//! Export commands: write transcript to TXT or DOCX and save converted audio files.
//! When segments are provided and have timestamps, output is formatted by section with time ranges.

use std::{fs, path::Path};
use tauri::command;

use crate::export;
use crate::types::{ExportResult, TranscriptSegment};

/// Exports the transcript to a plain text file. Uses timestamped sections if segments are provided.
#[command]
pub fn export_txt(
    transcript_text: String,
    output_path: String,
    segments: Option<Vec<TranscriptSegment>>,
) -> ExportResult {
    let path = Path::new(&output_path);
    let seg_ref = segments.as_deref();
    match export::export_to_txt(path, &transcript_text, seg_ref) {
        Ok(()) => ExportResult::ok(),
        Err(e) => ExportResult::err(e.to_string()),
    }
}

/// Exports the transcript to a DOCX file. Uses timestamped sections if segments are provided.
#[command]
pub fn export_docx(
    transcript_text: String,
    output_path: String,
    segments: Option<Vec<TranscriptSegment>>,
) -> ExportResult {
    let path = Path::new(&output_path);
    let seg_ref = segments.as_deref();
    match export::export_to_docx(path, &transcript_text, seg_ref) {
        Ok(()) => ExportResult::ok(),
        Err(e) => ExportResult::err(e.to_string()),
    }
}

/// Saves a previously converted audio file from a temporary path to a user-chosen destination.
#[command]
pub fn save_converted_audio(source_path: String, output_path: String) -> ExportResult {
    let src = Path::new(&source_path);
    if !src.exists() || !src.is_file() {
        return ExportResult::err("Ficheiro convertido não encontrado.");
    }
    let dst = Path::new(&output_path);
    match fs::copy(src, dst) {
        Ok(_) => ExportResult::ok(),
        Err(e) => ExportResult::err(e.to_string()),
    }
}
