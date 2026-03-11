/**
 * Transcript as timestamped segments. Highlights the segment matching current playback time.
 * Clicking a segment seeks the audio to that segment's start (via onSeek).
 * MVP: segment-based display for sync playback; export uses plain text from segments.
 * Editable segment text is not implemented — export uses joined segment text.
 */

import { useEffect, useRef } from "react";
import type { TranscriptSegment as Segment } from "../types";

export interface TranscriptSegmentsProps {
  segments: Segment[];
  /** Current playback time in seconds; used to highlight the active segment. */
  currentTime: number;
  /** Total audio duration in seconds; when a single segment has start=0 end=0, it is treated as 0–duration. */
  duration?: number;
  /** Callback when user clicks a segment: seek audio to segment.start. */
  onSeek: (timeSeconds: number) => void;
}

/** True when we have no real timestamps (all segments 0,0); frontend distributes by duration. */
function hasNoTimestamps(segments: Segment[]): boolean {
  return segments.length > 0 && segments.every((s) => s.start === 0 && s.end === 0);
}

/** Effective start/end for a segment. When all segments are 0,0 and duration > 0, distribute proportionally. */
function effectiveRange(
  seg: Segment,
  index: number,
  segments: Segment[],
  duration: number
): { start: number; end: number } {
  if (hasNoTimestamps(segments) && duration > 0 && segments.length > 0) {
    const n = segments.length;
    const start = (index * duration) / n;
    const end = ((index + 1) * duration) / n;
    return { start, end };
  }
  const end =
    seg.start === 0 && seg.end === 0 && duration > 0 && segments.length === 1 ? duration : seg.end;
  return { start: seg.start, end };
}

/** Find index of segment that contains the given time (start <= time < end). */
function getActiveSegmentIndex(
  segments: Segment[],
  time: number,
  duration: number
): number {
  if (segments.length === 0) return -1;
  for (let i = 0; i < segments.length; i++) {
    const { start, end } = effectiveRange(segments[i], i, segments, duration);
    if (time >= start && time < end) return i;
  }
  if (time < effectiveRange(segments[0], 0, segments, duration).start) return 0;
  return segments.length - 1;
}

export function TranscriptSegments({
  segments,
  currentTime,
  duration = 0,
  onSeek,
}: TranscriptSegmentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);
  const activeIndex = getActiveSegmentIndex(segments, currentTime, duration);

  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current || !activeRef.current) return;
    const container = containerRef.current;
    const active = activeRef.current;
    // Position relative to scrollable content (offsetTop can be relative to a different ancestor)
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const activeTopInContent =
      container.scrollTop + (activeRect.top - containerRect.top);
    const activeBottomInContent = activeTopInContent + active.offsetHeight;
    const visibleBottom = container.scrollTop + container.clientHeight;
    const needsScroll =
      activeTopInContent < container.scrollTop ||
      activeBottomInContent > visibleBottom;
    if (needsScroll) {
      const targetScroll =
        activeTopInContent -
        container.clientHeight / 2 +
        active.offsetHeight / 2;
      const clamped = Math.max(
        0,
        Math.min(
          container.scrollHeight - container.clientHeight,
          targetScroll
        )
      );
      container.scrollTo({ top: clamped, behavior: "smooth" });
    }
  }, [activeIndex]);

  if (segments.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <h2 className="shrink-0 border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
          Transcrição
        </h2>
        <p className="flex flex-1 items-center justify-center rounded-b-lg bg-gray-50/50 px-3 py-6 text-center text-sm text-gray-500">
          A transcrição aparecerá aqui após processar o áudio.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <h2 className="shrink-0 border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
        Transcrição
      </h2>
      <div
        ref={containerRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
        role="region"
        aria-label="Segmentos da transcrição"
      >
        {segments.map((seg, i) => {
          const isActive = i === activeIndex;
          const { start: effStart, end: effEnd } = effectiveRange(seg, i, segments, duration);
          const hasTimestamps = !hasNoTimestamps(segments);
          const title = hasTimestamps
            ? `${effStart.toFixed(1)}s – ${effEnd.toFixed(1)}s (clique para ir)`
            : "Clique para reproduzir";
          return (
            <p
              key={i}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSeek(effStart)}
              className={`cursor-pointer rounded px-2 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-blue-100 text-gray-900 ring-1 ring-blue-300"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={title}
            >
              {seg.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
