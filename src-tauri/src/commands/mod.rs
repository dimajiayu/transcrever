//! Tauri commands exposed to the frontend.
//! These handle file validation, transcription invocation, and export.

use tauri::command;

/// Example command; replace with real commands (validate_audio, start_transcription, export_txt, export_docx).
#[command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Transcrever backend is ready.", name)
}
