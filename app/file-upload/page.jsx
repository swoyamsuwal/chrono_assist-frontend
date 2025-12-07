"use client";

import React, { useState, useRef } from "react";
import SideBarLayout from "../components/Side_bar";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)}${sizes[i]}`;
}

export default function FileUploadDashboard() {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  function onFilesAdded(fileList) {
    const added = Array.from(fileList).map((f) => ({
      id: `${Date.now()}-${f.name}`,
      file: f,
      name: f.name,
      size: f.size,
      date: new Date().toLocaleDateString(),
      by: "Swoyam",
      uploadedToAI: false,
    }));
    setFiles((prev) => [...added, ...prev]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      onFilesAdded(e.dataTransfer.files);
    }
  }

  function handleDelete(id) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function toggleUploadToAI(id) {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, uploadedToAI: !f.uploadedToAI } : f
      )
    );
  }

  return (
    <SideBarLayout>
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        {/* Upload area */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={
            "rounded-md border-2 p-6 mb-6 " +
            (dragActive
              ? "border-dashed border-blue-400 bg-gray-800/40"
              : "border-transparent")
          }
        >
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 15a4 4 0 004 4h10a4 4 0 004-4V7a4 4 0 00-4-4H7a4 4 0 00-4 4v8z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  Drag & drop files here
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-400">
                Allowed: PDF, DOCX, PPTX • Max 20MB
              </div>
              <div className="mt-2">
                <button
                  onClick={() =>
                    inputRef.current && inputRef.current.click()
                  }
                  className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition text-white"
                >
                  Add files
                </button>
                <input
                  type="file"
                  multiple
                  ref={inputRef}
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && onFilesAdded(e.target.files)
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="text-left text-sm text-gray-300">
                <th className="w-3/12 py-2 px-3">Resource Name</th>
                <th className="w-1/12 py-2 px-3">Delete</th>
                <th className="w-2/12 py-2 px-3">Upload to AI</th>
                <th className="w-2/12 py-2 px-3">Shared On Date</th>
                <th className="w-1/12 py-2 px-3">Size</th>
                <th className="w-2/12 py-2 px-3">By</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-gray-400"
                  >
                    No files yet — add some above.
                  </td>
                </tr>
              )}

              {files.map((f) => (
                <tr
                  key={f.id}
                  className="bg-gray-700/30 border-t border-gray-700"
                >
                  <td className="py-4 px-3">
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-gray-400">
                      {f.file.type || "—"}
                    </div>
                  </td>

                  <td className="py-4 px-3 text-center">
                    <button
                      onClick={() => handleDelete(f.id)}
                      title="Delete"
                      className="p-2 rounded-full bg-red-600 hover:bg-red-500 transition"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7L5 7"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M10 11v6m4-6v6"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 7V6a2 2 0 012-2h2a2 2 0 012 2v1"
                        />
                      </svg>
                    </button>
                  </td>

                  <td className="py-4 px-3 text-center">
                    <button
                      onClick={() => toggleUploadToAI(f.id)}
                      className={
                        "p-2 rounded " +
                        (f.uploadedToAI
                          ? "bg-green-600"
                          : "bg-gray-700 hover:bg-gray-600")
                      }
                    >
                      {f.uploadedToAI ? (
                        <span className="text-xs">✓ AI</span>
                      ) : (
                        <svg
                          className="w-5 h-5 text-gray-100"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 5v14m7-7H5"
                          />
                        </svg>
                      )}
                    </button>
                  </td>

                  <td className="py-4 px-3">{f.date}</td>
                  <td className="py-4 px-3">{formatBytes(f.size)}</td>
                  <td className="py-4 px-3">{f.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </SideBarLayout>
  );
}
