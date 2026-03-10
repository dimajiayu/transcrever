You are a senior desktop software engineer and solution architect.

Build a fully offline cross-platform desktop application for macOS and Windows.

Project goal:
Create a desktop app that allows a user to upload a Portuguese audio file, transcribe it locally using a bundled Whisper-based model, review and edit the transcript, and export the transcript as TXT or DOCX.

Core requirements:
- The app must work completely offline
- No cloud APIs
- No internet connection required after installation
- The app must include frontend, backend logic, transcription engine, and local model resources
- The user only provides local audio files
- Supported platforms: macOS and Windows
- Supported input formats: mp3, wav, m4a, mp4 (audio track)
- Default transcription language: Portuguese ("pt")
- The transcript must be editable in the UI
- The user must be able to export transcript as .txt and .docx

Technical stack requirements:
- Tauri 2
- React
- TypeScript
- Rust backend commands inside Tauri
- whisper.cpp as the local transcription engine
- bundled local Whisper model file
- Tailwind CSS for UI styling

Architecture requirements:
- Frontend in React/TypeScript
- Tauri Rust commands handle file validation, invoke whisper.cpp, parse output, and export files
- whisper.cpp binary must be bundled with the app
- model file must be bundled with the app
- No separate external backend service
- No Docker
- No Python runtime dependency in the shipped app

Functional requirements:
1. Upload audio via file picker or drag-and-drop
2. Show selected file name
3. Start transcription button
4. Show processing status and progress indicator
5. Display transcript in an editable text area
6. Export transcript to TXT
7. Export transcript to DOCX
8. Handle errors gracefully

Non-functional requirements:
- App must be simple and stable
- Keep code modular and production-like
- Prepare structure for future additions such as timestamps and speaker diarization, but do not implement them now
- Keep the UI clean and minimal

Implementation preferences:
- Use clear folder structure
- Use reusable React components
- Use typed interfaces and types
- Add comments where needed
- Add error handling
- Add README with setup/build instructions
- Add scripts for local development and production build

Your task:
1. Create the project structure
2. Implement the application incrementally
3. Explain important architectural decisions briefly
4. Generate complete code, not pseudo-code
5. When external binaries/resources are needed, specify exactly where they should be placed
6. Assume the whisper.cpp binary and model will be bundled as local resources
7. Prefer a practical, buildable solution over overengineering

Important:
- Do not switch to cloud speech-to-text
- Do not replace whisper.cpp with an online model
- Do not ask unnecessary clarifying questions
- Make reasonable implementation assumptions and proceed