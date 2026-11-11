use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::{self, OpenOptions},
    path::PathBuf,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{Manager, State};

const SCAN_CHUNK_BYTES: u64 = 32 * 1024 * 1024;
const PROGRESS_INTERVAL_BYTES: u64 = 64 * 1024 * 1024;
const MAX_FRAGMENT_CHARS: usize = 180;
const MAX_IMAGE_BYTES: usize = 32 * 1024 * 1024;
const MAX_VIDEO_BYTES: usize = 32 * 1024 * 1024;
const MAX_MEDIA_FRAGMENTS: usize = 256;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NtfsVolume {
    id: String,
    label: String,
    total_bytes: u64,
    free_bytes: u64,
    cluster_size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveredText {
    offset: u64,
    text: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveredMedia {
    offset: u64,
    mime_type: String,
    data_base64: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanReport {
    volume_id: String,
    bytes_scanned: u64,
    #[serde(default = "scan_completed_by_default")]
    scan_completed: bool,
    fragments: Vec<RecoveredText>,
    media: Vec<RecoveredMedia>,
}

fn scan_completed_by_default() -> bool {
    true
}

#[derive(Default)]
pub struct ScanRegistry(Mutex<HashMap<String, Arc<AtomicBool>>>);

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldFile {
    id: String,
    name: String,
    seed: u32,
    report: ScanReport,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorldFileRef<'a> {
    id: &'a str,
    name: &'a str,
    seed: u32,
    report: &'a ScanReport,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedWorld {
    id: String,
    name: String,
    volume_id: String,
    file_size_bytes: u64,
    bytes_scanned: u64,
    fragment_count: usize,
    media_count: usize,
}

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    bytes_processed: u64,
    total_bytes: u64,
    bytes_read: u64,
}

#[tauri::command]
pub fn get_install_ntfs_volume() -> Result<NtfsVolume, String> {
    #[cfg(windows)]
    {
        windows::get_install_ntfs_volume()
    }

    #[cfg(not(windows))]
    {
        Err("Чтение диска установки сейчас поддерживается только в Windows.".into())
    }
}

#[tauri::command]
pub async fn scan_ntfs_free_space(
    app: tauri::AppHandle,
    registry: State<'_, ScanRegistry>,
    volume_id: String,
    world_name: String,
    seed: u32,
    scan_id: String,
    start_basis_points: u32,
    end_basis_points: u32,
) -> Result<ScanReport, String> {
    validate_world_name(&world_name)?;
    if scan_id.is_empty() || scan_id.len() > 128 {
        return Err("Идентификатор сканирования некорректен.".into());
    }
    let cancelled = Arc::new(AtomicBool::new(false));
    {
        let mut active_scans = registry
            .0
            .lock()
            .map_err(|error| format!("Не удалось зарегистрировать сканирование: {error}"))?;
        if active_scans.contains_key(&scan_id) {
            return Err("Сканирование с таким идентификатором уже запущено.".into());
        }
        active_scans.insert(scan_id.clone(), Arc::clone(&cancelled));
    }

    let result = {
        #[cfg(windows)]
        {
            use tauri::Emitter;

            let task = tauri::async_runtime::spawn_blocking(move || {
                let mut last_emitted = 0;
                let report = windows::scan_ntfs_free_space(
                    &volume_id,
                    start_basis_points,
                    end_basis_points,
                    &cancelled,
                    |progress| {
                        if progress.bytes_processed.saturating_sub(last_emitted)
                            < PROGRESS_INTERVAL_BYTES
                            && progress.bytes_processed < progress.total_bytes
                        {
                            return Ok(());
                        }
                        app.emit("disk-scan-progress", progress).map_err(|error| {
                            format!("Не удалось обновить прогресс сканирования: {error}")
                        })?;
                        last_emitted = progress.bytes_processed;
                        Ok(())
                    },
                )?;
                persist_world(&app, &world_name, seed, &report)?;
                Ok(report)
            });
            task.await
                .map_err(|error| format!("Задача сканирования завершилась с ошибкой: {error}"))?
        }

        #[cfg(not(windows))]
        {
            let _ = app;
            let _ = cancelled;
            let _ = volume_id;
            let _ = world_name;
            let _ = seed;
            let _ = start_basis_points;
            let _ = end_basis_points;
            Err(
                "Поиск по свободному пространству NTFS сейчас поддерживается только в Windows."
                    .into(),
            )
        }
    };
    registry
        .0
        .lock()
        .map_err(|error| format!("Не удалось завершить регистрацию сканирования: {error}"))?
        .remove(&scan_id);
    result
}

#[tauri::command]
pub fn cancel_disk_scan(scan_id: String, registry: State<'_, ScanRegistry>) -> Result<(), String> {
    let active_scans = registry
        .0
        .lock()
        .map_err(|error| format!("Не удалось запросить остановку сканирования: {error}"))?;
    let cancelled = active_scans
        .get(&scan_id)
        .ok_or_else(|| "Сканирование уже завершено или не найдено.".to_owned())?;
    cancelled.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub async fn list_worlds(app: tauri::AppHandle) -> Result<Vec<SavedWorld>, String> {
    tauri::async_runtime::spawn_blocking(move || list_world_files(&app))
        .await
        .map_err(|error| format!("Задача чтения списка миров завершилась с ошибкой: {error}"))?
}

fn list_world_files(app: &tauri::AppHandle) -> Result<Vec<SavedWorld>, String> {
    let directory = worlds_directory(app)?;
    let entries = match fs::read_dir(&directory) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(format!("Не удалось прочитать список миров: {error}")),
    };
    let mut worlds = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|error| format!("Не удалось прочитать файл мира: {error}"))?;
        if entry
            .path()
            .extension()
            .and_then(|extension| extension.to_str())
            != Some("json")
        {
            continue;
        }
        let path = entry.path();
        let bytes =
            fs::read(&path).map_err(|error| format!("Не удалось прочитать файл мира: {error}"))?;
        let world: WorldFile = serde_json::from_slice(&bytes)
            .map_err(|error| format!("Файл мира повреждён: {error}"))?;
        validate_world_id(&world.id)?;
        let expected_file = format!("world-{}.json", world.id);
        if entry.file_name().to_str() != Some(expected_file.as_str()) {
            return Err("Имя файла мира не совпадает с его идентификатором.".into());
        }
        worlds.push(saved_world(&world, bytes.len() as u64));
    }
    worlds.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(worlds)
}

