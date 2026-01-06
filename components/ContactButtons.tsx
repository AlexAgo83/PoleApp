import Image from "next/image";
import clsx from "clsx";

type Props = {
  phone?: string | null;
  instagramUsername?: string | null;
  className?: string;
};

export function ContactButtons({ phone, instagramUsername, className }: Props) {
  const hasPhone = Boolean(phone?.trim());
  const hasInstagram = Boolean(instagramUsername?.trim());
  if (!hasPhone && !hasInstagram) return null;

  const buttonClass =
    "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10";
  const iconClass = "h-4 w-4";

  return (
    <div className={clsx("flex flex-wrap items-center gap-2", className)}>
      {hasPhone && (
        <a
          href={`https://wa.me/${phone}`}
          target="_blank"
          rel="noreferrer noopener"
          className={buttonClass}
          aria-label="Ouvrir WhatsApp"
        >
          <Image
            src="/icons/whatsapp.png"
            alt="WhatsApp"
            width={20}
            height={20}
            className={iconClass}
          />
          <span>WhatsApp</span>
        </a>
      )}
      {hasInstagram && (
        <a
          href={`https://www.instagram.com/${instagramUsername}/`}
          target="_blank"
          rel="noreferrer noopener"
          className={buttonClass}
          aria-label="Ouvrir le profil Instagram"
        >
          <Image
            src="/icons/instagram.png"
            alt="Instagram"
            width={20}
            height={20}
            className={iconClass}
          />
          <span>Instagram</span>
        </a>
      )}
    </div>
  );
}
