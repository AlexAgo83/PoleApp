"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { allowedImageHosts } from "@/lib/imageHosts";

/* eslint-disable @next/next/no-img-element */

type SafeImageProps = {
  src?: string;
  publicId?: string | null;
  resourceType?: "image" | "video";
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
  publicId,
  resourceType = "image",
  alt,
  className,
  width,
  height,
  loading = "lazy",
  fallbackSrc,
}: SafeImageProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;
  const resolvedSrc =
    publicId && publicId.trim().length > 0 && cloudName
      ? `https://res.cloudinary.com/${cloudName}/${resourceType === "video" ? "video" : "image"}/upload/${publicId}`
      : src ?? "";
  const [forceFallback, setForceFallback] = useState(false);
  const parsedUrl = useMemo(() => {
    try {
      return resolvedSrc ? new URL(resolvedSrc) : null;
    } catch {
      return null;
    }
  }, [resolvedSrc]);

  const isDataOrRelative = !parsedUrl;
  const isAllowedHost = parsedUrl ? allowedImageHosts.includes(parsedUrl.hostname) : false;
  const resolvedWidth = width ?? 800;
  const resolvedHeight = height ?? 450;

  if (forceFallback || isDataOrRelative || !isAllowedHost) {
    return (
      <img
        src={forceFallback ? fallbackSrc ?? resolvedSrc : resolvedSrc}
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
      src={resolvedSrc}
      alt={alt}
      className={className}
      width={resolvedWidth}
      height={resolvedHeight}
      loading={loading}
      unoptimized
      onError={() => setForceFallback(true)}
    />
  );
}
