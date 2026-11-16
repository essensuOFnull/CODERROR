mod disk_recovery;

use std::sync::Mutex;
use tauri::{LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SetWindowPos,
};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct WorldCreationRequest {
    name: String,
    seed: u32,
}

#[derive(Default)]
struct StartupWorldCreation(Mutex<Option<WorldCreationRequest>>);

const OVERLAY_LABEL: &str = "glitch-frame";
/// Отступ рамки в логических пикселях.
const PADDING: f64 = 64.0;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn request_world_generation_elevation(
    app: tauri::AppHandle,
    world_name: String,
    seed: u32,
) -> Result<bool, String> {
    let name = disk_recovery::validate_world_name(&world_name)?.to_owned();

    #[cfg(windows)]
    {
        if windows::is_elevated() {
            return Ok(true);
        }
        windows::relaunch_elevated(&name, seed)?;
        app.exit(0);
        Ok(false)
    }

    #[cfg(not(windows))]
    {
        let _ = (app, name, seed);
        Err("Создание мира с чтением NTFS поддерживается только в Windows.".into())
    }
}

#[tauri::command]
fn take_startup_world_creation(
    request: tauri::State<'_, StartupWorldCreation>,
) -> Result<Option<WorldCreationRequest>, String> {
    request
        .0
        .lock()
        .map_err(|error| format!("Не удалось получить параметры создания мира: {error}"))
        .map(|mut request| request.take())
}

fn startup_world_creation() -> Option<WorldCreationRequest> {
    let mut args = std::env::args_os().skip(1);
    while let Some(argument) = args.next() {
        if argument == "--coderror-create-world" {
            let name = args.next()?.into_string().ok()?;
            let seed = args.next()?.into_string().ok()?.parse().ok()?;
            return Some(WorldCreationRequest { name, seed });
        }
    }
    None
}

#[cfg(windows)]
mod windows {
    use std::{ffi::OsStr, os::windows::ffi::OsStrExt, ptr::null_mut};
    use windows_sys::Win32::UI::Shell::{IsUserAnAdmin, ShellExecuteW};
    use windows_sys::Win32::{
        Foundation::{ERROR_CANCELLED, GetLastError},
        UI::WindowsAndMessaging::SW_SHOWNORMAL,
    };

    fn wide(value: &OsStr) -> Vec<u16> {
        value.encode_wide().chain(Some(0)).collect()
    }

    fn quote_argument(argument: &str) -> String {
        let mut quoted = String::from("\"");
        let mut backslashes = 0;
        for character in argument.chars() {
            match character {
                '\\' => backslashes += 1,
                '"' => {
                    quoted.push_str(&"\\".repeat(backslashes * 2 + 1));
                    quoted.push('"');
                    backslashes = 0;
                }
                _ => {
                    quoted.push_str(&"\\".repeat(backslashes));
                    quoted.push(character);
                    backslashes = 0;
                }
            }
        }
        quoted.push_str(&"\\".repeat(backslashes * 2));
        quoted.push('"');
        quoted
    }

    pub fn is_elevated() -> bool {
        unsafe { IsUserAnAdmin() != 0 }
    }

    pub fn relaunch_elevated(name: &str, seed: u32) -> Result<(), String> {
        let executable = std::env::current_exe()
            .map_err(|error| format!("Не удалось определить путь к приложению: {error}"))?;
        let working_directory = std::env::current_dir()
            .map_err(|error| format!("Не удалось определить рабочую папку: {error}"))?;
        let parameters = format!("--coderror-create-world {} {}", quote_argument(name), seed);
        let operation = wide(OsStr::new("runas"));
        let executable_wide = wide(executable.as_os_str());
        let parameters_wide = wide(OsStr::new(&parameters));
        let working_directory_wide = wide(working_directory.as_os_str());

        unsafe { windows_sys::Win32::Foundation::SetLastError(0) };
        let result = unsafe {
            ShellExecuteW(
                null_mut(),
                operation.as_ptr(),
                executable_wide.as_ptr(),
                parameters_wide.as_ptr(),
                working_directory_wide.as_ptr(),
                SW_SHOWNORMAL,
            )
        };
        let error = unsafe { GetLastError() };
        if error == ERROR_CANCELLED || result as usize == ERROR_CANCELLED as usize {
            return Err("Запрос прав администратора отменён.".into());
        }
        if result as usize > 32 {
            return Ok(());
        }

        let error = if error == 0 {
            result as usize
        } else {
            error as usize
        };
        Err(format!(
            "Не удалось перезапустить приложение с правами администратора (код ошибки {error})."
        ))
    }
}

