import { useEffect, useRef } from "react";
import {
  Map as MLMap,
  NavigationControl,
  LngLatBounds,
  type GeoJSONSource,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { MAP_STYLE, SAN_JUAN } from "../lib/mapStyle";

type Pt = [number, number];

function toData(points: Pt[]): FeatureCollection {
  const features: FeatureCollection["features"] = points.map((p, i) => ({
    type: "Feature",
    properties: { i },
    geometry: { type: "Point", coordinates: p },
  }));
  if (points.length >= 2) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: points },
    });
  }
  return { type: "FeatureCollection", features };
}

export function RouteDrawMap({
  points,
  onAddPoint,
  autoFit = false,
}: {
  points: Pt[];
  onAddPoint: (p: Pt) => void;
  autoFit?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);
  const fittedRef = useRef(false);
  // Keep a live ref so the click handler (bound once) always sees the callback.
  const addRef = useRef(onAddPoint);
  addRef.current = onAddPoint;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MLMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: SAN_JUAN,
      zoom: 14,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("draft", { type: "geojson", data: toData([]) });
      map.addLayer({
        id: "draft-line",
        type: "line",
        source: "draft",
        filter: ["==", "$type", "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#E11D2A", "line-width": 5 },
      });
      map.addLayer({
        id: "draft-points",
        type: "circle",
        source: "draft",
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#1573B8",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      readyRef.current = true;
    });

    map.on("click", (e: MapMouseEvent) => {
      addRef.current([e.lngLat.lng, e.lngLat.lat]);
    });
    map.getCanvas().style.cursor = "crosshair";

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // Redraw whenever the points change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("draft") as GeoJSONSource | undefined;
    if (src) src.setData(toData(points));

    // In edit mode, zoom to the loaded route once it arrives.
    if (autoFit && !fittedRef.current && points.length >= 1) {
      const bounds = new LngLatBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 0 });
      fittedRef.current = true;
    }
  }, [points, autoFit]);

  return <div ref={containerRef} className="draw-map" data-lenis-prevent />;
}
