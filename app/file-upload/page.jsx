"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import SideBarLayout from "../components/Side_bar";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)}${sizes[i]}`;
}

function FileIcon({ mime }) {
  const m = String(mime || "").toLowerCase();
  const tone =
    m.includes("pdf")
      ? "bg-red-50 text-red-700 ring-red-100"
      : m.includes("word") || m.includes("doc")
      ? "bg-blue-50 text-blue-700 ring-blue-100"
      : m.includes("ppt")
      ? "bg-amber-50 text-amber-800 ring-amber-100"
      : "bg-slate-50 text-slate-700 ring-slate-100";

  const label =
    m.includes("pdf")
      ? "PDF"
      : m.includes("word") || m.includes("doc")
      ? "DOC"
      : m.includes("ppt")
      ? "PPT"
      : "FILE";

  return (
    <div className={`h-10 w-10 rounded-2xl ring-1 grid place-items-center text-xs font800 font-semibold ${tone}`}>
      {label}
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "blue"
      ? "bg-blue-50 text-blue-700 ring-blue-100"
      : tone === "amber"
      ? "bg-amber-50 text-amber-800 ring-amber-100"
      : tone === "red"
      ? "bg-red-50 text-red-700 ring-red-100"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {children}
    </span>
  );
}

export default function FileUploadDashboard() {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [embeddingLoadingId, setEmbeddingLoadingId] = useState(null);
  const inputRef = useRef(null);

  const [user, setUser] = useState(null);

  const API_BASE = "http://127.0.0.1:8000";

  function getAccessToken() {
    return typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setInitialLoading(false);
      return;
    }

    async function loadFiles() {
      try {
        const res = await fetch(`${API_BASE}/file_upload/list_files/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.error("Failed to load files");
          return;
        }

        const data = await res.json();
        setFiles(
          data.map((d) => ({
            id: d.id,
            name: d.original_filename,
            size: d.file_size,
            mime: d.mime_type,
            createdAt: d.created_at,
            fileUrl: d.file_url,
            uploadedToAI: d.is_embedded ?? false,
          }))
        );
      } catch (e) {
        console.error("Error loading files:", e);
      } finally {
        setInitialLoading(false);
      }
    }

    loadFiles();
  }, []);

  async function uploadToBackend(fileObj) {
    const token = getAccessToken();
    if (!token) {
      console.error("No access token; user not logged in");
      return null;
    }

    const wantRename = window.confirm(
      `Default name is "${fileObj.name}". Do you want to change it?`
    );

    let finalName;
    if (!wantRename) {
      finalName = fileObj.name;
    } else {
      const input = window.prompt("Enter new file name:", fileObj.name);
      finalName = input && input.trim() ? input.trim() : fileObj.name;
    }

    const formData = new FormData();
    formData.append("file", fileObj);
    formData.append("original_filename", finalName);

    const res = await fetch(`${API_BASE}/file_upload/upload_file/`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let data;
    try {
      data = await res.json();
    } catch (err) {
      console.error("Failed to parse JSON:", err);
      return null;
    }

    if (!res.ok) {
      console.error("Upload failed:", data);
      return null;
    }

    return data;
  }

  async function onFilesAdded(fileList) {
    setLoading(true);
    try {
      const filesArray = Array.from(fileList);
      for (const f of filesArray) {
        const result = await uploadToBackend(f);
        if (result) {
          setFiles((prev) => [
            {
              id: result.id,
              name: result.original_filename,
              size: result.file_size,
              mime: result.mime_type,
              createdAt: result.created_at,
              fileUrl: result.file_url,
              uploadedToAI: result.is_embedded ?? false,
            },
            ...prev,
          ]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      onFilesAdded(e.dataTransfer.files);
    }
  }

  async function handleDelete(id) {
    const token = getAccessToken();
    if (!token) {
      console.error("No access token; user not logged in");
      return;
    }

    const res = await fetch(`${API_BASE}/file_upload/delete_file/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      console.error("Delete failed");
      return;
    }

    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleUploadToAI(id, alreadyEmbedded) {
    if (alreadyEmbedded) return;

    const token = getAccessToken();
    if (!token) {
      console.error("No access token; user not logged in");
      return;
    }

    try {
      setEmbeddingLoadingId(id);
      const res = await fetch(`${API_BASE}/file_upload/embed_file/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        console.error("Embedding failed");
        return;
      }

      await res.json().catch(() => ({}));

      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, uploadedToAI: true } : f)));
    } catch (e) {
      console.error("Error embedding file:", e);
    } finally {
      setEmbeddingLoadingId(null);
    }
  }

  const embeddedCount = useMemo(
    () => files.filter((f) => !!f.uploadedToAI).length,
    [files]
  );
  const totalSize = useMemo(
    () => files.reduce((acc, f) => acc + (Number(f.size) || 0), 0),
    [files]
  );

  const username = user?.username || "You";

  return (
    <SideBarLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              File Upload
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload resources, embed them to AI, and manage your library.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Pill tone="blue">{files.length} files</Pill>
            <Pill tone="green">{embeddedCount} embedded</Pill>
            <Pill>{formatBytes(totalSize)}</Pill>
          </div>
        </div>

        {/* Dropzone card */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={[
            "rounded-2xl border bg-white shadow-sm",
            dragActive ? "border-indigo-300 ring-4 ring-indigo-50" : "border-slate-200",
          ].join(" ")}
        >
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div
                  className={[
                    "h-14 w-14 rounded-2xl grid place-items-center ring-1",
                    dragActive
                      ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
                      : "bg-slate-50 text-slate-700 ring-slate-200",
                  ].join(" ")}
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6L16 6a5 5 0 0 1 1 9.9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 12v9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8.5 14.5 12 11l3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900">
                    Drag & drop files here
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    or click the button to browse from your device.
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Allowed: PDF, DOCX, PPTX • Max 20MB
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-start lg:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => inputRef.current && inputRef.current.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
                  disabled={loading}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {loading ? "Uploading..." : "Add files"}
                </button>

                <input
                  type="file"
                  multiple
                  ref={inputRef}
                  className="hidden"
                  onChange={(e) => e.target.files && onFilesAdded(e.target.files)}
                />
              </div>
            </div>
          </div>

          {/* Dashed inner area */}
          <div className="px-6 pb-6">
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600">
              {dragActive ? (
                <span className="font-semibold text-indigo-700">
                  Drop to upload
                </span>
              ) : (
                <span>
                  Tip: You can drop multiple files at once.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Files table */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-base font-semibold text-slate-900">
              Uploaded Files
            </div>
            <div className="text-sm text-slate-500">
              Showing {files.length} files
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-3 px-5">Resource</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Shared on</th>
                  <th className="py-3 px-5">Size</th>
                  <th className="py-3 px-5">By</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {initialLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-5 text-sm text-slate-500">
                      Loading files...
                    </td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-5">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 grid place-items-center text-slate-600 ring-1 ring-slate-200">
                          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M14 2v6h6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div className="mt-3 text-sm font-semibold text-slate-900">
                          No files yet
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Upload your first document using the dropzone above.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  files.map((f) => {
                    const isEmbedded = !!f.uploadedToAI;
                    const isLoading = embeddingLoadingId === f.id;
                    const disabled = isEmbedded || isLoading;

                    return (
                      <tr key={f.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileIcon mime={f.mime} />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">
                                {f.fileUrl ? (
                                  <a
                                    href={f.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-indigo-700 underline decoration-slate-300 hover:decoration-indigo-400"
                                  >
                                    {f.name}
                                  </a>
                                ) : (
                                  f.name
                                )}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {f.mime || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <Pill tone="slate">{(f.mime || "—").split("/")[1]?.toUpperCase?.() || "—"}</Pill>
                        </td>

                        <td className="py-4 px-5 text-sm text-slate-700">
                          {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
                        </td>

                        <td className="py-4 px-5 text-sm text-slate-700">
                          {formatBytes(f.size)}
                        </td>

                        <td className="py-4 px-5 text-sm text-slate-700">
                          {username}
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleUploadToAI(f.id, isEmbedded)}
                              disabled={disabled}
                              className={[
                                "rounded-xl px-3 py-2 text-xs font-semibold transition border",
                                isEmbedded
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
                                disabled && !isEmbedded ? "opacity-60" : "",
                              ].join(" ")}
                              title={isEmbedded ? "Already embedded" : "Upload to AI"}
                            >
                              {isEmbedded ? "Embedded" : isLoading ? "Embedding..." : "Upload to AI"}
                            </button>

                            <button
                              onClick={() => handleDelete(f.id)}
                              title="Delete"
                              className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition grid place-items-center"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M4 7h16M10 11v6m4-6v6M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 bg-white" />
        </div>
      </div>
    </SideBarLayout>
  );
}
