//! Export logic: write transcript to TXT and DOCX.
//! When segments with timestamps are available, exports are formatted by section with time ranges.

use std::fs::File;
use std::io::Write;
use std::path::Path;

use chrono::Local;
use docx_rs::{Docx, Paragraph, Run};

use crate::types::TranscriptSegment;

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

/// Formats seconds as HH:MM:SS (human-readable, zero-padded).
fn format_timestamp(seconds: f64) -> String {
    let total_secs = seconds.max(0.0);
    let h = (total_secs / 3600.0) as u32;
    let m = ((total_secs % 3600.0) / 60.0) as u32;
    let s = (total_secs % 60.0) as u32;
    format!("{:02}:{:02}:{:02}", h, m, s)
}

/// Normalizes segment text: trim and collapse whitespace/newlines to a single space.
fn normalize_segment_text(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// True if we have at least one segment with real timestamps (not both start and end zero).
fn has_timestamped_segments(segments: &[TranscriptSegment]) -> bool {
    segments
        .iter()
        .any(|s| s.start != 0.0 || s.end != 0.0)
}

/// Builds formatted TXT content from segments: [HH:MM:SS - HH:MM:SS] then text, blank line between sections.
fn build_formatted_txt(segments: &[TranscriptSegment]) -> String {
    let mut out = String::new();
    for seg in segments {
        let range = format!("[{} - {}]", format_timestamp(seg.start), format_timestamp(seg.end));
        let text = normalize_segment_text(seg.text.trim());
        out.push_str(&range);
        out.push('\n');
        out.push_str(&text);
        out.push_str("\n\n");
    }
    out.trim_end().to_string()
}

/// Writes the transcript to a plain text file (UTF-8).
/// If segments are provided and have timestamps, uses formatted sections; otherwise plain text.
pub fn export_to_txt(
    output_path: &Path,
    transcript_text: &str,
    segments: Option<&[TranscriptSegment]>,
) -> Result<(), ExportError> {
    let content = match segments {
        Some(segs) if !segs.is_empty() && has_timestamped_segments(segs) => {
            build_formatted_txt(segs)
        }
        _ => transcript_text.to_string(),
    };
    let mut file = File::create(output_path)?;
    file.write_all(content.as_bytes())?;
    file.flush()?;
    Ok(())
}

/// Writes the transcript to a DOCX with title "Transcription", export date, then sections.
/// If segments have timestamps, each section is time range (distinct) + paragraph + spacing; else plain paragraphs.
pub fn export_to_docx(
    output_path: &Path,
    transcript_text: &str,
    segments: Option<&[TranscriptSegment]>,
) -> Result<(), ExportError> {
    let file = File::create(output_path)?;
    let date_str = Local::now().format("%Y-%m-%d").to_string();

    let mut docx = Docx::new();
    docx = docx.add_paragraph(
        Paragraph::new().add_run(Run::new().add_text("Transcription").bold()),
    );
    docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(date_str)));
    docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text("")));

    match segments {
        Some(segs) if !segs.is_empty() && has_timestamped_segments(segs) => {
            for seg in segs {
                let range = format!(
                    "[{} - {}]",
                    format_timestamp(seg.start),
                    format_timestamp(seg.end)
                );
                let text = normalize_segment_text(seg.text.trim());
                docx = docx.add_paragraph(
                    Paragraph::new().add_run(Run::new().add_text(range).bold()),
                );
                docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(text)));
                docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text("")));
            }
        }
        _ => {
            if transcript_text.is_empty() {
                docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text("")));
            } else {
                for line in transcript_text.lines() {
                    docx = docx.add_paragraph(
                        Paragraph::new().add_run(Run::new().add_text(line)),
                    );
                }
            }
        }
    }

    docx
        .build()
        .pack(file)
        .map_err(|e| ExportError::Docx(e.to_string()))?;
    Ok(())
}
