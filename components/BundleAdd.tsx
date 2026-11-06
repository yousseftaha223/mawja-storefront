"use client";
import { useCart } from "./Cart";
export default function BundleAdd({ id, name, price, image }: { id: string; name: string; price: number; image: string }) {
  const { add } = useCart();
  return <button className="btn btn-navy" onClick={() => add({ key: `b:${id}`, kind: "bundle", id, name, label: "Bundle", price, qty: 1, image })}>Add bundle to cart</button>;
}
