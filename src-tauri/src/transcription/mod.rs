//! Transcription logic: invoke bundled whisper.cpp and parse output.
//! Uses resources from the app bundle (binary + model).

// TODO: resolve path to bundled whisper binary and model (e.g. via tauri::api::path::resource_dir).
// TODO: spawn whisper process with correct args (audio path, model path, language "pt").
// TODO: parse stdout and return transcript text (and later: timestamps for future use).
