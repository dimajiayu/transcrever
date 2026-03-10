/**
 * Main page/container: composes all UI sections and holds app state.
 * Uses placeholder mock handlers until Tauri backend is connected.
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
import type { SelectedFile, TranscriptionStatus } from "./types";

const INITIAL_STATUS: TranscriptionStatus = "idle";
const INITIAL_MESSAGE = "Seleccione um ficheiro de áudio e inicie a transcrição.";

export default function App() {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [status, setStatus] = useState<TranscriptionStatus>(INITIAL_STATUS);
  const [statusMessage, setStatusMessage] = useState(INITIAL_MESSAGE);
  const [statusError, setStatusError] = useState<string | undefined>(undefined);
  const [transcript, setTranscript] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasFile = selectedFile !== null;
  const isLoading = status === "uploading" || status === "transcribing";
  const transcriptEmpty = transcript.trim().length === 0;

  const clearStatusError = useCallback(() => setStatusError(undefined), []);

  const handlePickFile = useCallback(() => {
    clearStatusError();
    fileInputRef.current?.click();
  }, [clearStatusError]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const path = (file as File & { path?: string }).path ?? file.name;
      setSelectedFile({ name: file.name, path, size: file.size });
      setStatus("idle");
      setStatusMessage(INITIAL_MESSAGE);
      setStatusError(undefined);
    },
    []
  );

  const handleFileSelect = useCallback((file: SelectedFile) => {
    setSelectedFile(file);
    setStatus("idle");
    setStatusMessage(INITIAL_MESSAGE);
    setStatusError(undefined);
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setStatus(INITIAL_STATUS);
    setStatusMessage(INITIAL_MESSAGE);
    setStatusError(undefined);
  }, []);

  /** Placeholder: simulate transcription until backend is connected. */
  const handleStartTranscription = useCallback(() => {
    if (!selectedFile) return;
    setStatus("transcribing");
    setStatusMessage("A processar o áudio…");
    setStatusError(undefined);

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
    // TODO: call Tauri command to save as .txt
    console.log("Export TXT (mock):", transcript.slice(0, 80) + "...");
  }, [transcript, transcriptEmpty]);

  /** Placeholder: export DOCX (mock until backend export is connected). */
  const handleExportDocx = useCallback(() => {
    if (transcriptEmpty) return;
    // TODO: call Tauri command to save as .docx
    console.log("Export DOCX (mock):", transcript.slice(0, 80) + "...");
  }, [transcript, transcriptEmpty]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.mp4,audio/*"
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
