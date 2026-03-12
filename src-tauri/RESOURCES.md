# Bundled resources (whisper.cpp binaries)

The app invokes **whisper.cpp** from the Rust backend. The **Whisper model** is **not** bundled: the user selects a `.bin` model file at runtime from the UI. Only the whisper binary (or binaries on macOS) must be placed in the project so they are included when you run or build.

---

## 1. Where to place the whisper.cpp binary(ies)

### macOS (two binaries: accelerate + portable)

The app supports **two** whisper binaries on macOS for a **runtime fallback**:

| Binary | Purpose |
|--------|--------|
| **whisper-accelerate** | Default: built with Accelerate/BLAS for best performance. May fail on some Macs with dyld/symbol errors (e.g. older macOS). |
| **whisper-portable** | Fallback: built with `-DGGML_BLAS=OFF -DGGML_ACCELERATE=OFF` for broad compatibility. Slower but runs on older Macs. |

- **Paths**: `src-tauri/resources/whisper-accelerate` and `src-tauri/resources/whisper-portable`
- **Behaviour**: When the user starts transcription, the app runs **whisper-accelerate** first. If that binary fails to start or exits with a runtime/linker error (e.g. "Library not loaded", "Symbol not found"), the app automatically **retries with whisper-portable** and shows a short notice: *"A aplicação usou o modo de compatibilidade neste Mac. A transcrição pode ser mais lenta."*
- **Build**: Build two whisper.cpp executables (see § 1.1–1.2): one with default/Accelerate for `whisper-accelerate`, one with `GGML_BLAS=OFF` and `GGML_ACCELERATE=OFF` for `whisper-portable`. Copy them into `resources/` and run `chmod +x` on both.

### Windows / Linux (single binary)

- **Path (Linux)**: `src-tauri/resources/whisper-cli` (no extension). Run `chmod +x whisper-cli`.
- **Path (Windows)**: `src-tauri/resources/whisper-cli.exe`

The Rust code looks up the binary by name relative to the bundled resource directory. Use the full CLI that accepts `-m`, `-f`, `-l`, not the small `main` stub.

### 1.1 Portable macOS build (for distribution to other Macs)

If you build whisper.cpp with **CMake** and use the default shared library, the `whisper-cli` binary will depend on `libwhisper.1.dylib`. That dylib is looked up at **absolute paths from the machine where you built** (e.g. `/Users/mac/Documents/phpstorm/whisper.cpp/build/...`). On another Mac, those paths do not exist, so you get:

```text
dyld: Library not loaded: '@rpath/libwhisper.1.dylib'
  Referenced from: '.../Transcrever.app/Contents/Resources/resources/whisper-cli'
  Reason: tried: '/Users/mac/.../whisper.cpp/build/...' (no such file), ...
```

**Option A — Recommended: build a self-contained binary (no dylib)**

Rebuild whisper.cpp so that the whisper library is **statically linked** into the executable. Then you only ship `whisper-cli` and it runs on any Mac of the same architecture.

- **Using CMake:** build with static libs so no `libwhisper.1.dylib` is produced or needed. For **maximum compatibility across Macs** (see § 1.2), disable **both** BLAS and the Accelerate framework with **`-DGGML_BLAS=OFF -DGGML_ACCELERATE=OFF`**:

  ```bash
  cd /path/to/whisper.cpp
  rm -rf build && mkdir build && cd build
  cmake .. -DBUILD_SHARED_LIBS=OFF -DGGML_BLAS=OFF -DGGML_ACCELERATE=OFF
  cmake --build . --config Release
  ```

  Copy the resulting `whisper-cli` (or the target that builds the CLI) from the build tree into `src-tauri/resources/whisper-cli`. Do **not** copy `libwhisper.1.dylib`; the executable must not depend on it.

- **Using Makefile:** if you build with `make` in the whisper.cpp repo, the default is often a single executable with no separate dylib. Copy that binary to `src-tauri/resources/whisper-cli`.

