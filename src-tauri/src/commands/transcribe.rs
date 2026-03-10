//! Transcription command: invokes bundled whisper.cpp.

use std::path::Path;
use tauri::command;

use crate::transcription;
use crate::types::TranscriptResult;

/// Runs transcription on the given audio file using the bundled whisper.cpp binary.
/// Uses Portuguese ("pt") as the language. Returns a serializable result for the frontend.
#[command]
pub fn transcribe_audio(app: tauri::AppHandle, file_path: String) -> TranscriptResult {
    let path = Path::new(&file_path);
    match transcription::transcribe(path, &app) {
        Ok(text) => TranscriptResult::ok(text),
        Err(e) => TranscriptResult::err(e.to_string()),
    }
}
