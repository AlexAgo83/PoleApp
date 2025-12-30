"use client";

import { ButtonHTMLAttributes, MouseEvent } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  message?: string;
  onConfirm?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function ConfirmDeleteButton({ message = "Confirmer la suppression ?", onConfirm, onClick, ...rest }: Props) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const ok = typeof window !== "undefined" ? window.confirm(message) : true;
    if (!ok) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onConfirm?.(event);
    onClick?.(event);
  };

  return <button {...rest} onClick={handleClick} />;
}