After replacing the binary, run `npm run tauri:build` again so the app bundle contains the new executable.

**Option B — Bundle the dylib and fix rpath**

If you must keep a dynamically linked build:

1. Copy into `src-tauri/resources/` both the `whisper-cli` binary and `libwhisper.1.dylib` (and any other dylibs that `otool -L whisper-cli` lists and that are not system libs).
2. Point the executable at the dylib next to itself (same folder in the bundle):

   ```bash
   cd src-tauri/resources
   install_name_tool -change '@rpath/libwhisper.1.dylib' '@loader_path/libwhisper.1.dylib' whisper-cli
   ```

3. If `libwhisper.1.dylib` itself depends on other local dylibs (e.g. ggml), fix their paths with `install_name_tool` on the dylib as well, using `@loader_path` so they are found in the same directory.
4. Rebuild the app: `npm run tauri:build`.

Option A is simpler and avoids shipping or relinking dylibs.

### 1.2 macOS Accelerate symbol (runs on older Macs)

If your self-contained `whisper-cli` runs on your Mac but **on another Mac** you see:

```text
dyld: Symbol not found: (_cblas_sgemm$NEWLAPACK$ILP64)
  Referenced from: '.../Transcrever.app/Contents/Resources/resources/whisper-cli'
  Expected in: '/System/Library/Frameworks/Accelerate.framework/.../Accelerate'
```

the binary was built against **newer** Apple Accelerate interfaces (NEWLAPACK/ILP64) that exist only on **macOS 13.3+**. The other device has an older macOS, so that symbol is missing.

**Fix:** Rebuild whisper.cpp **without** linking the Accelerate framework. In ggml (used by whisper.cpp) there are **two** options that can pull in Accelerate; both must be off:

- **`GGML_BLAS=OFF`** — disables BLAS (matrix ops that use NEWLAPACK symbols).
- **`GGML_ACCELERATE=OFF`** — disables the Accelerate framework entirely (vector ops). If you only set `GGML_BLAS=OFF`, the binary can still link Accelerate and fail on older Macs.

Do a **clean** build:

```bash
cd /path/to/whisper.cpp
rm -rf build && mkdir build && cd build
cmake .. -DBUILD_SHARED_LIBS=OFF -DGGML_BLAS=OFF -DGGML_ACCELERATE=OFF
cmake --build . --config Release
```

**Verify** that the new binary does not link Accelerate. Replace `path/to/build/whisper-cli` with the actual path to the built executable (e.g. `build/bin/whisper-cli`):

```bash
otool -L path/to/build/whisper-cli | grep -i Accel
```

If this prints nothing, the binary is fine. If it still prints a line containing `Accelerate`, the build did not pick up one of the options — delete the `build` directory and run cmake again with both `-DGGML_BLAS=OFF` and `-DGGML_ACCELERATE=OFF`.

Then copy the new `whisper-cli` into `src-tauri/resources/whisper-cli`, run `chmod +x`, and `npm run tauri:build` again.

Trade-off: CPU inference will not use Apple’s BLAS (Accelerate); it may be slower on Apple Silicon, but the app will work on all supported macOS versions (e.g. 10.15+). If you only need to support macOS 13.3+, you can omit `-DGGML_BLAS=OFF` for better performance.

**Transcription duration on older Macs:** Without Accelerate/BLAS, inference is CPU-only and can be **many times slower than realtime** (e.g. 1 minute of audio may take 10–30+ minutes on a 2017 Intel Mac). The app shows a spinner and a message that it may take several minutes; the process is working — ask users to wait and use a small test file first (e.g. 10–20 seconds of audio) to confirm it completes.

Example layout:

```text
src-tauri/
  resources/
    whisper-accelerate   ← macOS: fast build (optional; if missing, portable is used only)
    whisper-portable     ← macOS: compatibility build
    whisper-cli          ← Linux: single CLI
    whisper-cli.exe      ← Windows: single CLI
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
