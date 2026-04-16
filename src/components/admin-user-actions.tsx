"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserAdminActions({ id, banned }: { id: string; banned: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<"BID_AND_RUN" | "FRAUD" | "ABUSE" | "MANUAL">(
    "MANUAL",
  );

  async function act(action: "BAN" | "UNBAN" | "RESET_STRIKES") {
    setBusy(true);
    const body: Record<string, unknown> = { action };
    if (action === "BAN") body.reason = reason;
    await fetch(`/api/admin/users/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  if (banned) {
    return (
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => act("UNBAN")}
          className="btn-ghost px-3 py-1 text-xs"
        >
          Buka Blokir
        </button>
        <button
          disabled={busy}
          onClick={() => act("RESET_STRIKES")}
          className="btn-ghost px-3 py-1 text-xs"
        >
          Reset Strikes
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as typeof reason)}
        className="input max-w-[140px] text-xs"
      >
        <option value="MANUAL">Manual</option>
        <option value="BID_AND_RUN">BID_AND_RUN</option>
        <option value="FRAUD">FRAUD</option>
        <option value="ABUSE">ABUSE</option>
      </select>
      <button
        disabled={busy}
        onClick={() => act("BAN")}
        className="btn-danger px-3 py-1 text-xs"
      >
        Blokir
      </button>
      <button
        disabled={busy}
        onClick={() => act("RESET_STRIKES")}
        className="btn-ghost px-3 py-1 text-xs"
      >
        Reset
      </button>
    </div>
  );
}
