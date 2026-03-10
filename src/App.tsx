/**
 * Main page/container: composes all UI sections and holds app state.
 * File upload uses validation; payload is prepared for Tauri backend.
 */

import { useCallback, useRef, useState } from "react";
import {
  Header,
  AudioUploadSection,
  ActionSection,
  StatusSection,
  TranscriptSection,
  ExportSection,
} from "./components";
import { FILE_INPUT_ACCEPT, MAX_FILE_SIZE_BYTES } from "./constants/upload";
import { validateAudioFile, validateSelectedFileLike } from "./utils/fileValidation";
import { prepareAudioFilePayload } from "./utils/upload";
import { validateAudioPath } from "./api/tauri";
import type { SelectedFile, TranscriptionStatus } from "./types";

const INITIAL_STATUS: TranscriptionStatus = "idle";
const INITIAL_MESSAGE = "Seleccione um ficheiro de áudio e inicie a transcrição.";

/** Builds SelectedFile from a validated File (path from Tauri when available). */
function fileToSelectedFile(file: File): SelectedFile {
  const path = (file as File & { path?: string }).path ?? file.name;
  return { name: file.name, path, size: file.size };
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [status, setStatus] = useState<TranscriptionStatus>(INITIAL_STATUS);
  const [statusMessage, setStatusMessage] = useState(INITIAL_MESSAGE);
  const [statusError, setStatusError] = useState<string | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasFile = selectedFile !== null;
  const isLoading = status === "uploading" || status === "transcribing";
  const transcriptEmpty = transcript.trim().length === 0;

  const clearStatusError = useCallback(() => setStatusError(undefined), []);
  const clearValidationError = useCallback(() => setValidationError(null), []);

  const handlePickFile = useCallback(() => {
    clearStatusError();
    clearValidationError();
    fileInputRef.current?.click();
  }, [clearStatusError, clearValidationError]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      const result = validateAudioFile(file, MAX_FILE_SIZE_BYTES);
      if (!result.ok) {
        setValidationError(result.error);
        setStatusError(result.error);
        setSelectedFile(null);
        setStatus("error");
        setStatusMessage("Ficheiro rejeitado.");
        return;
      }

      setValidationError(null);
      setStatusError(undefined);
      setSelectedFile(fileToSelectedFile(file));
      setStatus("idle");
      setStatusMessage(INITIAL_MESSAGE);
    },
    []
  );

  const handleFileSelect = useCallback((file: SelectedFile) => {
    const result = validateSelectedFileLike(file, MAX_FILE_SIZE_BYTES);
    if (!result.ok) {
      setValidationError(result.error);
      setStatusError(result.error);
      setSelectedFile(null);
      setStatus("error");
      setStatusMessage("Ficheiro rejeitado.");
      return;
    }
    setValidationError(null);
    setStatusError(undefined);
    setSelectedFile(file);
    setStatus("idle");
    setStatusMessage(INITIAL_MESSAGE);
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setStatus(INITIAL_STATUS);
    setStatusMessage(INITIAL_MESSAGE);
    setStatusError(undefined);
    setValidationError(null);
  }, []);

  /** Validates path with Tauri, then runs transcription (mock until whisper is wired). */
  const handleStartTranscription = useCallback(async () => {
    if (!selectedFile) return;
    const payload = prepareAudioFilePayload(selectedFile);
    setStatusError(undefined);

    try {
      const backendValidation = await validateAudioPath(payload.path);
      if (!backendValidation.valid && backendValidation.error) {
        setStatus("error");
        setStatusMessage("Erro de validação.");
        setStatusError(backendValidation.error);
        return;
      }
    } catch (e) {
      // Tauri not available (e.g. browser dev); allow mock transcription
      console.warn("Tauri validate_audio_path not available:", e);
    }

    setStatus("transcribing");
    setStatusMessage("A processar o áudio…");

    // TODO: replace with invoke('start_transcription', { path: payload.path })
    setTimeout(() => {
      setStatus("success");
      setStatusMessage("Transcrição concluída.");
      setTranscript(
        "[Transcrição simulada]\n\nEste é um texto de exemplo. Quando o motor de transcrição (whisper.cpp) estiver ligado, o conteúdo real do áudio aparecerá aqui.\n\nPode editar o texto antes de exportar."
      );
    }, 2500);
  }, [selectedFile]);

  /** Placeholder: export TXT (mock until backend export is connected). */
  const handleExportTxt = useCallback(() => {
    if (transcriptEmpty) return;
    console.log("Export TXT (mock):", transcript.slice(0, 80) + "...");
  }, [transcript, transcriptEmpty]);

  /** Placeholder: export DOCX (mock until backend export is connected). */
  const handleExportDocx = useCallback(() => {
    if (transcriptEmpty) return;
    console.log("Export DOCX (mock):", transcript.slice(0, 80) + "...");
  }, [transcript, transcriptEmpty]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_INPUT_ACCEPT}
          className="hidden"
          onChange={handleFileInputChange}
          aria-hidden
        />
        <AudioUploadSection
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          onClearFile={handleClearFile}
          onPickFile={handlePickFile}
          isDragOver={isDragOver}
          onDragOver={setIsDragOver}
          validationError={validationError}
        />
        <ActionSection
          hasFile={hasFile}
          isLoading={isLoading}
          onStartTranscription={handleStartTranscription}
        />
        <StatusSection
          status={status}
          message={statusMessage}
          error={statusError}
        />
        <TranscriptSection transcript={transcript} onChange={setTranscript} />
        <ExportSection
          transcriptEmpty={transcriptEmpty}
          onExportTxt={handleExportTxt}
          onExportDocx={handleExportDocx}
        />
      </main>
    </div>
  );
}
