"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import SideBarLayout from "../components/Side_bar";
import { usePermissions } from "../hooks/usePermissions";

// ─── ↓ INCREASE SIZE HERE to change the max upload limit ───────────────────
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MiB  ← change this number
// ───────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6; // ← change to show more/fewer rows per page

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function FileIcon({ mime }) {
  const m = String(mime || "").toLowerCase();
  const tone = m.includes("pdf")
    ? "bg-red-50 text-red-700 ring-red-100"
    : m.includes("word") || m.includes("doc")
    ? "bg-blue-50 text-blue-700 ring-blue-100"
    : m.includes("ppt")
    ? "bg-amber-50 text-amber-800 ring-amber-100"
    : "bg-slate-50 text-slate-700 ring-slate-100";

  const label = m.includes("pdf")
    ? "PDF"
    : m.includes("word") || m.includes("doc")
    ? "DOC"
    : m.includes("ppt")
    ? "PPT"
    : "FILE";

  return (
    <div className={`h-10 w-10 rounded-2xl ring-1 grid place-items-center text-xs font-semibold ${tone}`}>
      {label}
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "green" ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : tone === "blue" ? "bg-blue-50 text-blue-700 ring-blue-100"
    : tone === "amber" ? "bg-amber-50 text-amber-800 ring-amber-100"
    : tone === "red" ? "bg-red-50 text-red-700 ring-red-100"
    : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {children}
    </span>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  // Build page number array with ellipsis: [1, …, 4, 5, 6, …, 12]
  function getPages() {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 4) pages.push("…");
    const start = Math.max(2, page - 1);
    const end   = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 3) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  const btnBase =
    "h-9 min-w-[36px] px-2 rounded-xl text-sm font-medium transition flex items-center justify-center";
  const btnActive =
    "bg-indigo-600 text-white shadow-sm";
  const btnInactive =
    "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50";
  const btnDisabled =
    "bg-white border border-slate-200 text-slate-300 cursor-not-allowed";

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-slate-100">
      {/* Left: range info */}
      <span className="text-xs text-slate-500 tabular-nums">
        Page <span className="font-semibold text-slate-700">{page}</span> of{" "}
        <span className="font-semibold text-slate-700">{totalPages}</span>
      </span>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={`${btnBase} ${page === 1 ? btnDisabled : btnInactive}`}
          aria-label="Previous page"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Page numbers */}
        {getPages().map((p, idx) =>
          p === "…" ? (
            <span key={`ellipsis-${idx}`} className="h-9 w-9 flex items-center justify-center text-slate-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`${btnBase} ${p === page ? btnActive : btnInactive}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} ${page === totalPages ? btnDisabled : btnInactive}`}
          aria-label="Next page"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── File Size Warning Modal ──────────────────────────────────────────────────
function FileSizeWarningModal({ fileName, size, onClose }) {
  const limitLabel = formatBytes(MAX_FILE_SIZE);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-2xl bg-red-50 ring-1 ring-red-100 grid place-items-center text-red-600 shrink-0">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              <path d="M12 9v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900">File too large</div>
            <div className="text-xs text-slate-500 mt-0.5">Maximum allowed size is {limitLabel}</div>
          </div>
        </div>

        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-5">
          <p className="text-sm text-red-700 leading-relaxed">
            <span className="font-semibold break-all">{fileName}</span>
            {" "}is <span className="font-semibold">{formatBytes(size)}</span>,
            which exceeds the {limitLabel} limit. Please compress or choose a smaller file.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ─── File Preview Modal ───────────────────────────────────────────────────────
function FilePreviewModal({ doc, onClose }) {
  const overlayRef = useRef(null);
  const [previewData, setPreviewData] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState(null);

  const API_BASE = "http://127.0.0.1:8000";
  function getAccessToken() {
    return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (!doc) return;
    const token = getAccessToken();
    setLoadingPreview(true);
    setPreviewError(null);

    fetch(`${API_BASE}/file_upload/preview_file/${doc.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (data.error) { setPreviewError(data.error); setLoadingPreview(false); return; }
        setPreviewData(data);
        if (data.mime_type?.includes("text/plain")) {
          const res = await fetch(data.url);
          setTextContent(await res.text());
        }
        setLoadingPreview(false);
      })
      .catch(() => {
        setPreviewError("Failed to load preview. Please try again.");
        setLoadingPreview(false);
      });
  }, [doc]);

  const handleOverlayClick = (e) => { if (e.target === overlayRef.current) onClose(); };

  const mime    = previewData?.mime_type || doc.mime || "";
  const isPDF   = mime.includes("pdf");
  const isText  = mime.includes("text/plain");
  const isImage = mime.includes("image/");
  const isOther = !isPDF && !isText && !isImage;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "92vw", maxWidth: 1000, height: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon mime={mime} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{previewData?.filename || doc.name}</p>
              <p className="text-xs text-slate-500">{mime || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(isText || isImage) && !loadingPreview && !previewError && (
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(1)))}
                  className="h-8 w-8 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition text-base grid place-items-center">−</button>
                <span className="text-xs text-slate-600 w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(1)))}
                  className="h-8 w-8 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition text-base grid place-items-center">+</button>
                <button onClick={() => setZoom(1)}
                  className="px-2 h-8 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 transition">Reset</button>
              </div>
            )}
            <button onClick={onClose}
              className="h-8 w-8 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition grid place-items-center">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50">
          {loadingPreview && (
            <div className="flex items-center justify-center w-full h-full gap-2 text-slate-500 text-sm">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading preview…
            </div>
          )}
          {!loadingPreview && previewError && (
            <div className="flex flex-col items-center justify-center w-full h-full gap-3 text-center px-6">
              <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100 grid place-items-center">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">{previewError}</p>
            </div>
          )}
          {!loadingPreview && !previewError && isPDF && (
            <iframe src={previewData.url} title={previewData.filename} className="w-full h-full border-0" />
          )}
          {!loadingPreview && !previewError && isText && textContent !== null && (
            <div className="w-full h-full overflow-auto p-6">
              <pre className="font-mono text-sm text-slate-800 whitespace-pre-wrap leading-relaxed"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.15s ease", width: `${(1 / zoom) * 100}%` }}>
                {textContent}
              </pre>
            </div>
          )}
          {!loadingPreview && !previewError && isImage && (
            <div className="w-full h-full overflow-auto flex items-start justify-center p-6">
              <img src={previewData.url} alt={previewData.filename}
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.15s ease", maxWidth: "none" }}
                className="rounded-lg shadow-md" />
            </div>
          )}
          {!loadingPreview && !previewError && isOther && (
            <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-center px-6">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 ring-1 ring-slate-200 grid place-items-center">
                <svg className="h-8 w-8 text-slate-500" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Browser preview not available for this file type</p>
                <p className="mt-1 text-xs text-slate-500">Download the file to view it in the appropriate application.</p>
              </div>
              <a href={previewData?.url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M12 15V3m0 12-4-4m4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function FileUploadDashboard() {
  const router = useRouter();

  const { hasPermission, loading: permLoading } = usePermissions();
  const canUpload = hasPermission("files", "create");
  const canDelete = hasPermission("files", "delete");
  const canEmbed  = hasPermission("files", "execute");

  const [files, setFiles]                           = useState([]);
  const [dragActive, setDragActive]                 = useState(false);
  const [loading, setLoading]                       = useState(false);
  const [initialLoading, setInitialLoading]         = useState(true);
  const [embeddingLoadingId, setEmbeddingLoadingId] = useState(null);
  const [previewDoc, setPreviewDoc]                 = useState(null);
  const [sizeWarnModal, setSizeWarnModal]           = useState(null);
  const [page, setPage]                             = useState(1);
  const inputRef = useRef(null);

  const [user, setUser] = useState(null);
  const API_BASE = "http://127.0.0.1:8000";

  function getAccessToken() {
    return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("user");
    if (stored) { try { setUser(JSON.parse(stored)); } catch { setUser(null); } }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setInitialLoading(false); return; }

    async function loadFiles() {
      try {
        const res = await fetch(`${API_BASE}/file_upload/list_files/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { console.error("Failed to load files"); return; }
        const data = await res.json();
        setFiles(data.map((d) => ({
          id: d.id,
          name: d.original_filename,
          size: d.file_size,
          mime: d.mime_type,
          createdAt: d.created_at,
          fileUrl: d.file_url,
          uploadedToAI: d.is_embedded ?? false,
        })));
      } catch (e) {
        console.error("Error loading files:", e);
      } finally {
        setInitialLoading(false);
      }
    }
    loadFiles();
  }, []);

  // ── pagination derived values ─────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(files.length / PAGE_SIZE));
  const pagedFiles  = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return files.slice(start, start + PAGE_SIZE);
  }, [files, page]);

  // Reset to page 1 whenever a new file is added (it lands at the top)
  function handlePageChange(p) {
    setPage(Math.min(Math.max(1, p), totalPages));
  }

  // ── upload ────────────────────────────────────────────────────────────────
  async function uploadToBackend(fileObj) {
    const token = getAccessToken();
    if (!token) { console.error("No access token"); return null; }

    if (fileObj.size > MAX_FILE_SIZE) {
      setSizeWarnModal({ fileName: fileObj.name, size: fileObj.size });
      return null;
    }

    const formData = new FormData();
    formData.append("file", fileObj);
    formData.append("original_filename", fileObj.name);

    const res = await fetch(`${API_BASE}/file_upload/upload_file/`, {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    let data;
    try { data = await res.json(); } catch { return null; }
    if (!res.ok) { console.error("Upload failed:", data); return null; }
    return data;
  }

  async function onFilesAdded(fileList) {
    setLoading(true);
    try {
      for (const f of Array.from(fileList)) {
        const result = await uploadToBackend(f);
        if (result) {
          setFiles((prev) => [{
            id: result.id,
            name: result.original_filename,
            size: result.file_size,
            mime: result.mime_type,
            createdAt: result.created_at,
            fileUrl: result.file_url,
            uploadedToAI: result.is_embedded ?? false,
          }, ...prev]);
          setPage(1); // jump to first page so user sees the new file immediately
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (canUpload && e.dataTransfer.files?.length) onFilesAdded(e.dataTransfer.files);
  }

  async function handleDelete(id) {
    const token = getAccessToken();
    if (!token) return;
    const res = await fetch(`${API_BASE}/file_upload/delete_file/`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { console.error("Delete failed"); return; }
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      // If deleting the last item on the current page, go back one page
      const newTotalPages = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
      setPage((p) => Math.min(p, newTotalPages));
      return next;
    });
  }

  async function handleUploadToAI(id, alreadyEmbedded) {
    if (alreadyEmbedded) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      setEmbeddingLoadingId(id);
      const res = await fetch(`${API_BASE}/file_upload/embed_file/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { console.error("Embedding failed"); return; }
      await res.json().catch(() => ({}));
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, uploadedToAI: true } : f)));
    } catch (e) {
      console.error("Error embedding file:", e);
    } finally {
      setEmbeddingLoadingId(null);
    }
  }

  const embeddedCount  = useMemo(() => files.filter((f) => !!f.uploadedToAI).length, [files]);
  const totalSize      = useMemo(() => files.reduce((acc, f) => acc + (Number(f.size) || 0), 0), [files]);
  const username       = user?.username || "You";
  const showActionsCol = canDelete || canEmbed;

  // Row range label e.g. "1 – 6 of 14"
  const rangeStart = files.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, files.length);

  return (
    <SideBarLayout>
      {previewDoc && <FilePreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}

      {sizeWarnModal && (
        <FileSizeWarningModal
          fileName={sizeWarnModal.fileName}
          size={sizeWarnModal.size}
          onClose={() => setSizeWarnModal(null)}
        />
      )}

      <div className="w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">File Upload</h1>
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

        {canUpload && (
          <section
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
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
                  <div className={[
                    "h-14 w-14 rounded-2xl grid place-items-center ring-1",
                    dragActive ? "bg-indigo-50 text-indigo-700 ring-indigo-100" : "bg-slate-50 text-slate-700 ring-slate-200",
                  ].join(" ")}>
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                      <path d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6L16 6a5 5 0 0 1 1 9.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M12 12v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M8.5 14.5 12 11l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-slate-900">Drag & drop files here</div>
                    <div className="mt-1 text-sm text-slate-500">or click the button to browse from your device.</div>
                    {/* ↓ INCREASE SIZE HERE — update MAX_FILE_SIZE at the top, label auto-updates */}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <svg className="h-3.5 w-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 9v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Allowed: PDF, DOCX, PPTX &nbsp;·&nbsp; Max <strong className="ml-1">{formatBytes(MAX_FILE_SIZE)}</strong> per file
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-start lg:justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
                    disabled={loading}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

            <div className="px-6 pb-6">
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600">
                {dragActive ? (
                  <span className="font-semibold text-indigo-700">Drop to upload</span>
                ) : (
                  <span>Tip: You can drop multiple files at once.</span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Files table */}
        <div className={`${canUpload ? "mt-6" : ""} rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden`}>

          {/* Table header bar */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-base font-semibold text-slate-900">Uploaded Files</div>
            {files.length > 0 && (
              <div className="text-sm text-slate-500 tabular-nums">
                {rangeStart}–{rangeEnd} of {files.length}
              </div>
            )}
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
                  {showActionsCol && <th className="py-3 px-5 text-right">Actions</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {initialLoading || permLoading ? (
                  <tr>
                    <td colSpan={showActionsCol ? 6 : 5} className="py-10 px-5 text-sm text-slate-500">
                      Loading files...
                    </td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={showActionsCol ? 6 : 5} className="py-12 px-5">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 grid place-items-center text-slate-600 ring-1 ring-slate-200">
                          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="mt-3 text-sm font-semibold text-slate-900">No files yet</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {canUpload ? "Upload your first document using the dropzone above." : "No files have been uploaded yet."}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedFiles.map((f) => {
                    const isEmbedded    = !!f.uploadedToAI;
                    const isLoading     = embeddingLoadingId === f.id;
                    const embedDisabled = isEmbedded || isLoading;

                    return (
                      <tr key={f.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileIcon mime={f.mime} />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(f)}
                                className="text-sm font-semibold text-slate-900 truncate hover:text-indigo-700 underline decoration-slate-300 hover:decoration-indigo-400 transition text-left"
                                title="Click to preview"
                              >
                                {f.name}
                              </button>
                              <div className="text-xs text-slate-500 truncate">{f.mime || "—"}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <Pill tone="slate">
                            {(f.mime || "—").split("/")[1]?.toUpperCase?.() || "—"}
                          </Pill>
                        </td>

                        <td className="py-4 px-5 text-sm text-slate-700">
                          {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
                        </td>

                        <td className="py-4 px-5 text-sm text-slate-700">{formatBytes(f.size)}</td>

                        <td className="py-4 px-5 text-sm text-slate-700">{username}</td>

                        {showActionsCol && (
                          <td className="py-4 px-5">
                            <div className="flex items-center justify-end gap-2">
                              {canEmbed && (
                                <>
                                  <button
                                    onClick={() => handleUploadToAI(f.id, isEmbedded)}
                                    disabled={embedDisabled}
                                    className={[
                                      "rounded-xl px-3 py-2 text-xs font-semibold transition border",
                                      isEmbedded
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default"
                                        : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
                                      embedDisabled && !isEmbedded ? "opacity-60" : "",
                                    ].join(" ")}
                                    title={isEmbedded ? "Already embedded" : "Upload to AI"}
                                  >
                                    {isEmbedded ? "Embedded" : isLoading ? "Embedding..." : "Upload to AI"}
                                  </button>
                                  {isEmbedded && (
                                    <button
                                      onClick={() => router.push(`/file-upload/chat/${f.id}`)}
                                      title="Chat with this document"
                                      className="h-9 w-9 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300 transition grid place-items-center"
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                  )}
                                </>
                              )}

                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(f.id)}
                                  title="Delete"
                                  className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition grid place-items-center"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <path d="M4 7h16M10 11v6m4-6v6M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"
                                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination — rendered below the table */}
          {!initialLoading && !permLoading && files.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </SideBarLayout>
  );
}