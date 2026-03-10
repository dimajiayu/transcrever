/**
 * File validation helpers for audio upload.
 * Validates extension and size; returns user-friendly messages.
 */

import {
  ALLOWED_AUDIO_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  type AllowedAudioExtension,
} from "../constants/upload";

export interface ValidationSuccess {
  ok: true;
  extension: AllowedAudioExtension;
}

export interface ValidationError {
  ok: false;
  error: string;
}

export type FileValidationResult = ValidationSuccess | ValidationError;

/**
 * Gets the file extension (lowercase, with leading dot) from a file name.
 */
export function getFileExtension(name: string): string {
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1) return "";
  return name.slice(lastDot).toLowerCase();
}

/**
 * Checks if the extension is in the allowed list.
 */
export function isAllowedExtension(extension: string): extension is AllowedAudioExtension {
  return (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(extension);
}

/**
 * Validates a File for upload: allowed type and max size.
 * Returns a result with ok: true and extension, or ok: false and user-friendly error message.
 */
export function validateAudioFile(
  file: File,
  maxSizeBytes: number = MAX_FILE_SIZE_BYTES
): FileValidationResult {
  const ext = getFileExtension(file.name);
  if (!ext) {
    return { ok: false, error: "O ficheiro não tem extensão. Use .mp3, .wav, .m4a ou .mp4." };
  }
  if (!isAllowedExtension(ext)) {
    return {
      ok: false,
      error: `Tipo de ficheiro não suportado (${ext}). Use .mp3, .wav, .m4a ou .mp4.`,
    };
  }
  if (file.size > maxSizeBytes) {
    const maxGB = (maxSizeBytes / (1024 * 1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `Ficheiro demasiado grande. Tamanho máximo: ${maxGB} GB.`,
    };
  }
  return { ok: true, extension: ext as AllowedAudioExtension };
}

/** Shape used when we have name/size/path but not a File (e.g. from drop). */
export interface SelectedFileLike {
  name: string;
  size?: number;
}

/**
 * Validates name (extension) and size for an already-selected file (e.g. from drag-and-drop).
 * Use when the frontend only has SelectedFile, not a File.
 */
export function validateSelectedFileLike(
  file: SelectedFileLike,
  maxSizeBytes: number = MAX_FILE_SIZE_BYTES
): FileValidationResult {
  const ext = getFileExtension(file.name);
  if (!ext) {
    return { ok: false, error: "O ficheiro não tem extensão. Use .mp3, .wav, .m4a ou .mp4." };
  }
  if (!isAllowedExtension(ext)) {
    return {
      ok: false,
      error: `Tipo de ficheiro não suportado (${ext}). Use .mp3, .wav, .m4a ou .mp4.`,
    };
  }
  const size = file.size ?? 0;
  if (size > maxSizeBytes) {
    const maxGB = (maxSizeBytes / (1024 * 1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `Ficheiro demasiado grande. Tamanho máximo: ${maxGB} GB.`,
    };
  }
  return { ok: true, extension: ext as AllowedAudioExtension };
}
