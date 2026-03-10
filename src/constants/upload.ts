/**
 * Upload configuration: allowed extensions and max file size.
 * Used by file validation and file input accept attribute.
 */

/** Allowed audio/video file extensions (lowercase, with leading dot). */
export const ALLOWED_AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".mp4"] as const;

export type AllowedAudioExtension = (typeof ALLOWED_AUDIO_EXTENSIONS)[number];

/** Default max file size: 2GB in bytes. */
const TWO_GB = 2 * 1024 * 1024 * 1024;

/** Configurable max file size in bytes (default 2GB). */
export const MAX_FILE_SIZE_BYTES = TWO_GB;

/** Comma-separated accept string for <input type="file" accept="..."> */
export const FILE_INPUT_ACCEPT = ALLOWED_AUDIO_EXTENSIONS.join(",");
