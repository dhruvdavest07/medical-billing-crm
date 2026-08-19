import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import type { OrderComment } from "@prisma/client";

const ENCODER = new TextEncoder();
const POLL_INTERVAL_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 15_000;

type CommentWithAuthor = OrderComment & {
  author: { id: string; name: string | null };
};

interface ServerSentEvent {
  type: "comments" | "heartbeat" | "connected" | "error";
  data: unknown;
}

function formatSSE(event: ServerSentEvent): Uint8Array {
  const payload = typeof event.data === "string" ? event.data : JSON.stringify(event.data);
  return ENCODER.encode(`event: ${event.type}qndata: ${payload}\n\n`);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let orgId: string;
  try {
    const ctx = await requireOrgContext();
    orgId = ctx.organizationId;
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: status === 403 ? 403 : 401 },
    );
  }

  const order = await prisma.billingOrder.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const abortSignal = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastSeenCount = await prisma.orderComment
        .count({ where: { orderId: id } })
        .catch(() => 0);

      controller.enqueue(
        formatSSE({ type: "connected", data: { count: lastSeenCount } }),
      );

      const poll = async () => {
        try {
          const currentCount = await prisma.orderComment.count({
            where: { orderId: id },
          });

          if (currentCount > lastSeenCount) {
            const newComments = await prisma.orderComment.findMany({
              where: { orderId: id, createdAt: { gt: new Date(Date.now() - 60_000) } },
              include: { author: { select: { id: true, name: true } } },
              orderBy: { createdAt: "desc" },
            }) as CommentWithAuthor[];

            const toSend = newComments.slice(0, currentCount - lastSeenCount);
            if (toSend.length > 0) {
              controller.enqueue(formatSSE({ type: "comments", data: toSend }));
            }
            lastSeenCount = currentCount;
          }
        } catch {
          // ignore poll errors
        }
      };

      const pollTimer = setInterval(poll, POLL_INTERVAL_MS);
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(formatSSE({ type: "heartbeat", data: { t: Date.now() } }));
        } catch {
          // controller may be closed
        }
      }, HEARTBEAT_INTERVAL_MS);

      const cleanup = () => {
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        try { controller.close(); } catch { /* already closed */ }
      };

      abortSignal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      // Client cancelled the stream
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
