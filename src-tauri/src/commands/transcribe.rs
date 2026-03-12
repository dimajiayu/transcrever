//! Transcription command: invokes bundled whisper.cpp.
//! On macOS, tries whisper-accelerate first and falls back to whisper-portable on runtime failure.
//! Runs the blocking work in a thread pool so the UI stays responsive.

use std::path::Path;
use tauri::command;

use crate::transcription;
use crate::types::TranscriptResult;

/// Runs transcription on the given audio file using the bundled whisper binary (or accelerate then portable on macOS).
/// Uses Portuguese ("pt") as the language. Returns plain text, segments, and engine/fallback metadata.
#[command]
pub async fn transcribe_audio(
    app: tauri::AppHandle,
    audio_path: String,
    model_path: String,
) -> TranscriptResult {
    let result = tauri::async_runtime::spawn_blocking(move || {
        transcription::transcribe(
            Path::new(&audio_path),
            Path::new(&model_path),
            &app,
        )
    })
    .await;

    match result {
        Ok(Ok(outcome)) => TranscriptResult::ok(
            outcome.text,
            outcome.segments,
            Some(outcome.engine_used),
            outcome.fallback_used,
            outcome.warning,
        ),
        Ok(Err(e)) => TranscriptResult::err(e.to_string()),
        Err(e) => TranscriptResult::err(format!("Erro no motor de transcrição: {}", e)),
    }
}
