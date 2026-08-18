import type { Resources } from "./en";

export const es: Resources = {
  app: {
    title: "Rastreador de Protestas",
    tagline: "Entérate de lo que marcha y busca ruta con todo el contexto.",
  },
  lang: { label: "Idioma", en: "EN", es: "ES" },
  theme: { toLight: "Modo claro", toDark: "Modo oscuro" },
  match: {
    heading: "Planifica una ruta",
    pending:
      "El mapa y las rutas aparecerán aquí cuando se configure el estilo del mapa.",
    origin: "Origen",
    destination: "Destino",
    check: "Verificar ruta",
  },
  protests: {
    heading: "Próximas protestas",
    loading: "Cargando protestas...",
    empty: "No hay protestas próximas registradas por ahora.",
    error: "No se pudieron cargar las protestas. ¿Está corriendo la API?",
  },
  protest: {
    cause: "Causa",
    goal: "Objetivo",
    when: "Cuándo",
    organizers: "Organizaciones",
    links: "Enlaces",
    addToCalendar: "Agregar al calendario",
    downloadIcs: "Descargar .ics",
  },
  common: { minutes: "min" },
};
