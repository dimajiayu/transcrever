//! Transcription logic: invoke bundled whisper.cpp and parse output.
//! Binary is bundled; model path is provided by the user at runtime.
//! Produces both plain transcript text and timestamped segments for sync playback.

use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Deserialize;
use tauri::path::BaseDirectory;
use tauri::Manager;
use tauri::AppHandle;

use crate::types::TranscriptSegment;

/// Filename of the whisper binary (whisper.cpp CLI; .exe on Windows).
#[cfg(target_os = "windows")]
const WHISPER_BINARY_NAME: &str = "whisper-cli.exe";
#[cfg(not(target_os = "windows"))]
const WHISPER_BINARY_NAME: &str = "whisper-cli";

/// Path relative to BaseDirectory::Resource in the built app.
/// Tauri preserves folder structure (bundle "resources/*" → Contents/Resources/resources/).
#[cfg(target_os = "windows")]
const WHISPER_BINARY_RESOURCE_PATH: &str = "resources/whisper-cli.exe";
#[cfg(not(target_os = "windows"))]
const WHISPER_BINARY_RESOURCE_PATH: &str = "resources/whisper-cli";

/// Language code for Portuguese.
const LANGUAGE_CODE: &str = "pt";

/// Result of transcription: full text and segments with timestamps (in seconds).
pub struct TranscribeOutput {
    pub text: String,
    pub segments: Vec<TranscriptSegment>,
}

/// Flexible JSON segment shape from whisper.cpp (-oj). Different versions use different field names.
#[derive(Debug, Deserialize)]
struct JsonSegment {
    #[serde(default)]
    start: Option<f64>,
    #[serde(default)]
    end: Option<f64>,
    #[serde(rename = "t0", default)]
    t0_cs: Option<u64>,
    #[serde(rename = "t1", default)]
    t1_cs: Option<u64>,
    #[serde(default)]
    text: String,
}

#[derive(Debug, Deserialize)]
struct WhisperJson {
    #[serde(default)]
    transcription: Option<Vec<JsonSegment>>,
    #[serde(default)]
    segments: Option<Vec<JsonSegment>>,
}

/// Errors that can occur during transcription.
#[derive(Debug)]
pub enum TranscriptionError {
    ResourceNotFound(String),
    SpawnFailed(String),
    ProcessError {
        stdout: String,
        stderr: String,
    },
    /// Process succeeded but no transcript text was produced (e.g. unsupported format, silent audio, or output went to file instead of stdout).
    EmptyOutput { stdout: String, stderr: String },
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
            TranscriptionError::EmptyOutput { stdout, stderr } => {
                write!(
                    f,
                    "Transcrição vazia. O áudio pode estar em silêncio, ser muito curto ou estar num formato que o Whisper não processou (ex.: M4A pode precisar de conversão para WAV 16 kHz). Saída do Whisper — stderr: {} | stdout: {}",
                    if stderr.is_empty() { "(vazio)" } else { stderr.as_str() },
                    if stdout.is_empty() { "(vazio)" } else { stdout.as_str() }
                )
            }
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
            .resolve(WHISPER_BINARY_RESOURCE_PATH, BaseDirectory::Resource)
            .map_err(|_| {
                TranscriptionError::ResourceNotFound(format!(
                    "Binário do Whisper não encontrado (esperado: {}).",
                    WHISPER_BINARY_NAME
                ))
            })?
    };
    if !path.exists() {
        let hint = if cfg!(debug_assertions) {
            format!(
                "Coloque {} em src-tauri/resources/ e faça chmod +x.",
                WHISPER_BINARY_NAME
            )
        } else {
            format!(
                "O binário não foi incluído na instalação. Reconstrua a aplicação (npm run tauri:build) com {} em src-tauri/resources/ e reinstale.",
                WHISPER_BINARY_NAME
            )
        };
        return Err(TranscriptionError::ResourceNotFound(format!(
            "Binário não encontrado em {}. {}",
            path.display(),
            hint
        )));
    }
    Ok(path)
}

