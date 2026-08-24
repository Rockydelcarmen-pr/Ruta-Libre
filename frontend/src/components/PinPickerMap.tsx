import { useEffect, useRef } from "react";
import { Map as MLMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE } from "../lib/mapStyle";

type Pt = [number, number];

/** A small map centered on a starting point with one draggable/clickable pin,
    for fine-tuning an exact spot near a device's GPS reading. */
export function PinPickerMap({
  center,
  point,
  onMove,
}: {
  center: Pt;
  point: Pt;
  onMove: (p: Pt) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MLMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom: 17,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl(), "top-right");
    mapRef.current = map;

    const el = document.createElement("div");
    el.className = "march-marker march-marker-start";
    const marker = new Marker({ element: el, draggable: true })
      .setLngLat(point)
      .addTo(map);
    marker.on("dragend", () => {
      const { lng, lat } = marker.getLngLat();
      moveRef.current([lng, lat]);
    });
    markerRef.current = marker;

    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      moveRef.current([e.lngLat.lng, e.lngLat.lat]);
    });
    map.getCanvas().style.cursor = "crosshair";

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    markerRef.current?.setLngLat(point);
  }, [point]);

  return <div ref={containerRef} className="pin-picker-map" data-lenis-prevent />;
}
