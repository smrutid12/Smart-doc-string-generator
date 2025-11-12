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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a file!");
      return;
    }

    // Send data to backend
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    formData.append("prompt", prompt);
    formData.append("format", format);

    // TODO: fetch('/api/generate-docstring', { method: 'POST', body: formData })

    alert("File submitted! (Implement backend API call)");
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
            <label className="block text-sm font-medium text-white">
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
                  className="bg-gray-800 text-white" // make option dark too
                >
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white">
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

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-white">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Don't change the code, just add the doc-string"
            className="mt-2 block w-full rounded-md bg-white/5 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4}
          />
          <p className="mt-1 text-gray-400 text-sm">
            Write a few sentences about the form of doc-string.
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-white">File</label>
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

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Generate Docstring
          </button>
        </div>
      </form>
    </div>
  );
}
