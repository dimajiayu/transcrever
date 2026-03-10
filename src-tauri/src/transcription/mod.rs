//! Transcription logic: invoke bundled whisper.cpp and parse output.
//! Uses resources from the app bundle (binary + model).

use std::path::Path;
use std::process::Command;

use tauri::path::BaseDirectory;
use tauri::Manager;
use tauri::AppHandle;

/// Default filename for the bundled whisper binary (no extension on Unix; .exe on Windows).
#[cfg(target_os = "windows")]
const WHISPER_BINARY_NAME: &str = "main.exe";
#[cfg(not(target_os = "windows"))]
const WHISPER_BINARY_NAME: &str = "main";

/// Default model filename in resources (e.g. ggml-base.bin).
const DEFAULT_MODEL_NAME: &str = "ggml-base.bin";

/// Language code for Portuguese.
const LANGUAGE_CODE: &str = "pt";

/// Errors that can occur during transcription.
#[derive(Debug)]
pub enum TranscriptionError {
    ResourceNotFound(String),
    SpawnFailed(String),
    ProcessError { stderr: String },
    EmptyOutput,
}

impl std::fmt::Display for TranscriptionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TranscriptionError::ResourceNotFound(s) => write!(f, "Recurso não encontrado: {}", s),
            TranscriptionError::SpawnFailed(s) => write!(f, "Erro ao iniciar transcrição: {}", s),
            TranscriptionError::ProcessError { stderr } => {
                write!(f, "Erro do motor de transcrição: {}", stderr)
            }
            TranscriptionError::EmptyOutput => write!(f, "Transcrição vazia."),
        }
    }
}

/// Resolves the path to the bundled whisper binary.
fn resolve_whisper_binary(app: &AppHandle) -> Result<std::path::PathBuf, TranscriptionError> {
    app.path()
        .resolve(WHISPER_BINARY_NAME, BaseDirectory::Resource)
        .map_err(|_| {
            TranscriptionError::ResourceNotFound(format!(
                "Binário do Whisper não encontrado (esperado: {}). Coloque o executável em src-tauri/resources/.",
                WHISPER_BINARY_NAME
            ))
        })
}

/// Resolves the path to the bundled model file.
fn resolve_model_path(app: &AppHandle) -> Result<std::path::PathBuf, TranscriptionError> {
    app.path()
        .resolve(DEFAULT_MODEL_NAME, BaseDirectory::Resource)
        .map_err(|_| {
            TranscriptionError::ResourceNotFound(format!(
                "Modelo não encontrado (esperado: {}). Coloque o ficheiro em src-tauri/resources/.",
                DEFAULT_MODEL_NAME
            ))
        })
}

/// Runs transcription on the given audio file using the bundled whisper.cpp binary.
/// Uses Portuguese ("pt") as the transcription language.
/// Returns the transcript text on success.
pub fn transcribe(audio_path: &Path, app: &AppHandle) -> Result<String, TranscriptionError> {
    let binary = resolve_whisper_binary(app)?;
    let model = resolve_model_path(app)?;

    let output = Command::new(&binary)
        .arg("-m")
        .arg(model)
        .arg("-f")
        .arg(audio_path)
        .arg("-l")
        .arg(LANGUAGE_CODE)
        .output()
        .map_err(|e| TranscriptionError::SpawnFailed(e.to_string()))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(TranscriptionError::ProcessError {
            stderr: stderr.into_owned(),
        });
    }

    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if text.is_empty() {
        return Err(TranscriptionError::EmptyOutput);
    }

    Ok(text)
}
