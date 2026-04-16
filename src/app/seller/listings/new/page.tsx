"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { CATEGORY_LABEL } from "@/lib/utils";
import {
  MediaUploader,
  MediaThumb,
  type UploadedMedia,
} from "@/components/media-uploader";

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1550503519-ba3eaaa8d0b4?auto=format&fit=crop&w=900&q=80",
];

export default function NewListingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    category: "GOSANKE_KOHAKU",
    bloodline: "",
    breederName: "",
    sizeCm: 35,
    ageMonths: 12,
    sex: "Female",
    description: "",
    coverImage: SAMPLE_IMAGES[0],
    price: 2500000,
    mode: "FIXED" as "FIXED" | "AUCTION",
    startingBid: 1000000,
    minIncrement: 100000,
    durationHours: 48,
    memberOnly: false,
    minTier: "NONE" as "NONE" | "SILVER" | "GOLD" | "PLATINUM",
  });
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!session?.user) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-koi-muted">
          Harus{" "}
          <Link href="/auth/login?callbackUrl=/seller/listings/new" className="text-koi-gold">
            login
          </Link>{" "}
          dulu.
        </p>
      </div>
    );
  }
  if (!session.user.sellerId) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-koi-muted">
          Anda belum mendaftar sebagai seller.{" "}
          <Link href="/seller/onboarding" className="text-koi-gold">
            Daftar sekarang
          </Link>
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/koi", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        media: media.map(({ url, type }) => ({ url, type })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErr(data.error ?? "Gagal upload");
      return;
    }
    router.push("/seller");
    router.refresh();
  }

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Seller</p>
        <h1 className="heading-display text-3xl text-white">Upload Koi Baru</h1>
      </div>
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Nama Koi</label>
              <input
                required
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Kategori</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Bloodline</label>
              <input
                className="input"
                value={form.bloodline}
                onChange={(e) => setForm({ ...form, bloodline: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Breeder</label>
              <input
                className="input"
                value={form.breederName}
                onChange={(e) => setForm({ ...form, breederName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Size (cm)</label>
              <input
                type="number"
                required
                className="input"
                value={form.sizeCm}
                onChange={(e) => setForm({ ...form, sizeCm: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Umur (bulan)</label>
              <input
                type="number"
                className="input"
                value={form.ageMonths}
                onChange={(e) => setForm({ ...form, ageMonths: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Sex</label>
              <select
                className="input"
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value })}
              >
                <option>Male</option>
                <option>Female</option>
                <option>Unknown</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Deskripsi</label>
              <textarea
                required
                rows={4}
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Foto Cover</label>
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.coverImage}
                  alt=""
                  className="h-28 w-full rounded border border-koi-border object-cover"
                />
                <div className="space-y-2">
                  <MediaUploader
                    label="Upload foto cover"
                    accept="image/*"
                    folder="koi/cover"
                    onUploaded={(items) => {
                      const img = items.find((i) => i.type === "image");
                      if (img) setForm({ ...form, coverImage: img.url });
                    }}
                  />
                  <input
                    className="input text-xs"
                    value={form.coverImage}
                    onChange={(e) =>
                      setForm({ ...form, coverImage: e.target.value })
                    }
                    placeholder="atau paste URL foto"
                  />
                  <div className="flex gap-2">
                    {SAMPLE_IMAGES.map((url) => (
                      <button
                        type="button"
                        key={url}
                        onClick={() => setForm({ ...form, coverImage: url })}
                        className="h-10 w-10 overflow-hidden rounded border border-koi-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <label className="label">Galeri foto &amp; video</label>
              <MediaUploader
                label="Tambah foto / video (bisa pilih beberapa)"
                accept="image/*,video/*"
                multiple
                folder="koi/gallery"
                onUploaded={(items) => setMedia((m) => [...m, ...items])}
              />
              {media.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {media.map((m, idx) => (
                    <MediaThumb
                      key={m.publicId}
                      item={m}
                      onRemove={() =>
                        setMedia((prev) => prev.filter((_, i) => i !== idx))
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card space-y-4 p-6">
          <div>
            <label className="label">Mode Jual</label>
            <div className="grid grid-cols-2 gap-2">
              {(["FIXED", "AUCTION"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm({ ...form, mode: m })}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    form.mode === m
                      ? "border-koi-gold bg-koi-gold/10 text-koi-gold"
                      : "border-koi-border text-koi-platinum"
                  }`}
                >
                  {m === "FIXED" ? "Fixed Price" : "Lelang"}
                </button>
              ))}
            </div>
          </div>
          {form.mode === "FIXED" ? (
            <div>
              <label className="label">Harga (IDR)</label>
              <input
                type="number"
                required
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="label">Starting Bid (IDR)</label>
                <input
                  type="number"
                  required
                  className="input"
                  value={form.startingBid}
                  onChange={(e) => setForm({ ...form, startingBid: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Min Increment (IDR)</label>
                <input
                  type="number"
                  required
                  className="input"
                  value={form.minIncrement}
                  onChange={(e) => setForm({ ...form, minIncrement: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Durasi (jam)</label>
                <input
                  type="number"
                  required
                  className="input"
                  value={form.durationHours}
                  onChange={(e) =>
                    setForm({ ...form, durationHours: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-koi-platinum">
                  <input
                    type="checkbox"
                    checked={form.memberOnly}
                    onChange={(e) =>
                      setForm({ ...form, memberOnly: e.target.checked })
                    }
                  />{" "}
                  Eksklusif Member Elit
                </label>
              </div>
              {form.memberOnly && (
                <div>
                  <label className="label">Minimum Tier</label>
                  <select
                    className="input"
                    value={form.minTier}
                    onChange={(e) =>
                      setForm({ ...form, minTier: e.target.value as typeof form.minTier })
                    }
                  >
                    <option value="SILVER">Silver</option>
                    <option value="GOLD">Gold</option>
                    <option value="PLATINUM">Platinum</option>
                  </select>
                </div>
              )}
            </>
          )}
          {err && (
            <div className="rounded-lg border border-koi-red/50 bg-koi-red/10 p-3 text-sm text-koi-red">
              {err}
            </div>
          )}
          <button disabled={loading} className="btn-gold w-full">
            {loading ? "Mengupload..." : "Submit Listing"}
          </button>
          <p className="text-xs text-koi-muted">
            Listing akan melalui approval admin sebelum dipublish.
          </p>
        </div>
      </form>
    </div>
  );
}
