"use client";

import { useState, ChangeEvent, FormEvent, useRef } from "react";
import {
  Bot,
  Braces,
  Code2,
  FileCode2,
  FileUp,
  Info,
  Loader2,
  Play,
  Sparkles,
  Terminal,
  WandSparkles,
} from "lucide-react";
import { generateDocstring } from "../services/docstringService";
import DownloadResponse from "./DownloadResult";

type LanguageOption =
  | "Python"
  | "JavaScript"
  | "TypeScript"
  | "Java"
  | "C++"
  | "C";

type DocStringFormat =
  | "Google"
  | "NumPy"
  | "PEP-257"
  | "JSDoc"
  | "TSDoc"
  | "JavaDoc"
  | "Doxygen";

const languageOptions: LanguageOption[] = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C",
  "C++",
];

const formatOptionsByLanguage: Record<LanguageOption, DocStringFormat[]> = {
  Python: ["Google", "NumPy", "PEP-257"],
  JavaScript: ["JSDoc"],
  TypeScript: ["TSDoc", "JSDoc"],
  Java: ["JavaDoc"],
  C: ["Doxygen"],
  "C++": ["Doxygen"],
};

const fileNameByLanguage: Record<LanguageOption, string> = {
  Python: "main.py",
  JavaScript: "main.js",
  TypeScript: "main.ts",
  Java: "Main.java",
  C: "main.c",
  "C++": "main.cpp",
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="relative group inline-flex">
      <div className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[#2d2d30] text-gray-300 transition hover:bg-[#3a3a3d] hover:text-white">
        <Info size={12} />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-7 z-50 w-72 -translate-x-1/2 rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-xs leading-5 text-gray-300 opacity-0 shadow-2xl transition group-hover:opacity-100">
        {text}
      </div>
    </div>
  );
}

