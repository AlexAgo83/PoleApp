"use client";

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
 * Simple <img> fallback to avoid next/image remote host whitelisting issues.
 * Use for dynamic/external URLs where domains are not guaranteed.
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
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      onError={(e) => {
        if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
          e.currentTarget.src = fallbackSrc;
        }
      }}
    />
  );
}