#[tauri::command]
pub async fn load_world(app: tauri::AppHandle, id: String) -> Result<WorldFile, String> {
    validate_world_id(&id)?;
    tauri::async_runtime::spawn_blocking(move || load_world_file(&app, &id))
        .await
        .map_err(|error| format!("Задача загрузки мира завершилась с ошибкой: {error}"))?
}

#[tauri::command]
pub async fn delete_world(app: tauri::AppHandle, id: String) -> Result<(), String> {
    validate_world_id(&id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let path = worlds_directory(&app)?.join(format!("world-{id}.json"));
        fs::remove_file(path).map_err(|error| match error.kind() {
            std::io::ErrorKind::NotFound => "Сохранённый мир уже удалён.".into(),
            _ => format!("Не удалось удалить сохранённый мир: {error}"),
        })
    })
    .await
    .map_err(|error| format!("Задача удаления мира завершилась с ошибкой: {error}"))?
}

fn load_world_file(app: &tauri::AppHandle, id: &str) -> Result<WorldFile, String> {
    validate_world_id(id)?;
    let path = worlds_directory(app)?.join(format!("world-{id}.json"));
    let bytes =
        fs::read(path).map_err(|error| format!("Не удалось открыть сохранённый мир: {error}"))?;
    let world: WorldFile =
        serde_json::from_slice(&bytes).map_err(|error| format!("Файл мира повреждён: {error}"))?;
    if world.id != id {
        return Err("Идентификатор в файле мира не совпадает с именем файла.".into());
    }
    Ok(world)
}

fn persist_world(
    app: &tauri::AppHandle,
    name: &str,
    seed: u32,
    report: &ScanReport,
) -> Result<SavedWorld, String> {
    let name = validate_world_name(name)?;
    let directory = worlds_directory(&app)?;
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Не удалось создать каталог миров: {error}"))?;

    let id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Не удалось получить время для имени файла мира: {error}"))?
        .as_nanos()
        .to_string();
    let world = WorldFileRef {
        id: &id,
        name,
        seed,
        report,
    };
    let temporary_path = directory.join(format!("world-{id}.json.tmp"));
    let final_path = directory.join(format!("world-{id}.json"));
    let mut created_temporary = false;
    let write_result: Result<(), String> = (|| {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary_path)
            .map_err(|error| format!("Не удалось создать файл мира: {error}"))?;
        created_temporary = true;
        serde_json::to_writer(&mut file, &world)
            .map_err(|error| format!("Не удалось записать файл мира: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("Не удалось сохранить файл мира: {error}"))?;
        fs::rename(&temporary_path, &final_path)
            .map_err(|error| format!("Не удалось завершить сохранение мира: {error}"))?;
        Ok(())
    })();
    if let Err(error) = write_result {
        if !created_temporary {
            return Err(error);
        }
        return match fs::remove_file(&temporary_path) {
            Ok(()) => Err(error),
            Err(cleanup_error) if cleanup_error.kind() == std::io::ErrorKind::NotFound => {
                Err(error)
            }
            Err(cleanup_error) => Err(format!(
                "{error}; не удалось удалить временный файл мира: {cleanup_error}"
            )),
        };
    }

    let file_size_bytes = fs::metadata(&final_path)
        .map_err(|error| format!("Не удалось определить размер файла мира: {error}"))?
        .len();
    Ok(saved_world_parts(&id, name, report, file_size_bytes))
}

fn validate_world_name(name: &str) -> Result<&str, String> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 64 || name.chars().any(char::is_control) {
        return Err("Название мира должно содержать от 1 до 64 печатных символов.".into());
    }
    Ok(name)
}

fn worlds_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("worlds"))
        .map_err(|error| format!("Не удалось определить каталог сохранённых миров: {error}"))
}

fn validate_world_id(id: &str) -> Result<(), String> {
    if id.is_empty() || !id.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err("Некорректный идентификатор сохранённого мира.".into());
    }
    Ok(())
}

fn saved_world(world: &WorldFile, file_size_bytes: u64) -> SavedWorld {
    saved_world_parts(&world.id, &world.name, &world.report, file_size_bytes)
}

fn saved_world_parts(
    id: &str,
    name: &str,
    report: &ScanReport,
    file_size_bytes: u64,
) -> SavedWorld {
    SavedWorld {
        id: id.to_owned(),
        name: name.to_owned(),
        volume_id: report.volume_id.clone(),
        file_size_bytes,
        bytes_scanned: report.bytes_scanned,
        fragment_count: report.fragments.len(),
        media_count: report.media.len(),
    }
}

#[cfg(windows)]
mod windows {
    use super::*;
    use std::{
        collections::HashSet,
        ffi::OsStr,
        mem::size_of,
        os::windows::ffi::OsStrExt,
        path::{Component, Prefix},
        ptr::{null, null_mut},
    };
    use windows_sys::Win32::{
        Foundation::{CloseHandle, ERROR_MORE_DATA, GENERIC_READ, HANDLE, INVALID_HANDLE_VALUE},
        Security::SECURITY_ATTRIBUTES,
        Storage::FileSystem::{
            CreateFileW, FILE_BEGIN, FILE_SHARE_READ, FILE_SHARE_WRITE, GetDiskFreeSpaceW,
            GetVolumeInformationW, OPEN_EXISTING, ReadFile, SetFilePointerEx,
        },
        System::{
            IO::{DeviceIoControl, OVERLAPPED},
            Ioctl::FSCTL_GET_VOLUME_BITMAP,
        },
    };

