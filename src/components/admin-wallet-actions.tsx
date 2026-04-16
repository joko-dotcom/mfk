"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DepositApproveButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: "APPROVE" | "REJECT") {
    setBusy(true);
    await fetch(`/api/admin/deposits/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <button disabled={busy} onClick={() => act("APPROVE")} className="btn-gold px-3 py-1 text-xs">
        Setujui
      </button>
      <button disabled={busy} onClick={() => act("REJECT")} className="btn-ghost px-3 py-1 text-xs">
        Tolak
      </button>
    </div>
  );
}

export function WithdrawalApproveButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState("");
  async function act(action: "APPROVE" | "PAID" | "REJECT") {
    setBusy(true);
    const body: Record<string, unknown> = { action };
    if (action === "PAID" && ref) body.paymentRef = ref;
    await fetch(`/api/admin/withdrawals/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {status === "PENDING" && (
        <button disabled={busy} onClick={() => act("APPROVE")} className="btn-ghost px-3 py-1 text-xs">
          Setujui
        </button>
      )}
      <input
        className="input max-w-[180px]"
        placeholder="Payment ref"
        value={ref}
        onChange={(e) => setRef(e.target.value)}
      />
      <button disabled={busy} onClick={() => act("PAID")} className="btn-gold px-3 py-1 text-xs">
        Tandai Sudah Transfer
      </button>
      <button disabled={busy} onClick={() => act("REJECT")} className="btn-ghost px-3 py-1 text-xs">
        Tolak &amp; Refund
      </button>
    </div>
  );
}
