/**
 * Tauri backend bridge: invoke commands with typed payloads.
 * Prepares file path and validation for the Rust backend.
 * When not running inside Tauri (e.g. browser dev), skips backend calls and returns safe defaults.
 */

export interface ValidateAudioPathResult {
  valid: boolean;
  error: string | null;
}

export interface ExportResult {
  success: boolean;
  error?: string | null;
}

export interface TranscriptResult {
  success: boolean;
  text?: string | null;
  segments?: Array<{ start: number; end: number; text: string }> | null;
  error?: string | null;
}

export function isTauriAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

/**
 * Opens native file picker for audio (when running in Tauri).
 * Returns the selected file path, or null if cancelled or not in Tauri.
 */
export async function openAudioFile(): Promise<string | null> {
  if (!isTauriAvailable()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({
    multiple: false,
    directory: false,
    filters: [
      { name: "Áudio", extensions: ["mp3", "wav", "m4a", "mp4"] },
    ],
  });
  if (result === null || Array.isArray(result)) return null;
  return result;
}

/**
 * Opens native file picker for Whisper model .bin file (when running in Tauri).
 * Returns the selected file path, or null if cancelled or not in Tauri.
 */
export async function openModelFile(): Promise<string | null> {
  if (!isTauriAvailable()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Modelo Whisper", extensions: ["bin"] }],
  });
  if (result === null || Array.isArray(result)) return null;
  return result;
}

/**
 * Asks the Tauri backend to validate an audio file path (exists, is file, allowed extension).
 * When running in the browser (no Tauri), returns { valid: true, error: null } so the app can continue.
 */
export async function validateAudioPath(path: string): Promise<ValidateAudioPathResult> {
  if (!isTauriAvailable()) {
    return { valid: true, error: null };
  }
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<ValidateAudioPathResult>("validate_audio_file", {
    filePath: path,
  });
  return {
    valid: result.valid,
    error: result.error ?? null,
  };
}

/**
 * Asks the Tauri backend to validate a model file path (exists, is file, .bin extension).
 */
export async function validateModelPath(path: string): Promise<ValidateAudioPathResult> {
  if (!isTauriAvailable()) {
    return { valid: true, error: null };
  }
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<ValidateAudioPathResult>("validate_model_file", {
    filePath: path,
  });
  return {
    valid: result.valid,
    error: result.error ?? null,
  };
}

/**
 * Converts the given audio file (e.g. M4A, MP4) to WAV using ffmpeg (44.1 kHz, 16-bit mono).
 * Returns the path to the temporary WAV file. Requires ffmpeg to be installed.
 */
export async function convertAudioToWav(inputPath: string): Promise<{ path: string } | { error: string }> {
  if (!isTauriAvailable()) {
    return { error: "Conversão só disponível na aplicação desktop." };
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const path = await invoke<string>("convert_audio_to_wav", { inputPath });
    return { path };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}

/**
 * Runs transcription on the given audio file with the given model via the backend (whisper.cpp).
 * When not running in Tauri, returns { success: false, error: "…" } so the UI can show that the desktop app is required.
 */
export async function transcribeAudio(
  audioPath: string,
  modelPath: string
): Promise<TranscriptResult> {
  if (!isTauriAvailable()) {
    return {
      success: false,
      error: "Transcrição só disponível na aplicação desktop.",
    };
  }
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<TranscriptResult>("transcribe_audio", {
    audioPath,
    modelPath,
  });
  return {
    success: result.success,
    text: result.text ?? null,
    segments: result.segments ?? null,
    error: result.error ?? null,
  };
}

/**
 * Opens save dialog for TXT, then exports transcript to the chosen path (UTF-8).
 * Returns backend ExportResult; path is null when user cancels (success: false, no error message).
 */
export async function exportTxtToFile(transcript: string): Promise<ExportResult> {
  if (!isTauriAvailable()) {
    return { success: false, error: "Exportação só disponível na aplicação desktop." };
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { invoke } = await import("@tauri-apps/api/core");

  const outputPath = await save({
    filters: [{ name: "Texto", extensions: ["txt"] }],
  });

  if (outputPath === null) {
    return { success: false };
  }

  try {
    const result = await invoke<ExportResult>("export_txt", {
      transcriptText: transcript,
      outputPath,
    });
    return {
      success: result.success,
      error: result.error ?? null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, error: message };
  }
}

/**
 * Opens save dialog for DOCX, then exports transcript (with title and date) to the chosen path.
 * Returns backend ExportResult; path is null when user cancels.
 */
export async function exportDocxToFile(transcript: string): Promise<ExportResult> {
  if (!isTauriAvailable()) {
    return { success: false, error: "Exportação só disponível na aplicação desktop." };
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { invoke } = await import("@tauri-apps/api/core");

  const outputPath = await save({
    filters: [{ name: "Documento Word", extensions: ["docx"] }],
  });

  if (outputPath === null) {
    return { success: false };
  }

  try {
    const result = await invoke<ExportResult>("export_docx", {
      transcriptText: transcript,
      outputPath,
    });
    return {
      success: result.success,
      error: result.error ?? null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, error: message };
  }
}