    struct OwnedHandle(HANDLE);

    impl Drop for OwnedHandle {
        fn drop(&mut self) {
            unsafe {
                CloseHandle(self.0);
            }
        }
    }

    fn wide(value: &str) -> Vec<u16> {
        OsStr::new(value).encode_wide().chain(Some(0)).collect()
    }

    fn inspect_volume(letter: char) -> Option<NtfsVolume> {
        let id = format!("{letter}:");
        let root = wide(&format!("{id}\\"));
        let mut label = [0u16; 261];
        let mut filesystem = [0u16; 32];
        let mut serial = 0;
        let mut max_component_length = 0;
        let mut flags = 0;

        let has_info = unsafe {
            GetVolumeInformationW(
                root.as_ptr(),
                label.as_mut_ptr(),
                label.len() as u32,
                &mut serial,
                &mut max_component_length,
                &mut flags,
                filesystem.as_mut_ptr(),
                filesystem.len() as u32,
            )
        };
        if has_info == 0 {
            return None;
        }

        let filesystem = String::from_utf16_lossy(
            &filesystem[..filesystem
                .iter()
                .position(|unit| *unit == 0)
                .unwrap_or(filesystem.len())],
        );
        if !filesystem.eq_ignore_ascii_case("NTFS") {
            return None;
        }

        let mut sectors_per_cluster = 0;
        let mut bytes_per_sector = 0;
        let mut free_clusters = 0;
        let mut total_clusters = 0;
        let has_space = unsafe {
            GetDiskFreeSpaceW(
                root.as_ptr(),
                &mut sectors_per_cluster,
                &mut bytes_per_sector,
                &mut free_clusters,
                &mut total_clusters,
            )
        };
        if has_space == 0 || sectors_per_cluster == 0 || bytes_per_sector == 0 {
            return None;
        }

        let cluster_size = u64::from(sectors_per_cluster) * u64::from(bytes_per_sector);
        let label = String::from_utf16_lossy(
            &label[..label
                .iter()
                .position(|unit| *unit == 0)
                .unwrap_or(label.len())],
        );

        Some(NtfsVolume {
            id,
            label: if label.is_empty() {
                "Локальный том".into()
            } else {
                label
            },
            total_bytes: u64::from(total_clusters) * cluster_size,
            free_bytes: u64::from(free_clusters) * cluster_size,
            cluster_size,
        })
    }

    pub fn get_install_ntfs_volume() -> Result<NtfsVolume, String> {
        let executable = std::env::current_exe()
            .map_err(|error| format!("Не удалось определить путь к приложению: {error}"))?;
        let letter = match executable.components().next() {
            Some(Component::Prefix(prefix)) => match prefix.kind() {
                Prefix::Disk(letter) | Prefix::VerbatimDisk(letter) => char::from(letter),
                _ => return Err("Не удалось определить букву диска приложения.".into()),
            },
            _ => return Err("Путь к приложению не содержит букву диска.".into()),
        };

        inspect_volume(letter).ok_or_else(|| {
            format!("Диск приложения ({letter}:) недоступен или не отформатирован в NTFS.")
        })
    }

    fn open_volume(id: &str) -> Result<OwnedHandle, String> {
        let path = wide(&format!("\\\\.\\{id}"));
        let handle = unsafe {
            CreateFileW(
                path.as_ptr(),
                GENERIC_READ,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                null::<SECURITY_ATTRIBUTES>(),
                OPEN_EXISTING,
                0,
                null_mut(),
            )
        };
        if handle == INVALID_HANDLE_VALUE {
            return Err(format!(
                "Не удалось открыть том {id} только для чтения: {}. Проверьте права доступа.",
                std::io::Error::last_os_error()
            ));
        }
        Ok(OwnedHandle(handle))
    }

    fn validate_volume_id(id: &str) -> Result<(), String> {
        let bytes = id.as_bytes();
        if bytes.len() != 2 || !bytes[0].is_ascii_alphabetic() || bytes[1] != b':' {
            return Err("Выберите том из списка NTFS; допустимый формат — например, D:.".into());
        }
        Ok(())
    }

    fn read_free_run(
        handle: HANDLE,
        start_lcn: u64,
        cluster_count: u64,
        cluster_size: u64,
        volume_id: &str,
        report: &mut ScanReport,
        seen: &mut HashSet<String>,
        tail: &mut Vec<u8>,
        scan_start_bytes: u64,
        scan_total_bytes: u64,
        cancelled: &AtomicBool,
        progress: &mut impl FnMut(ScanProgress) -> Result<(), String>,
    ) -> Result<(), String> {
        let byte_count = cluster_count
            .checked_mul(cluster_size)
            .ok_or_else(|| "Размер свободного диапазона NTFS переполнен.".to_owned())?;
        if byte_count == 0 {
            return Ok(());
        }

        let run_offset = start_lcn
            .checked_mul(cluster_size)
            .ok_or_else(|| "Смещение кластера NTFS переполнено.".to_owned())?;
        let mut run_read = 0u64;
        while run_read < byte_count {
            if cancelled.load(Ordering::Relaxed) {
                break;
            }
            let chunk_size = usize::try_from((byte_count - run_read).min(SCAN_CHUNK_BYTES))
                .map_err(|_| "Размер блока чтения слишком велик.".to_owned())?;
            let absolute_offset = run_offset
                .checked_add(run_read)
                .ok_or_else(|| "Смещение чтения переполнено.".to_owned())?;
            let offset = i64::try_from(absolute_offset)
                .map_err(|_| "Смещение тома слишком велико.".to_owned())?;
            let mut data = vec![0u8; chunk_size];
            let mut new_position = 0i64;
            if unsafe { SetFilePointerEx(handle, offset, &mut new_position, FILE_BEGIN) } == 0 {
                return Err(format!(
                    "Не удалось перейти к свободному кластеру на томе {volume_id}: {}",
                    std::io::Error::last_os_error()
                ));
            }

            let mut bytes_read = 0u32;
            if unsafe {
                ReadFile(
                    handle,
                    data.as_mut_ptr(),
                    data.len() as u32,
                    &mut bytes_read,
                    null_mut::<OVERLAPPED>(),
                )
            } == 0
            {
                return Err(format!(
                    "Ошибка чтения свободных кластеров тома {volume_id}: {}",
                    std::io::Error::last_os_error()
                ));
            }
            if bytes_read == 0 {
                return Err(format!(
                    "Неожиданный конец свободного диапазона на томе {volume_id}."
                ));
            }

            data.truncate(bytes_read as usize);
            let overlap = tail.len();
            let scan_offset = absolute_offset - overlap as u64;
            tail.extend_from_slice(&data);
            collect_utf8_runs(&tail, scan_offset, &mut report.fragments, seen);
            collect_utf16_runs(&tail, scan_offset, &mut report.fragments, seen);
            recover_media(&tail, scan_offset, overlap, report);
            let retained = tail.len().min(MAX_IMAGE_BYTES.max(MAX_VIDEO_BYTES) - 1);
            tail.drain(..tail.len() - retained);
            report.bytes_scanned += u64::from(bytes_read);
            run_read += u64::from(bytes_read);
            progress(ScanProgress {
                bytes_processed: (absolute_offset + u64::from(bytes_read))
                    .saturating_sub(scan_start_bytes)
                    .min(scan_total_bytes),
                total_bytes: scan_total_bytes,
                bytes_read: report.bytes_scanned,
            })?;
        }
        Ok(())
    }

