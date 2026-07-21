import { SKILL_ORDER } from "../data/adminData";

// Direct join vs request-only is computed live per viewer (not stored on the
// event) by comparing the viewer's own skill_level against the event's level.
export function computeJoinStatus(eventLevel: string | null | undefined, viewerLevel: string | undefined): "JOIN DIRECTLY" | "REQUEST ONLY" {
  if (!eventLevel) return "JOIN DIRECTLY";
  const viewerRank = SKILL_ORDER.indexOf((viewerLevel ?? "Rookie") as (typeof SKILL_ORDER)[number]);
  const eventRank = SKILL_ORDER.indexOf(eventLevel as (typeof SKILL_ORDER)[number]);
  return viewerRank >= eventRank ? "JOIN DIRECTLY" : "REQUEST ONLY";
}
