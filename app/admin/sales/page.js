"use client";

import CounterSalesList from "@/components/counter/CounterSalesList";
import { getAdminToken } from "@/lib/auth";

export default function AdminSalesPage() {
  return <CounterSalesList token={getAdminToken()} isAdmin />;
}
