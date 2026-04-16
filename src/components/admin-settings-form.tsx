"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlatformSetting } from "@prisma/client";

type Method = "MOCK" | "MIDTRANS" | "XENDIT" | "MANUAL_BANK_TRANSFER";

export function AdminSettingsForm({ setting }: { setting: PlatformSetting }) {
  const router = useRouter();
  const [state, setState] = useState({
    auctionFeeBps: setting.auctionFeeBps,
    listingFeeIDR: setting.listingFeeIDR,
    silverPriceIDR: setting.silverPriceIDR,
    goldPriceIDR: setting.goldPriceIDR,
    platinumPriceIDR: setting.platinumPriceIDR,
    minBuyerDepositIDR: setting.minBuyerDepositIDR,
    minSellerDepositIDR: setting.minSellerDepositIDR,
    bnrPenaltyBps: setting.bnrPenaltyBps,
    bnrStrikesForBan: setting.bnrStrikesForBan,
    withdrawalFeeIDR: setting.withdrawalFeeIDR,
    withdrawalMinIDR: setting.withdrawalMinIDR,
    azukariMonthlyFeeIDR: setting.azukariMonthlyFeeIDR,
    kcFeeBps: setting.kcFeeBps,
    paymentMethodDefault: setting.paymentMethodDefault as Method,
    waBotNumber: setting.waBotNumber ?? "",
    waAutoReply: setting.waAutoReply ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Gagal menyimpan");
      return;
    }
    setMsg("✓ Tersimpan.");
    router.refresh();
  }

  function update<K extends keyof typeof state>(key: K, value: (typeof state)[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  return (
    <form onSubmit={submit} className="card space-y-6 p-5">
      <Section title="Fee &amp; Membership">
        <NumberField
          label="Auction Fee (bps)"
          value={state.auctionFeeBps}
          onChange={(v) => update("auctionFeeBps", v)}
          hint="100 bps = 1%"
        />
        <NumberField
          label="Listing Fee (IDR)"
          value={state.listingFeeIDR}
          onChange={(v) => update("listingFeeIDR", v)}
        />
        <NumberField
          label="KC Fee (bps)"
          value={state.kcFeeBps}
          onChange={(v) => update("kcFeeBps", v)}
          hint="Fee konsinyasi 1500 bps = 15%"
        />
        <NumberField
          label="Silver Price (IDR)"
          value={state.silverPriceIDR}
          onChange={(v) => update("silverPriceIDR", v)}
        />
        <NumberField
          label="Gold Price (IDR)"
          value={state.goldPriceIDR}
          onChange={(v) => update("goldPriceIDR", v)}
        />
        <NumberField
          label="Platinum Price (IDR)"
          value={state.platinumPriceIDR}
          onChange={(v) => update("platinumPriceIDR", v)}
        />
      </Section>

      <Section title="Deposit &amp; BNR">
        <NumberField
          label="Min Deposit Buyer (IDR)"
          value={state.minBuyerDepositIDR}
          onChange={(v) => update("minBuyerDepositIDR", v)}
        />
        <NumberField
          label="Min Deposit Seller (IDR)"
          value={state.minSellerDepositIDR}
          onChange={(v) => update("minSellerDepositIDR", v)}
        />
        <NumberField
          label="BNR Penalty (bps of order)"
          value={state.bnrPenaltyBps}
          onChange={(v) => update("bnrPenaltyBps", v)}
          hint="5000 bps = 50% dari nilai order"
        />
        <NumberField
          label="BNR Strikes for Ban"
          value={state.bnrStrikesForBan}
          onChange={(v) => update("bnrStrikesForBan", v)}
        />
      </Section>

      <Section title="Withdrawal &amp; Azukari">
        <NumberField
          label="Withdrawal Fee (IDR)"
          value={state.withdrawalFeeIDR}
          onChange={(v) => update("withdrawalFeeIDR", v)}
        />
        <NumberField
          label="Min Withdrawal (IDR)"
          value={state.withdrawalMinIDR}
          onChange={(v) => update("withdrawalMinIDR", v)}
        />
        <NumberField
          label="Azukari Monthly Fee (IDR)"
          value={state.azukariMonthlyFeeIDR}
          onChange={(v) => update("azukariMonthlyFeeIDR", v)}
        />
      </Section>

      <Section title="Payment &amp; WhatsApp">
        <div>
          <label className="label">Payment Method Default</label>
          <select
            className="input"
            value={state.paymentMethodDefault}
            onChange={(e) =>
              update("paymentMethodDefault", e.target.value as Method)
            }
          >
            <option value="MOCK">MOCK (dev)</option>
            <option value="MIDTRANS">MIDTRANS</option>
            <option value="XENDIT">XENDIT</option>
            <option value="MANUAL_BANK_TRANSFER">Manual Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className="label">WA Bot Number</label>
          <input
            className="input"
            value={state.waBotNumber}
            onChange={(e) => update("waBotNumber", e.target.value)}
            placeholder="628xxxx"
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">WA Auto-Reply</label>
          <textarea
            className="input min-h-[90px]"
            value={state.waAutoReply}
            onChange={(e) => update("waAutoReply", e.target.value)}
            placeholder="Halo! Balas BID <id> <nominal> untuk bid via WhatsApp."
          />
        </div>
      </Section>

      {msg && <p className="text-sm text-koi-gold">{msg}</p>}
      <button disabled={busy} className="btn-gold" type="submit">
        {busy ? "Menyimpan…" : "Simpan Perubahan"}
      </button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="mb-3 text-xs uppercase tracking-widest text-koi-gold"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="mt-1 text-xs text-koi-muted">{hint}</p>}
    </div>
  );
}