/// Runs transcription on the given audio file using the bundled whisper.cpp binary.
/// Uses the user-selected model path and Portuguese ("pt") as the transcription language.
/// Returns both plain text and timestamped segments. Requests JSON output (-oj -of -) for segments;
/// if JSON is not available or parsing fails, falls back to plain text and a single segment.
pub fn transcribe(
    audio_path: &Path,
    model_path: &Path,
    app: &AppHandle,
) -> Result<TranscribeOutput, TranscriptionError> {
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

    // 1) Try JSON (-oj -of -) for timestamped segments.
    let output = Command::new(&binary)
        .arg("-m")
        .arg(model_path)
        .arg("-f")
        .arg(audio_path)
        .arg("-l")
        .arg(LANGUAGE_CODE)
        .arg("-oj")
        .arg("-of")
        .arg("-")
        .arg("-np")
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

    if output.status.success() {
        if let Some(segments) = parse_json_segments(&stdout_str) {
            if !segments.is_empty() {
                let text = segments.iter().map(|s| s.text.as_str()).collect::<Vec<_>>().join(" ");
                return Ok(TranscribeOutput { text, segments });
            }
        }
    }

    // 2) Try SRT (-osrt -of -) for timestamped segments.
    let output_srt = Command::new(&binary)
        .arg("-m")
        .arg(model_path)
        .arg("-f")
        .arg(audio_path)
        .arg("-l")
        .arg(LANGUAGE_CODE)
        .arg("-osrt")
        .arg("-of")
        .arg("-")
        .arg("-np")
        .output()
        .ok();

    if let Some(ref out) = output_srt {
        if out.status.success() {
            let srt_stdout = String::from_utf8_lossy(&out.stdout);
            if let Some(segments) = parse_srt(srt_stdout.as_ref()) {
                if !segments.is_empty() {
                    let text = segments.iter().map(|s| s.text.as_str()).collect::<Vec<_>>().join(" ");
                    return Ok(TranscribeOutput { text, segments });
                }
            }
        }
    }

    // 3) Fallback: plain text (-otxt -of -), split by sentences into segments (start/end 0,0; frontend will distribute by duration).
    let output_txt = Command::new(&binary)
        .arg("-m")
        .arg(model_path)
        .arg("-f")
        .arg(audio_path)
        .arg("-l")
        .arg(LANGUAGE_CODE)
        .arg("-otxt")
        .arg("-of")
        .arg("-")
        .arg("-np")
        .output()
        .map_err(|e| TranscriptionError::SpawnFailed(e.to_string()))?;

    let txt_stdout = String::from_utf8_lossy(&output_txt.stdout).into_owned();
    if !output_txt.status.success() {
        return Err(TranscriptionError::ProcessError {
            stdout: txt_stdout,
            stderr: String::from_utf8_lossy(&output_txt.stderr).into_owned(),
        });
    }

    let text = parse_transcript_stdout(&txt_stdout);
    if text.is_empty() {
        return Err(TranscriptionError::EmptyOutput {
            stdout: stdout_str,
            stderr: stderr_str,
        });
    }

    let segments = split_into_sentence_segments(&text);
    Ok(TranscribeOutput {
        text: text.clone(),
        segments,
    })
}

