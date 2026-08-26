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

const styleUrl = import.meta.env.VITE_MAP_STYLE_URL;

/** MapLibre mutates the style object it's given, so every map instance needs
    its own copy — sharing one object across multiple maps on the same page
    (e.g. the overview map and each event's mini-map) corrupts it after the
    first instance loads. */
export function mapStyle(): string | StyleSpecification {
  return styleUrl || structuredClone(OSM_STYLE);
}

/** San Juan, Puerto Rico. */
export const SAN_JUAN: [number, number] = [-66.106, 18.4655];
