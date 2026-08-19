"use client";

import { useEffect, useRef, useState } from "react";

export interface SSEComment {
  id: string;
  text: string;
  createdAt: string;
  author?: { id: string; name: string | null };
  [key: string]: unknown;
}

interface UseSSECommentsResult<C> {
  comments: C[];
  isConnected: boolean;
}

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 10_000;

/**
 * Subscribes to a Server-Sent Events stream of comments and keeps a local
 * list up to date in real time.
 */
export function useSSEComments<C extends SSEComment>(
  url: string | null,
  initialComments: C[],
): UseSSECommentsResult<C> {
  const [comments, setComments] = useState<C[]>(initialComments);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const backoffRef = useRef<number>(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setComments(initialComments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (!url) {
      setIsConnected(false);
      return;
    }

    let closed = false;

    const scheduleReconnect = () => {
      if (closed) return;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS);
      reconnectTimerRef.current = setTimeout(() => {
        if (closed) return;
        connect();
      }, delay);
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
    };

    const connect = () => {
      const source = new EventSource(url);
      eventSourceRef.current = source;

      source.onopen = () => {
        backoffRef.current = INITIAL_BACKOFF_MS;
        setIsConnected(true);
      };

      source.addEventListener("comments", (event) => {
        try {
          const parsed = JSON.parse(event.data) as C[];
          if (!Array.isArray(parsed)) return;
          setComments((prev) => {
            const seen = new Set(prev.map((c) => c.id));
            const fresh = parsed.filter((c) => !seen.has(c.id));
            return fresh.length > 0 ? [...fresh, ...prev] : prev;
          });
        } catch {
          // Ignore malformed payloads
        }
      });

      source.addEventListener("heartbeat", () => {
        backoffRef.current = INITIAL_BACKOFF_MS;
      });

      source.onerror = () => {
        setIsConnected(false);
        try { source.close(); } catch { /* ignore */ }
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const source = eventSourceRef.current;
      if (source) {
        try { source.close(); } catch { /* ignore */ }
        eventSourceRef.current = null;
      }
    };
  }, [url]);

  return { comments, isConnected };
}
