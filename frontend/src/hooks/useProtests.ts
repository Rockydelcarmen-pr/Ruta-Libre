import { useCallback, useEffect, useState } from "react";
import { getProtests } from "../lib/api";
import type { Lang, Protest } from "../lib/types";

export function useProtests(lang: Lang): {
  protests: Protest[];
  loading: boolean;
  error: boolean;
  reload: () => void;
} {
  const [protests, setProtests] = useState<Protest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getProtests(lang)
      .then((data) => {
        if (!cancelled) setProtests(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => reload(), [reload]);

  return { protests, loading, error, reload };
}
