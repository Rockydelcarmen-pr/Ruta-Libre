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
  const last = points.length - 1;
  const features: FeatureCollection["features"] = points.map((p, i) => ({
    type: "Feature",
    properties: {
      i,
      role: i === 0 ? "start" : i === last ? "end" : "mid",
    },
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
  onMovePoint,
  onRemovePoint,
  autoFit = false,
}: {
  points: Pt[];
  onAddPoint: (p: Pt) => void;
  onMovePoint?: (index: number, p: Pt) => void;
  onRemovePoint?: (index: number) => void;
  autoFit?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);
  const fittedRef = useRef(false);
  // Keep live refs so handlers bound once still see the latest callbacks.
  const addRef = useRef(onAddPoint);
  addRef.current = onAddPoint;
  const moveRef = useRef(onMovePoint);
  moveRef.current = onMovePoint;
  const removeRef = useRef(onRemovePoint);
  removeRef.current = onRemovePoint;
  const draggingIndexRef = useRef<number | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;

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
      map.addSource("draft", { type: "geojson", data: toData(pointsRef.current) });
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
          "circle-radius": ["match", ["get", "role"], "mid", 6, 9],
          "circle-color": [
            "match",
            ["get", "role"],
            "start",
            "#1F9D57",
            "end",
            "#E11D2A",
            "#1573B8",
          ],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      readyRef.current = true;

      if (autoFit && !fittedRef.current && pointsRef.current.length >= 1) {
        const bounds = new LngLatBounds();
        pointsRef.current.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 0 });
        fittedRef.current = true;
      }
    });

    // Clicking an existing point starts a drag instead of adding a new one.
    map.on("mousedown", "draft-points", (e) => {
      const feature = e.features?.[0];
      const index = feature?.properties?.i;
      if (typeof index !== "number") return;
      e.preventDefault();
      draggingIndexRef.current = index;
      map.dragPan.disable();
      map.getCanvas().style.cursor = "grabbing";
    });

    map.on("mousemove", (e: MapMouseEvent) => {
      if (draggingIndexRef.current === null) return;
      moveRef.current?.(draggingIndexRef.current, [e.lngLat.lng, e.lngLat.lat]);
    });

    const endDrag = () => {
      if (draggingIndexRef.current === null) return;
      draggingIndexRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = "crosshair";
    };
    map.on("mouseup", endDrag);
    map.on("mouseout", endDrag);

    map.on("mouseenter", "draft-points", () => {
      map.getCanvas().style.cursor = "grab";
    });
    map.on("mouseleave", "draft-points", () => {
      if (draggingIndexRef.current === null) {
        map.getCanvas().style.cursor = "crosshair";
      }
    });

    // Right-click an existing point to delete it.
    map.on("contextmenu", "draft-points", (e) => {
      e.preventDefault();
      const feature = e.features?.[0];
      const index = feature?.properties?.i;
      if (typeof index === "number") removeRef.current?.(index);
    });

    map.on("click", (e: MapMouseEvent) => {
      // Ignore the click that follows a drag/point interaction.
      const hit = map.queryRenderedFeatures(e.point, {
        layers: ["draft-points"],
      });
      if (hit.length > 0) return;
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
