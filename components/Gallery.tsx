"use client";
import { useState } from "react";
export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="gal" />;
  return (
    <div>
      <div className="gal"><img src={images[i]} alt={alt} width={1000} height={1000} /></div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((s, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Image ${n + 1}`} aria-current={n === i}><img src={s} alt="" width={72} height={72} loading="lazy" /></button>
          ))}
        </div>
      )}
    </div>
  );
}
