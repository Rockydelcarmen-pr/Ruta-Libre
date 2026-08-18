/** [lng, lat] pair (GeoJSON coordinate order). */
export type Coord = [number, number];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LineStringGeoJSON {
  type: "LineString";
  coordinates: Coord[];
}

export function toLineString(coordinates: Coord[]): LineStringGeoJSON {
  return { type: "LineString", coordinates };
}
