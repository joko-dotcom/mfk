import { subscribe, type AuctionEvent } from "@/lib/bid-bus";

// Node runtime so we can use long-lived SSE streams without the Edge runtime's
// stricter limits. Vercel serverless functions support SSE up to 300s (Pro).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auctionId = params.id;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      function send(event: AuctionEvent) {
        controller.enqueue(
          encoder.encode(
            `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
          ),
        );
      }
      // initial hello
      controller.enqueue(encoder.encode(`: connected\n\n`));

      const unsubscribe = subscribe(auctionId, send);

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 25_000);

      const abort = () => {
        clearInterval(keepalive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };
      _req.signal?.addEventListener?.("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
