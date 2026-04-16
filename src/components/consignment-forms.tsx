"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SellerOpt {
  id: string;
  farmName: string;
  province: string;
}

export function ConsignmentCreateForm({ sellers }: { sellers: SellerOpt[] }) {
  const router = useRouter();
  const [hostSellerId, setHostSellerId] = useState(sellers[0]?.id ?? "");
  const [koiName, setKoiName] = useState("");
  const [sizeCm, setSizeCm] = useState(30);
  const [askingPrice, setAskingPrice] = useState(5_000_000);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/kc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hostSellerId, koiName, sizeCm, askingPrice, description }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Gagal submit");
      return;
    }
    setMsg("✓ Request dikirim ke farm host.");
    setKoiName("");
    setDescription("");
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
          <label className="label">Asking Price (IDR)</label>
          <input
            type="number"
            className="input"
            value={askingPrice}
            onChange={(e) => setAskingPrice(Number(e.target.value))}
            min={100000}
            step={100000}
            required
          />
        </div>
      </div>
      <div>
        <label className="label">Deskripsi</label>
        <textarea
          className="input min-h-[90px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {msg && <p className="text-sm text-koi-gold">{msg}</p>}
      <button disabled={busy || !hostSellerId} className="btn-gold w-full" type="submit">
        {busy ? "Memproses…" : "Kirim Request"}
      </button>
    </form>
  );
}

export function ConsignmentActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [soldPrice, setSoldPrice] = useState(0);

  async function act(action: "APPROVE" | "REJECT" | "COMPLETE") {
    setBusy(true);
    const body: Record<string, unknown> = { action };
    if (action === "COMPLETE") body.soldPrice = soldPrice;
    await fetch(`/api/kc/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  if (status === "PENDING") {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => act("APPROVE")} className="btn-gold px-3 py-1 text-xs">
          Terima
        </button>
        <button disabled={busy} onClick={() => act("REJECT")} className="btn-ghost px-3 py-1 text-xs">
          Tolak
        </button>
      </div>
    );
  }
  if (status === "ACTIVE") {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="number"
          className="input max-w-[160px]"
          placeholder="Sold price IDR"
          value={soldPrice || ""}
          onChange={(e) => setSoldPrice(Number(e.target.value))}
        />
        <button
          disabled={busy || soldPrice < 1000}
          onClick={() => act("COMPLETE")}
          className="btn-gold px-3 py-1 text-xs"
        >
          Mark Sold
        </button>
      </div>
    );
  }
  return null;
}
