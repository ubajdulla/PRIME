import gamesImage from "../../imports/events/games.jpg";
import tournamentImage from "../../imports/events/tournaments.jpg";
import trainingsImage from "../../imports/events/trainings.jpg";
import beachImage from "../../imports/events/beach.jpg";
import eventsImage from "../../imports/events/events.jpg";

export const DEFAULT_IMAGE: Record<string, string> = {
  GAMES: gamesImage,
  OPENGYM: gamesImage,
  TOURNAMENT: tournamentImage,
  TRAININGS: trainingsImage,
  BEACH: beachImage,
  EVENTS: eventsImage,
};

export function categoryImage(category: string | null | undefined): string {
  return DEFAULT_IMAGE[category ?? ""] ?? DEFAULT_IMAGE.GAMES;
}
