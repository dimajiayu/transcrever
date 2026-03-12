//! Shared response and error types for Tauri commands.
//! All structs are serializable for the frontend.

use serde::{Deserialize, Serialize};

/// Result of validating an audio file path.
#[derive(Debug, Clone, Serialize)]
pub struct ValidationResult {
    pub valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ValidationResult {
    pub fn ok() -> Self {
        Self {
            valid: true,
            error: None,
        }
    }

    pub fn err(message: impl Into<String>) -> Self {
        Self {
            valid: false,
            error: Some(message.into()),
        }
    }
}

/// A single transcript segment with start/end times in seconds and text.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSegment {
    pub start: f64,
    pub end: f64,
    pub text: String,
}

/// Which whisper binary was used (for macOS dual-binary fallback).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EngineUsed {
    Accelerate,
    Portable,
}

/// Result of a transcription request.
#[derive(Debug, Clone, Serialize)]
pub struct TranscriptResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub segments: Option<Vec<TranscriptSegment>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Which engine was used (macOS: accelerate vs portable; other platforms: portable/default).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub engine_used: Option<EngineUsed>,
    /// True if the app fell back from accelerate to portable on this run.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fallback_used: Option<bool>,
    /// Optional message for the UI (e.g. compatibility mode notice).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warning: Option<String>,
}

impl TranscriptResult {
    pub fn ok(
        text: impl Into<String>,
        segments: Vec<TranscriptSegment>,
        engine_used: Option<EngineUsed>,
        fallback_used: bool,
        warning: Option<String>,
    ) -> Self {
        let text = text.into();
        Self {
            success: true,
            text: Some(text.clone()),
            segments: Some(segments),
            error: None,
            engine_used: Some(engine_used.unwrap_or(EngineUsed::Portable)),
            fallback_used: if fallback_used {
                Some(true)
            } else {
                None
            },
            warning,
        }
    }

    pub fn err(message: impl Into<String>) -> Self {
        Self {
            success: false,
            text: None,
            segments: None,
            error: Some(message.into()),
            engine_used: None,
            fallback_used: None,
            warning: None,
        }
    }
}

/// Result of an export (TXT or DOCX) operation.
#[derive(Debug, Clone, Serialize)]
pub struct ExportResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ExportResult {
    pub fn ok() -> Self {
        Self {
            success: true,
            error: None,
        }
    }

    pub fn err(message: impl Into<String>) -> Self {
        Self {
            success: false,
            error: Some(message.into()),
        }
    }
}