    fn flush_bitmap_run(
        handle: HANDLE,
        run_start: &mut Option<u64>,
        run_clusters: &mut u64,
        cluster_size: u64,
        volume_id: &str,
        report: &mut ScanReport,
        seen: &mut HashSet<String>,
        tail: &mut Vec<u8>,
        scan_start_bytes: u64,
        scan_total_bytes: u64,
        cancelled: &AtomicBool,
        preserve_tail: bool,
        progress: &mut impl FnMut(ScanProgress) -> Result<(), String>,
    ) -> Result<(), String> {
        if let Some(start_lcn) = run_start.take() {
            let cluster_count = std::mem::take(run_clusters);
            read_free_run(
                handle,
                start_lcn,
                cluster_count,
                cluster_size,
                volume_id,
                report,
                seen,
                tail,
                scan_start_bytes,
                scan_total_bytes,
                cancelled,
                progress,
            )?;
        }
        if !preserve_tail {
            tail.clear();
        }
        Ok(())
    }

    fn recover_media(data: &[u8], base_offset: u64, overlap: usize, report: &mut ScanReport) {
        let mut offset = 0usize;
        while offset < data.len() && report.media.len() < MAX_MEDIA_FRAGMENTS {
            let first_byte = data[offset];
            let possible_image = matches!(first_byte, 0xff | 0x89 | b'B' | b'R');
            let possible_video = matches!(first_byte, 0x1a | b'R' | b'\0');
            if !possible_image && !possible_video {
                offset += 1;
                continue;
            }

            let found = if possible_image {
                find_image(data, offset)
            } else {
                None
            }
            .or_else(|| {
                if possible_video {
                    find_video(data, offset)
                } else {
                    None
                }
            });

            if let Some((mime_type, length)) = found {
                if offset + length <= overlap {
                    offset += length;
                    continue;
                }
                let bytes = &data[offset..offset + length];
                report.media.push(RecoveredMedia {
                    offset: base_offset + offset as u64,
                    mime_type,
                    data_base64: encode_base64(bytes),
                });
                offset += length;
                continue;
            }
            offset += 1;
        }
    }

    fn find_image(data: &[u8], offset: usize) -> Option<(String, usize)> {
        let remaining = data.len().checked_sub(offset)?;
        let bytes = &data[offset..];

        if bytes.starts_with(b"\xff\xd8\xff") {
            let length = bytes.windows(2).position(|window| window == b"\xff\xd9")? + 2;
            return (length <= MAX_IMAGE_BYTES).then(|| ("image/jpeg".into(), length));
        }

        if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
            let length = png_length(bytes)?;
            return (length <= MAX_IMAGE_BYTES).then(|| ("image/png".into(), length));
        }

        if bytes.starts_with(b"BM") && remaining >= 6 {
            let length = u32::from_le_bytes(bytes.get(2..6)?.try_into().ok()?) as usize;
            if (26..=MAX_IMAGE_BYTES).contains(&length) && length <= remaining {
                return Some(("image/bmp".into(), length));
            }
        }

