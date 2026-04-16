"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SellerOpt {
  id: string;
  farmName: string;
  province: string;
}

export function AzukariCreateForm({
  sellers,
  defaultMonthlyFee,
}: {
  sellers: SellerOpt[];
  defaultMonthlyFee: number;
}) {
  const router = useRouter();
  const [hostSellerId, setHostSellerId] = useState(sellers[0]?.id ?? "");
  const [koiName, setKoiName] = useState("");
  const [sizeCm, setSizeCm] = useState(40);
  const [monthlyFeeIDR, setMonthlyFeeIDR] = useState(defaultMonthlyFee);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/azukari", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hostSellerId, koiName, sizeCm, monthlyFeeIDR }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Gagal submit");
      return;
    }
    setMsg("✓ Kontrak azukari dibuat.");
    setKoiName("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Host Farm</label>
        <select
          value={hostSellerId}
          onChange={(e) => setHostSellerId(e.target.value)}
          className="input"
          required
        >
          {sellers.length === 0 && <option value="">Tidak ada farm verified</option>}
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.farmName} — {s.province}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Nama Koi</label>
        <input
          className="input"
          value={koiName}
          onChange={(e) => setKoiName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Ukuran (cm)</label>
          <input
            type="number"
            className="input"
            value={sizeCm}
            onChange={(e) => setSizeCm(Number(e.target.value))}
            min={1}
            required
          />
        </div>
        <div>
          <label className="label">Fee Bulanan (IDR)</label>
          <input
            type="number"
            className="input"
            value={monthlyFeeIDR}
            onChange={(e) => setMonthlyFeeIDR(Number(e.target.value))}
            min={50000}
            step={50000}
            required
          />
        </div>
      </div>
      {msg && <p className="text-sm text-koi-gold">{msg}</p>}
      <button disabled={busy || !hostSellerId} className="btn-gold w-full" type="submit">
        {busy ? "Memproses…" : "Buat Kontrak"}
      </button>
    </form>
  );
}

export function AzukariActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (status !== "ACTIVE") return null;
  async function act(action: "FINISH" | "CANCEL") {
    setBusy(true);
    await fetch(`/api/azukari/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button disabled={busy} onClick={() => act("FINISH")} className="btn-gold px-3 py-1 text-xs">
        Selesai
      </button>
      <button disabled={busy} onClick={() => act("CANCEL")} className="btn-ghost px-3 py-1 text-xs">
        Batalkan
      </button>
    </div>
  );
}
