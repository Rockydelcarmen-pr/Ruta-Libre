import { useCallback, useEffect, useState } from "react";
import { getProtests } from "../lib/api";
import { getSampleProtests, type MarchView } from "../lib/sampleProtests";
import type { Lang } from "../lib/types";

export function useProtests(lang: Lang): {
  marches: MarchView[];
  loading: boolean;
  usingSample: boolean;
  reload: () => void;
} {
  const [marches, setMarches] = useState<MarchView[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingSample, setUsingSample] = useState(false);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    getProtests(lang)
      .then((data) => {
        if (cancelled) return;
        if (data.length > 0) {
          setMarches(data.map((p) => ({ ...p })));
          setUsingSample(false);
        } else {
          // Server reachable but empty: still show something to look at.
          setMarches(getSampleProtests(lang));
          setUsingSample(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Server not connected yet: fall back to sample data.
        setMarches(getSampleProtests(lang));
        setUsingSample(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => reload(), [reload]);

  return { marches, loading, usingSample, reload };
}
