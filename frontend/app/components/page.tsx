"use client";

import { useState, ChangeEvent, FormEvent } from "react";

type LanguageOption = "Python" | "JavaScript" | "TypeScript" | "Java" | "C++";
const languageOptions: LanguageOption[] = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
];

type DocStringFormat = "Google" | "NumPy" | "PEP-257";
const formatOptions: DocStringFormat[] = ["Google", "NumPy", "PEP-257"];

export default function UploadFile() {
  const [language, setLanguage] = useState<LanguageOption>("Python");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<DocStringFormat>("Google");
  const [inputMode, setInputMode] = useState<"code" | "file">("code");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleModeChange = (mode: "code" | "file") => {
    setInputMode(mode);
    if (mode === "code") setFile(null);
    if (mode === "file") setPrompt("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (inputMode === "file" && !file) {
      alert("Please upload a file!");
      return;
    }
    if (inputMode === "code" && !prompt.trim()) {
      alert("Please enter some code!");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("language", language);
    formData.append("format", format);
    formData.append("mode", inputMode);
    if (inputMode === "file" && file) formData.append("file", file);
    if (inputMode === "code") formData.append("prompt", prompt);

    // Simulate backend call
    setTimeout(() => {
      alert("Submitted! (Connect to backend)");
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto mt-12 bg-gray-900 border border-gray-800 shadow-lg rounded-2xl p-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <h2 className="text-2xl font-semibold text-white">
          Doc String Generator
        </h2>
        <p className="text-gray-400">
          Upload your file to add doc strings or paste code in the editor.{" "}
          <a href="#" className="text-indigo-400 hover:text-indigo-300">
            Know more
          </a>
          .
        </p>

        {/* Language and Format */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white after:content-['*'] after:ml-0.5 after:text-red-500">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageOption)}
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
              {formatOptions.map((f) => (
                <option key={f} value={f} className="bg-gray-800 text-white">
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
            <label
              className={`block text-sm font-medium text-white ${
                inputMode === "code"
                  ? "after:content-['*'] after:ml-0.5 after:text-red-500"
                  : ""
              }`}
            >
              Code Block
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Write or paste your code here"
              className="mt-2 block w-full rounded-lg bg-[#1e1e1e] px-3 py-2 text-sm text-gray-100 font-mono placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
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
                    "\t" +
                    target.value.substring(end);
                  e.currentTarget.value = newValue;
                  setPrompt(newValue);
                  requestAnimationFrame(() => {
                    target.selectionStart = target.selectionEnd = start + 1;
                  });
                }
              }}
            />
          </div>
        )}

        {inputMode === "file" && (
          <div>
            <label
              className={`block text-sm font-medium text-white ${
                inputMode === "file"
                  ? "after:content-['*'] after:ml-0.5 after:text-red-500"
                  : ""
              }`}
            >
              File Upload
            </label>
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
      </form>
    </div>
  );
}