#[cfg(windows)]
fn place_overlay_below_main(app: &tauri::AppHandle) {
    let Some(main) = app.get_webview_window("main") else { return; };
    let Some(overlay) = app.get_webview_window(OVERLAY_LABEL) else { return; };
    
    let Ok(main_hwnd) = main.hwnd() else { return; };
    let Ok(overlay_hwnd) = overlay.hwnd() else { return; };

    // В windows-sys HWND — это просто указатель (isize),
    // поэтому Some() не нужен.
    unsafe {
        let _ = SetWindowPos(
            overlay_hwnd.0, // Приводим тип к сырому указателю
            main_hwnd.0,    // Второй аргумент — тоже HWND, без Option
            0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );
    }
}

#[cfg(not(windows))]
fn place_overlay_below_main(_app: &tauri::AppHandle) {}

/// Вычисляет логические координаты и размеры для оверлея.
fn get_overlay_geometry(
    scale: f64,
    outer_pos: tauri::PhysicalPosition<i32>,
    inner_pos: tauri::PhysicalPosition<i32>,
    inner_size: tauri::PhysicalSize<u32>,
) -> (f64, f64, f64, f64) {
    // Переводим всё в логические пиксели
    let outer_y = outer_pos.y as f64 / scale;
    let inner_x = inner_pos.x as f64 / scale;
    let inner_y = inner_pos.y as f64 / scale;
    let inner_w = inner_size.width as f64 / scale;
    let inner_h = inner_size.height as f64 / scale;

    // X и Ширина: по видимой части контента (inner)
    let x = inner_x - PADDING;
    let w = inner_w + PADDING * 2.0;

    // Y: по самому верху окна (outer), чтобы захватить титлбар
    let y = outer_y - PADDING;

    // Высота: от верхней внешней границы (outer_y) до нижней внутренней (inner_y + inner_h)
    let h = (inner_y + inner_h) - outer_y + PADDING * 2.0;

    (x, y, w, h)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(disk_recovery::ScanRegistry::default())
        .manage(StartupWorldCreation(Mutex::new(startup_world_creation())))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            request_world_generation_elevation,
            take_startup_world_creation,
            disk_recovery::get_install_ntfs_volume,
            disk_recovery::scan_ntfs_free_space,
            disk_recovery::cancel_disk_scan,
            disk_recovery::list_worlds,
            disk_recovery::load_world,
            disk_recovery::delete_world
        ])
        .setup(|app| {
            let main_window = app
                .get_webview_window("main")
                .expect("main window not found");

            // Достаем все нужные метрики
            let scale = main_window.scale_factor()?;
            let outer_pos = main_window.outer_position()?;
            let inner_pos = main_window.inner_position()?;
            let inner_size = main_window.inner_size()?;

            // Считаем позицию и размер
            let (x, y, w, h) = get_overlay_geometry(scale, outer_pos, inner_pos, inner_size);

            let overlay = WebviewWindowBuilder::new(
                app,
                OVERLAY_LABEL,
                WebviewUrl::App("overlay.html".into()),
            )
            .title("Glitch Frame")
            .position(x, y)
            .inner_size(w, h)
            .decorations(false)
            .transparent(true)
            .skip_taskbar(true)
            .focused(false)
            .resizable(false)
            .shadow(false)
            .visible(false)
            .build()?;

            overlay.set_ignore_cursor_events(true)?;
            overlay.show()?;

            // Ставим оверлей под главным окном уже после show() — так надёжнее
            place_overlay_below_main(app.handle());

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            // Главное окно закрылось — закрываем и оверлей, иначе
            // Tauri не завершит приложение (второе окно ещё живо).
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(overlay) = window.app_handle().get_webview_window(OVERLAY_LABEL) {
                    let _ = overlay.close();
                }
                return;
            }

            let Some(overlay) = window.app_handle().get_webview_window(OVERLAY_LABEL) else {
                return;
            };

            // Синхронизируем границы
            if let (Ok(scale), Ok(outer_pos), Ok(inner_pos), Ok(inner_size)) = (
                window.scale_factor(),
                window.outer_position(),
                window.inner_position(),
                window.inner_size(),
            ) {
                let (x, y, w, h) = get_overlay_geometry(scale, outer_pos, inner_pos, inner_size);
                
                let _ = overlay.set_position(LogicalPosition::new(x, y));
                let _ = overlay.set_size(LogicalSize::new(w, h));
            }

            // Поддерживаем Z-порядок при любом событии (перетаскивание,
            // ресайз, смена фокуса и т.д.), чтобы оверлей не «выпрыгивал» наверх.
            if matches!(
                event,
                tauri::WindowEvent::Moved(_)
                    | tauri::WindowEvent::Resized(_)
                    | tauri::WindowEvent::Focused(_)
            ) {
                place_overlay_below_main(window.app_handle());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}