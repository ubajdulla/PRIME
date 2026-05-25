export interface Dict {
  nav: {
    events: string;
    alerts: string;
    profile: string;
    admin: string;
  };
  home: {
    eventsFeed: string;
    noEvents: string;
    tagline: string;
    copyright: string;
    footer: {
      privacy: string;
      terms: string;
      rules: string;
      contact: string;
    };
    filters: {
      all: string;
      tournament: string;
      games: string;
      trainings: string;
      events: string;
      beach: string;
      joinDirectly: string;
      requestOnly: string;
    };
  };
  event: {
    eventDetails: string;
    date: string;
    time: string;
    location: string;
    entryFee: string;
    requestOnly: string;
    joinDirectly: string;
    rosterTitle: string;
    capacity: string;
    joined: string;
    viewProfile: string;
    groupChat: string;
    waitlistCount: (n: number) => string;
    sendRequest: string;
    directJoin: string;
    moderator: string;
  };
  admin: {
    overview: string;
    upcomingEvents: string;
    pendingRequests: string;
    activePlayers: string;
    collectedWeek: string;
    paid: string;
    unpaid: string;
    pendingRequest: (n: number) => string;
  };
  days: {
    today: string;
    tomorrow: string;
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
}