        if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") && remaining >= 12 {
            let length =
                (u32::from_le_bytes(bytes.get(4..8)?.try_into().ok()?) as usize).checked_add(8)?;
            if (12..=MAX_IMAGE_BYTES).contains(&length) && length <= remaining {
                return Some(("image/webp".into(), length));
            }
        }

        None
    }

    fn png_length(data: &[u8]) -> Option<usize> {
        let mut cursor = 8usize;
        while cursor.checked_add(12)? <= data.len() && cursor <= MAX_IMAGE_BYTES {
            let chunk_length =
                u32::from_be_bytes(data.get(cursor..cursor + 4)?.try_into().ok()?) as usize;
            let chunk_end = cursor.checked_add(12)?.checked_add(chunk_length)?;
            if chunk_end > data.len() || chunk_end > MAX_IMAGE_BYTES {
                return None;
            }
            if data.get(cursor + 4..cursor + 8)? == b"IEND" {
                return Some(chunk_end);
            }
            cursor = chunk_end;
        }
        None
    }

    fn find_video(data: &[u8], offset: usize) -> Option<(String, usize)> {
        let remaining = data.len().checked_sub(offset)?;
        let bytes = &data[offset..];

        if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"AVI ") && remaining >= 12 {
            let length =
                (u32::from_le_bytes(bytes.get(4..8)?.try_into().ok()?) as usize).checked_add(8)?;
            if (12..=MAX_VIDEO_BYTES).contains(&length) && length <= remaining {
                return Some(("video/x-msvideo".into(), length));
            }
        }

        if bytes.starts_with(b"\x1a\x45\xdf\xa3") {
            if let Some(length) = webm_length(bytes) {
                if length <= MAX_VIDEO_BYTES {
                    return Some(("video/webm".into(), length));
                }
            }
        }

        if remaining >= 8 && bytes.get(4..8) == Some(b"ftyp") {
            if let Some(length) = mp4_length(bytes) {
                if length <= MAX_VIDEO_BYTES {
                    return Some(("video/mp4".into(), length));
                }
            }
        }

        None
    }

    fn mp4_length(data: &[u8]) -> Option<usize> {
        let mut cursor = 0usize;
        let mut has_ftyp = false;
        let mut has_moov = false;
        let mut has_mdat = false;

        while cursor.checked_add(8)? <= data.len() && cursor < MAX_VIDEO_BYTES {
            let size = u32::from_be_bytes(data.get(cursor..cursor + 4)?.try_into().ok()?) as u64;
            let kind = data.get(cursor + 4..cursor + 8)?;
            let (header_size, size) = if size == 1 {
                let extended =
                    u64::from_be_bytes(data.get(cursor + 8..cursor + 16)?.try_into().ok()?);
                (16usize, extended)
            } else if size == 0 {
                (8usize, u64::try_from(data.len() - cursor).ok()?)
            } else {
                (8usize, size)
            };
            if size < header_size as u64 {
                return None;
            }
            let end = cursor.checked_add(usize::try_from(size).ok()?)?;
            if end > data.len() || end > MAX_VIDEO_BYTES {
                return None;
            }
            has_ftyp |= kind == b"ftyp";
            has_moov |= kind == b"moov";
            has_mdat |= kind == b"mdat";
            cursor = end;
            if has_ftyp && has_moov && has_mdat {
                return Some(cursor);
            }
        }
        None
    }

    fn webm_length(data: &[u8]) -> Option<usize> {
        let header_size = ebml_size_length(*data.get(4)?);
        let header_end = 4usize.checked_add(header_size)?;
        if header_end > data.len() || header_end + 4 > data.len() {
            return None;
        }
        let encoded_header_size = data.get(4..header_end)?;
        let header_payload_size = ebml_size_value(encoded_header_size)?;
        let segment_start = header_end.checked_add(usize::try_from(header_payload_size).ok()?)?;
        if data.get(segment_start..segment_start + 4)? != b"\x18\x53\x80\x67" {
            return None;
        }

        let size_start = segment_start + 4;
        let size_length = ebml_size_length(*data.get(size_start)?);
        let size_end = size_start.checked_add(size_length)?;
        let segment_size = ebml_size_value(data.get(size_start..size_end)?)?;
        let unknown_size = segment_size == (1u64 << (7 * size_length)) - 1;

        if unknown_size {
            let clip_end = data.len().min(MAX_VIDEO_BYTES);
            let segment = data.get(segment_start..clip_end)?;
            if segment
                .windows(4)
                .any(|window| window == b"\x1f\x43\xb6\x75")
            {
                return Some(clip_end);
            }
            return None;
        }

        let end = size_end.checked_add(usize::try_from(segment_size).ok()?)?;
        if end > data.len() || end > MAX_VIDEO_BYTES {
            return None;
        }
        let segment = data.get(segment_start..end)?;
        segment
            .windows(4)
            .any(|window| window == b"\x1f\x43\xb6\x75")
            .then_some(end)
    }

    fn ebml_size_length(first: u8) -> usize {
        (1..=8)
            .find(|length| first & (0x80 >> (length - 1)) != 0)
            .unwrap_or(0)
    }

    fn ebml_size_value(bytes: &[u8]) -> Option<u64> {
        let (&first, rest) = bytes.split_first()?;
        let length = ebml_size_length(first);
        if length == 0 || bytes.len() != length {
            return None;
        }
        let mut value = u64::from(first) & (0xffu64 >> length);
        for byte in rest {
            value = (value << 8) | u64::from(*byte);
        }
        Some(value)
    }

    fn encode_base64(data: &[u8]) -> String {
        const TABLE: &[u8; 64] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut encoded = String::with_capacity(data.len().div_ceil(3) * 4);
        for chunk in data.chunks(3) {
            let first = chunk[0];
            let second = chunk.get(1).copied().unwrap_or(0);
            let third = chunk.get(2).copied().unwrap_or(0);
            encoded.push(TABLE[(first >> 2) as usize] as char);
            encoded.push(TABLE[(((first & 0x03) << 4) | (second >> 4)) as usize] as char);
            encoded.push(if chunk.len() > 1 {
                TABLE[(((second & 0x0f) << 2) | (third >> 6)) as usize] as char
            } else {
                '='
            });
            encoded.push(if chunk.len() > 2 {
                TABLE[(third & 0x3f) as usize] as char
            } else {
                '='
            });
        }
        encoded
    }

    fn push_fragment(
        text: String,
        offset: u64,
        fragments: &mut Vec<RecoveredText>,
        seen: &mut HashSet<String>,
    ) {
        let text = text.trim();
        if text.chars().count() < 24 {
            return;
        }
        let normalized = text.to_ascii_lowercase();
        if [
            "unsafe precondition(s) violated",
            "slice::from_raw_parts requires",
            "panicked at",
            "stack backtrace:",
        ]
        .iter()
        .any(|marker| normalized.contains(marker))
        {
            return;
        }
        if text
            .chars()
            .filter(|character| character.is_alphabetic())
            .count()
            < 6
        {
            return;
        }

        let excerpt = text.chars().take(MAX_FRAGMENT_CHARS).collect::<String>();
        if seen.insert(excerpt.clone()) {
            fragments.push(RecoveredText {
                offset,
                text: excerpt,
            });
        }
    }

    fn collect_utf8_runs(
        data: &[u8],
        base_offset: u64,
        fragments: &mut Vec<RecoveredText>,
        seen: &mut HashSet<String>,
    ) {
        let mut start = None;
        for index in 0..=data.len() {
            let printable = data.get(index).is_some_and(|byte| {
                *byte == b'\t' || *byte == b'\r' || *byte == b'\n' || (0x20..=0xff).contains(byte)
            });
            if printable && start.is_none() {
                start = Some(index);
            } else if !printable {
                if let Some(run_start) = start.take() {
                    if let Ok(text) = std::str::from_utf8(&data[run_start..index]) {
                        push_fragment(
                            text.to_owned(),
                            base_offset + run_start as u64,
                            fragments,
                            seen,
                        );
                    }
                }
            }
        }
    }

    fn collect_utf16_runs(
        data: &[u8],
        base_offset: u64,
        fragments: &mut Vec<RecoveredText>,
        seen: &mut HashSet<String>,
    ) {
        let mut run = String::new();
        let mut run_offset = 0;
        for (index, pair) in data.chunks_exact(2).enumerate() {
            let value = u16::from_le_bytes([pair[0], pair[1]]);
            let character = if (0x20..=0x7e).contains(&value) {
                Some(char::from(value as u8))
            } else if value > 0x9f {
                char::from_u32(u32::from(value))
                    .filter(|character| character.is_alphanumeric() || character.is_whitespace())
            } else {
                None
            };
            if let Some(character) = character {
                if run.is_empty() {
                    run_offset = index * 2;
                }
                run.push(character);
            } else if !run.is_empty() {
                push_fragment(
                    std::mem::take(&mut run),
                    base_offset + run_offset as u64,
                    fragments,
                    seen,
                );
            }
        }
        if !run.is_empty() {
            push_fragment(run, base_offset + run_offset as u64, fragments, seen);
        }
    }

    fn resolve_scan_range(
        total_clusters: u64,
        start_basis_points: u32,
        end_basis_points: u32,
    ) -> Result<(u64, u64), String> {
        if start_basis_points >= end_basis_points || end_basis_points > 10_000 {
            return Err("Начало диапазона должно быть меньше его конца.".into());
        }
        let total = u128::from(total_clusters);
        let start = (total * u128::from(start_basis_points) / 10_000) as u64;
        let end = (total * u128::from(end_basis_points) / 10_000) as u64;
        if start >= end {
            return Err("Выбранный диапазон меньше одного кластера диска.".into());
        }
        Ok((start, end))
    }

    pub fn scan_ntfs_free_space(
        volume_id: &str,
        start_basis_points: u32,
        end_basis_points: u32,
        cancelled: &AtomicBool,
        mut progress: impl FnMut(ScanProgress) -> Result<(), String>,
    ) -> Result<ScanReport, String> {
        validate_volume_id(volume_id)?;
        let volume = get_install_ntfs_volume()?;
        if !volume.id.eq_ignore_ascii_case(volume_id) {
            return Err(format!(
                "Разрешено сканировать только NTFS-диск установки ({}).",
                volume.id
            ));
        }
        let handle = open_volume(&volume.id)?;
        let (scan_start_lcn, scan_end_lcn) = resolve_scan_range(
            volume.total_bytes / volume.cluster_size,
            start_basis_points,
            end_basis_points,
        )?;
        let scan_start_bytes = scan_start_lcn * volume.cluster_size;
        let scan_end_bytes = scan_end_lcn * volume.cluster_size;
        let scan_total_bytes = scan_end_bytes - scan_start_bytes;
        let mut report = ScanReport {
            volume_id: volume.id.clone(),
            bytes_scanned: 0,
            scan_completed: true,
            fragments: Vec::new(),
            media: Vec::new(),
        };
        let mut seen = HashSet::new();
        let mut bitmap = vec![0u8; 256 * 1024];
        let mut tail = Vec::new();

        let mut requested_lcn = scan_start_lcn;
        'scan: while requested_lcn < scan_end_lcn {
            if cancelled.load(Ordering::Relaxed) {
                report.scan_completed = false;
                break;
            }
            let input_lcn = i64::try_from(requested_lcn)
                .map_err(|_| "Номер кластера NTFS слишком велик.".to_owned())?;
            let mut returned = 0u32;
            let success = unsafe {
                DeviceIoControl(
                    handle.0,
                    FSCTL_GET_VOLUME_BITMAP,
                    &input_lcn as *const i64 as *const _,
                    size_of::<i64>() as u32,
                    bitmap.as_mut_ptr() as *mut _,
                    bitmap.len() as u32,
                    &mut returned,
                    null_mut(),
                )
            };
            let error = std::io::Error::last_os_error();
            if success == 0 && error.raw_os_error() != Some(ERROR_MORE_DATA as i32) {
                return Err(format!(
                    "Не удалось прочитать карту свободных кластеров тома {}: {error}",
                    volume.id
                ));
            }
            if returned < 16 {
                return Err("Windows вернула неполную карту свободных кластеров NTFS.".into());
            }

            let start_lcn = u64::try_from(i64::from_ne_bytes(bitmap[0..8].try_into().unwrap()))
                .map_err(|_| "Windows вернула некорректный начальный кластер.".to_owned())?;
            let bitmap_size = u64::try_from(i64::from_ne_bytes(bitmap[8..16].try_into().unwrap()))
                .map_err(|_| "Windows вернула некорректный размер карты кластеров.".to_owned())?;
            let available_bits = u64::from(returned - 16) * 8;
            let bitmap_end_lcn = start_lcn
                .checked_add(available_bits.min(bitmap_size.saturating_sub(start_lcn)))
                .ok_or_else(|| "Конец карты кластеров переполнен.".to_owned())?;
            let page_start_lcn = start_lcn.max(scan_start_lcn).max(requested_lcn);
            let page_end_lcn = bitmap_end_lcn.min(scan_end_lcn);
            if page_end_lcn <= page_start_lcn {
                return Err("Карта NTFS не продвигается по выбранному диапазону.".into());
            }
            let bit_start = page_start_lcn - start_lcn;
            let bit_count = page_end_lcn - page_start_lcn;
            if bit_count == 0 {
                continue;
            }

            let mut free_run_start = None;
            let mut free_run_clusters = 0u64;
            let first_byte = usize::try_from(bit_start / 8)
                .map_err(|_| "Смещение карты кластеров слишком велико.".to_owned())?;
            let last_byte = usize::try_from((bit_start + bit_count).div_ceil(8))
                .map_err(|_| "Смещение карты кластеров слишком велико.".to_owned())?;
            for byte_index in first_byte..last_byte {
                if cancelled.load(Ordering::Relaxed) {
                    report.scan_completed = false;
                    break 'scan;
                }
                let bit_offset = byte_index as u64 * 8;
                let first_bit_in_byte = bit_start.saturating_sub(bit_offset).min(8) as u8;
                let bits_in_byte =
                    (bit_start + bit_count - bit_offset).min(8) as u8 - first_bit_in_byte;
                let byte = bitmap[16 + byte_index];
                if bits_in_byte == 8 && first_bit_in_byte == 0 && byte == 0 {
                    if free_run_start.is_none() {
                        free_run_start = Some(page_start_lcn + bit_offset - bit_start);
                    }
                    free_run_clusters += 8;
                } else if bits_in_byte == 8 && first_bit_in_byte == 0 && byte == u8::MAX {
                    flush_bitmap_run(
                        handle.0,
                        &mut free_run_start,
                        &mut free_run_clusters,
                        volume.cluster_size,
                        &volume.id,
                        &mut report,
                        &mut seen,
                        &mut tail,
                        scan_start_bytes,
                        scan_total_bytes,
                        cancelled,
                        false,
                        &mut progress,
                    )?;
                } else {
                    for bit in first_bit_in_byte..first_bit_in_byte + bits_in_byte {
                        let free = byte & (1 << bit) == 0;
                        let lcn = start_lcn + bit_offset + u64::from(bit);
                        if free {
                            if free_run_start.is_none() {
                                free_run_start = Some(lcn);
                            }
                            free_run_clusters += 1;
                        } else {
                            flush_bitmap_run(
                                handle.0,
                                &mut free_run_start,
                                &mut free_run_clusters,
                                volume.cluster_size,
                                &volume.id,
                                &mut report,
                                &mut seen,
                                &mut tail,
                                scan_start_bytes,
                                scan_total_bytes,
                                cancelled,
                                false,
                                &mut progress,
                            )?;
                        }
                    }
                }
            }
            flush_bitmap_run(
                handle.0,
                &mut free_run_start,
                &mut free_run_clusters,
                volume.cluster_size,
                &volume.id,
                &mut report,
                &mut seen,
                &mut tail,
                scan_start_bytes,
                scan_total_bytes,
                cancelled,
                true,
                &mut progress,
            )?;
            if cancelled.load(Ordering::Relaxed) {
                report.scan_completed = false;
                break;
            }
            let bytes_processed = page_end_lcn
                .checked_mul(volume.cluster_size)
                .ok_or_else(|| "Смещение обработанных байтов переполнено.".to_owned())?
                .saturating_sub(scan_start_bytes)
                .min(scan_total_bytes);
            progress(ScanProgress {
                bytes_processed,
                total_bytes: scan_total_bytes,
                bytes_read: report.bytes_scanned,
            })?;
            requested_lcn = page_end_lcn;
        }

        if report.scan_completed {
            progress(ScanProgress {
                bytes_processed: scan_total_bytes,
                total_bytes: scan_total_bytes,
                bytes_read: report.bytes_scanned,
            })?;
        }
        Ok(report)
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn detects_ntfs_volume_containing_the_running_binary() {
            let volume = get_install_ntfs_volume().expect("current test binary should be on NTFS");

            assert_eq!(volume.id.len(), 2);
            assert_eq!(volume.id.as_bytes()[1], b':');
            assert!(volume.free_bytes > 0);
        }

        #[test]
        fn extracts_utf8_text_from_free_clusters() {
            let bytes = b"\0This is a recovered note with enough readable text.\0";
            let mut fragments = Vec::new();
            let mut seen = HashSet::new();

            collect_utf8_runs(bytes, 4096, &mut fragments, &mut seen);

            assert_eq!(fragments.len(), 1);
            assert_eq!(fragments[0].offset, 4097);
            assert_eq!(
                fragments[0].text,
                "This is a recovered note with enough readable text."
            );
        }

        #[test]
        fn extracts_utf16_text_from_free_clusters() {
            let text = "Удалённый документ содержит достаточно читаемого текста.";
            let mut bytes = Vec::new();
            for character in text.encode_utf16() {
                bytes.extend_from_slice(&character.to_le_bytes());
            }
            let mut fragments = Vec::new();
            let mut seen = HashSet::new();

            collect_utf16_runs(&bytes, 8192, &mut fragments, &mut seen);

            assert_eq!(fragments.len(), 1);
            assert_eq!(fragments[0].offset, 8192);
            assert_eq!(fragments[0].text, text);
        }

        #[test]
        fn ignores_rust_diagnostic_noise() {
            let bytes = b"\0unsafe precondition(s) violated: slice::from_raw_parts requires an aligned and non-null pointer\0";
            let mut fragments = Vec::new();
            let mut seen = HashSet::new();

            collect_utf8_runs(bytes, 0, &mut fragments, &mut seen);

            assert!(fragments.is_empty());
        }

        #[test]
        fn validates_and_trims_world_names() {
            assert_eq!(validate_world_name("  мой мир  ").unwrap(), "мой мир");
            assert!(validate_world_name("  ").is_err());
            assert!(validate_world_name(&"м".repeat(65)).is_err());
            assert!(validate_world_name("bad\nname").is_err());
        }

        #[test]
        fn round_trips_world_metadata_and_recovered_fragments() {
            let report = ScanReport {
                volume_id: "C:".into(),
                bytes_scanned: 4096,
                scan_completed: true,
                fragments: vec![RecoveredText {
                    offset: 128,
                    text: "Recovered fragment".into(),
                }],
                media: Vec::new(),
            };
            let encoded = serde_json::to_vec(&WorldFileRef {
                id: "12345",
                name: "мой мир",
                seed: 42,
                report: &report,
            })
            .unwrap();
            let world: WorldFile = serde_json::from_slice(&encoded).unwrap();

            assert_eq!(world.name, "мой мир");
            assert_eq!(world.seed, 42);
            assert_eq!(world.report.fragments[0].text, "Recovered fragment");
        }

        #[test]
        fn carves_supported_images_and_video_containers() {
            let jpeg = b"\xff\xd8\xff\xd9";
            let png = b"\x89PNG\r\n\x1a\n\0\0\0\0IEND\0\0\0\0";
            let mut bmp = vec![0u8; 26];
            bmp[0..2].copy_from_slice(b"BM");
            bmp[2..6].copy_from_slice(&26u32.to_le_bytes());
            let webp = b"RIFF\x04\0\0\0WEBP";
            let avi = b"RIFF\x04\0\0\0AVI ";
            let mp4 = b"\0\0\0\x08ftyp\0\0\0\x08moov\0\0\0\x08mdat";
            let extended_mp4 = [
                b"\0\0\0\x01ftyp\0\0\0\0\0\0\0\x10".as_slice(),
                b"\0\0\0\x08moov",
                b"\0\0\0\x08mdat",
            ]
            .concat();
            let webm = b"\x1a\x45\xdf\xa3\x80\x18\x53\x80\x67\xff\x1f\x43\xb6\x75";

            assert_eq!(find_image(jpeg, 0), Some(("image/jpeg".into(), jpeg.len())));
            assert_eq!(find_image(png, 0), Some(("image/png".into(), png.len())));
            assert_eq!(find_image(&bmp, 0), Some(("image/bmp".into(), bmp.len())));
            assert_eq!(find_image(webp, 0), Some(("image/webp".into(), webp.len())));
            assert_eq!(
                find_video(avi, 0),
                Some(("video/x-msvideo".into(), avi.len()))
            );
            assert_eq!(find_video(mp4, 0), Some(("video/mp4".into(), mp4.len())));
            assert_eq!(
                find_video(&extended_mp4, 0),
                Some(("video/mp4".into(), extended_mp4.len()))
            );
            assert_eq!(find_video(webm, 0), Some(("video/webm".into(), webm.len())));
        }

        #[test]
        fn base64_encodes_media_bytes() {
            assert_eq!(encode_base64(b"Man"), "TWFu");
            assert_eq!(encode_base64(b"Ma"), "TWE=");
            assert_eq!(encode_base64(b"M"), "TQ==");
        }

        #[test]
        fn caps_images_and_videos_at_256_items_together() {
            let image = b"\xff\xd8\xff\xd9";
            let video = b"RIFF\x04\0\0\0AVI ";
            let mut data = Vec::new();
            for _ in 0..150 {
                data.extend_from_slice(image);
                data.extend_from_slice(video);
            }
            let mut report = ScanReport {
                volume_id: "C:".into(),
                bytes_scanned: data.len() as u64,
                scan_completed: true,
                fragments: Vec::new(),
                media: Vec::new(),
            };

            recover_media(&data, 0, 0, &mut report);

            assert_eq!(report.media.len(), MAX_MEDIA_FRAGMENTS);
            assert!(
                report
                    .media
                    .iter()
                    .any(|media| media.mime_type == "image/jpeg")
            );
            assert!(
                report
                    .media
                    .iter()
                    .any(|media| media.mime_type == "video/x-msvideo")
            );
        }

        #[test]
        fn recovers_media_across_read_buffer_boundary() {
            let first_chunk = b"\xff\xd8\xff";
            let second_chunk = b"\xd9";
            let mut combined = first_chunk.to_vec();
            combined.extend_from_slice(second_chunk);
            let mut report = ScanReport {
                volume_id: "C:".into(),
                bytes_scanned: 0,
                scan_completed: true,
                fragments: Vec::new(),
                media: Vec::new(),
            };
            recover_media(&first_chunk[..], 0, 0, &mut report);
            recover_media(&combined, 0, first_chunk.len(), &mut report);

            assert_eq!(report.media.len(), 1);
            assert_eq!(report.media[0].offset, 0);
            assert_eq!(report.media[0].data_base64, "/9j/2Q==");
        }

        #[test]
        fn recovers_mp4_larger_than_the_previous_six_mebibyte_limit() {
            let target_size = 7 * 1024 * 1024;
            let mut data = Vec::with_capacity(target_size);
            data.extend_from_slice(&16u32.to_be_bytes());
            data.extend_from_slice(b"ftypisom");
            data.extend_from_slice(b"\0\0\0\0");
            data.extend_from_slice(&8u32.to_be_bytes());
            data.extend_from_slice(b"moov");
            let mdat_size = u32::try_from(target_size - data.len()).unwrap();
            data.extend_from_slice(&mdat_size.to_be_bytes());
            data.extend_from_slice(b"mdat");
            data.resize(target_size, 0);

            assert_eq!(
                find_video(&data, 0),
                Some(("video/mp4".into(), target_size))
            );
        }

        #[test]
        fn resolves_selected_scan_ranges_to_cluster_boundaries() {
            assert_eq!(
                resolve_scan_range(10_000, 2_500, 7_500).unwrap(),
                (2_500, 7_500)
            );
            assert!(resolve_scan_range(10_000, 7_500, 2_500).is_err());
            assert!(resolve_scan_range(10_000, 0, 10_001).is_err());
            assert!(resolve_scan_range(10, 1, 2).is_err());
        }

        #[test]
        fn older_world_reports_default_to_completed() {
            let report: ScanReport = serde_json::from_str(
                r#"{"volumeId":"C:","bytesScanned":0,"fragments":[],"media":[]}"#,
            )
            .unwrap();
            assert!(report.scan_completed);
        }
    }
}
