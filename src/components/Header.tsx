/**
 * App header with title and subtitle.
 */

export interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = "Transcrever", subtitle = "Transcrição de áudio offline" }: HeaderProps) {
  return (
    <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      {subtitle && (
        <p className="text-xs text-gray-500">{subtitle}</p>
      )}
    </header>
  );
}
