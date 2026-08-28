import { useEffect, useState } from "react";
import { getChips } from "../lib/api";
import type { Chip } from "../lib/types";
import type { MarchView } from "../lib/sampleProtests";

/**
 * Pull live parking chips for every march's route so they show as pins on
 * the overview map too, not just each event's own expanded mini-map.
 * `bump` lets a card report its own chip list changed (drop/take/admin
 * remove) without waiting for the next full reload.
 */
export function useMarchChips(marches: MarchView[]) {
  const [chips, setChips] = useState<Chip[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const withRoutes = marches.filter((m) => m.route_geojson);
    if (withRoutes.length === 0) {
      setChips([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      withRoutes.map((m) => {
        const start = m.route_geojson!.coordinates[0];
        if (!start) return Promise.resolve({ chips: [] as Chip[] });
        const [lng, lat] = start;
        return getChips(lat, lng).catch(() => ({ chips: [] as Chip[] }));
      }),
    ).then((results) => {
      if (cancelled) return;
      const byId = new Map<string, Chip>();
      for (const { chips: found } of results) {
        for (const c of found) {
          if (c.status === "available") byId.set(c.id, c);
        }
      }
      setChips([...byId.values()]);
    });
    return () => {
      cancelled = true;
    };
  }, [marches, version]);

  return { chips, bump: () => setVersion((v) => v + 1) };
}
