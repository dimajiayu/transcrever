/**
 * App header with title and subtitle.
 */

export interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = "Transcrever", subtitle = "Transcrição de áudio offline" }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {subtitle && (
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      )}
    </header>
  );
}
