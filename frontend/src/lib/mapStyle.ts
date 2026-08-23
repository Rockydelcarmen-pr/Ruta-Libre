import type { StyleSpecification } from "maplibre-gl";

/** Free OpenStreetMap raster tiles: real streets and buildings, no API key.
    For production, set VITE_MAP_STYLE_URL to a proper tile provider. */
export const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export const MAP_STYLE: string | StyleSpecification =
  import.meta.env.VITE_MAP_STYLE_URL || OSM_STYLE;

/** San Juan, Puerto Rico. */
export const SAN_JUAN: [number, number] = [-66.106, 18.4655];
