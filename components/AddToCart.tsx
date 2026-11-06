"use client";
import { useState } from "react";
import { useCart } from "./Cart";
import type { Variant } from "@/lib/types";
import { money, unit, cx } from "@/lib/utils";

export default function AddToCart({ productId, name, image, variants, available }: { productId: string; name: string; image: string; variants: Variant[]; available: boolean }) {
  const { add, currency } = useCart(); const [sel, setSel] = useState(variants[0]?.id); const [qty, setQty] = useState(1);
  const v = variants.find((x) => x.id === sel) || variants[0];
  if (!v) return null;
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm text-navy/60">Size</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
          {variants.map((x) => (
            <button key={x.id} role="radio" aria-checked={x.id === v.id} onClick={() => setSel(x.id)}
              className={cx("rounded-full border px-5 py-2.5 text-sm transition-colors", x.id === v.id ? "border-navy bg-navy text-swan" : "border-mist hover:border-navy")}>
              {x.size_ml} ml · {money(unit(x), currency)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <button className="h-11 w-11 rounded-full border border-mist" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
          <span className="w-6 text-center">{qty}</span>
          <button className="h-11 w-11 rounded-full border border-mist" onClick={() => setQty(Math.min(20, qty + 1))} aria-label="Increase quantity">+</button>
        </div>
        <button disabled={!available} className="btn btn-navy flex-1"
          onClick={() => add({ key: `v:${v.id}`, kind: "variant", id: v.id, name, label: `${v.size_ml} ml`, price: unit(v), qty, image })}>
          {available ? "Add to cart" : "Currently unavailable"}
        </button>
      </div>
    </div>
  );
}
