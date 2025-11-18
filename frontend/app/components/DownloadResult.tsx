export default function DownloadResponse({
  resultCode,
  setResultCode,
  handleDownload,
}: {
  resultCode: string;
  setResultCode: (value: string) => void;
  handleDownload: () => void;
}) {
  return (
    <>
      {resultCode && (
        <div className="mt-10 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Generated Code with Docstrings
          </h3>

          <textarea
            value={resultCode}
            onChange={(e) => setResultCode(e.target.value)}
            className="w-full h-80 bg-[#1e1e1e] text-gray-100 font-mono text-sm p-4 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            spellCheck={false}
          />

          <div className="flex gap-4 mt-4">
            <button
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
              onClick={handleDownload}
            >
              Download File
            </button>

            <button
              className="px-4 py-2 bg-gray-700 text-white font-medium rounded-md hover:bg-gray-600"
              onClick={() => navigator.clipboard.writeText(resultCode)}
            >
              Copy to Clipboard
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700"
              onClick={() => setResultCode("")}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
