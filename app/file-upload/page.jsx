"use client";

import React, { useState, useRef, useEffect } from "react";
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
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const inputRef = useRef(null);

  // NEW: user state
  const [user, setUser] = useState(null);

  const API_BASE = "http://127.0.0.1:8000";

  function getAccessToken() {
    return typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;
  }

  // NEW: load user from localStorage
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
            uploadedToAI: false,
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
              uploadedToAI: false,
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
                  disabled={loading}
                >
                  {loading ? "Uploading..." : "Add files"}
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
              {initialLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-gray-400"
                  >
                    Loading files...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-gray-400"
                  >
                    No files yet — add some above.
                  </td>
                </tr>
              ) : (
                files.map((f) => (
                  <tr
                    key={f.id}
                    className="bg-gray-700/30 border-t border-gray-700"
                  >
                    <td className="py-4 px-3">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-gray-400">
                        {f.mime || "—"}
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

                    <td className="py-4 px-3">
                      {f.createdAt
                        ? new Date(f.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-4 px-3">
                      {formatBytes(f.size)}
                    </td>
                    <td className="py-4 px-3">
                      {user ? user.username : "You are"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </SideBarLayout>
  );
}
