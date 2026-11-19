"use client";

import CounterSale from "@/components/counter/CounterSale";
import { getAdminToken } from "@/lib/auth";

export default function AdminSellPage() {
  return <CounterSale token={getAdminToken()} />;
}
