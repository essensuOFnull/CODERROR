use serde::Serialize;

const MAX_SCAN_BYTES: u64 = 32 * 1024 * 1024;
const MAX_FRAGMENTS: usize = 128;
const MAX_FRAGMENT_CHARS: usize = 180;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NtfsVolume {
    id: String,
    label: String,
    total_bytes: u64,
    free_bytes: u64,
    cluster_size: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveredText {
    offset: u64,
    text: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanReport {
    volume_id: String,
    bytes_scanned: u64,
    fragments: Vec<RecoveredText>,
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
pub async fn scan_ntfs_free_space(volume_id: String) -> Result<ScanReport, String> {
    #[cfg(windows)]
    {
        tauri::async_runtime::spawn_blocking(move || windows::scan_ntfs_free_space(&volume_id))
            .await
            .map_err(|error| format!("Задача сканирования завершилась с ошибкой: {error}"))?
    }

    #[cfg(not(windows))]
    {
        let _ = volume_id;
        Err("Поиск по свободному пространству NTFS сейчас поддерживается только в Windows.".into())
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
    ) -> Result<(), String> {
        let remaining = MAX_SCAN_BYTES.saturating_sub(report.bytes_scanned);
        if remaining == 0 || report.fragments.len() >= MAX_FRAGMENTS {
            return Ok(());
        }

        let byte_count = cluster_count
            .checked_mul(cluster_size)
            .ok_or_else(|| "Размер свободного диапазона NTFS переполнен.".to_owned())?
            .min(remaining);
        if byte_count == 0 {
            return Ok(());
        }

        let offset = start_lcn
            .checked_mul(cluster_size)
            .ok_or_else(|| "Смещение кластера NTFS переполнено.".to_owned())?;
        let offset =
            i64::try_from(offset).map_err(|_| "Смещение тома слишком велико.".to_owned())?;
        let size =
            usize::try_from(byte_count).map_err(|_| "Размер чтения слишком велик.".to_owned())?;
        let mut data = vec![0u8; size];
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

        data.truncate(bytes_read as usize);
        if data.is_empty() {
            return Ok(());
        }

        collect_utf8_runs(&data, offset as u64, &mut report.fragments, seen);
        collect_utf16_runs(&data, offset as u64, &mut report.fragments, seen);
        report.bytes_scanned += bytes_read as u64;
        Ok(())
    }

    fn push_fragment(
        text: String,
        offset: u64,
        fragments: &mut Vec<RecoveredText>,
        seen: &mut HashSet<String>,
    ) {
        let text = text.trim();
        if fragments.len() >= MAX_FRAGMENTS || text.chars().count() < 24 {
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
            if fragments.len() >= MAX_FRAGMENTS {
                return;
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
            let character = char::from_u32(u32::from(value));
            if let Some(character) = character.filter(|character| {
                !character.is_control()
                    && (character.is_alphanumeric()
                        || character.is_whitespace()
                        || character.is_ascii_punctuation())
            }) {
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
            if fragments.len() >= MAX_FRAGMENTS {
                return;
            }
        }
        if !run.is_empty() {
            push_fragment(run, base_offset + run_offset as u64, fragments, seen);
        }
    }

    pub fn scan_ntfs_free_space(volume_id: &str) -> Result<ScanReport, String> {
        validate_volume_id(volume_id)?;
        let volume = get_install_ntfs_volume()?;
        if !volume.id.eq_ignore_ascii_case(volume_id) {
            return Err(format!(
                "Разрешено сканировать только NTFS-диск установки ({}).",
                volume.id
            ));
        }
        let handle = open_volume(&volume.id)?;
        let mut report = ScanReport {
            volume_id: volume.id.clone(),
            bytes_scanned: 0,
            fragments: Vec::new(),
        };
        let mut seen = HashSet::new();
        let mut next_lcn = 0u64;
        let mut pending_start = None;
        let mut pending_clusters = 0u64;
        let mut bitmap = vec![0u8; 64 * 1024];

        while report.bytes_scanned < MAX_SCAN_BYTES && report.fragments.len() < MAX_FRAGMENTS {
            let input_lcn = i64::try_from(next_lcn)
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
            let bit_count = available_bits.min(bitmap_size.saturating_sub(start_lcn));
            if bit_count == 0 {
                if let Some(run_start) = pending_start.take() {
                    read_free_run(
                        handle.0,
                        run_start,
                        pending_clusters,
                        volume.cluster_size,
                        &volume.id,
                        &mut report,
                        &mut seen,
                    )?;
                    pending_clusters = 0;
                }
                break;
            }

            if start_lcn != next_lcn {
                if let Some(run_start) = pending_start.take() {
                    read_free_run(
                        handle.0,
                        run_start,
                        pending_clusters,
                        volume.cluster_size,
                        &volume.id,
                        &mut report,
                        &mut seen,
                    )?;
                    pending_clusters = 0;
                }
            }

            for bit in 0..bit_count {
                let byte_index = 16 + (bit / 8) as usize;
                let free = bitmap[byte_index] & (1 << (bit % 8)) == 0;
                let lcn = start_lcn + bit;
                if free {
                    if pending_start.is_none() {
                        pending_start = Some(lcn);
                    }
                    pending_clusters += 1;
                } else if let Some(run_start) = pending_start.take() {
                    read_free_run(
                        handle.0,
                        run_start,
                        pending_clusters,
                        volume.cluster_size,
                        &volume.id,
                        &mut report,
                        &mut seen,
                    )?;
                    pending_clusters = 0;
                }

                if report.bytes_scanned >= MAX_SCAN_BYTES || report.fragments.len() >= MAX_FRAGMENTS
                {
                    break;
                }
            }

            next_lcn = start_lcn + bit_count;
            if next_lcn >= bitmap_size {
                break;
            }
        }

        if report.bytes_scanned < MAX_SCAN_BYTES && report.fragments.len() < MAX_FRAGMENTS {
            if let Some(run_start) = pending_start {
                read_free_run(
                    handle.0,
                    run_start,
                    pending_clusters,
                    volume.cluster_size,
                    &volume.id,
                    &mut report,
                    &mut seen,
                )?;
            }
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
    }
}
