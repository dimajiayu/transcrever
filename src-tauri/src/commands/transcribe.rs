//! Transcription command: invokes bundled whisper.cpp.
//! Runs the blocking work in a thread pool so the UI stays responsive.

use std::path::Path;
use tauri::command;

use crate::transcription;
use crate::types::TranscriptResult;

/// Runs transcription on the given audio file using the bundled whisper.cpp binary and user-selected model.
/// Uses Portuguese ("pt") as the language. Returns plain text and timestamped segments for sync playback.
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
        Ok(Ok(out)) => TranscriptResult::ok(out.text, out.segments),
        Ok(Err(e)) => TranscriptResult::err(e.to_string()),
        Err(e) => TranscriptResult::err(format!("Erro no motor de transcrição: {}", e)),
    }
}
