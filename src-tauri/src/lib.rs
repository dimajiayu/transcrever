//! Transcrever — offline desktop transcription app.
//! Tauri commands, transcription, and export logic are organized in submodules.

mod commands;
mod export;
mod transcription;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            // Future: commands::validate_audio, commands::start_transcription, commands::export_txt, commands::export_docx
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
