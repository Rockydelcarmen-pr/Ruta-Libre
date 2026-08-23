import { useEffect, useRef } from "react";
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
import { MAP_STYLE, SAN_JUAN } from "../lib/mapStyle";

function routeFeatures(marches: MarchView[]): Feature[] {
  return marches
    .filter((m) => m.route_geojson)
    .map((m) => ({
      type: "Feature" as const,
      properties: { id: m.id },
      geometry: m.route_geojson as LineString,
    }));
}

export function MapView({ marches }: { marches: MarchView[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MLMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: SAN_JUAN,
      zoom: 13,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl(), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw / update the routes and markers whenever the marches change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      const data: FeatureCollection = {
        type: "FeatureCollection",
        features: routeFeatures(marches),
      };

      const src = map.getSource("marches") as
        | GeoJSONSource
        | undefined;
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

      // Reset markers.
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
        const el = document.createElement("div");
        el.className = "march-marker";
        const marker = new Marker({ element: el })
          .setLngLat(start)
          .setPopup(
            new Popup({ offset: 14 }).setText(
              m.title ?? "Protest",
            ),
          )
          .addTo(map);
        markersRef.current.push(marker);
      }

      if (any) map.fitBounds(bounds, { padding: 48, maxZoom: 15 });
    };

    if (map.isStyleLoaded()) {
      draw();
    } else {
      map.once("load", draw);
    }
  }, [marches]);

  // data-lenis-prevent: let wheel events zoom the map instead of scrolling the page.
  return <div ref={containerRef} className="map-view" data-lenis-prevent />;
}
