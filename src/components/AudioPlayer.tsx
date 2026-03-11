/**
 * Audio player: play/pause, time, duration, seek bar.
 * Uses the selected local audio file path; in Tauri, convertFileSrc() is used so the webview can load the file.
 * Fully offline — no remote URLs.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioPlayerProps {
  /** Local file path to the audio file (from file picker or conversion). When null, player is disabled. */
  audioPath: string | null;
  /** Called when playback position changes (in seconds). */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when duration is known (in seconds). */
  onDurationChange?: (duration: number) => void;
  /** Ref to the underlying <audio> element so parent can seek (e.g. on segment click). */
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  audioPath,
  onTimeUpdate,
  onDurationChange,
  audioRef: externalAudioRef,
}: AudioPlayerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const internalRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioPath) {
      setSrc(null);
      setCurrentTime(0);
      setDuration(0);
      setPlaying(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const { convertFileSrc } = await import("@tauri-apps/api/core");
        const url = convertFileSrc(audioPath);
        if (!cancelled) {
          setSrc(url);
        }
      } catch {
        if (!cancelled) setSrc(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioPath]);

  const handleTimeUpdate = useCallback(() => {
    const el = internalRef.current;
    if (el) {
      const t = el.currentTime;
      setCurrentTime(t);
      onTimeUpdate?.(t);
    }
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    const el = internalRef.current;
    if (el) {
      const d = el.duration;
      setDuration(Number.isFinite(d) ? d : 0);
      onDurationChange?.(Number.isFinite(d) ? d : 0);
    }
  }, [onDurationChange]);

  const handlePlay = useCallback(() => setPlaying(true), []);
  const handlePause = useCallback(() => setPlaying(false), []);
  const handleEnded = useCallback(() => setPlaying(false), []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = internalRef.current;
      const value = parseFloat(e.target.value);
      if (el && Number.isFinite(value)) {
        el.currentTime = value;
        setCurrentTime(value);
        onTimeUpdate?.(value);
      }
    },
    [onTimeUpdate]
  );

  const togglePlay = useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {
        // Play failed (e.g. scope/load error); keep UI in sync
        setPlaying(false);
      });
    } else {
      el.pause();
    }
  }, []);

  const setAudioRef = useCallback(
    (node: HTMLAudioElement | null) => {
      (internalRef as React.MutableRefObject<HTMLAudioElement | null>).current = node;
      if (externalAudioRef) {
        (externalAudioRef as React.MutableRefObject<HTMLAudioElement | null>).current = node;
      }
    },
    [externalAudioRef]
  );

  const disabled = !src || loading;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
      {disabled ? (
        <p className="py-2 text-center text-sm text-gray-500">
          {loading ? "A carregar…" : "Seleccione e transcreva um ficheiro para reproduzir."}
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <audio
            ref={setAudioRef}
            src={src ?? undefined}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            preload="metadata"
            className="hidden"
          />
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pausar" : "Reproduzir"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800"
          >
            {playing ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>
          <span className="min-w-[2.5rem] text-xs tabular-nums text-gray-600">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="min-w-0 flex-1 accent-gray-800"
            aria-label="Posição na faixa"
          />
          <span className="min-w-[2.5rem] text-right text-xs tabular-nums text-gray-600">
            {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}
