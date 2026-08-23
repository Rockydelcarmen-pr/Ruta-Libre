import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProtests } from "../hooks/useProtests";
import type { Lang } from "../lib/types";
import { MarchCard } from "./MarchCard";
import { MapView } from "./MapView";

const usingDemoMap = !import.meta.env.VITE_MAP_STYLE_URL;

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function MarchesFeed({ lang }: { lang: Lang }) {
  const { t } = useTranslation();
  const { marches, loading, usingSample } = useProtests(lang);

  const [q, setQ] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [orgs, setOrgs] = useState<string[]>([]);

  const allTags = useMemo(
    () => unique(marches.flatMap((m) => m.tags)),
    [marches],
  );
  const allOrgs = useMemo(
    () => unique(marches.flatMap((m) => m.organizer_names)),
    [marches],
  );

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return marches.filter((m) => {
      const hay = [m.title, m.cause, ...m.tags, ...m.organizer_names]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const textOk = !text || hay.includes(text);
      const tagOk = tags.length === 0 || tags.some((x) => m.tags.includes(x));
      const orgOk =
        orgs.length === 0 || orgs.some((x) => m.organizer_names.includes(x));
      return textOk && tagOk && orgOk;
    });
  }, [marches, q, tags, orgs]);

  const toggle = (
    value: string,
    list: string[],
    set: (v: string[]) => void,
  ) => {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const hasFilters = q !== "" || tags.length > 0 || orgs.length > 0;
  const clearAll = () => {
    setQ("");
    setTags([]);
    setOrgs([]);
  };

  return (
    <section className="feed container" aria-labelledby="feed-h">
      <div className="eyebrow">{t("feed.eyebrow")}</div>
      <h2 id="feed-h">{t("feed.heading")}</h2>

      {!loading && marches.length > 0 && (
        <div className="filters">
          <input
            className="text-input search"
            type="search"
            placeholder={t("search.placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t("search.placeholder")}
          />

          {allTags.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">{t("search.topics")}</span>
              <div className="filter-chips">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={tags.includes(tag) ? "filter-chip on" : "filter-chip"}
                    aria-pressed={tags.includes(tag)}
                    onClick={() => toggle(tag, tags, setTags)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allOrgs.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">{t("search.orgs")}</span>
              <div className="filter-chips">
                {allOrgs.map((org) => (
                  <button
                    key={org}
                    type="button"
                    className={orgs.includes(org) ? "filter-chip on" : "filter-chip"}
                    aria-pressed={orgs.includes(org)}
                    onClick={() => toggle(org, orgs, setOrgs)}
                  >
                    {org}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasFilters && (
            <div className="filter-summary">
              <span className="muted">
                {filtered.length} {t("search.results")}
              </span>
              <button type="button" className="mini-btn" onClick={clearAll}>
                {t("search.clear")}
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <MapView marches={filtered} />
          {usingDemoMap && <p className="map-note">{t("feed.mapNote")}</p>}
        </>
      )}

      {loading && <p className="muted">{t("common.loading")}</p>}

      {!loading && filtered.length === 0 && marches.length > 0 && (
        <p className="muted">{t("search.none")}</p>
      )}

      {!loading &&
        filtered.map((m, i) => (
          <MarchCard
            key={m.id}
            march={i === 0 ? { ...m, featured: true } : m}
            lang={lang}
          />
        ))}

      {!loading && usingSample && (
        <p className="muted" style={{ marginTop: 4 }}>
          {t("common.sampleNote")}
        </p>
      )}
    </section>
  );
}
