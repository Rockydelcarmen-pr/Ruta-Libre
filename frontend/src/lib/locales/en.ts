export const en = {
  app: {
    title: "Protest Tracker",
    tagline: "Know what's marching, and route around it with full context.",
  },
  lang: { label: "Language", en: "EN", es: "ES" },
  theme: { toLight: "Light mode", toDark: "Dark mode" },
  match: {
    heading: "Plan a route",
    pending:
      "Map and routing will appear here once the Google Maps key is configured.",
    origin: "Start",
    destination: "Destination",
    check: "Check route",
  },
  protests: {
    heading: "Upcoming protests",
    loading: "Loading protests...",
    empty: "No upcoming protests are registered right now.",
    error: "Could not load protests. Is the API running?",
  },
  protest: {
    cause: "Cause",
    goal: "Goal",
    when: "When",
    organizers: "Organizers",
    links: "Links",
    addToCalendar: "Add to calendar",
    downloadIcs: "Download .ics",
  },
  common: { minutes: "min" },
};

export type Resources = typeof en;
