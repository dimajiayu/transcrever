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

export type EngineUsed = "accelerate" | "portable";

export interface TranscriptResult {
  success: boolean;
  text?: string | null;
  segments?: Array<{ start: number; end: number; text: string }> | null;
  error?: string | null;
  engine_used?: EngineUsed | null;
  fallback_used?: boolean | null;
  warning?: string | null;
}

export function isTauriAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

/** Builds default export filename: audio base name + date/time + extension. Safe for all platforms (no : in time). */
export function getDefaultExportFileName(
  audioFileName: string,
  extension: "txt" | "docx" | "wav"
): string {
  const base = audioFileName
    .replace(/\.[^.]+$/, "")
    .replace(/[/\\:*?"<>|]/g, "_")
    .trim() || "transcript";
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const dateTime = `${d}.${m}.${y}_${h}-${min}`;
  return `${base}_${dateTime}.${extension}`;
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
 * Converts the given audio file (e.g. M4A, MP4, WAV) to WAV 16 kHz mono using ffmpeg.
 * Optimal for Whisper. Returns the path to the temporary WAV file. Requires ffmpeg to be installed.
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
 * Lets the user choose where to save a converted WAV file (16 kHz mono) and copies it there.
 * Suggests a default name based on the original audio file.
 */
export async function saveConvertedAudioFile(
  sourcePath: string,
  audioFileName?: string | null
): Promise<ExportResult> {
  if (!isTauriAvailable()) {
    return { success: false, error: "Guardar só disponível na aplicação desktop." };
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { invoke } = await import("@tauri-apps/api/core");

  const defaultPath =
    audioFileName != null && audioFileName !== ""
      ? getDefaultExportFileName(audioFileName, "wav")
      : undefined;

  const outputPath = await save({
    filters: [{ name: "Áudio WAV", extensions: ["wav"] }],
    ...(defaultPath != null && { defaultPath }),
  });

  if (outputPath === null) {
    return { success: false };
  }

  try {
    const result = await invoke<ExportResult>("save_converted_audio", {
      sourcePath,
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
    engine_used: result.engine_used ?? null,
    fallback_used: result.fallback_used ?? false,
    warning: result.warning ?? null,
  };
}

/**
 * Opens save dialog for TXT, then exports transcript to the chosen path (UTF-8).
 * If segments are provided and have timestamps, output is formatted by section with time ranges.
 * If audioFileName is provided, the save dialog suggests a default name: "{base}_{DD.MM.YYYY_HH-MM}.txt".
 * Returns backend ExportResult; path is null when user cancels.
 */
export async function exportTxtToFile(
  transcript: string,
  segments?: Array<{ start: number; end: number; text: string }> | null,
  audioFileName?: string | null
): Promise<ExportResult> {
  if (!isTauriAvailable()) {
    return { success: false, error: "Exportação só disponível na aplicação desktop." };
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { invoke } = await import("@tauri-apps/api/core");

  const defaultPath =
    audioFileName != null && audioFileName !== ""
      ? getDefaultExportFileName(audioFileName, "txt")
      : undefined;

  const outputPath = await save({
    filters: [{ name: "Texto", extensions: ["txt"] }],
    ...(defaultPath != null && { defaultPath }),
  });

  if (outputPath === null) {
    return { success: false };
  }

  try {
    const result = await invoke<ExportResult>("export_txt", {
      transcriptText: transcript,
      outputPath,
      segments: segments ?? undefined,
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
 * Opens save dialog for DOCX, then exports transcript (title, date, and sections) to the chosen path.
 * If segments are provided and have timestamps, output is formatted by section with time ranges.
 * If audioFileName is provided, the save dialog suggests a default name: "{base}_{DD.MM.YYYY_HH-MM}.docx".
 * Returns backend ExportResult; path is null when user cancels.
 */
export async function exportDocxToFile(
  transcript: string,
  segments?: Array<{ start: number; end: number; text: string }> | null,
  audioFileName?: string | null
): Promise<ExportResult> {
  if (!isTauriAvailable()) {
    return { success: false, error: "Exportação só disponível na aplicação desktop." };
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { invoke } = await import("@tauri-apps/api/core");

  const defaultPath =
    audioFileName != null && audioFileName !== ""
      ? getDefaultExportFileName(audioFileName, "docx")
      : undefined;

  const outputPath = await save({
    filters: [{ name: "Documento Word", extensions: ["docx"] }],
    ...(defaultPath != null && { defaultPath }),
  });

  if (outputPath === null) {
    return { success: false };
  }

  try {
    const result = await invoke<ExportResult>("export_docx", {
      transcriptText: transcript,
      outputPath,
      segments: segments ?? undefined,
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
