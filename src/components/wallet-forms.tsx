"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatIDR } from "@/lib/utils";

export function DepositForm({
  allowSeller,
  minBuyerIDR,
  minSellerIDR,
}: {
  allowSeller: boolean;
  minBuyerIDR: number;
  minSellerIDR: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(minBuyerIDR);
  const [purpose, setPurpose] = useState<"BUYER" | "SELLER">("BUYER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/wallet/deposit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount, purpose, method: "MOCK" }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? "Gagal top up");
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/wallet"), 800);
    router.refresh();
  }

  const min = purpose === "SELLER" ? minSellerIDR : minBuyerIDR;

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      {allowSeller && (
        <div>
          <label className="label">Tujuan Deposit</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPurpose("BUYER")}
              className={purpose === "BUYER" ? "btn-gold flex-1" : "btn-ghost flex-1"}
            >
              Buyer (spendable)
            </button>
            <button
              type="button"
              onClick={() => setPurpose("SELLER")}
              className={purpose === "SELLER" ? "btn-gold flex-1" : "btn-ghost flex-1"}
            >
              Seller Jaminan
            </button>
          </div>
        </div>
      )}
      <div>
        <label className="label">Nominal (IDR)</label>
        <input
          type="number"
          min={min}
          step={50000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="input"
          required
        />
        <p className="mt-1 text-xs text-koi-muted">
          Minimal {formatIDR(min)}. Mode MOCK — auto-approve untuk development.
        </p>
      </div>
      {error && <p className="text-sm text-koi-red">{error}</p>}
      {success && (
        <p className="text-sm text-koi-gold">
          ✓ Top up berhasil. Saldo diperbarui, redirect…
        </p>
      )}
      <button disabled={submitting} type="submit" className="btn-gold w-full">
        {submitting ? "Memproses…" : `Top Up ${formatIDR(amount)}`}
      </button>
    </form>
  );
}

export function WithdrawForm({
  available,
  minIDR,
  feeIDR,
}: {
  available: number;
  minIDR: number;
  feeIDR: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(Math.max(minIDR, 0));
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount, bankName, bankAccount, accountName }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? "Gagal request penarikan");
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/wallet"), 800);
    router.refresh();
  }

  const net = Math.max(0, amount - feeIDR);

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div>
        <label className="label">Nominal (IDR)</label>
        <input
          type="number"
          min={minIDR}
          max={available}
          step={10000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="input"
          required
        />
        <p className="mt-1 text-xs text-koi-muted">
          Tersedia {formatIDR(available)} • Biaya admin {formatIDR(feeIDR)} • Anda terima{" "}
          <span className="text-koi-gold">{formatIDR(net)}</span>
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Bank</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="BCA / Mandiri / BNI"
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">No Rekening</label>
          <input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>
      <div>
        <label className="label">Nama Pemilik Rekening</label>
        <input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          className="input"
          required
        />
      </div>
      {error && <p className="text-sm text-koi-red">{error}</p>}
      {success && <p className="text-sm text-koi-gold">✓ Request dikirim, tunggu approval admin.</p>}
      <button disabled={submitting || available < minIDR} type="submit" className="btn-gold w-full">
        {submitting ? "Memproses…" : `Ajukan Penarikan ${formatIDR(amount)}`}
      </button>
    </form>
  );
}
