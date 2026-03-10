# Transcrever

Offline desktop app to upload Portuguese audio, transcribe it locally with a bundled Whisper-based engine, edit the transcript, and export as TXT or DOCX.

## Project purpose

- **Fully offline**: no cloud APIs, no internet after install.
- **Local transcription**: uses [whisper.cpp](https://github.com/ggerganov/whisper.cpp) and a bundled Whisper model.
- **Supported input**: MP3, WAV, M4A, MP4 (audio track).
- **Default language**: Portuguese (`pt`).
- **Export**: TXT and DOCX.

Stack: **Tauri 2**, **React**, **TypeScript**, **Tailwind CSS**, **Rust** backend with commands for validation, transcription, and export.

---

## Local development

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** (e.g. [rustup](https://rustup.rs))
- **macOS**: Xcode Command Line Tools  
- **Windows**: Visual Studio Build Tools and WebView2

### Steps

1. **Clone and install**

   ```bash
   cd transcrever
   npm install
   ```

2. **Run the app (dev)**

   ```bash
   npm run dev          # frontend only — Vite at http://localhost:5173
   npm run tauri:dev    # Tauri + frontend — opens desktop window
   ```

3. **Optional: app icons**

   For a proper bundle you need icons. From project root:

   ```bash
   npm run tauri icon path/to/your/icon.png
   ```

   Icons are generated into `src-tauri/icons/`. Without this, development still works; the packager may use defaults or warn.

---

## Build (production)

### macOS

```bash
npm run build          # build frontend
npm run tauri:build    # build Tauri app (creates .app and/or .dmg under src-tauri/target/release/bundle)
```

Requirements: Xcode Command Line Tools (or full Xcode). Output: `src-tauri/target/release/bundle/macos/` (e.g. `Transcrever.app`).

### Windows

```bash
npm run build
npm run tauri:build
```

Requirements: Visual Studio Build Tools, WebView2. Output: `src-tauri/target/release/bundle/msi/` (and/or `nsis/`).

---

## Bundling whisper.cpp and model files

The app is designed to ship **whisper.cpp** and a **Whisper model** as bundled resources so everything runs offline.

### Where to put them

- **Directory**: `src-tauri/resources/`
- **Whisper binary**: build or download a **whisper.cpp** executable for the target OS and place it in `src-tauri/resources/`, e.g.:
  - macOS: `whisper-cli` or `main` (or a name you use in code)
  - Windows: `whisper-cli.exe` or `main.exe`
- **Model file**: e.g. `ggml-base.bin` (or another `.bin` from [whisper.cpp models](https://github.com/ggerganov/whisper.cpp#available-models)). Place it in `src-tauri/resources/` (e.g. `src-tauri/resources/ggml-base.bin`).

### How they are bundled

- In `tauri.conf.json`, `bundle.resources` is set to `["resources/*"]`, so everything under `src-tauri/resources/` is included in the app bundle.
- At runtime, the Rust backend should resolve paths via Tauri’s resource resolver (e.g. `app.path().resolve(..., BaseDirectory::Resource)`) and pass the binary path and model path to the transcription logic that spawns whisper.cpp.

### Building whisper.cpp

- Clone [whisper.cpp](https://github.com/ggerganov/whisper.cpp), build for your platform (e.g. `make` on macOS/Linux, or CMake on Windows).
- Copy the CLI binary (and optionally the model) into `src-tauri/resources/` as above.
- The Rust code in `src-tauri/src/transcription/` will be implemented to call this binary with the chosen model and audio path; the exact binary and model names can be configured there.

### Summary

| Item        | Location                    | Purpose                    |
|------------|-----------------------------|----------------------------|
| Whisper CLI| `src-tauri/resources/`      | Run transcription          |
| Model (.bin)| `src-tauri/resources/`     | Loaded by whisper.cpp      |

After adding these files, run `npm run tauri:build` again so they are included in the installer and app bundle.
