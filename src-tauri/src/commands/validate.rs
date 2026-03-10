//! Audio file validation command.

use std::path::Path;
use tauri::command;

use crate::types::ValidationResult;

/// Allowed audio file extensions (lowercase).
const ALLOWED_EXTENSIONS: [&str; 4] = [".mp3", ".wav", ".m4a", ".mp4"];

/// Validates that the given path exists, is a file, and has an allowed extension.
/// Frontend sends the path from the file picker or drag-and-drop.
#[command]
pub fn validate_audio_file(file_path: String) -> ValidationResult {
    let p = Path::new(&file_path);
    if !p.exists() {
        return ValidationResult::err("Ficheiro não encontrado.");
    }
    if !p.is_file() {
        return ValidationResult::err("O caminho não é um ficheiro.");
    }
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| format!(".{}", s.to_lowercase()))
        .unwrap_or_default();
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return ValidationResult::err(format!(
            "Tipo não suportado ({}). Use .mp3, .wav, .m4a ou .mp4.",
            ext
        ));
    }
    ValidationResult::ok()
}
