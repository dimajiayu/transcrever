/**
 * Upload utility: prepare payload for Tauri backend.
 * Desktop app uses local file paths; the backend receives the path to read the file.
 */

import type { SelectedFile } from "../types";

/** Payload sent to Tauri for transcription (file path for local access). */
export interface AudioFilePayload {
  path: string;
  name: string;
  size?: number;
}

/**
 * Builds the payload to send to the Tauri backend for transcription.
 * Uses the stored file path (from Tauri's file picker or drag-and-drop with path).
 */
export function prepareAudioFilePayload(selectedFile: SelectedFile): AudioFilePayload {
  return {
    path: selectedFile.path,
    name: selectedFile.name,
    size: selectedFile.size,
  };
}
