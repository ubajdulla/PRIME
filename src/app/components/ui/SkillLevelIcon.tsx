import { SKILL_ORDER } from "../../data/adminData";

// "Fill Level" cup: a rank-proportional fill rises inside the bowl, empty at
// Rookie (1/6) to overflowing at PRIME (6/6) - the tier reads from how full
// the cup is, not a detail that has to be spotted. Shared between the
// Players search categories and every place a player's skill tier is shown;
// takes its color from the surrounding text color (currentColor).
export function SkillLevelIcon({ level, size = 18 }: { level: string; size?: number }) {
  const rank = Math.max(1, SKILL_ORDER.indexOf(level as (typeof SKILL_ORDER)[number]) + 1);
  const frac = rank / SKILL_ORDER.length;
  const bowlTop = 4.5, bowlBottom = 12.3;
  const fillY = bowlBottom - frac * (bowlBottom - bowlTop);
  const clipId = `cup-clip-${level}`;
  return (
    <svg width={size} height={size * (26 / 24)} viewBox="0 0 24 26" fill="none">
      <defs>
        <clipPath id={clipId}><path d="M7.3 4.3h9.4v4a4.7 4.7 0 0 1-9.4 0Z" /></clipPath>
      </defs>
      <rect x="6" y={fillY} width="12" height="10" fill="currentColor" opacity={0.85} clipPath={`url(#${clipId})`} />
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth={1.9} />
      <path d="M7 6H4a2 2 0 0 0 2 4M17 6h3a2 2 0 0 1-2 4" stroke="currentColor" strokeWidth={1.9} />
    </svg>
  );
}
