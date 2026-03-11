/**
 * Main page/container: composes all UI sections and holds app state.
 * File upload uses validation; payload is prepared for Tauri backend.
 */

import { useCallback, useRef, useState } from "react";
import {
  Header,
  AudioUploadSection,
  ModelSelectSection,
  ActionSection,
  StatusSection,
  TranscriptSection,
  ExportSection,
} from "./components";
import { FILE_INPUT_ACCEPT, MAX_FILE_SIZE_BYTES } from "./constants/upload";
import {
  validateAudioFile,
  validateSelectedFileLike,
  validateModelFileLike,
} from "./utils/fileValidation";
import { prepareAudioFilePayload } from "./utils/upload";
import {
  exportDocxToFile,
  exportTxtToFile,
  isTauriAvailable,
  openAudioFile,
  openModelFile,
  transcribeAudio,
  validateAudioPath,
  validateModelPath,
} from "./api/tauri";
import type { SelectedFile, SelectedModel, TranscriptionStatus } from "./types";

const INITIAL_STATUS: TranscriptionStatus = "idle";
const INITIAL_MESSAGE =
  "Seleccione um ficheiro de áudio, um modelo Whisper (.bin) e inicie a transcrição.";

/** Builds SelectedFile from a validated File (path from Tauri when available). */
function fileToSelectedFile(file: File): SelectedFile {
  const path = (file as File & { path?: string }).path ?? file.name;
  return { name: file.name, path, size: file.size };
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
  const [status, setStatus] = useState<TranscriptionStatus>(INITIAL_STATUS);
  const [statusMessage, setStatusMessage] = useState(INITIAL_MESSAGE);
  const [statusError, setStatusError] = useState<string | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [modelValidationError, setModelValidationError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isModelDragOver, setIsModelDragOver] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasFile = selectedFile !== null;
  const hasModel = selectedModel !== null;
  const isLoading = status === "uploading" || status === "transcribing";
  const transcriptEmpty = transcript.trim().length === 0;

  const clearStatusError = useCallback(() => setStatusError(undefined), []);
  const clearValidationError = useCallback(() => setValidationError(null), []);

  const handlePickFile = useCallback(async () => {
    clearStatusError();
    clearValidationError();
    if (isTauriAvailable()) {
      const path = await openAudioFile();
      if (!path) return;
      const name = path.replace(/^.*[/\\]/, "");
      const file: SelectedFile = { name, path, size: undefined };
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
    } else {
      fileInputRef.current?.click();
    }
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

  const handlePickModel = useCallback(async () => {
    setModelValidationError(null);
    if (isTauriAvailable()) {
      const path = await openModelFile();
      if (!path) return;
      const name = path.replace(/^.*[/\\]/, "");
      const result = validateModelFileLike(name);
      if (!result.ok) {
        setModelValidationError(result.error);
        setSelectedModel(null);
        return;
      }
      setModelValidationError(null);
      setSelectedModel({ name, path });
    }
  }, []);

  const handleModelSelect = useCallback((model: SelectedModel) => {
    const result = validateModelFileLike(model.name);
    if (!result.ok) {
      setModelValidationError(result.error);
      setSelectedModel(null);
      return;
    }
    setModelValidationError(null);
    setSelectedModel(model);
  }, []);

  const handleClearModel = useCallback(() => {
    setSelectedModel(null);
    setModelValidationError(null);
  }, []);

  /** Validates audio and model paths with Tauri, then runs transcription via whisper.cpp. */
  const handleStartTranscription = useCallback(async () => {
    if (!selectedFile || !selectedModel) return;
    const payload = prepareAudioFilePayload(selectedFile);
    setStatusError(undefined);

    try {
      const [audioValidation, modelValidation] = await Promise.all([
        validateAudioPath(payload.path),
        validateModelPath(selectedModel.path),
      ]);
      if (!audioValidation.valid && audioValidation.error) {
        setStatus("error");
        setStatusMessage("Erro de validação do áudio.");
        setStatusError(audioValidation.error);
        return;
      }
      if (!modelValidation.valid && modelValidation.error) {
        setStatus("error");
        setStatusMessage("Erro de validação do modelo.");
        setStatusError(modelValidation.error);
        return;
      }
    } catch (e) {
      setStatus("error");
      setStatusMessage("Transcrição indisponível.");
      setStatusError("A transcrição requer a aplicação desktop (npm run tauri:dev).");
      return;
    }

    setStatus("transcribing");
    setStatusMessage("A processar o áudio…");

    try {
      const result = await transcribeAudio(payload.path, selectedModel.path);
      if (result.success && result.text !== undefined) {
        setStatus("success");
        setStatusMessage("Transcrição concluída.");
        setTranscript(result.text ?? "");
      } else {
        setStatus("error");
        setStatusMessage("Erro na transcrição.");
        setStatusError(result.error ?? "Erro desconhecido.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setStatus("error");
      setStatusMessage("Erro na transcrição.");
      setStatusError(message);
    }
  }, [selectedFile, selectedModel]);

  /** Export transcript to TXT: save dialog then Tauri command; show success/error feedback. */
  const handleExportTxt = useCallback(async () => {
    if (transcriptEmpty) return;
    setExportFeedback(null);
    const result = await exportTxtToFile(transcript);
    if (result.success) {
      setExportFeedback({ message: "Ficheiro guardado.", success: true });
      setTimeout(() => setExportFeedback(null), 4000);
    } else if (result.error) {
      setExportFeedback({ message: result.error, success: false });
      setTimeout(() => setExportFeedback(null), 4000);
    }
    // User cancelled: no message shown.
  }, [transcript, transcriptEmpty]);

  /** Export transcript to DOCX: save dialog then Tauri command; show success/error feedback. */
  const handleExportDocx = useCallback(async () => {
    if (transcriptEmpty) return;
    setExportFeedback(null);
    const result = await exportDocxToFile(transcript);
    if (result.success) {
      setExportFeedback({ message: "Ficheiro guardado.", success: true });
      setTimeout(() => setExportFeedback(null), 4000);
    } else if (result.error) {
      setExportFeedback({ message: result.error, success: false });
      setTimeout(() => setExportFeedback(null), 4000);
    }
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
        <ModelSelectSection
          selectedModel={selectedModel}
          onModelSelect={handleModelSelect}
          onClearModel={handleClearModel}
          onPickModel={handlePickModel}
          isDragOver={isModelDragOver}
          onDragOver={setIsModelDragOver}
          validationError={modelValidationError}
        />
        <ActionSection
          hasFile={hasFile}
          hasModel={hasModel}
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
          exportFeedback={exportFeedback}
        />
      </main>
    </div>
  );
}
