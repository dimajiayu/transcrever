/**
 * Main app shell. Transcription UI will be composed from components.
 */
function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">Transcrever</h1>
      </header>
      <main className="p-6">
        <p className="text-gray-600">Offline desktop transcription app.</p>
      </main>
    </div>
  );
}

export default App;
