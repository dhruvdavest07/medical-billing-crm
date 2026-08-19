"use client";

import * as React from "react";
import type { VitalSnapshot } from "@/lib/vitals";

type StreamStatus = "idle" | "connecting" | "live" | "error";

type StreamPayload = {
  patientId: string;
  vital: VitalSnapshot | null;
};

export function useVitalsStream(patientId?: string | null) {
  const [latestVital, setLatestVital] = React.useState<VitalSnapshot | null>(null);
  const [status, setStatus] = React.useState<StreamStatus>("idle");

  React.useEffect(() => {
    if (!patientId) {
      setLatestVital(null);
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    const stream = new EventSource(
      `/api/vitals/stream?patientId=${encodeURIComponent(patientId)}`,
    );

    const handleSnapshot = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as StreamPayload;
      setLatestVital(payload.vital);
      setStatus("live");
    };

    const handleVital = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as StreamPayload;
      setLatestVital(payload.vital);
      setStatus("live");
    };

    const handleConnected = () => {
      setStatus("live");
    };

    const handleError = () => {
      setStatus("error");
    };

    stream.addEventListener("connected", handleConnected);
    stream.addEventListener("snapshot", handleSnapshot as EventListener);
    stream.addEventListener("vital", handleVital as EventListener);
    stream.onerror = handleError;

    return () => {
      stream.removeEventListener("connected", handleConnected);
      stream.removeEventListener("snapshot", handleSnapshot as EventListener);
      stream.removeEventListener("vital", handleVital as EventListener);
      stream.close();
    };
  }, [patientId]);

  return {
    latestVital,
    status,
  };
}
