"use client";
import { useState } from "react";
import { Leaf, PawPrint } from "lucide-react";
import { indexedPhoto, type PhotoWidth } from "@/lib/photo-index";
import "./photo-thumb.css";

/** A cropped square photo of an animal (key: scientific name) or a tree (key:
 *  Chinese name). Kinds with no free photo show a quiet tile instead. */
export function PhotoThumb({
  photoKey,
  kind,
  size = 48,
  width = 250,
  radius,
  className,
}: {
  photoKey: string | null | undefined;
  kind: "animal" | "plant";
  /** Square side in CSS pixels. Omit to let the parent set the size. */
  size?: number;
  width?: PhotoWidth;
  radius?: number;
  className?: string;
}) {
  const photo = indexedPhoto(photoKey, width);
  const [failed, setFailed] = useState(false);
  const Icon = kind === "plant" ? Leaf : PawPrint;
  return (
    <span
      className={`photo-thumb${className ? ` ${className}` : ""}`}
      data-photo={photo && !failed ? "yes" : "none"}
      style={{
        ...(size ? { width: size, height: size } : {}),
        ...(radius !== undefined ? { borderRadius: radius } : {}),
      }}
      aria-hidden="true"
    >
      {photo && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.src}
          alt=""
          width={photo.width}
          height={photo.height}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon
          size={Math.max(14, Math.round((size || 48) * 0.42))}
          strokeWidth={1.5}
        />
      )}
    </span>
  );
}
