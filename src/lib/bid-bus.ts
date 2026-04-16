// Simple in-process pub/sub for auction updates.
// Used for server-sent events (SSE) streaming so clients get near-realtime bid
// updates without needing a dedicated websocket server. Works on a single
// serverless instance; for multi-instance prod, swap with Redis Pub/Sub, Pusher,
// Ably, or LiveKit.

type AuctionEvent =
  | {
      type: "bid";
      auctionId: string;
      amount: number;
      userName: string;
      userId: string;
      endTime: string;
      at: string;
    }
  | {
      type: "chat";
      auctionId: string;
      userName: string;
      userId: string;
      message: string;
      at: string;
    }
  | {
      type: "status";
      auctionId: string;
      status: string;
      at: string;
    }
  | {
      type: "live";
      auctionId: string;
      active: boolean;
      at: string;
    };

type Listener = (e: AuctionEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(auctionId: string, fn: Listener): () => void {
  const set = listeners.get(auctionId) ?? new Set<Listener>();
  set.add(fn);
  listeners.set(auctionId, set);
  return () => {
    set.delete(fn);
    if (set.size === 0) listeners.delete(auctionId);
  };
}

export function publish(e: AuctionEvent): void {
  const set = listeners.get(e.auctionId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(e);
    } catch {
      // ignore individual listener errors
    }
  }
}

export type { AuctionEvent };
