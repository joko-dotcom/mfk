"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminActions({
  kind,
  id,
  actions,
}: {
  kind: "seller" | "koi";
  id: string;
  actions: Array<"verify" | "reject" | "approve">;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: string) {
    setBusy(true);
    await fetch(`/api/admin/${kind}/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {actions.map((a) => (
        <button
          key={a}
          disabled={busy}
          onClick={() => run(a)}
          className={a === "reject" ? "btn-danger" : "btn-gold"}
        >
          {a === "verify" ? "Verifikasi" : a === "approve" ? "Approve" : "Tolak"}
        </button>
      ))}
    </div>
  );
}
