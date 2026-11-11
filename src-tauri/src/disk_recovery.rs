use serde::Serialize;

const MAX_SCAN_BYTES: u64 = 64 * 1024 * 1024;
const SCAN_CHUNK_BYTES: u64 = 8 * 1024 * 1024;
const MAX_BITMAP_SAMPLES: u64 = 64;
const MAX_FRAGMENTS: usize = 128;
const MAX_FRAGMENT_CHARS: usize = 180;
const MAX_IMAGE_BYTES: usize = 2 * 1024 * 1024;
const MAX_VIDEO_BYTES: usize = 6 * 1024 * 1024;
const MAX_MEDIA_BYTES: usize = 16 * 1024 * 1024;
const MAX_IMAGES: usize = 4;
const MAX_VIDEOS: usize = 2;

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
pub struct RecoveredMedia {
    offset: u64,
    mime_type: String,
    data_base64: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanReport {
    volume_id: String,
    bytes_scanned: u64,
    fragments: Vec<RecoveredText>,
    media: Vec<RecoveredMedia>,
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
        collections::hash_map::RandomState,
        ffi::OsStr,
        hash::{BuildHasher, Hasher},
        mem::size_of,
        os::windows::ffi::OsStrExt,
        path::{Component, Prefix},
        ptr::{null, null_mut},
        time::{SystemTime, UNIX_EPOCH},
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

    fn next_random(state: &mut u64) -> u64 {
        *state ^= *state >> 12;
        *state ^= *state << 25;
        *state ^= *state >> 27;
        state.wrapping_mul(0x2545_f491_4f6c_dd1d)
    }

    fn greatest_common_divisor(mut left: u64, mut right: u64) -> u64 {
        while right != 0 {
            let remainder = left % right;
            left = right;
            right = remainder;
        }
        left
    }

    fn bitmap_page_order(total_clusters: u64, bits_per_page: u64, seed: u64) -> Vec<u64> {
        if total_clusters == 0 || bits_per_page == 0 {
            return Vec::new();
        }

        let page_count = total_clusters.div_ceil(bits_per_page);
        let sample_count = page_count.min(MAX_BITMAP_SAMPLES);
        let mut state = if seed == 0 {
            0x9e37_79b9_7f4a_7c15
        } else {
            seed
        };
        let start = next_random(&mut state) % page_count;
        let stride = if page_count == 1 {
            1
        } else {
            let mut candidate = next_random(&mut state) % (page_count - 1) + 1;
            while greatest_common_divisor(candidate, page_count) != 1
                || (page_count > 3 && (candidate == 1 || candidate == page_count - 1))
            {
                candidate = candidate % (page_count - 1) + 1;
            }
            candidate
        };

        (0..sample_count)
            .map(|index| {
                ((u128::from(start) + u128::from(index) * u128::from(stride))
                    % u128::from(page_count)) as u64
            })
            .collect()
    }

    fn read_free_run(
        handle: HANDLE,
        start_lcn: u64,
        cluster_count: u64,
        cluster_size: u64,
        volume_id: &str,
        report: &mut ScanReport,
        seen: &mut HashSet<String>,
        media_bytes: &mut usize,
    ) -> Result<(), String> {
        let remaining = MAX_SCAN_BYTES.saturating_sub(report.bytes_scanned);
        if remaining == 0
            || (report.fragments.len() >= MAX_FRAGMENTS
                && report.media.len() >= MAX_IMAGES + MAX_VIDEOS)
        {
            return Ok(());
        }

        let byte_count = cluster_count
            .checked_mul(cluster_size)
            .ok_or_else(|| "Размер свободного диапазона NTFS переполнен.".to_owned())?
            .min(remaining);
        if byte_count == 0 {
            return Ok(());
        }

        let run_offset = start_lcn
            .checked_mul(cluster_size)
            .ok_or_else(|| "Смещение кластера NTFS переполнено.".to_owned())?;
        let mut run_read = 0u64;
        let mut tail = Vec::new();
        while run_read < byte_count
            && report.bytes_scanned < MAX_SCAN_BYTES
            && (report.fragments.len() < MAX_FRAGMENTS
                || report.media.len() < MAX_IMAGES + MAX_VIDEOS)
        {
            let chunk_size = usize::try_from(
                (byte_count - run_read)
                    .min(SCAN_CHUNK_BYTES)
                    .min(MAX_SCAN_BYTES - report.bytes_scanned),
            )
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
                break;
            }

            data.truncate(bytes_read as usize);
            let overlap = tail.len();
            let scan_offset = absolute_offset - overlap as u64;
            tail.extend_from_slice(&data);
            collect_utf8_runs(&tail, scan_offset, &mut report.fragments, seen);
            collect_utf16_runs(&tail, scan_offset, &mut report.fragments, seen);
            recover_media(&tail, scan_offset, overlap, report, media_bytes);
            let retained = tail.len().min(MAX_VIDEO_BYTES - 1);
            tail.drain(..tail.len() - retained);
            report.bytes_scanned += u64::from(bytes_read);
            run_read += u64::from(bytes_read);
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
        media_bytes: &mut usize,
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
                media_bytes,
            )?;
        }
        Ok(())
    }

    fn image_count(report: &ScanReport) -> usize {
        report
            .media
            .iter()
            .filter(|item| item.mime_type.starts_with("image/"))
            .count()
    }

    fn video_count(report: &ScanReport) -> usize {
        report
            .media
            .iter()
            .filter(|item| item.mime_type.starts_with("video/"))
            .count()
    }

    fn recover_media(
        data: &[u8],
        base_offset: u64,
        overlap: usize,
        report: &mut ScanReport,
        media_bytes: &mut usize,
    ) {
        let mut offset = 0usize;
        while offset < data.len() && *media_bytes < MAX_MEDIA_BYTES {
            let found = if image_count(report) < MAX_IMAGES {
                find_image(data, offset)
            } else {
                None
            }
            .or_else(|| {
                if video_count(report) < MAX_VIDEOS {
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
                if *media_bytes + length <= MAX_MEDIA_BYTES {
                    let bytes = &data[offset..offset + length];
                    report.media.push(RecoveredMedia {
                        offset: base_offset + offset as u64,
                        mime_type,
                        data_base64: encode_base64(bytes),
                    });
                    *media_bytes += length;
                    offset += length;
                    continue;
                }
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
            media: Vec::new(),
        };
        let mut seen = HashSet::new();
        let mut media_bytes = 0usize;
        let mut bitmap = vec![0u8; 64 * 1024];
        let bits_per_page =
            u64::try_from(bitmap.len() - 16).expect("bitmap buffer length fits in u64") * 8;
        let total_clusters = volume.total_bytes / volume.cluster_size;
        let mut random_seed = RandomState::new().build_hasher().finish()
            ^ SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos() as u64
            ^ u64::from(std::process::id());
        if random_seed == 0 {
            random_seed = 1;
        }
        let page_order = bitmap_page_order(total_clusters, bits_per_page, random_seed);

        for page in page_order {
            if report.bytes_scanned >= MAX_SCAN_BYTES
                || (report.fragments.len() >= MAX_FRAGMENTS
                    && report.media.len() >= MAX_IMAGES + MAX_VIDEOS)
            {
                break;
            }

            let page_lcn = page
                .checked_mul(bits_per_page)
                .ok_or_else(|| "Смещение карты кластеров переполнено.".to_owned())?;
            let input_lcn = i64::try_from(page_lcn)
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
                continue;
            }

            let mut free_run_start = None;
            let mut free_run_clusters = 0u64;
            let bitmap_bytes = usize::try_from(bit_count.div_ceil(8))
                .map_err(|_| "Размер карты кластеров слишком велик.".to_owned())?;
            for byte_index in 0..bitmap_bytes {
                let bit_offset = byte_index as u64 * 8;
                let bits_in_byte = (bit_count - bit_offset).min(8) as u8;
                let byte = bitmap[16 + byte_index];
                if bits_in_byte == 8 && byte == 0 {
                    if free_run_start.is_none() {
                        free_run_start = Some(start_lcn + bit_offset);
                    }
                    free_run_clusters += 8;
                } else if bits_in_byte == 8 && byte == u8::MAX {
                    flush_bitmap_run(
                        handle.0,
                        &mut free_run_start,
                        &mut free_run_clusters,
                        volume.cluster_size,
                        &volume.id,
                        &mut report,
                        &mut seen,
                        &mut media_bytes,
                    )?;
                } else {
                    for bit in 0..bits_in_byte {
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
                                &mut media_bytes,
                            )?;
                        }
                    }
                }

                if report.bytes_scanned >= MAX_SCAN_BYTES
                    || (report.fragments.len() >= MAX_FRAGMENTS
                        && report.media.len() >= MAX_IMAGES + MAX_VIDEOS)
                {
                    break;
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
                &mut media_bytes,
            )?;
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
        fn limits_recovered_image_count() {
            let image = b"\xff\xd8\xff\xd9";
            let data = image.repeat(MAX_IMAGES + 2);
            let mut report = ScanReport {
                volume_id: "C:".into(),
                bytes_scanned: data.len() as u64,
                fragments: Vec::new(),
                media: Vec::new(),
            };
            let mut media_bytes = 0;

            recover_media(&data, 0, 0, &mut report, &mut media_bytes);

            assert_eq!(report.media.len(), MAX_IMAGES);
            assert_eq!(media_bytes, MAX_IMAGES * image.len());
        }

        #[test]
        fn samples_distinct_random_bitmap_pages() {
            let order = bitmap_page_order(100_000, 100, 12345);
            let unique = order.iter().copied().collect::<HashSet<_>>();
            let first_step = order[1].abs_diff(order[0]);

            assert_eq!(order.len(), MAX_BITMAP_SAMPLES as usize);
            assert_eq!(unique.len(), order.len());
            assert!(order.iter().all(|page| *page < 1_000));
            assert!(first_step > 1 && first_step < 999);
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
                fragments: Vec::new(),
                media: Vec::new(),
            };
            let mut media_bytes = 0;

            recover_media(&first_chunk[..], 0, 0, &mut report, &mut media_bytes);
            recover_media(
                &combined,
                0,
                first_chunk.len(),
                &mut report,
                &mut media_bytes,
            );

            assert_eq!(report.media.len(), 1);
            assert_eq!(report.media[0].offset, 0);
            assert_eq!(report.media[0].data_base64, "/9j/2Q==");
        }
    }
}
