"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Fish } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "BUYER" as "BUYER" | "SELLER",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Gagal mendaftar");
      setLoading(false);
      return;
    }
    const signed = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (signed?.error) {
      setError(signed.error);
      return;
    }
    router.push(form.role === "SELLER" ? "/seller/onboarding" : "/");
    router.refresh();
  }

  return (
    <div className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient text-black">
            <Fish size={16} />
          </span>
          <h1 className="font-display text-2xl text-white">Daftar Akun</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Nama Lengkap</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Nomor HP (opsional)</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Daftar Sebagai</label>
            <div className="grid grid-cols-2 gap-2">
              {(["BUYER", "SELLER"] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setForm({ ...form, role: r })}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    form.role === r
                      ? "border-koi-gold bg-koi-gold/10 text-koi-gold"
                      : "border-koi-border text-koi-platinum"
                  }`}
                >
                  {r === "BUYER" ? "Buyer / Kolektor" : "Seller / Farm"}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-koi-red/50 bg-koi-red/10 p-3 text-sm text-koi-red">
              {error}
            </div>
          )}
          <button disabled={loading} className="btn-gold w-full">
            {loading ? "Memproses..." : "Buat Akun"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-koi-muted">
          Sudah punya akun?{" "}
          <Link href="/auth/login" className="text-koi-gold hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
