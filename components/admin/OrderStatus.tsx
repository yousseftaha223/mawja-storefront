"use client";
import { useTransition } from "react";
import { updateOrderStatus } from "@/lib/actions/admin";
import { ORDER_STATUSES } from "@/lib/config";
export default function OrderStatus({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <select disabled={pending} defaultValue={status} aria-label="Order status" className="rounded-lg border border-mist/70 bg-white px-3 py-2 text-sm capitalize"
      onChange={(e) => start(async () => { const r = await updateOrderStatus(id, e.target.value); if (!r.ok) alert(r.error); })}>
      {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
    </select>
  );
}
