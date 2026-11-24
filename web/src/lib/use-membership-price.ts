"use client";
import { useEffect, useState } from "react";

/** The fixed monthly fee, fetched once from the server (null until loaded). */
export function useMembershipPrice(): number | null {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/admin/settings").then((r) => (r.ok ? r.json() : null)).then((d) => d && setPrice(d.membershipPrice));
  }, []);
  return price;
}
