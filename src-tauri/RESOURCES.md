# Bundled resources (whisper.cpp binary only)

The app invokes **whisper.cpp** from the Rust backend. The **Whisper model** is **not** bundled: the user selects a `.bin` model file at runtime from the UI. Only the whisper binary must be placed in the project so it is included when you run or build.

---

## 1. Where to place the whisper.cpp binary

- **Path**: `src-tauri/resources/whisper-cli`
- **Windows**: `src-tauri/resources/whisper-cli.exe`

The Rust code looks up the binary by name: `whisper-cli` on macOS/Linux and `whisper-cli.exe` on Windows, relative to the bundled resource directory. Use the **whisper-cli** executable (the full CLI that accepts `-m`, `-f`, `-l`), not the small `main` stub.

**Steps:**

1. Build whisper.cpp for your platform (see [whisper.cpp](https://github.com/ggerganov/whisper.cpp)). The Makefile may produce `main` and/or `whisper-cli`; copy **whisper-cli** (the larger executable that does transcription).
2. Copy the CLI executable into `src-tauri/resources/`:
   - macOS/Linux: name it `whisper-cli` (no extension). Run `chmod +x whisper-cli`.
   - Windows: name it `whisper-cli.exe`.
3. On Apple Silicon Macs, use a native **arm64** build of whisper-cli if possible; an x86_64 binary requires Rosetta.

Example layout:

```text
src-tauri/
  resources/
    whisper-cli      ← whisper.cpp CLI (macOS/Linux)
    whisper-cli.exe  ← whisper.cpp CLI (Windows; optional if you only build for Unix)
```

---

## 2. Model file (user-selected at runtime)

The app **does not bundle** a Whisper model. The user selects both:

1. **Audio file** (MP3, WAV, M4A, MP4)
2. **Model file** (Whisper ggml `.bin`, e.g. `ggml-base.bin`, `ggml-small.bin`)

from the UI at runtime (file picker or drag-and-drop). "Start Transcription" is enabled only when both are selected. The user can switch models and rerun transcription without rebuilding the app.

**Downloading a model:**

- Get a ggml model from [whisper.cpp](https://github.com/ggerganov/whisper.cpp) (e.g. `ggml-base.bin`, `ggml-small.bin`).
- Place it anywhere on disk and select it in the app when prompted.

---

## 3. How Tauri config references resources

In `tauri.conf.json`:

```json
"bundle": {
  "resources": ["resources/*"],
  "externalBin": [],
  ...
}
```

- **`resources`**  
  Everything under `src-tauri/resources/` is bundled. Place **only** the whisper binary there (e.g. `whisper-cli` or `whisper-cli.exe`). Do **not** put model files under `resources/` if you want to keep the package small; the user selects the model at runtime from the UI. The folder `resources/models/` is in `.gitignore` so the model is not committed.
- **`externalBin`**  
  Left empty. The whisper binary is treated as a resource, not a sidecar.

---

## 4. Example command invocation

The Rust backend runs whisper.cpp like this (conceptually):

```bash
/path/to/bundled/whisper-cli -m /path/to/user-selected/model.bin -f /path/to/input.wav -l pt
```

- **`-m`**: path to the **user-selected** model file (chosen in the UI).
- **`-f`**: path to the input audio file (chosen by the user).
- **`-l pt`**: language Portuguese.

Stdout is captured and parsed into plain transcript text; stderr (and stdout on failure) are included in error messages shown in the UI.

---

## 5. Where files end up in the built bundle

After `npm run tauri:build`, the bundled app contains the frontend, the Rust binary, and only the whisper binary under resources (no model):

| Platform | Bundle output (typical) | Resource directory at runtime |
|----------|-------------------------|--------------------------------|
| **macOS** | `target/release/bundle/macos/Transcrever.app` | `Transcrever.app/Contents/Resources/` (here: `whisper-cli` only) |
| **Windows** | `target/release/bundle/msi/` or `nsis/` | Next to the app executable; only `whisper-cli.exe` in resources |

The user must provide a model file when using the app.

---

## 6. Summary

| Item            | Location                                    | Used by backend as              |
|-----------------|---------------------------------------------|----------------------------------|
| Whisper binary  | `src-tauri/resources/whisper-cli` (or `.exe`) | `whisper-cli` / `whisper-cli.exe` (Resource) |
| Model file      | **Not bundled** — user selects at runtime   | Path passed from frontend to `transcribe_audio` |

After adding the binary, run `npm run tauri:dev` or `npm run tauri:build` so the bundle is updated.
