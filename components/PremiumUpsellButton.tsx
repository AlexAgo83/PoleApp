"use client";

import { ComponentProps } from "react";

type Props = {
  label?: string;
} & ComponentProps<"button">;

export function PremiumUpsellButton({ label = "Passer premium", className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const event = new CustomEvent("open-premium-modal");
        window.dispatchEvent(event);
      }}
      className={className}
      {...rest}
    >
      {label}
    </button>
  );
}
