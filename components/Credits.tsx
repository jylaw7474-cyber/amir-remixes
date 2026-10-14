"use client";

import { useEffect, useState } from "react";

/** Mureka's billing response is not documented in detail, so show its balance field if present */
export default function Credits() {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b && (typeof b.balance === "number" || typeof b.balance === "string")) setBalance(String(b.balance));
      })
      .catch(() => {});
  }, []);

  if (balance === null) return null;
  return <span title="יתרה בחשבון Mureka">יתרה: <span dir="ltr">{balance}</span></span>;
}
