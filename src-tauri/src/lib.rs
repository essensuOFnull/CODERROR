// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod disk_recovery;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(disk_recovery::ScanRegistry::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            disk_recovery::get_install_ntfs_volume,
            disk_recovery::scan_ntfs_free_space,
            disk_recovery::cancel_disk_scan,
            disk_recovery::list_worlds,
            disk_recovery::load_world,
            disk_recovery::delete_world
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
