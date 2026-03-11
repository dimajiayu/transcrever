//! Audio and model file validation commands.

use std::path::Path;
use tauri::command;

use crate::types::ValidationResult;

/// Allowed audio file extensions (lowercase).
const ALLOWED_AUDIO_EXTENSIONS: [&str; 4] = [".mp3", ".wav", ".m4a", ".mp4"];

/// Allowed model file extension (whisper.cpp ggml models).
const MODEL_EXTENSION: &str = ".bin";

/// Validates that the given path exists, is a file, and has an allowed audio extension.
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
    if !ALLOWED_AUDIO_EXTENSIONS.contains(&ext.as_str()) {
        return ValidationResult::err(format!(
            "Tipo não suportado ({}). Use .mp3, .wav, .m4a ou .mp4.",
            ext
        ));
    }
    ValidationResult::ok()
}

/// Validates that the given path exists, is a file, and has the .bin extension (Whisper ggml model).
#[command]
pub fn validate_model_file(file_path: String) -> ValidationResult {
    let p = Path::new(&file_path);
    if !p.exists() {
        return ValidationResult::err("Ficheiro do modelo não encontrado.");
    }
    if !p.is_file() {
        return ValidationResult::err("O caminho do modelo não é um ficheiro.");
    }
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| format!(".{}", s.to_lowercase()));
    if ext.as_deref() != Some(MODEL_EXTENSION) {
        return ValidationResult::err(format!(
            "O modelo deve ser um ficheiro .bin (Whisper ggml). Recebido: {}",
            ext.as_deref().unwrap_or("sem extensão")
        ));
    }
    ValidationResult::ok()
}
