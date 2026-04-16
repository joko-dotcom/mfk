"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";

const PROVINCES = [
  "Aceh","Sumatera Utara","Sumatera Barat","Riau","Jambi","Sumatera Selatan","Bengkulu","Lampung","Kepulauan Riau","Bangka Belitung",
  "DKI Jakarta","Banten","Jawa Barat","Jawa Tengah","DI Yogyakarta","Jawa Timur","Bali","NTB","NTT",
  "Kalimantan Barat","Kalimantan Tengah","Kalimantan Selatan","Kalimantan Timur","Kalimantan Utara",
  "Sulawesi Utara","Gorontalo","Sulawesi Tengah","Sulawesi Barat","Sulawesi Selatan","Sulawesi Tenggara",
  "Maluku","Maluku Utara","Papua","Papua Barat",
];

export default function SellerOnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    farmName: "",
    description: "",
    location: "",
    province: "Jawa Timur",
    ktpNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (session && session.user?.sellerId) {
      router.replace("/seller");
    }
  }, [session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/seller/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErr(data.error ?? "Gagal daftar seller");
      return;
    }
    await update();
    router.push("/seller");
    router.refresh();
  }

  if (!session?.user) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-koi-muted">
          Anda harus{" "}
          <Link href="/auth/login?callbackUrl=/seller/onboarding" className="text-koi-gold">
            masuk
          </Link>{" "}
          terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Seller</p>
        <h1 className="heading-display text-3xl text-white">Daftar Farm Koi Anda</h1>
        <p className="mt-1 max-w-xl text-sm text-koi-muted">
          Setelah submit, admin akan mereview dan memverifikasi farm Anda dalam 1x24 jam.
          Setelah terverifikasi, Anda bisa upload koi & membuat lelang.
        </p>
      </div>
      <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-6">
        <div>
          <label className="label">Nama Farm</label>
          <input
            required
            className="input"
            value={form.farmName}
            onChange={(e) => setForm({ ...form, farmName: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Deskripsi Farm</label>
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Kota/Kab</label>
            <input
              required
              className="input"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Provinsi</label>
            <select
              className="input"
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            >
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Nomor KTP (16 digit)</label>
          <input
            required
            className="input"
            pattern="[0-9]{16}"
            maxLength={16}
            value={form.ktpNumber}
            onChange={(e) => setForm({ ...form, ktpNumber: e.target.value })}
          />
          <p className="mt-1 text-xs text-koi-muted">
            Upload foto KTP & farm akan diminta di langkah selanjutnya (belum aktif pada MVP).
          </p>
        </div>
        {err && (
          <div className="rounded-lg border border-koi-red/50 bg-koi-red/10 p-3 text-sm text-koi-red">
            {err}
          </div>
        )}
        <button disabled={loading} className="btn-gold w-full">
          {loading ? "Mengirim..." : "Submit Verifikasi"}
        </button>
        <p className="flex items-center gap-2 text-xs text-koi-muted">
          <BadgeCheck size={14} className="text-koi-gold" />
          Admin akan memverifikasi KTP & foto farm sebelum listing dapat dipublish.
        </p>
      </form>
    </div>
  );
}
