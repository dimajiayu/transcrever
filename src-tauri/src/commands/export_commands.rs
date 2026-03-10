//! Export commands: write transcript to TXT or DOCX.

use std::path::Path;
use tauri::command;

use crate::export;
use crate::types::ExportResult;

/// Exports the transcript text to a plain text file at the given path.
#[command]
pub fn export_txt(transcript_text: String, output_path: String) -> ExportResult {
    let path = Path::new(&output_path);
    match export::export_to_txt(path, &transcript_text) {
        Ok(()) => ExportResult::ok(),
        Err(e) => ExportResult::err(e.to_string()),
    }
}

/// Exports the transcript text to a DOCX file at the given path.
#[command]
pub fn export_docx(transcript_text: String, output_path: String) -> ExportResult {
    let path = Path::new(&output_path);
    match export::export_to_docx(path, &transcript_text) {
        Ok(()) => ExportResult::ok(),
        Err(e) => ExportResult::err(e.to_string()),
    }
}
