/**
 * Transcript section: editable, scrollable text area (copy-friendly).
 */

export interface TranscriptSectionProps {
  transcript: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TranscriptSection({
  transcript,
  onChange,
  placeholder = "A transcrição aparecerá aqui…",
}: TranscriptSectionProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-gray-700">Transcrição</h2>
      <textarea
        value={transcript}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={12}
        className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        spellCheck={true}
      />
    </section>
  );
}
