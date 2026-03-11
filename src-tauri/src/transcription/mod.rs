//! Transcription logic: invoke bundled whisper.cpp and parse output.
//! Binary is bundled; model path is provided by the user at runtime.

use std::path::{Path, PathBuf};
use std::process::Command;

use tauri::path::BaseDirectory;
use tauri::Manager;
use tauri::AppHandle;

/// Default filename for the bundled whisper binary (whisper.cpp CLI; .exe on Windows).
#[cfg(target_os = "windows")]
const WHISPER_BINARY_NAME: &str = "whisper-cli.exe";
#[cfg(not(target_os = "windows"))]
const WHISPER_BINARY_NAME: &str = "whisper-cli";

/// Language code for Portuguese.
const LANGUAGE_CODE: &str = "pt";

/// Errors that can occur during transcription.
#[derive(Debug)]
pub enum TranscriptionError {
    ResourceNotFound(String),
    SpawnFailed(String),
    ProcessError {
        stdout: String,
        stderr: String,
    },
    EmptyOutput,
}

impl std::fmt::Display for TranscriptionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TranscriptionError::ResourceNotFound(s) => write!(f, "Recurso não encontrado: {}", s),
            TranscriptionError::SpawnFailed(s) => write!(f, "Erro ao iniciar transcrição: {}", s),
            TranscriptionError::ProcessError { stdout, stderr } => {
                let mut msg = stderr.clone();
                if !stdout.is_empty() {
                    msg.push_str(" | stdout: ");
                    msg.push_str(stdout.as_str());
                }
                write!(f, "Erro do motor de transcrição: {}", msg)
            }
            TranscriptionError::EmptyOutput => write!(f, "Transcrição vazia."),
        }
    }
}

/// Resolves the path to the bundled whisper binary.
/// In dev (debug build) uses src-tauri/resources/; in release uses the app bundle resource dir.
fn resolve_whisper_binary(app: &AppHandle) -> Result<PathBuf, TranscriptionError> {
    let path = if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources").join(WHISPER_BINARY_NAME)
    } else {
        app.path()
            .resolve(WHISPER_BINARY_NAME, BaseDirectory::Resource)
            .map_err(|_| {
                TranscriptionError::ResourceNotFound(format!(
                    "Binário do Whisper não encontrado (esperado: {}).",
                    WHISPER_BINARY_NAME
                ))
            })?
    };
    if !path.exists() {
        return Err(TranscriptionError::ResourceNotFound(format!(
            "Binário não encontrado em {}. Coloque {} em src-tauri/resources/ e faça chmod +x.",
            path.display(),
            WHISPER_BINARY_NAME
        )));
    }
    Ok(path)
}

/// Runs transcription on the given audio file using the bundled whisper.cpp binary.
/// Uses the user-selected model path and Portuguese ("pt") as the transcription language.
/// Returns the transcript text on success.
pub fn transcribe(
    audio_path: &Path,
    model_path: &Path,
    app: &AppHandle,
) -> Result<String, TranscriptionError> {
    let binary = resolve_whisper_binary(app)?;
    if !model_path.exists() {
        return Err(TranscriptionError::ResourceNotFound(format!(
            "Modelo não encontrado em {}.",
            model_path.display()
        )));
    }
    if !model_path.is_file() {
        return Err(TranscriptionError::ResourceNotFound(
            "O caminho do modelo não é um ficheiro.".to_string(),
        ));
    }

    // Spawn the CLI; on "No such file or directory" the binary path may be wrong or the binary may be wrong architecture (e.g. x86_64 on arm64 without Rosetta)
    let output = Command::new(&binary)
        .arg("-m")
        .arg(model_path)
        .arg("-f")
        .arg(audio_path)
        .arg("-l")
        .arg(LANGUAGE_CODE)
        .output()
        .map_err(|e| {
            let msg = e.to_string();
            let hint = if msg.contains("No such file or directory") {
                format!(
                    " {} Use o binário whisper-cli (não main) em src-tauri/resources/ e faça chmod +x. Em Mac com Apple Silicon, use um binário arm64 ou instale Rosetta para x86_64.",
                    msg
                )
            } else {
                msg
            };
            TranscriptionError::SpawnFailed(hint)
        })?;

    let stdout_str = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr_str = String::from_utf8_lossy(&output.stderr).into_owned();

    if !output.status.success() {
        return Err(TranscriptionError::ProcessError {
            stdout: stdout_str,
            stderr: stderr_str,
        });
    }

    let text = parse_transcript_stdout(&stdout_str);
    if text.is_empty() {
        return Err(TranscriptionError::EmptyOutput);
    }

    Ok(text)
}

/// Parses whisper.cpp stdout into plain transcript text.
/// Trims whitespace and removes common log/header lines for a clean MVP output.
fn parse_transcript_stdout(stdout: &str) -> String {
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    // whisper.cpp main can print loading messages; the actual transcript is typically the last
    // meaningful block. For MVP we return the full stdout trimmed (user sees one block of text).
    trimmed.to_string()
}
