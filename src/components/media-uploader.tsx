"use client";

// MediaUploader — talks to /api/upload/sign, gets a Cloudinary signed payload,
// then POSTs the file directly to Cloudinary (bypasses Vercel's 4.5 MB limit).
// Returns the secure_url back via onUploaded. Supports image & video.

import { useState } from "react";
import { UploadCloud, X, Loader2, Film, ImageIcon } from "lucide-react";

type SignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: "image" | "video" | "auto" | "raw";
  publicId?: string;
  uploadUrl: string;
  error?: string;
};

type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  bytes: number;
  error?: { message: string };
};

export type UploadedMedia = {
  url: string;
  type: "image" | "video";
  publicId: string;
};

export function MediaUploader({
  label = "Upload",
  accept = "image/*",
  multiple = false,
  folder,
  onUploaded,
}: {
  label?: string;
  accept?: string;
  multiple?: boolean;
  folder?: string;
  onUploaded: (items: UploadedMedia[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    const uploaded: UploadedMedia[] = [];
    try {
      const arr = Array.from(files);
      for (let i = 0; i < arr.length; i += 1) {
        const file = arr[i];
        setProgress(`Mengupload ${i + 1} / ${arr.length}...`);
        const isVideo = file.type.startsWith("video/");
        const signRes = await fetch("/api/upload/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            folder,
            resourceType: isVideo ? "video" : "image",
          }),
        });
        const sign: SignResponse = await signRes.json();
        if (!signRes.ok) {
          throw new Error(sign.error ?? "Gagal mendapatkan signature upload");
        }

        const form = new FormData();
        form.append("file", file);
        form.append("api_key", sign.apiKey);
        form.append("timestamp", String(sign.timestamp));
        form.append("signature", sign.signature);
        form.append("folder", sign.folder);
        if (sign.publicId) form.append("public_id", sign.publicId);

        const upRes = await fetch(sign.uploadUrl, {
          method: "POST",
          body: form,
        });
        const upJson = (await upRes.json()) as CloudinaryUploadResponse;
        if (!upRes.ok) {
          throw new Error(upJson.error?.message ?? "Upload ke Cloudinary gagal");
        }
        uploaded.push({
          url: upJson.secure_url,
          type: isVideo ? "video" : "image",
          publicId: upJson.public_id,
        });
      }
      onUploaded(uploaded);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-koi-border bg-koi-panel/60 px-4 py-6 text-sm text-koi-muted transition hover:border-koi-gold hover:text-koi-gold">
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>{progress ?? "Mengupload..."}</span>
          </>
        ) : (
          <>
            <UploadCloud size={16} />
            <span>{label}</span>
          </>
        )}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={busy}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {err && (
        <p className="mt-2 flex items-start gap-1 text-xs text-koi-red">
          <X size={12} className="mt-0.5" /> {err}
        </p>
      )}
    </div>
  );
}

export function MediaThumb({
  item,
  onRemove,
}: {
  item: UploadedMedia;
  onRemove?: () => void;
}) {
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded border border-koi-border bg-koi-panel">
      {item.type === "video" ? (
        <div className="flex h-full w-full items-center justify-center text-koi-gold">
          <Film size={20} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="" className="h-full w-full object-cover" />
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-0 top-0 rounded-bl bg-black/60 p-1 text-white hover:bg-koi-red"
        >
          <X size={12} />
        </button>
      )}
      <div className="absolute bottom-0 left-0 flex items-center gap-1 bg-black/60 px-1 py-0.5 text-[10px] text-white">
        {item.type === "video" ? <Film size={10} /> : <ImageIcon size={10} />}
      </div>
    </div>
  );
}
