/**
 * Shared types for the transcription app UI.
 */

export type TranscriptionStatus =
  | "idle"
  | "uploading"
  | "transcribing"
  | "success"
  | "error";

export interface SelectedFile {
  name: string;
  path: string;
  size?: number;
}

export interface StatusState {
  status: TranscriptionStatus;
  message: string;
  error?: string;
}
