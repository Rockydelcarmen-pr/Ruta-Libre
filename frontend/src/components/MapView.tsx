import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Map as MLMap,
  Marker,
  Popup,
  NavigationControl,
  LngLatBounds,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, LineString } from "geojson";
import type { MarchView } from "../lib/sampleProtests";
import type { Chip } from "../lib/types";
import { mapStyle, SAN_JUAN } from "../lib/mapStyle";

function dateLabel(eventDate: string, lang: string): string {
  const d = new Date(`${eventDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang, { day: "numeric", month: "short" });
}

function routeFeatures(marches: MarchView[]): Feature[] {
  return marches
    .filter((m) => m.route_geojson)
    .map((m) => ({
      type: "Feature" as const,
      properties: { id: m.id },
      geometry: m.route_geojson as LineString,
    }));
}

/** Draw/refresh the route lines + start markers. Safe to call on every change. */
function drawRoutes(
  map: MLMap,
  marches: MarchView[],
  chips: Chip[],
  markersRef: { current: Marker[] },
  lang: string,
): void {
  const data: FeatureCollection = {
    type: "FeatureCollection",
    features: routeFeatures(marches),
  };

  const src = map.getSource("marches") as GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
  } else {
    map.addSource("marches", { type: "geojson", data });
    map.addLayer({
      id: "march-lines",
      type: "line",
      source: "marches",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#E11D2A", "line-width": 5 },
    });
  }

  markersRef.current.forEach((mk) => mk.remove());
  markersRef.current = [];

  const bounds = new LngLatBounds();
  let any = false;
  for (const m of marches) {
    const coords = m.route_geojson?.coordinates;
    if (!coords || coords.length === 0) continue;
    coords.forEach((c) => bounds.extend(c as [number, number]));
    any = true;

    const start = coords[0] as [number, number];
    const startEl = document.createElement("div");
    startEl.className = "march-marker march-marker-start";
    startEl.textContent = "S";
    startEl.title = "Start";
    const startMarker = new Marker({ element: startEl })
      .setLngLat(start)
      .setPopup(new Popup({ offset: 14 }).setText(m.title ?? "Protest"))
      .addTo(map);
    markersRef.current.push(startMarker);

    const label = dateLabel(m.event_date, lang);
    if (label) {
      const dateEl = document.createElement("div");
      dateEl.className = "march-date-bubble";
      dateEl.textContent = label;
      const dateMarker = new Marker({
        element: dateEl,
        anchor: "bottom",
        offset: [0, -20],
      })
        .setLngLat(start)
        .addTo(map);
      markersRef.current.push(dateMarker);
    }

    if (coords.length > 1) {
      const end = coords[coords.length - 1] as [number, number];
      const endEl = document.createElement("div");
      endEl.className = "march-marker march-marker-end";
      endEl.textContent = "E";
      endEl.title = "End";
      const endMarker = new Marker({ element: endEl })
        .setLngLat(end)
        .setPopup(new Popup({ offset: 14 }).setText(m.title ?? "Protest"))
        .addTo(map);
      markersRef.current.push(endMarker);
    }
  }

  for (const chip of chips) {
    const el = document.createElement("div");
    el.className = "march-marker chip-marker";
    el.textContent = "P";
    el.title = "Reported parking";
    const marker = new Marker({ element: el })
      .setLngLat([chip.lng, chip.lat])
      .setPopup(new Popup({ offset: 14 }).setText(chip.note || "Parking reported here"))
      .addTo(map);
    markersRef.current.push(marker);
  }

  if (any) map.fitBounds(bounds, { padding: 48, maxZoom: 15 });
}

export function MapView({
  marches,
  chips = [],
}: {
  marches: MarchView[];
  chips?: Chip[];
}) {
  const { i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const loadedRef = useRef(false);
  // Always-current marches/chips, so the load handler draws the latest data.
  const marchesRef = useRef(marches);
  marchesRef.current = marches;
  const chipsRef = useRef(chips);
  chipsRef.current = chips;
  const langRef = useRef(i18n.language);
  langRef.current = i18n.language;

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MLMap({
      container: containerRef.current,
      style: mapStyle(),
      center: SAN_JUAN,
      zoom: 13,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl(), "top-right");
    mapRef.current = map;
    map.on("error", (e) => console.error("[maplibre]", e.error));

    map.on("load", () => {
      loadedRef.current = true;
      map.resize();
      drawRoutes(map, marchesRef.current, chipsRef.current, markersRef, langRef.current);
    });

    // Draw once the map has settled too, in case load fired before data arrived.
    map.on("idle", () => {
      if (!loadedRef.current) return;
      if (!map.getSource("marches")) {
        drawRoutes(map, marchesRef.current, chipsRef.current, markersRef, langRef.current);
      }
    });

    return () => {
      loadedRef.current = false;
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw whenever the events or chips change. Draw as soon as the style is
  // ready by any measure (our load flag, or MapLibre reporting style loaded).
  // Both branches read from the refs, not the closed-over marches/chips, so a
  // deferred once("idle") callback registered on an earlier (e.g. still-empty
  // chips) render can't fire later with stale data and wipe out markers a
  // subsequent render already drew correctly.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (loadedRef.current || map.isStyleLoaded()) {
      loadedRef.current = true;
      drawRoutes(map, marchesRef.current, chipsRef.current, markersRef, i18n.language);
    } else {
      map.once("idle", () => {
        loadedRef.current = true;
        drawRoutes(map, marchesRef.current, chipsRef.current, markersRef, i18n.language);
      });
    }
  }, [marches, chips, i18n.language]);

  // data-lenis-prevent: let wheel events zoom the map instead of scrolling the page.
  return <div ref={containerRef} className="map-view" data-lenis-prevent />;
}
