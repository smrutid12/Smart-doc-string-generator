"use client";

import { useState, ChangeEvent, FormEvent } from "react";
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

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="relative group inline-block ml-2">
      {/* i button */}
      <div className="w-5 h-5 flex items-center justify-center text-xs rounded-full bg-gray-700 text-white cursor-pointer">
        i
      </div>

      {/* tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 p-3 text-xs text-gray-200 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
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
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong");
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

  return (
    <div className="max-w-3xl mx-auto mt-12 bg-gray-900 border border-gray-800 shadow-lg rounded-2xl p-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <h2 className="text-2xl font-semibold text-white">
          {resultCode
            ? "Your Docstring is Ready!"
            : "Smart Doc String Generator ✨"}
        </h2>

        <p className="text-gray-400">
          {resultCode
            ? "Download, copy or edit your generated code below."
            : "Upload your file to add doc strings or paste code in the editor."}
        </p>
        {resultCode == "" && (
          <>
            {/* Language and Format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white after:content-['*'] after:ml-0.5 after:text-red-500">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => {
                    const selectedLanguage = e.target.value as LanguageOption;
                    setLanguage(selectedLanguage);

                    // reset format based on selected language
                    setFormat(formatOptionsByLanguage[selectedLanguage][0]);
                  }}
                  className="mt-2 block w-full rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  {languageOptions.map((lang) => (
                    <option
                      key={lang}
                      value={lang}
                      className="bg-gray-800 text-white"
                    >
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white after:content-['*'] after:ml-0.5 after:text-red-500">
                  Docstring Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as DocStringFormat)}
                  className="mt-2 block w-full rounded-md bg-gray-800 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  {formatOptionsByLanguage[language].map((f) => (
                    <option
                      key={f}
                      value={f}
                      className="bg-gray-800 text-white"
                    >
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toggle Between Code & File */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleModeChange("code")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  inputMode === "code"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Code Input
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("file")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  inputMode === "file"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                File Upload
              </button>
            </div>

            {/* Conditional Rendering */}
            {inputMode === "code" && (
              <div>
                <div className="flex items-center">
                  <label
                    className={`block text-sm font-medium text-white ${
                      inputMode === "code"
                        ? "after:content-['*'] after:ml-0.5 after:text-red-500"
                        : ""
                    }`}
                  >
                    Code Block
                  </label>

                  <InfoTooltip
                    text={`Paste your ${language} function or class here.
                      Make sure the code is valid.
                      Example:
                        function add(a, b) {
                          return a + b;
                        }`}
                  />
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-[#2d2d2d] bg-[#1e1e1e] shadow-2xl">
                  {/* Editor top bar */}
                  <div className="flex items-center justify-between border-b border-[#2d2d2d] bg-[#252526] px-4 py-2">
                    <div className="text-xs font-medium text-gray-400">
                      {language === "Python" && "main.py"}
                      {language === "JavaScript" && "main.js"}
                      {language === "TypeScript" && "main.ts"}
                      {language === "Java" && "Main.java"}
                      {language === "C" && "main.c"}
                      {language === "C++" && "main.cpp"}
                    </div>

                    <div className="text-xs text-gray-500">Code Editor</div>
                  </div>

                  {/* Editor body */}
                  <div className="flex max-h-[420px] min-h-[260px] overflow-hidden bg-[#1e1e1e]">
                    {/* Line numbers */}
                    <div className="select-none border-r border-[#2d2d2d] bg-[#1e1e1e] px-3 py-3 text-right font-mono text-sm leading-6 text-gray-500">
                      {(code || "\n").split("\n").map((_, index) => (
                        <div key={index}>{index + 1}</div>
                      ))}
                    </div>

                    {/* Code textarea */}
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder={`Paste your ${language} code here...`}
                      className="
        block min-h-[260px] w-full resize-y overflow-auto whitespace-pre
        bg-[#1e1e1e] px-4 py-3 font-mono text-sm leading-6 text-gray-100
        caret-indigo-400 placeholder:text-gray-600 focus:outline-none

        [&::-webkit-scrollbar]:h-2
        [&::-webkit-scrollbar]:w-2
        [&::-webkit-scrollbar-track]:bg-[#1e1e1e]
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-[#4b5563]
        [&::-webkit-scrollbar-thumb:hover]:bg-[#6b7280]
      "
                      rows={10}
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

                  {/* Bottom status bar */}
                  <div className="flex items-center justify-between border-t border-[#2d2d2d] bg-[#0e639c] px-4 py-1 text-xs text-white">
                    <span>{language}</span>
                    <span>Lines: {code ? code.split("\n").length : 1}</span>
                  </div>
                </div>
              </div>
            )}

            {inputMode === "file" && (
              <div>
                <div className="flex items-center">
                  <label
                    className={`block text-sm font-medium text-white ${
                      inputMode === "file"
                        ? "after:content-['*'] after:ml-0.5 after:text-red-500"
                        : ""
                    }`}
                  >
                    File Upload
                  </label>

                  <InfoTooltip
                    text={`Upload a file containing your ${language} code.
                    Supported formats:.py, .js, .ts, .java, .c, .cpp
                    Max size: 10MB
                    Make sure the file contains valid functions or classes.`}
                  />
                </div>
                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-white/25 px-6 py-10">
                  <div className="text-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md bg-transparent font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      <span>{file ? file.name : "Upload a file"}</span>
                      <input
                        id="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    {!file && (
                      <p className="text-gray-400 text-sm mt-2">
                        or drag and drop (up to 10MB)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2 ${
                  loading
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-500 hover:bg-indigo-600"
                }`}
              >
                {loading && (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                {loading ? "Generating..." : "Generate Docstring"}
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
      {/* Output Section */}
    </div>
  );
}
