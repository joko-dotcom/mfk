"use client";
import { useState } from "react";
import Link from "next/link";

export default function WhatsappLinkPage() {
  const [code, setCode] = useState<string | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/wa-link", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal");
      setCode(j.code);
      setExpires(j.expiresAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/account" className="text-sm text-koi-platinum/60 hover:text-koi-gold">
        ← Kembali ke akun
      </Link>
      <h1 className="mt-4 font-display text-3xl text-koi-gold">Link WhatsApp</h1>
      <p className="mt-2 text-koi-platinum/70">
        Hubungkan nomor WhatsApp Anda ke akun untuk bid via chat, notifikasi pemenang,
        dan peringatan bid-and-run.
      </p>

      <div className="mt-8 rounded-xl border border-koi-gold/20 bg-koi-ink/60 p-6">
        <h2 className="font-display text-xl text-koi-platinum">Cara menghubungkan</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-koi-platinum/80">
          <li>Klik <span className="text-koi-gold">Generate Kode</span> di bawah.</li>
          <li>Buka WhatsApp, chat bot Mafia Koi (nomor akan ditampilkan di footer setelah deploy).</li>
          <li>
            Kirim perintah: <code className="rounded bg-black/60 px-2 py-0.5 text-koi-gold">/link KODE</code>
          </li>
          <li>Bot akan konfirmasi. Setelah itu Anda bisa kirim:
            <ul className="mt-1 list-disc pl-5">
              <li><code>/bid AUCTION_ID NOMINAL</code> — pasang bid</li>
              <li><code>/myaccount</code> — cek info akun</li>
              <li><code>/help</code> — daftar perintah</li>
            </ul>
          </li>
        </ol>

        <button
          onClick={generate}
          disabled={loading}
          className="mt-6 rounded-lg bg-koi-gold px-5 py-2.5 font-medium text-koi-ink hover:bg-koi-gold/90 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Kode"}
        </button>

        {error && <p className="mt-4 text-sm text-koi-red">{error}</p>}

        {code && (
          <div className="mt-6 rounded-lg border border-koi-gold/40 bg-koi-gold/5 p-4">
            <p className="text-xs uppercase tracking-wider text-koi-gold/70">Kode Anda</p>
            <p className="mt-1 font-mono text-2xl font-bold text-koi-gold">{code}</p>
            <p className="mt-2 text-xs text-koi-platinum/60">
              Kirim ke bot: <code className="text-koi-gold">/link {code}</code>
              {expires && ` — valid sampai ${new Date(expires).toLocaleTimeString("id-ID")}`}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-koi-red/30 bg-koi-red/5 p-4 text-sm">
        <p className="font-medium text-koi-red">⚠️ Kebijakan Bid-and-Run</p>
        <p className="mt-1 text-koi-platinum/70">
          Pemenang lelang wajib membayar dalam 24 jam. Order overdue akan otomatis
          DEFAULTED, menambah strike. Pada strike ke-2, akun di-blacklist dan tidak
          bisa bid lagi di seluruh farm.
        </p>
      </div>
    </div>
  );
}
