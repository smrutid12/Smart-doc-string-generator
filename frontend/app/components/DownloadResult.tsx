"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileCode2,
  RotateCcw,
  Sparkles,
} from "lucide-react";

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
        <section className="overflow-hidden rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] shadow-2xl">
          {/* Result tab bar */}
          <div className="flex items-center justify-between border-b border-[#2d2d2d] bg-[#252526]">
            <div className="flex">
              <div className="flex items-center gap-2 border-r border-[#2d2d2d] bg-[#1e1e1e] px-4 py-2 text-sm text-white">
                <FileCode2 size={15} className="text-[#c3e88d]" />
                docstring_output
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 text-xs text-gray-500">
              <Sparkles size={14} className="text-indigo-300" />
              Generated Code
            </div>
          </div>

          {/* Result intro */}
          <div className="border-b border-[#2d2d2d] bg-[#181818] px-5 py-4">
            <h3 className="text-lg font-semibold text-white">
              Generated Code with Docstrings
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Review the output, edit if needed, then copy or download your final file.
            </p>
          </div>

          {/* Editor body */}
          <div className="flex max-h-[560px] min-h-[380px] overflow-hidden bg-[#1e1e1e]">
            {/* Line numbers */}
            <div className="select-none border-r border-[#2d2d2d] bg-[#1e1e1e] px-3 py-4 text-right font-mono text-sm leading-6 text-gray-500">
              {(resultCode || "\n").split("\n").map((_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>

            {/* Result textarea */}
            <textarea
              value={resultCode}
              onChange={(e) => setResultCode(e.target.value)}
              className="
                block min-h-[380px] w-full resize-y overflow-auto whitespace-pre
                bg-[#1e1e1e] px-4 py-4 font-mono text-sm leading-6 text-gray-100
                caret-[#89dceb] placeholder:text-gray-600 focus:outline-none

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

          {/* Bottom VS Code status bar */}
          <div className="flex items-center justify-between border-t border-[#2d2d2d] bg-[#0e639c] px-4 py-1.5 text-xs text-white">
            <span>Editable Output</span>
            <span>Lines: {lineCount}</span>
          </div>

          {/* Action panel */}
          <div className="flex flex-col gap-3 border-t border-[#2d2d2d] bg-[#181818] px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#007acc] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0e639c]"
              onClick={handleDownload}
            >
              <Download size={17} />
              Download File
            </button>

            <button
              type="button"
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                copied
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-[#2d2d30] hover:bg-[#3a3a3d]"
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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              onClick={() => setResultCode("")}
            >
              <RotateCcw size={17} />
              Try Again
            </button>
          </div>
        </section>
      )}
    </>
  );
}