"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function WishlistRemoveButton({ koiId }: { koiId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    await fetch("/api/wishlist", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ koiId }),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <button
      onClick={remove}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-full border border-koi-border px-2.5 py-1 text-xs text-koi-muted hover:border-koi-red/60 hover:text-koi-red"
    >
      <Trash2 size={12} /> {busy ? "…" : "Hapus"}
    </button>
  );
}
