"use client";

import { useEffect, useRef, useState } from "react";
import { carPhoto } from "@/lib/catalogue-data";
import { CarGlyph } from "./car-glyph";

/**
 * A photo of the car from Wikimedia Commons, with its credit.
 * Falls back to the drawn outline if there's no photo or it fails to load.
 */
export function CarPhoto({
  brand,
  model,
  bodyType,
  className = "",
  width = 960,
  credit = false,
  priority = false,
}: {
  brand: string;
  model: string;
  bodyType: string;
  className?: string;
  width?: number;
  credit?: boolean;
  priority?: boolean;
}) {
  const photo = carPhoto(brand, model, width);
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // An image that failed before the page became interactive never fires onError, so check once on mount.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  if (!photo || failed) {
    return (
      <div className={`grid place-items-center bg-raised text-dim ${className}`}>
        <CarGlyph bodyType={bodyType} className="w-3/4 max-w-56" />
      </div>
    );
  }
  return (
    <figure className={`relative overflow-hidden bg-raised ${className}`}>
      {/* A plain img: the file is already resized by Commons, and its host isn't ours. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img}
        src={photo.src}
        alt={`${brand} ${model}`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-full object-cover text-transparent"
      />
      {credit && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6 text-right text-[11px] text-white/80">
          <a href={photo.page} target="_blank" rel="noreferrer" className="hover:text-white hover:underline">
            Photo{photo.credit ? `: ${photo.credit}` : ""}, Wikimedia Commons
          </a>
        </figcaption>
      )}
    </figure>
  );
}
