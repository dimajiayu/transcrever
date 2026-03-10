//! Tauri commands exposed to the frontend.
//! These handle file validation, transcription invocation, and export.

use std::path::Path;
use tauri::command;

/// Allowed audio file extensions (lowercase).
const ALLOWED_EXTENSIONS: [&str; 4] = [".mp3", ".wav", ".m4a", ".mp4"];

/// Example command; replace with real commands (start_transcription, export_txt, export_docx).
#[command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Transcrever backend is ready.", name)
}

/// Result of validating an audio file path for transcription.
#[derive(serde::Serialize)]
pub struct ValidateAudioPathResult {
    pub valid: bool,
    pub error: Option<String>,
}

/// Validates that the given path exists, is a file, and has an allowed extension.
/// Frontend sends the path from the file picker or drag-and-drop (local path).
#[command]
pub fn validate_audio_path(path: String) -> ValidateAudioPathResult {
    let p = Path::new(&path);
    if !p.exists() {
        return ValidateAudioPathResult {
            valid: false,
            error: Some("Ficheiro não encontrado.".to_string()),
        };
    }
    if !p.is_file() {
        return ValidateAudioPathResult {
            valid: false,
            error: Some("O caminho não é um ficheiro.".to_string()),
        };
    }
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| format!(".{}", s.to_lowercase()))
        .unwrap_or_default();
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return ValidateAudioPathResult {
            valid: false,
            error: Some(format!(
                "Tipo não suportado ({}). Use .mp3, .wav, .m4a ou .mp4.",
                ext
            )),
        };
    }
    ValidateAudioPathResult {
        valid: true,
        error: None,
    }
}
