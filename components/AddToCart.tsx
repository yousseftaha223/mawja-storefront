"use client";
import { useState } from "react";
import { useCart } from "./Cart";
import type { Variant } from "@/lib/types";
import { money, unit } from "@/lib/utils";

export default function AddToCart({ productId, name, image, variants, available }: { productId: string; name: string; image: string; variants: Variant[]; available: boolean }) {
  const { add, currency } = useCart(); const [sel, setSel] = useState(variants[0]?.id); const [qty, setQty] = useState(1);
  const v = variants.find((x) => x.id === sel) || variants[0];
  if (!v) return null;
  const sale = v.sale_price != null && v.sale_price < v.price;
  return (
    <div>
      <p className="mt-5 text-2xl font-medium">{sale && <s className="mr-3 text-lg font-normal opacity-55">{money(v.price, currency)}</s>}{money(unit(v), currency)}</p>
      <div className="mt-6">
        <p className="opt-label">Size</p>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Size">
          {variants.map((x) => (
            <button key={x.id} role="radio" aria-checked={x.id === v.id} onClick={() => setSel(x.id)} className="szb">
              <b>{x.size_ml} ml</b><span className="text-sm">{money(unit(x), currency)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-7 flex flex-wrap items-stretch gap-3">
        <div className="qty">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
          <span>{qty}</span>
          <button onClick={() => setQty(Math.min(20, qty + 1))} aria-label="Increase quantity">+</button>
        </div>
        <button disabled={!available} className="sbtn sbtn-teal" style={{ flex: 1, minWidth: 200 }}
          onClick={() => add({ key: `v:${v.id}`, kind: "variant", id: v.id, name, label: `${v.size_ml} ml`, price: unit(v), qty, image })}>
          {available ? "Add to cart" : "Currently unavailable"}
        </button>
      </div>
    </div>
  );
}
