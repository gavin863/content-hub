// Per-channel branding: colors + authentic logos, used to theme the composer
// and the live preview so each channel looks like its real platform.

export const CHANNELS = {
  facebook: {
    key: "facebook",
    label: "Facebook",
    color: "#1877F2",
    ring: "rgba(24,119,242,0.15)",
    soft: "#EAF2FE",
    grad: "linear-gradient(135deg,#1877F2,#0A5DC2)"
  },
  wordpress: {
    key: "wordpress",
    label: "WordPress",
    color: "#1650C8",
    ring: "rgba(22,80,200,0.18)",
    soft: "#E8EFFE",
    grad: "linear-gradient(135deg,#2A7FFF,#0E3EA8)"
  }
};

export function channelTheme(type) {
  return CHANNELS[type] || {
    key: type, label: type || "Kênh", color: "#334155",
    ring: "rgba(51,65,85,0.15)", soft: "#F1F5F9", grad: "linear-gradient(135deg,#64748B,#334155)"
  };
}

// White logo glyph, meant to sit inside a colored circle/square.
export function ChannelGlyph({ type, className = "w-5 h-5" }) {
  if (type === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07"/>
      </svg>
    );
  }
  if (type === "wordpress") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M3.42 12c0-1.24.27-2.42.74-3.48L8.2 19.2A8.59 8.59 0 0 1 3.42 12zM12 20.58c-.84 0-1.66-.12-2.42-.35l2.57-7.47 2.63 7.22.06.13c-.9.31-1.86.47-2.84.47zm1.18-12.6c.51-.03.98-.08.98-.08.46-.06.4-.74-.06-.71 0 0-1.39.11-2.29.11-.84 0-2.26-.11-2.26-.11-.46-.03-.52.68-.05.71 0 0 .43.05.89.08l1.33 3.65-1.87 5.61-3.11-9.26c.51-.03.98-.08.98-.08.46-.06.4-.74-.06-.71 0 0-1.39.11-2.29.11-.16 0-.35-.01-.55-.01A8.58 8.58 0 0 1 12 3.42c2.23 0 4.26.85 5.79 2.25h-.11c-.84 0-1.44.73-1.44 1.52 0 .71.4 1.3.84 2.01.33.57.71 1.3.71 2.36 0 .73-.28 1.58-.65 2.76l-.85 2.85-3.06-9.19zm5.6 1.19c.34 1 .53 2.09.53 3.23a8.55 8.55 0 0 1-4.26 7.4l2.62-7.57c.49-1.22.65-2.2.65-3.07 0-.32-.02-.61-.06-.9zM12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2z"/>
      </svg>
    );
  }
  return <span className={className}>◆</span>;
}

// Nimbus company logo mark (a blue blossom holding an "N"). Recreated as inline
// SVG; swap for the real asset by dropping it in public/ and using an <img>.
export function NimbusLogo({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-label="Nimbus" role="img">
      <g fill="#1E7BFF">
        <circle cx="40" cy="32" r="20" />
        <circle cx="80" cy="32" r="20" />
        <circle cx="30" cy="60" r="20" />
        <circle cx="90" cy="60" r="20" />
        <circle cx="40" cy="88" r="20" />
        <circle cx="80" cy="88" r="20" />
        <rect x="26" y="26" width="68" height="68" rx="22" />
      </g>
      <rect x="41" y="33" width="12" height="54" rx="3" fill="#fff" />
      <rect x="67" y="33" width="12" height="54" rx="3" fill="#fff" />
      <polygon points="41,33 53,33 79,87 67,87" fill="#fff" />
    </svg>
  );
}

// Circular brand avatar for the account/page (uses the brand's initial).
export function BrandAvatar({ name, size = 40, grad = "linear-gradient(135deg,#0074FF,#00C2FF)" }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{ width: size, height: size, background: grad, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}
