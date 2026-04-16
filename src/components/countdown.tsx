"use client";

import { useEffect, useState } from "react";
import { formatCountdown, msUntil } from "@/lib/utils";

export function Countdown({
  endTime,
  className,
  onEnd,
}: {
  endTime: string | Date;
  className?: string;
  onEnd?: () => void;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = msUntil(endTime);
  useEffect(() => {
    if (remaining <= 0) onEnd?.();
  }, [remaining, onEnd]);

  // now included so effect runs on ticks
  void now;

  return (
    <span className={className}>
      {remaining > 0 ? formatCountdown(remaining) : "Selesai"}
    </span>
  );
}
