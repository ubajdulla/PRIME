import { CheckCircle2 } from "lucide-react";

interface VerifiedBadgeProps {
  verified: boolean | null | undefined;
  size?: number;
  ringClassName?: string;
}

// Public verified checkmark, shown to everyone (unlike TrustDot, which is
// admin-only) - always bottom-right on a `relative`-positioned avatar
// wrapper, matching the badge already used on the admin player profile
// header avatar.
export function VerifiedBadge({ verified, size = 16, ringClassName = "border-[#0e1621]" }: VerifiedBadgeProps) {
  if (!verified) return null;
  const iconSize = Math.max(8, Math.round(size * 0.62));
  return (
    <div
      className={`absolute -right-0.5 -bottom-0.5 bg-[#3390ec] rounded-full flex items-center justify-center border-2 ${ringClassName}`}
      style={{ width: size, height: size }}
    >
      <CheckCircle2 size={iconSize} className="text-white" strokeWidth={2.5} />
    </div>
  );
}
