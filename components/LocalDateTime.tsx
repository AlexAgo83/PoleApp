"use client";

import { useEffect, useState } from "react";

type Props = {
  iso: string;
  options?: Intl.DateTimeFormatOptions;
  prefix?: string;
  fallback?: string;
  className?: string;
};

export function LocalDateTime({ iso, options, prefix = "", fallback, className }: Props) {
  const [value, setValue] = useState<string>(fallback ?? iso);

  useEffect(() => {
    try {
      const formatted = new Date(iso).toLocaleString("fr-FR", {
        hour12: false,
        ...options,
      });
      setValue(formatted);
    } catch {
      // ignore formatting errors, keep fallback
    }
  }, [iso, options]);

  return <span className={className}>{prefix}{value}</span>;
}
