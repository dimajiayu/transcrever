/**
 * Tauri backend bridge: invoke commands with typed payloads.
 * Prepares file path and validation for the Rust backend.
 * When not running inside Tauri (e.g. browser dev), skips backend calls and returns safe defaults.
 */

export interface ValidateAudioPathResult {
  valid: boolean;
  error: string | null;
}

function isTauriAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
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
  const result = await invoke<ValidateAudioPathResult>("validate_audio_path", {
    path,
  });
  return {
    valid: result.valid,
    error: result.error ?? null,
  };
}
