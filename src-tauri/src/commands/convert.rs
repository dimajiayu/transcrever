//! Convert M4A/MP4 to WAV via ffmpeg for better Whisper compatibility.
//! Writes to a temp file and returns its path; the frontend can then use it for transcription.
//! On macOS, GUI apps don't get the shell PATH, so we try common Homebrew paths if "ffmpeg" is not found.

use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::command;

const FFMPEG_NOT_FOUND_MSG: &str =
    "ffmpeg não encontrado. Instale-o (ex.: brew install ffmpeg) e tente novamente.";

/// Returns the path to the ffmpeg binary. Tries PATH first, then on macOS common Homebrew locations
/// (GUI apps launched from Finder don't inherit shell PATH).
fn resolve_ffmpeg() -> Option<PathBuf> {
    // Try PATH first (works in terminal / dev)
    if Command::new("ffmpeg").arg("-version").output().is_ok_and(|o| o.status.success()) {
        return Some(PathBuf::from("ffmpeg"));
    }
    #[cfg(target_os = "macos")]
    {
        for path in ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"] {
            if Path::new(path).exists() && Command::new(path).arg("-version").output().is_ok_and(|o| o.status.success()) {
                return Some(PathBuf::from(path));
            }
        }
    }
    #[cfg(target_os = "windows")]
    {
        // Optional: try common Windows install paths if needed
        let paths = [
            std::env::var("ProgramFiles").ok().map(|p| format!("{}\\ffmpeg\\bin\\ffmpeg.exe", p)),
            std::env::var("ProgramFiles(x86)").ok().map(|p| format!("{}\\ffmpeg\\bin\\ffmpeg.exe", p)),
        ];
        for path_opt in paths {
            if let Some(p) = path_opt {
                if Path::new(&p).exists() {
                    return Some(PathBuf::from(p));
                }
            }
        }
    }
    None
}

/// Converts the given audio file to WAV (44.1 kHz, 16-bit mono) using ffmpeg.
/// Returns the path to the temporary WAV file on success.
/// Requires ffmpeg to be installed (e.g. `brew install ffmpeg` on macOS).
#[command]
pub fn convert_audio_to_wav(input_path: String) -> Result<String, String> {
    let input = Path::new(&input_path);
    if !input.exists() {
        return Err("Ficheiro não encontrado.".to_string());
    }
    if !input.is_file() {
        return Err("O caminho não é um ficheiro.".to_string());
    }

    let ffmpeg = resolve_ffmpeg().ok_or_else(|| FFMPEG_NOT_FOUND_MSG.to_string())?;

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("converted");
    let temp_dir = std::env::temp_dir();
    let suffix = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string());
    let output_path = temp_dir.join(format!("transcrever_{}_{}.wav", stem, suffix));

    let status = Command::new(&ffmpeg)
        .args([
            "-y",
            "-i",
            input_path.as_str(),
            "-c:a",
            "pcm_s16le",
            "-ar",
            "44100",
            "-ac",
            "1",
            output_path.to_str().unwrap(),
        ])
        .output();

    match status {
        Ok(output) if output.status.success() => {
            if output_path.exists() {
                Ok(output_path.to_string_lossy().into_owned())
            } else {
                Err("Conversão concluída mas ficheiro não encontrado.".to_string())
            }
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let msg = if stderr.contains("ffmpeg: not found") || stderr.contains("No such file") {
                FFMPEG_NOT_FOUND_MSG.to_string()
            } else {
                stderr.lines().rev().take(3).collect::<Vec<_>>().join(" ")
            };
            Err(msg)
        }
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Err(FFMPEG_NOT_FOUND_MSG.to_string())
            } else {
                Err(format!("Erro ao executar ffmpeg: {}", e))
            }
        }
    }
}