/// Parses SRT subtitle format from whisper.cpp (-osrt). Returns None if parsing fails.
fn parse_srt(s: &str) -> Option<Vec<TranscriptSegment>> {
    use std::collections::VecDeque;
    let mut segments = Vec::new();
    let mut lines: VecDeque<&str> = s.lines().collect();
    while !lines.is_empty() {
        // Optional index line (digits)
        if let Some(first) = lines.front() {
            if first.trim().chars().all(|c| c.is_ascii_digit()) {
                lines.pop_front();
            }
        }
        let time_line = lines.pop_front()?.trim();
        // Format: 00:00:00,000 --> 00:00:02,500
        let (start_sec, end_sec) = parse_srt_timestamp_line(time_line)?;
        let mut text_lines = Vec::new();
        while let Some(line) = lines.front() {
            let t = line.trim();
            if t.is_empty() {
                lines.pop_front();
                break;
            }
            text_lines.push(t);
            lines.pop_front();
        }
        let text = text_lines.join(" ").trim().to_string();
        if !text.is_empty() {
            segments.push(TranscriptSegment {
                start: start_sec,
                end: end_sec,
                text,
            });
        }
    }
    if segments.is_empty() {
        return None;
    }
    Some(segments)
}

fn parse_srt_timestamp_line(line: &str) -> Option<(f64, f64)> {
    let arrow = line.find("-->")?;
    let start_str = line[..arrow].trim();
    let end_str = line[arrow + 3..].trim();
    let start = parse_srt_timestamp(start_str)?;
    let end = parse_srt_timestamp(end_str)?;
    Some((start, end))
}

fn parse_srt_timestamp(s: &str) -> Option<f64> {
    let s = s.trim().replace(',', ".");
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() != 3 {
        return None;
    }
    let h: f64 = parts[0].trim().parse().ok()?;
    let m: f64 = parts[1].trim().parse().ok()?;
    let sec_ms: f64 = parts[2].trim().parse().ok()?;
    Some(h * 3600.0 + m * 60.0 + sec_ms)
}

/// Splits transcript into segments by sentence boundaries (.!? and newlines). Each segment has start=0, end=0;
/// the frontend can distribute them proportionally when duration is known.
fn split_into_sentence_segments(text: &str) -> Vec<TranscriptSegment> {
    let text = text.trim();
    if text.is_empty() {
        return vec![];
    }
    let mut segments = Vec::new();
    let mut current = String::new();
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        current.push(c);
        let at_sentence_end = matches!(c, '.' | '!' | '?' | '\n');
        let next_whitespace = chars.peek().map(|&c| c.is_whitespace()).unwrap_or(true);
        if at_sentence_end && next_whitespace {
            let trimmed = current.trim().to_string();
            if !trimmed.is_empty() {
                segments.push(TranscriptSegment {
                    start: 0.0,
                    end: 0.0,
                    text: trimmed,
                });
            }
            current.clear();
        }
    }
    let trimmed = current.trim().to_string();
    if !trimmed.is_empty() {
        segments.push(TranscriptSegment {
            start: 0.0,
            end: 0.0,
            text: trimmed,
        });
    }
    if segments.is_empty() {
        segments.push(TranscriptSegment {
            start: 0.0,
            end: 0.0,
            text: text.to_string(),
        });
    }
    segments
}

/// Parses whisper.cpp JSON output (-oj) into segments. Returns None if parsing fails.
fn parse_json_segments(stdout: &str) -> Option<Vec<TranscriptSegment>> {
    let root: WhisperJson = serde_json::from_str(stdout.trim()).ok()?;
    let segs = root.transcription.or(root.segments)?;
    let mut segments = Vec::with_capacity(segs.len());
    for s in segs {
        let (start, end) = if let (Some(a), Some(b)) = (s.start, s.end) {
            (a, b)
        } else if let (Some(t0), Some(t1)) = (s.t0_cs, s.t1_cs) {
            (t0 as f64 / 100.0, t1 as f64 / 100.0)
        } else {
            continue;
        };
        let text = s.text.trim().to_string();
        if !text.is_empty() {
            segments.push(TranscriptSegment { start, end, text });
        }
    }
    if segments.is_empty() {
        return None;
    }
    Some(segments)
}

/// Parses whisper.cpp plain stdout into a single string.
fn parse_transcript_stdout(stdout: &str) -> String {
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    trimmed.to_string()
}
