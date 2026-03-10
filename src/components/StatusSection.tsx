/**
 * Status section: current status text, progress indicator, error area.
 */

import type { TranscriptionStatus } from "../types";

export interface StatusSectionProps {
  status: TranscriptionStatus;
  message: string;
  error?: string;
}

const statusLabels: Record<TranscriptionStatus, string> = {
  idle: "Pronto",
  uploading: "A carregar…",
  transcribing: "A transcrever…",
  success: "Concluído",
  error: "Erro",
};

export function StatusSection({ status, message, error }: StatusSectionProps) {
  const isBusy = status === "uploading" || status === "transcribing";

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-gray-700">Estado</h2>
      <div className="flex items-center gap-2">
        {isBusy && (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700"
            aria-hidden
          />
        )}
        <span className="text-sm text-gray-700">
          {statusLabels[status]}: {message}
        </span>
      </div>
      {error && (
        <div
          className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}
    </section>
  );
}
