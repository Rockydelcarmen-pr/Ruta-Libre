import type { Lang, Protest } from "./types";

/** A protest plus the extra display fields the feed shows (going count, location). */
export interface MarchView extends Protest {
  going?: number;
  location?: string;
  featured?: boolean;
}

interface Bilingual {
  en: string;
  es: string;
}

interface SampleSpec {
  id: string;
  title: Bilingual;
  cause: Bilingual;
  goal: Bilingual;
  location: Bilingual;
  event_date: string;
  start_time: string;
  duration: number;
  going: number;
  status: string;
  featured: boolean;
  organizers: { id: string; name: string; role: string; website: string | null }[];
  links: string[];
  route: [number, number][];
  tags: string[];
}

const SPECS: SampleSpec[] = [
  {
    id: "sample-escambron",
    title: {
      en: "March for El Escambrón",
      es: "Marcha por El Escambrón",
    },
    cause: {
      en: "Keep El Escambrón's coast public. Stop Ordinance 55.",
      es: "Mantén pública la costa de El Escambrón. Detén la Ordenanza 55.",
    },
    goal: {
      en: "Stop Ordinance 55 and keep the coast public.",
      es: "Detener la Ordenanza 55 y mantener la costa pública.",
    },
    location: { en: "Puerta de Tierra", es: "Puerta de Tierra" },
    event_date: "2026-08-29",
    start_time: "10:00",
    duration: 180,
    going: 128,
    status: "approved",
    featured: true,
    organizers: [
      { id: "org-eu", name: "Escambrón Unido", role: "organizer", website: null },
      { id: "org-sc", name: "Sierra Club PR", role: "participant", website: null },
    ],
    links: [],
    route: [
      [-66.0975, 18.4665],
      [-66.096, 18.4658],
      [-66.0945, 18.465],
    ],
    tags: ["EJEMPLO", "Ordenanza 55", "costa", "ambiente"],
  },
  {
    id: "sample-viejo-sj",
    title: {
      en: "Old San Juan Climate Walk",
      es: "Caminata Climática del Viejo San Juan",
    },
    cause: {
      en: "Coastal resilience and climate action in the historic district.",
      es: "Resiliencia costera y acción climática en el casco histórico.",
    },
    goal: {
      en: "Raise awareness of sea-level rise in the historic district.",
      es: "Concientizar sobre el aumento del nivel del mar en el casco histórico.",
    },
    location: { en: "Casco histórico", es: "Casco histórico" },
    event_date: "2026-09-05",
    start_time: "09:00",
    duration: 120,
    going: 54,
    status: "upcoming",
    featured: false,
    organizers: [
      { id: "org-sc2", name: "Sierra Club PR", role: "organizer", website: null },
    ],
    links: [],
    route: [
      [-66.118, 18.4655],
      [-66.115, 18.4665],
      [-66.112, 18.467],
    ],
    tags: ["EJEMPLO", "clima", "costa", "ambiente"],
  },
];

export function getSampleProtests(lang: Lang): MarchView[] {
  return SPECS.map((s) => ({
    id: s.id,
    title: s.title[lang],
    cause: s.cause[lang],
    goal: s.goal[lang],
    description: null,
    event_date: s.event_date,
    start_time: s.start_time,
    estimated_duration_minutes: s.duration,
    external_links: s.links,
    tags: s.tags,
    status: s.status,
    route_geojson: { type: "LineString", coordinates: s.route },
    organizers: s.organizers.map((o) => ({ ...o, social_links: null })),
    participants: [],
    organizer_names: s.organizers
      .filter((o) => o.role === "organizer")
      .map((o) => o.name),
    going: s.going,
    location: s.location[lang],
    featured: s.featured,
  }));
}
