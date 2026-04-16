"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Fish } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email atau password salah");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="card w-full max-w-md p-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient text-black">
          <Fish size={16} />
        </span>
        <h1 className="font-display text-2xl text-white">Masuk</h1>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div className="rounded-lg border border-koi-red/50 bg-koi-red/10 p-3 text-sm text-koi-red">
            {error}
          </div>
        )}
        <button disabled={loading} className="btn-gold w-full">
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-koi-muted">
        Belum punya akun?{" "}
        <Link href="/auth/register" className="text-koi-gold hover:underline">
          Daftar
        </Link>
      </p>
      <div className="mt-4 rounded-lg border border-koi-border bg-koi-ink/50 p-3 text-xs text-koi-muted">
        <p className="font-medium text-koi-platinum">Demo accounts (seed):</p>
        <p>admin@mafiakoi.id / admin123</p>
        <p>sakai@mafiakoi.id / seller123 (seller)</p>
        <p>kolektor@mafiakoi.id / buyer123 (buyer)</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <Suspense fallback={<div className="text-koi-muted">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
