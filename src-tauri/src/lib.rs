//! Transcrever — offline desktop transcription app.
//! Tauri commands, transcription, and export logic are organized in submodules.

mod commands;
mod export;
mod transcription;
mod types;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::validate::validate_audio_file,
            commands::validate::validate_model_file,
            commands::convert::convert_audio_to_wav,
            commands::transcribe::transcribe_audio,
            commands::export_commands::export_txt,
            commands::export_commands::export_docx,
            commands::export_commands::save_converted_audio,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
