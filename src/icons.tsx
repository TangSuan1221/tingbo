export function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {muted ? <path d="m17 9 4 4m0-4-4 4" /> : <path d="M16 8.5c1.4 1.9 1.4 5.1 0 7m2.8-9.5c2.8 3.4 2.8 8.6 0 12" />}
    </svg>
  );
}

export function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? "filled" : ""}>
      <path d="M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  );
}

export function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h16v10H4V10Zm8 0v10M3 7h18v3H3V7Z" />
      <path d="M12 7H8.7C6.2 7 6 3.5 8.2 3.2 10.4 3 12 7 12 7Zm0 0h3.3c2.5 0 2.7-3.5.5-3.8C13.6 3 12 7 12 7Z" />
    </svg>
  );
}

export function GiftMiniIcon() {
  return (
    <span className="gift-mini" aria-hidden="true">
      <GiftIcon />
    </span>
  );
}

export function SignalIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 43V21M24 32h16M18 18l8 8m20-8-8 8M18 46l8-8m20 8-8-8" />
      <circle cx="32" cy="32" r="22" />
    </svg>
  );
}

export function PhoneAppIcon({
  kind
}: {
  kind: "live" | "browser" | "evidence" | "phone" | "scan" | "back" | "home";
}) {
  const paths = {
    live: (
      <>
        <rect x="4" y="6" width="16" height="12" />
        <path d="m10 10 5 2-5 2v-4Z" />
      </>
    ),
    browser: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16M12 4c2.5 2.2 3.6 4.9 3.6 8S14.5 17.8 12 20c-2.5-2.2-3.6-4.9-3.6-8S9.5 6.2 12 4Z" />
      </>
    ),
    evidence: (
      <>
        <path d="M6 3h9l3 3v15H6V3Z" />
        <path d="M15 3v4h4M9 11h6M9 15h6" />
      </>
    ),
    phone: <path d="M7.2 4.2 10 8 8.3 9.7c1.3 2.6 3.4 4.7 6 6l1.7-1.7 3.8 2.8-1.1 3c-.3.8-1.2 1.3-2.1 1.1C9.8 19.4 4.6 14.2 3.1 7.4c-.2-.9.3-1.8 1.1-2.1l3-1.1Z" />,
    scan: (
      <>
        <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
        <path d="M7 12h10M12 7v10" />
      </>
    ),
    back: <path d="m14.5 5-7 7 7 7M8 12h11" />,
    home: (
      <>
        <path d="m4 11 8-7 8 7" />
        <path d="M6.5 10v10h11V10M10 20v-6h4v6" />
      </>
    )
  };
  return (
    <svg className="phone-app-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13m-5-5 5 5-5 5" />
    </svg>
  );
}

export function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 8V4m0 0h-4m4 0-3 3a7 7 0 1 0 2 8" />
    </svg>
  );
}
