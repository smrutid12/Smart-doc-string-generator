"use client";

import { useState } from "react";
import { Check, Copy, Download, RotateCcw } from "lucide-react";

export default function DownloadResponse({
  resultCode,
  setResultCode,
  handleDownload,
}: {
  resultCode: string;
  setResultCode: (value: string) => void;
  handleDownload: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(resultCode);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 5000);
  }

  const lineCount = resultCode ? resultCode.split("\n").length : 1;

  return (
    <>
      {resultCode && (
        <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-lg">
          <div className="mb-5">
            <h3 className="text-xl font-semibold text-white">
              Generated Code with Docstrings
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Review, edit, copy, or download your generated code.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#2d2d2d] bg-[#1e1e1e] shadow-2xl">
            {/* Editor top bar */}
            <div className="flex items-center justify-between border-b border-[#2d2d2d] bg-[#252526] px-4 py-2">
              <div className="text-xs font-medium text-gray-400">
                docstring_output
              </div>

              <div className="text-xs text-gray-500">Generated Code</div>
            </div>

            {/* Editor body */}
            <div className="flex max-h-[520px] min-h-[320px] overflow-hidden bg-[#1e1e1e]">
              {/* Line numbers */}
              <div className="select-none border-r border-[#2d2d2d] bg-[#1e1e1e] px-3 py-3 text-right font-mono text-sm leading-6 text-gray-500">
                {(resultCode || "\n").split("\n").map((_, index) => (
                  <div key={index}>{index + 1}</div>
                ))}
              </div>

              {/* Result textarea */}
              <textarea
                value={resultCode}
                onChange={(e) => setResultCode(e.target.value)}
                className="
                  block min-h-[320px] w-full resize-y overflow-auto whitespace-pre
                  bg-[#1e1e1e] px-4 py-3 font-mono text-sm leading-6 text-gray-100
                  caret-indigo-400 placeholder:text-gray-600 focus:outline-none

                  [&::-webkit-scrollbar]:h-2
                  [&::-webkit-scrollbar]:w-2
                  [&::-webkit-scrollbar-track]:bg-[#1e1e1e]
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:bg-[#4b5563]
                  [&::-webkit-scrollbar-thumb:hover]:bg-[#6b7280]
                "
                spellCheck={false}
              />
            </div>

            {/* Bottom status bar */}
            <div className="flex items-center justify-between border-t border-[#2d2d2d] bg-[#0e639c] px-4 py-1 text-xs text-white">
              <span>Editable Output</span>
              <span>Lines: {lineCount}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              onClick={handleDownload}
            >
              <Download size={17} />
              Download File
            </button>

            <button
              type="button"
              className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition ${
                copied
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check size={17} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={17} />
                  Copy
                </>
              )}
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              onClick={() => setResultCode("")}
            >
              <RotateCcw size={17} />
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}