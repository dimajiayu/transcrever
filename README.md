# Transcrever

Offline desktop app to upload Portuguese audio, transcribe it locally with [whisper.cpp](https://github.com/ggerganov/whisper.cpp), edit the transcript, and export as TXT or DOCX. The app bundles only the whisper.cpp binary; you select the Whisper model (`.bin`) at runtime from the UI.

## Project purpose

- **Fully offline**: no cloud APIs, no internet after install.
- **Local transcription**: uses [whisper.cpp](https://github.com/ggerganov/whisper.cpp); the **model is chosen by the user** at runtime (not bundled).
- **Supported input**: MP3, WAV, M4A, MP4 (audio track).
- **Model**: Any Whisper ggml `.bin` file (e.g. ggml-base.bin, ggml-small.bin) selected in the app.
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
npm run tauri:build    # build Tauri app (creates .app and .dmg under src-tauri/target/release/bundle)
```

Requirements: Xcode Command Line Tools (or full Xcode). Output: `src-tauri/target/release/bundle/macos/` (e.g. `Transcrever.app`, `Transcrever.dmg`).

### Windows

```bash
npm run build
npm run tauri:build
```

Requirements: Visual Studio Build Tools, WebView2. Output: `src-tauri/target/release/bundle/msi/` and `nsis/` (e.g. `.msi` installer and `.exe` NSIS installer).

---

## Packaging and release builds

The Tauri build bundles the **app frontend** and the **whisper.cpp executable** only. The **Whisper model is not bundled**: users select a `.bin` model file at runtime from the UI. The app stays fully offline.

### What gets bundled

| Component | How it’s included |
|-----------|-------------------|
| **Frontend** | Built by `npm run build` (Vite → `dist/`); Tauri packs it into the app. |
| **Whisper binary** | Must be placed in `src-tauri/resources/` as `whisper-cli` (macOS/Linux) or `whisper-cli.exe` (Windows). Bundled via `bundle.resources`. |
| **Whisper model** | **Not bundled.** User selects a `.bin` file at runtime (file picker or drag-and-drop). |

See **Resource/binary placement** below and **`src-tauri/RESOURCES.md`** for exact paths and behaviour at runtime.

### Build commands (release)

From the project root:

```bash
npm run build          # 1. Build frontend (required before Tauri build)
npm run tauri:build    # 2. Build Tauri app and installers
```

- **macOS**: Produces `Transcrever.app` and `Transcrever.dmg` under `src-tauri/target/release/bundle/macos/`.
- **Windows**: Produces MSI and NSIS installers under `src-tauri/target/release/bundle/msi/` and `nsis/`.

To build only specific formats (e.g. only DMG on macOS):

```bash
npm run tauri build -- --bundles dmg
npm run tauri build -- --bundles msi
```

### Resource/binary placement guide

Before the first release build, ensure the whisper binary is in place. The model is **not** bundled; users select it in the app.

| Item | Location (relative to `src-tauri/`) | Notes |
|------|-------------------------------------|--------|
| Whisper CLI (macOS/Linux) | `resources/whisper-cli` | No extension; must be executable (`chmod +x whisper-cli` on Unix). Use the full CLI binary, not the small `main`. |
| Whisper CLI (Windows) | `resources/whisper-cli.exe` | Build whisper.cpp on Windows or cross-compile. |
| Whisper model | **Not in repo.** User selects a `.bin` file at runtime. | Download from whisper.cpp (e.g. ggml-base.bin) and choose it in the app. |

Full details (including how the backend invokes whisper and how the model is passed): **`src-tauri/RESOURCES.md`**.

### Release checklist

- [ ] **Version**: Bump `version` in `tauri.conf.json` (and optionally `package.json`) for the release.
- [ ] **Icons**: Run `npm run tauri icon path/to/icon.png` so installers and the app use your icon (otherwise Tauri may use defaults).
- [ ] **Resources**: Place `whisper-cli` (and/or `whisper-cli.exe`) in `src-tauri/resources/` as above; run `npm run tauri:build`. No model is bundled; users select a model in the app.
- [ ] **Test**: Run the built app (e.g. open the `.app` on macOS or run the installed app on Windows); test upload → transcribe → export TXT/DOCX.
- [ ] **macOS (optional)**: For distribution outside the App Store, consider code signing and notarization (see **Platform-specific notes** below).
- [ ] **Windows**: Ensure the installer is tested on a clean machine with WebView2 installed (or rely on the installer to prompt for it if configured).

### Platform-specific notes

- **macOS**
  - The bundled `whisper-cli` binary must be executable: run `chmod +x src-tauri/resources/whisper-cli` before building if you copied it from another machine.
  - For distribution outside the Mac App Store, you typically need to **code sign** the app and **notarize** it with Apple; otherwise users may see security warnings. This requires an Apple Developer account and is not required for local or internal builds.
  - Building for **Apple Silicon** vs **Intel**: build on the target architecture or use cross-compilation; the same `resources/` layout applies.

- **Windows**
  - **WebView2**: Users need the WebView2 runtime (often already present on Windows 11). For older systems, the Tauri/installer setup can be configured to bundle or prompt for WebView2.
  - **whisper.cpp**: Build the Windows binary with Visual Studio or MinGW and place `whisper-cli.exe` in `src-tauri/resources/`. The app expects the executable at runtime via the resource directory.
  - **Antivirus**: Some scanners may flag new or unsigned executables; signing the app (e.g. with a code-signing certificate) can reduce false positives.

---

## Bundling whisper.cpp (model selected at runtime)

The app bundles only the **whisper.cpp** executable. The **Whisper model is not bundled**: the user selects a `.bin` model file at runtime from the UI (file picker or drag-and-drop). This keeps the app small and lets users switch models without rebuilding.

### Where to put the binary

See **`src-tauri/RESOURCES.md`** for full details. Summary:

- **Whisper binary**: place the whisper.cpp CLI in `src-tauri/resources/` as **`whisper-cli`** (macOS/Linux) or **`whisper-cli.exe`** (Windows).
- **Model file**: not in the repo. Users select a `.bin` file (e.g. from [whisper.cpp](https://github.com/ggerganov/whisper.cpp)) in the app when they run transcription.

### How it works

- In `tauri.conf.json`, `bundle.resources` includes only the whisper binary (no model).
- At runtime, the user selects an audio file and a model file in the UI. "Start Transcription" is enabled only when both are selected. The Rust backend invokes `whisper-cli -m <model_path> -f <audio_path> -l pt`.

### Building whisper.cpp

- Clone [whisper.cpp](https://github.com/ggerganov/whisper.cpp), build for your platform (e.g. `make` on macOS/Linux, or CMake on Windows).
- Copy the CLI binary into `src-tauri/resources/` as above. Download a ggml model (e.g. `ggml-base.bin`) separately and select it in the app when transcribing.

### Summary

| Item         | Location                                | Purpose             |
|-------------|------------------------------------------|---------------------|
| Whisper CLI | `src-tauri/resources/whisper-cli` (or `whisper-cli.exe`) | Run transcription   |
| Model (.bin)| User-selected at runtime                 | Loaded by whisper.cpp; not bundled |

After adding the binary, run `npm run tauri:build` so it is included in the installer and app bundle.