export default function UploadFile() {
  const [language, setLanguage] = useState<LanguageOption>("Python");
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<DocStringFormat>(
    formatOptionsByLanguage["Python"][0],
  );
  const [inputMode, setInputMode] = useState<"code" | "file">("code");
  const [loading, setLoading] = useState(false);
  const [resultCode, setResultCode] = useState<string>("");
  const lineNumberRef = useRef<HTMLDivElement | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleModeChange = (mode: "code" | "file") => {
    setInputMode(mode);
    if (mode === "code") setFile(null);
    if (mode === "file") setCode("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (inputMode === "file" && !file) {
      alert("Please upload a file!");
      return;
    }

    if (inputMode === "code" && !code.trim()) {
      alert("Please enter some code!");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("language", language);
    formData.append("format", format);
    formData.append("mode", inputMode);

    if (inputMode === "file" && file) formData.append("file", file);
    if (inputMode === "code") formData.append("code", code);

    try {
      const result = await generateDocstring(formData);
      console.log("Backend Response:", result);
      setResultCode(result.modified_code);
    } catch (err: unknown) {
      console.error(err);

      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultCode) return;

    const extMap: Record<LanguageOption, string> = {
      Python: "py",
      JavaScript: "js",
      TypeScript: "ts",
      Java: "java",
      C: "c",
      "C++": "cpp",
    };

    const ext = extMap[language] || "txt";

    const blob = new Blob([resultCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `docstring_output.${ext}`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const lineCount = code ? code.split("\n").length : 1;

  return (
    <div className="min-h-dvh bg-[#0d1117] text-gray-100">
      {/* Top VS Code title bar */}
      <header className="flex h-12 items-center border-b border-[#2d2d2d] bg-[#181818] px-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#007acc] text-white shadow-lg shadow-blue-500/20">
            <Code2 size={16} />
          </div>
          Smart Doc Studio
        </div>

        <div className="mx-auto hidden w-[45%] items-center gap-2 rounded-lg border border-[#3c3c3c] bg-[#1f1f1f] px-3 py-1.5 text-sm text-gray-400 shadow-inner md:flex">
          <Sparkles size={15} className="text-indigo-400" />
          <span className="truncate">
            Generate clean docstrings for {language} using {format}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-[#252526] px-3 py-1 text-xs text-gray-400">
          <Bot size={14} className="text-green-400" />
          AI Ready
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-48px)]">
        {/* Activity bar */}
        <aside className="hidden w-14 flex-col items-center border-r border-[#2d2d2d] bg-[#181818] py-4 md:flex">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#2d2d30] text-[#89dceb]">
            <FileCode2 size={19} />
          </div>
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-[#2d2d30] hover:text-white">
            <Terminal size={19} />
          </div>
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-[#2d2d30] hover:text-white">
            <Braces size={19} />
          </div>
          <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
            <WandSparkles size={19} />
          </div>
        </aside>

        {/* Explorer panel */}
        <aside className="hidden w-64 border-r border-[#2d2d2d] bg-[#1e1e1e] p-4 lg:block">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Explorer
          </p>

          <div className="space-y-2">
            <div className="rounded-lg bg-[#252526] p-3">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-200">
                <FileCode2 size={15} className="text-blue-400" />
                docstring-project
              </div>

              <div className="ml-5 space-y-2 text-sm text-gray-400">
                {/* Main input file */}
                <div
                  className={`flex items-center gap-2 rounded-md px-2 py-1 transition ${
                    !resultCode
                      ? "bg-[#37373d] text-white"
                      : "text-gray-400 hover:bg-[#2d2d30] hover:text-white"
                  }`}
                >
                  <Code2
                    size={14}
                    className={
                      !resultCode ? "text-yellow-300" : "text-gray-500"
                    }
                  />
                  {fileNameByLanguage[language]}
                </div>

                {/* Generated output file */}
                <div
                  className={`flex items-center gap-2 rounded-md px-2 py-1 transition ${
                    resultCode
                      ? "bg-[#37373d] text-white"
                      : "text-gray-500 hover:bg-[#2d2d30] hover:text-gray-300"
                  }`}
                >
                  <Sparkles
                    size={14}
                    className={resultCode ? "text-purple-300" : "text-gray-600"}
                  />
                  docstring_output
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main editor area */}
        <main className="flex-1 overflow-y-auto bg-[#1e1e1e]">
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-6xl p-4 md:p-6"
          >
            {/* Fun hero / command panel */}
            <section className="mb-5 overflow-hidden rounded-2xl border border-[#2d2d2d] bg-[#181818] shadow-2xl">
              <div className="border-b border-[#2d2d2d] bg-[#252526] px-4 py-2 text-xs text-gray-400">
                command-center.tsx
              </div>

              <div className="relative p-5 md:p-7">
                <div className="absolute right-6 top-6 hidden rounded-full bg-indigo-500/10 px-4 py-2 text-xs text-indigo-300 ring-1 ring-indigo-500/20 md:block">
                  ✨ Built for developers who care about maintainable code
                </div>

                <div className="max-w-2xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#3c3c3c] bg-[#252526] px-3 py-1 text-xs text-gray-400">
                    <WandSparkles size={14} className="text-indigo-300" />
                    AI Docstring Generator
                  </div>

                  <h1 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
                    {resultCode
                      ? "Your docstrings compiled successfully."
                      : "Paste code. Pick a style. Generate clean docs."}
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400 md:text-base">
                    {resultCode
                      ? "Review your generated output, edit it if needed, then copy or download the final file."
                      : "Turn raw code into clear, consistent, production-ready documentation — right from a developer-friendly workspace."}
                  </p>
                </div>
              </div>
            </section>

            {resultCode === "" && (
              <>
                {/* Settings in header-like bar */}
                <section className="mb-5 rounded-2xl border border-[#2d2d2d] bg-[#181818] p-4 shadow-xl">
                  <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                        Language
                        <InfoTooltip text="Choose the programming language that matches your pasted code or uploaded file." />
                      </label>

                      <select
                        value={language}
                        onChange={(e) => {
                          const selectedLanguage = e.target
                            .value as LanguageOption;
                          setLanguage(selectedLanguage);
                          setFormat(
                            formatOptionsByLanguage[selectedLanguage][0],
                          );
                        }}
                        className="block w-full rounded-lg border border-[#3c3c3c] bg-[#252526] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#007acc] focus:ring-2 focus:ring-[#007acc]/30"
                      >
                        {languageOptions.map((lang) => (
                          <option
                            key={lang}
                            value={lang}
                            className="bg-[#252526] text-white"
                          >
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                        Docstring Format
                        <InfoTooltip text="Formats are filtered based on the selected language, so only valid options appear." />
                      </label>

                      <select
                        value={format}
                        onChange={(e) =>
                          setFormat(e.target.value as DocStringFormat)
                        }
                        className="block w-full rounded-lg border border-[#3c3c3c] bg-[#252526] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#007acc] focus:ring-2 focus:ring-[#007acc]/30"
                      >
                        {formatOptionsByLanguage[language].map((f) => (
                          <option
                            key={f}
                            value={f}
                            className="bg-[#252526] text-white"
                          >
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex rounded-lg border border-[#3c3c3c] bg-[#252526] p-1">
                      <button
                        type="button"
                        onClick={() => handleModeChange("code")}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                          inputMode === "code"
                            ? "bg-[#007acc] text-white shadow-lg shadow-blue-500/20"
                            : "text-gray-400 hover:bg-[#2d2d30] hover:text-white"
                        }`}
                      >
                        <Code2 size={16} />
                        Code
                      </button>

                      <button
                        type="button"
                        onClick={() => handleModeChange("file")}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                          inputMode === "file"
                            ? "bg-[#007acc] text-white shadow-lg shadow-blue-500/20"
                            : "text-gray-400 hover:bg-[#2d2d30] hover:text-white"
                        }`}
                      >
                        <FileUp size={16} />
                        File
                      </button>
                    </div>
                  </div>
                </section>

                {inputMode === "code" && (
                  <section className="overflow-hidden rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] shadow-2xl">
                    {/* Editor tab bar */}
                    <div className="flex items-center justify-between border-b border-[#2d2d2d] bg-[#252526]">
                      <div className="flex">
                        <div className="flex items-center gap-2 border-r border-[#2d2d2d] bg-[#1e1e1e] px-4 py-2 text-sm text-white">
                          <FileCode2 size={15} className="text-[#89dceb]" />
                          {fileNameByLanguage[language]}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-4 text-xs text-gray-500">
                        <Sparkles size={14} className="text-indigo-300" />
                        Code Editor
                      </div>
                    </div>

                    {/* Editor body */}
                    {/* Editor body */}
                    <div className="flex h-[55dvh] min-h-[320px] overflow-hidden bg-[#1e1e1e] sm:h-[520px]">
                      <div
                        ref={lineNumberRef}
                        className="w-12 shrink-0 select-none overflow-hidden border-r border-[#2d2d2d] bg-[#1e1e1e] px-3 py-4 text-right font-mono text-sm leading-6 text-gray-500"
                      >
                        {(code || "\n").split("\n").map((_, index) => (
                          <div key={index}>{index + 1}</div>
                        ))}
                      </div>

                      <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onScroll={(e) => {
                          if (lineNumberRef.current) {
                            lineNumberRef.current.scrollTop =
                              e.currentTarget.scrollTop;
                          }
                        }}
                        placeholder={`// Paste your ${language} code here...`}
                        className="
                          block h-full min-w-0 flex-1 resize-none overflow-auto whitespace-pre
                          bg-[#1e1e1e] px-4 py-4 font-mono text-sm leading-6 text-gray-100
                          caret-[#89dceb] placeholder:text-gray-600 focus:outline-none

                          [&::-webkit-scrollbar]:h-2
                          [&::-webkit-scrollbar]:w-2
                          [&::-webkit-scrollbar-track]:bg-[#1e1e1e]
                          [&::-webkit-scrollbar-thumb]:rounded-full
                          [&::-webkit-scrollbar-thumb]:bg-[#4b5563]
                          [&::-webkit-scrollbar-thumb:hover]:bg-[#6b7280]
                        "
                        rows={14}
                        spellCheck={false}
                        onKeyDown={(e) => {
                          if (e.key === "Tab") {
                            e.preventDefault();

                            const target = e.target as HTMLTextAreaElement;
                            const start = target.selectionStart;
                            const end = target.selectionEnd;

                            const newValue =
                              target.value.substring(0, start) +
                              "  " +
                              target.value.substring(end);

                            setCode(newValue);

                            requestAnimationFrame(() => {
                              target.selectionStart = target.selectionEnd =
                                start + 2;
                            });
                          }
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-[#2d2d2d] bg-[#0e639c] px-4 py-1.5 text-xs text-white">
                      <span>{language}</span>
                      <span>
                        {fileNameByLanguage[language]} · Lines: {lineCount}
                      </span>
                    </div>
                  </section>
                )}

                {inputMode === "file" && (
                  <section className="rounded-2xl border border-[#2d2d2d] bg-[#181818] p-6 shadow-2xl">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
                      File Upload
                      <InfoTooltip
                        text={`Upload a file containing your ${language} code.
Supported formats: .py, .js, .ts, .java, .c, .cpp
Max size: 10MB.
Make sure the file contains valid functions or classes.`}
                      />
                    </div>

                    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-[#3c3c3c] bg-[#1e1e1e] p-8 transition hover:border-[#007acc] hover:bg-[#202020]">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#252526] text-[#89dceb]">
                          <FileUp size={28} />
                        </div>

                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer rounded-lg bg-[#007acc] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0e639c]"
                        >
                          {file ? file.name : "Choose code file"}
                          <input
                            id="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                          />
                        </label>

                        <p className="mt-3 text-sm text-gray-500">
                          Drop a file here mentally, click practically.
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-[#007acc]/40 ${
                      loading
                        ? "cursor-not-allowed bg-[#0e639c]/60"
                        : "bg-[#007acc] shadow-lg shadow-blue-500/20 hover:bg-[#0e639c]"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play size={17} />
                        Generate Docstring
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {resultCode && (
              <DownloadResponse
                resultCode={resultCode}
                setResultCode={setResultCode}
                handleDownload={handleDownload}
              />
            )}
          </form>
        </main>
      </div>
    </div>
  );
}
