"use client";
import { useTransition } from "react";
import Link from "next/link";
import { deleteItem, moveItem, toggleStatus } from "@/lib/actions/admin";

export default function RowActions({ table, id, status, editHref, name }: { table: "products" | "bundles"; id: string; status: string; editHref: string; name: string }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<any>) => start(async () => { const r = await fn(); if (r && !r.ok) alert(r.error); });
  const b = "rounded-full border border-mist px-3 py-1.5 text-xs hover:bg-swan disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button className={b} disabled={pending} onClick={() => run(() => moveItem(table, id, -1))} aria-label="Move up">↑</button>
      <button className={b} disabled={pending} onClick={() => run(() => moveItem(table, id, 1))} aria-label="Move down">↓</button>
      <button className={b} disabled={pending} onClick={() => run(() => toggleStatus(table, id))}>{status === "published" ? "Hide" : "Publish"}</button>
      <Link className={b} href={editHref}>Edit</Link>
      <button className={`${b} text-red-600`} disabled={pending} onClick={() => confirm(`Delete “${name}”? This cannot be undone.`) && run(() => deleteItem(table, id))}>Delete</button>
    </div>
  );
}
