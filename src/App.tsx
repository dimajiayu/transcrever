/**
 * Main page/container: composes all UI sections and holds app state.
 * File upload uses validation; payload is prepared for Tauri backend.
 */

import { useCallback, useRef, useState } from "react";
import {
  Header,
  ControlsSection,
  AudioPlayer,
  TranscriptSection,
  TranscriptSegments,
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
  convertAudioToWav,
} from "./api/tauri";
import type { SelectedFile, SelectedModel, TranscriptionStatus, TranscriptSegment } from "./types";

const INITIAL_STATUS: TranscriptionStatus = "idle";
const INITIAL_MESSAGE =
  "Seleccione um ficheiro de áudio, um modelo Whisper (.bin) e inicie a transcrição.";

/** Builds SelectedFile from a validated File (path from Tauri when available). */
function fileToSelectedFile(file: File): SelectedFile {
  const path = (file as File & { path?: string }).path ?? file.name;
  return { name: file.name, path, size: file.size };
}

function isM4aOrMp4(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".m4a") || lower.endsWith(".mp4");
}

function replaceExtensionToWav(name: string): string {
  return name.replace(/\.(m4a|mp4)$/i, ".wav");
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
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isModelDragOver, setIsModelDragOver] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [engineMode, setEngineMode] = useState<"accelerate" | "portable" | null>(null);
  const [compatibilityWarning, setCompatibilityWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasFile = selectedFile !== null;
  const hasModel = selectedModel !== null;
  const showConvertSuggestion = hasFile && isM4aOrMp4(selectedFile!.name);
  const isLoading = status === "uploading" || status === "transcribing" || isConverting;
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
    setTranscript("");
    setTranscriptSegments([]);
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

  const handleConvertToWav = useCallback(async () => {
    if (!selectedFile || !isM4aOrMp4(selectedFile.name)) return;
    setStatusError(undefined);
    setIsConverting(true);
    try {
      const result = await convertAudioToWav(selectedFile.path);
      if ("path" in result) {
        setSelectedFile({
          name: replaceExtensionToWav(selectedFile.name),
          path: result.path,
          size: undefined,
        });
        setStatusMessage(INITIAL_MESSAGE);
      } else {
        setStatusError(result.error);
        setStatus("error");
        setStatusMessage("Erro na conversão.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setStatusError(message);
      setStatus("error");
      setStatusMessage("Erro na conversão.");
    } finally {
      setIsConverting(false);
    }
  }, [selectedFile]);

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
    setStatusMessage(
      "A processar o áudio… Em Macs mais antigos ou sem aceleração, a primeira transcrição pode demorar vários minutos. Aguarde."
    );
    setEngineMode(null);
    setCompatibilityWarning(null);

    try {
      const result = await transcribeAudio(payload.path, selectedModel.path);
      if (result.success && result.text !== undefined) {
        setStatus("success");
        setStatusMessage("Transcrição concluída.");
        setTranscript(result.text ?? "");
        setTranscriptSegments(result.segments ?? []);
        setEngineMode(result.engine_used ?? null);
        setCompatibilityWarning(
          result.fallback_used && result.warning ? result.warning : null
        );
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

  const handleSeekTo = useCallback((timeSeconds: number) => {
    const el = audioRef.current;
    if (el) {
      el.currentTime = timeSeconds;
      setPlaybackTime(timeSeconds);
    }
  }, []);

  /** Export transcript to TXT: save dialog then Tauri command; show success/error feedback. */
  const handleExportTxt = useCallback(async () => {
    if (transcriptEmpty) return;
    setExportFeedback(null);
    const result = await exportTxtToFile(transcript, transcriptSegments, selectedFile?.name ?? undefined);
    if (result.success) {
      setExportFeedback({ message: "Ficheiro guardado.", success: true });
      setTimeout(() => setExportFeedback(null), 4000);
    } else if (result.error) {
      setExportFeedback({ message: result.error, success: false });
      setTimeout(() => setExportFeedback(null), 4000);
    }
    // User cancelled: no message shown.
  }, [transcript, transcriptEmpty, transcriptSegments, selectedFile?.name]);

  /** Export transcript to DOCX: save dialog then Tauri command; show success/error feedback. */
  const handleExportDocx = useCallback(async () => {
    if (transcriptEmpty) return;
    setExportFeedback(null);
    const result = await exportDocxToFile(transcript, transcriptSegments, selectedFile?.name ?? undefined);
    if (result.success) {
      setExportFeedback({ message: "Ficheiro guardado.", success: true });
      setTimeout(() => setExportFeedback(null), 4000);
    } else if (result.error) {
      setExportFeedback({ message: result.error, success: false });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  }, [transcript, transcriptEmpty, transcriptSegments, selectedFile?.name]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-2 md:mx-auto md:max-w-3xl md:w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_INPUT_ACCEPT}
          className="hidden"
          onChange={handleFileInputChange}
          aria-hidden
        />
        <ControlsSection
          selectedFile={selectedFile}
          selectedModel={selectedModel}
          status={status}
          statusMessage={statusMessage}
          statusError={statusError}
          validationError={validationError}
          modelValidationError={modelValidationError}
          hasFile={hasFile}
          hasModel={hasModel}
          isLoading={isLoading}
          engineMode={engineMode}
          compatibilityWarning={compatibilityWarning}
          onPickFile={handlePickFile}
          onClearFile={handleClearFile}
          onPickModel={handlePickModel}
          onClearModel={handleClearModel}
          onFileSelect={handleFileSelect}
          onModelSelect={handleModelSelect}
          onStartTranscription={handleStartTranscription}
          isDragOver={isDragOver}
          isModelDragOver={isModelDragOver}
          onDragOver={setIsDragOver}
          onModelDragOver={setIsModelDragOver}
        />
        {showConvertSuggestion && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-sm text-amber-800">
              M4A/MP4: converter para WAV para melhor compatibilidade.
            </p>
            <button
              type="button"
              onClick={handleConvertToWav}
              disabled={isConverting}
              className="shrink-0 rounded bg-amber-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-amber-800"
            >
              {isConverting ? "A converter…" : "Converter para WAV"}
            </button>
          </div>
        )}
        <AudioPlayer
          audioPath={selectedFile?.path ?? null}
          onTimeUpdate={setPlaybackTime}
          onDurationChange={setAudioDuration}
          audioRef={audioRef}
        />
        <div className="flex max-h-[calc(100vh-20rem)] min-h-0 flex-1 flex-col overflow-hidden">
          {transcriptSegments.length > 0 ? (
            <TranscriptSegments
              segments={transcriptSegments}
              currentTime={playbackTime}
              duration={audioDuration}
              onSeek={handleSeekTo}
            />
          ) : (
            <TranscriptSection transcript={transcript} onChange={setTranscript} />
          )}
        </div>
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
