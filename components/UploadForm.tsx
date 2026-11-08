"use client";

import { useRef, useState } from "react";
import { validateFile } from "@/lib/checkLease";

interface Props {
  onSubmit: (file: File) => void;
  error?: string | null;
}

export default function UploadForm({ onSubmit, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function pick(f: File | undefined | null) {
    if (!f) return;
    const problem = validateFile(f);
    setLocalError(problem);
    setFile(problem ? null : f);
  }

  const shownError = localError ?? error;

  return (
    <form
      className="lc-upload"
      onSubmit={(e) => {
        e.preventDefault();
        if (file) onSubmit(file);
      }}
    >
      <label
        htmlFor="lease-file"
        className={`lc-drop ${dragging ? "is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
      >
        <span className="lc-drop-icon" aria-hidden="true">📄</span>
        <span className="lc-drop-title">
          {file ? file.name : "Choose a file or drop it here"}
        </span>
        <span className="lc-drop-hint">PDF or photo · up to 15 MB</span>
        <input
          ref={inputRef}
          id="lease-file"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="lc-file-input"
          aria-describedby={shownError ? "upload-error" : undefined}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </label>

      {shownError && (
        <p id="upload-error" className="lc-error" role="alert">
          {shownError}
        </p>
      )}

      <button type="submit" className="lc-btn lc-btn-primary lc-btn-big" disabled={!file}>
        Check my lease
      </button>
    </form>
  );
}
