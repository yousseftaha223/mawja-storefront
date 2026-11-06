"use client";
import { useState } from "react";
import { cx } from "@/lib/utils";
export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="aspect-square rounded-2xl bg-swan" />;
  return (
    <div>
      <img src={images[i]} alt={alt} width={1000} height={1000} className="aspect-square w-full rounded-2xl object-cover" />
      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((s, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Image ${n + 1}`} className={cx("overflow-hidden rounded-lg border-2", n === i ? "border-navy" : "border-transparent")}>
              <img src={s} alt="" width={72} height={72} loading="lazy" className="h-[72px] w-[72px] object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
