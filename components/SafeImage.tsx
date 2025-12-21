"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { allowedImageHosts } from "@/lib/imageHosts";

/* eslint-disable @next/next/no-img-element */

type SafeImageProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  fallbackSrc?: string;
};

/**
 * Hybrid image component:
 * - Data URIs or relative paths -> plain <img>.
 * - Allowed remote hosts -> next/image (unoptimized to avoid pipeline surprises).
 * - Disallowed hosts -> plain <img> with fallback on error.
 */
export function SafeImage({
  src,
  alt,
  className,
  width,
  height,
  loading = "lazy",
  fallbackSrc,
}: SafeImageProps) {
  const [forceFallback, setForceFallback] = useState(false);
  const parsedUrl = useMemo(() => {
    try {
      return new URL(src);
    } catch {
      return null;
    }
  }, [src]);

  const isDataOrRelative = !parsedUrl;
  const isAllowedHost = parsedUrl ? allowedImageHosts.includes(parsedUrl.hostname) : false;

  if (forceFallback || isDataOrRelative || !isAllowedHost) {
    return (
      <img
        src={forceFallback ? fallbackSrc ?? src : src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={loading}
        onError={() => setForceFallback(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      unoptimized
      onError={() => setForceFallback(true)}
    />
  );
}
