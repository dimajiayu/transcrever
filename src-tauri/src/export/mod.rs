//! Export logic: write transcript to TXT and DOCX.
//! Used by Tauri commands when the user exports from the UI.

use std::fs::File;
use std::io::Write;
use std::path::Path;

use docx_rs::{Docx, Paragraph, Run};

/// Errors that can occur during export.
#[derive(Debug)]
pub enum ExportError {
    Io(String),
    Docx(String),
}

impl std::fmt::Display for ExportError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExportError::Io(s) => write!(f, "Erro de ficheiro: {}", s),
            ExportError::Docx(s) => write!(f, "Erro ao criar DOCX: {}", s),
        }
    }
}

impl From<std::io::Error> for ExportError {
    fn from(e: std::io::Error) -> Self {
        ExportError::Io(e.to_string())
    }
}

/// Writes the transcript text to a plain text file.
pub fn export_to_txt(output_path: &Path, transcript_text: &str) -> Result<(), ExportError> {
    let mut file = File::create(output_path)?;
    file.write_all(transcript_text.as_bytes())?;
    file.flush()?;
    Ok(())
}

/// Writes the transcript text to a DOCX file.
/// Uses one paragraph per line (split by newlines) for readability.
pub fn export_to_docx(output_path: &Path, transcript_text: &str) -> Result<(), ExportError> {
    let file = File::create(output_path)?;

    let mut docx = Docx::new();

    if transcript_text.is_empty() {
        docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text("")));
    } else {
        for line in transcript_text.lines() {
            docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(line)));
        }
    }

    docx
        .build()
        .pack(file)
        .map_err(|e| ExportError::Docx(e.to_string()))?;

    Ok(())
}
