"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle } from "lucide-react";

export function UploadForm() {
  const router = useRouter(); const [files, setFiles] = useState<File[]>([]); const [name, setName] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function upload(event: React.FormEvent) { event.preventDefault(); if (!files.length) return setError("Choose at least one image."); setLoading(true); setError(""); const form = new FormData(); form.set("name", name); files.forEach((file) => form.append("photos", file)); const response = await fetch("/api/items", { method: "POST", body: form }); const payload = await response.json(); setLoading(false); if (!response.ok) return setError(payload.error); router.push(`/items/${payload.itemId}`); router.refresh(); }
  return <form className="upload-form" onSubmit={upload}><label className="drop-zone"><ImagePlus size={28} /><strong>Choose garment photos</strong><span>JPG, PNG, HEIC or WebP · up to 12MB each</span><input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))} /></label>{files.length > 0 && <p className="selected-files">{files.map((file) => file.name).join(" · ")}</p>}<label className="field-label">Label <span>optional</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Navy overshirt" /></label>{error && <p className="form-error">{error}</p>}<button className="primary-action" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : null}{loading ? "Preparing garment…" : "Add to wardrobe"}</button></form>;
}
