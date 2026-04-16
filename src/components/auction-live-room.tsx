"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Gavel, MessageCircle, Users, Zap, Crown } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { formatIDR, TIER_LABEL, tierRank } from "@/lib/utils";

type BidEntry = {
  id: string;
  amount: number;
  userName: string;
  createdAt: string;
};

type ChatEntry = {
  id: string;
  userName: string;
  message: string;
  kind: "chat" | "bid_event" | "system";
  createdAt: string;
};

type Props = {
  auctionId: string;
  slug: string;
  initialCurrentBid: number;
  startingBid: number;
  minIncrement: number;
  endTime: string;
  status: string;
  memberOnly: boolean;
  minTier: "NONE" | "SILVER" | "GOLD" | "PLATINUM";
  antiSniperMinutes: number;
  initialBids: BidEntry[];
};

export function AuctionLiveRoom({
  auctionId,
  slug,
  initialCurrentBid,
  startingBid,
  minIncrement,
  endTime: initialEndTime,
  status,
  memberOnly,
  minTier,
  antiSniperMinutes,
  initialBids,
}: Props) {
  const { data: session } = useSession();
  const [currentBid, setCurrentBid] = useState(initialCurrentBid);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [bids, setBids] = useState<BidEntry[]>(initialBids);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const minNextBid = Math.max(currentBid + minIncrement, startingBid + minIncrement);

  const canBid =
    !!session?.user &&
    status !== "ENDED" &&
    status !== "CANCELLED" &&
    (!memberOnly || tierRank(session.user.membershipTier) >= tierRank(minTier));

  useEffect(() => {
    const es = new EventSource(`/api/auctions/${auctionId}/stream`);
    es.addEventListener("bid", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          amount: number;
          userName: string;
          endTime: string;
          at: string;
          bidId?: string;
        };
        setCurrentBid(data.amount);
        setEndTime(data.endTime);
        setBids((prev) => [
          {
            id: data.bidId ?? `${data.at}-${data.amount}`,
            amount: data.amount,
            userName: data.userName,
            createdAt: data.at,
          },
          ...prev,
        ].slice(0, 50));
        setChat((prev) => [
          ...prev,
          {
            id: `bid-${data.at}`,
            userName: data.userName,
            message: `bid ${formatIDR(data.amount)}`,
            kind: "bid_event" as const,
            createdAt: data.at,
          },
        ].slice(-200));
        setFlash(true);
        setTimeout(() => setFlash(false), 900);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("chat", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          userName: string;
          message: string;
          at: string;
        };
        setChat((prev) => [
          ...prev,
          {
            id: `chat-${data.at}`,
            userName: data.userName,
            message: data.message,
            kind: "chat" as const,
            createdAt: data.at,
          },
        ].slice(-200));
      } catch {
        /* ignore */
      }
    });
    return () => es.close();
  }, [auctionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length]);

  async function placeBid(amountNum: number) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/auctions/${auctionId}/bid`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: amountNum }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error ?? "Gagal bid");
      return;
    }
    setInput("");
  }

  async function sendChat() {
    const msg = message.trim();
    if (!msg) return;
    setMessage("");
    await fetch(`/api/auctions/${auctionId}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
  }

  // Ignore slug for now, used to generate possible share links in future
  void slug;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`card p-5 transition ${flash ? "ring-2 ring-koi-gold" : ""}`}
      >
        <div className="flex items-center justify-between">
          <span className="chip-red">
            <Gavel size={10} /> Live Bidding
          </span>
          {memberOnly && (
            <span className="chip-gold">
              <Crown size={10} /> {TIER_LABEL[minTier]}+ Only
            </span>
          )}
        </div>
        <p className="mt-3 text-xs uppercase tracking-widest text-koi-muted">
          Current Bid
        </p>
        <p className="font-display text-4xl text-koi-gold md:text-5xl">
          {formatIDR(currentBid)}
        </p>
        <p className="text-xs text-koi-muted">
          Min next bid: {formatIDR(minNextBid)} • Starting {formatIDR(startingBid)}
        </p>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-koi-border bg-koi-ink/60 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase text-koi-muted">Berakhir dalam</p>
            <Countdown endTime={endTime} className="font-mono text-xl text-white" />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-koi-muted">Anti-Sniper</p>
            <p className="text-sm text-white">+{antiSniperMinutes} menit saat last bid</p>
          </div>
        </div>
        {!session?.user ? (
          <Link href={`/auth/login?callbackUrl=/auctions/${slug}`} className="btn-gold mt-4 w-full">
            Masuk untuk Bid
          </Link>
        ) : !canBid ? (
          <div className="mt-4 rounded-lg border border-koi-gold/40 bg-koi-gold/10 p-3 text-xs text-koi-gold">
            Lelang ini eksklusif untuk member {TIER_LABEL[minTier]}+. <Link href="/membership" className="underline">Upgrade membership</Link>.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 4].map((mult) => {
                const amt = currentBid + minIncrement * (mult + 1);
                return (
                  <button
                    key={mult}
                    onClick={() => placeBid(amt)}
                    disabled={busy}
                    className="btn-ghost flex-1"
                  >
                    <Zap size={12} /> +{formatIDR(minIncrement * (mult + 1))}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={`${minNextBid}`}
                className="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                onClick={() => {
                  const n = Number(input);
                  if (!Number.isFinite(n)) return;
                  placeBid(n);
                }}
                disabled={busy || !input}
                className="btn-gold"
              >
                Bid
              </button>
            </div>
            {err && (
              <div className="rounded-lg border border-koi-red/50 bg-koi-red/10 p-2 text-xs text-koi-red">
                {err}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card flex h-[420px] flex-col">
        <div className="flex items-center justify-between border-b border-koi-border px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-white">
            <MessageCircle size={14} /> Live Chat & Bid
          </p>
          <p className="flex items-center gap-1 text-xs text-koi-muted">
            <Users size={12} /> live
          </p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
          {bids.slice(0, 5).map((b) => (
            <div key={`seed-${b.id}`} className="flex items-center gap-2 text-xs text-koi-muted">
              <span className="chip-gold shrink-0">
                <Gavel size={10} /> bid
              </span>
              <span className="text-white">{b.userName}</span>
              <span className="text-koi-gold">{formatIDR(b.amount)}</span>
            </div>
          ))}
          {chat.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              {c.kind === "bid_event" ? (
                <>
                  <span className="chip-gold shrink-0">
                    <Gavel size={10} /> bid
                  </span>
                  <p className="text-white">
                    <span className="font-medium">{c.userName}</span>{" "}
                    <span className="text-koi-gold">{c.message}</span>
                  </p>
                </>
              ) : (
                <p className="text-koi-platinum">
                  <span className="font-medium text-white">{c.userName}: </span>
                  {c.message}
                </p>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {session?.user && (
          <div className="flex gap-2 border-t border-koi-border p-3">
            <input
              className="input"
              placeholder="Tulis pesan..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendChat();
              }}
            />
            <button onClick={sendChat} className="btn-ghost">
              Kirim
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
