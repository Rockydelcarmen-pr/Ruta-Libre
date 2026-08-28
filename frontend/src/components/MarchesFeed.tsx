import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Auth } from "../hooks/useAuth";
import type { Chip, Lang } from "../lib/types";
import type { MarchView } from "../lib/sampleProtests";
import { MarchCard } from "./MarchCard";
import { MapView } from "./MapView";

const usingDemoMap = !import.meta.env.VITE_MAP_STYLE_URL;

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function MarchesFeed({
  lang,
  auth,
  marches,
  loading,
  usingSample,
  chips,
  onChipsChanged,
  q,
}: {
  lang: Lang;
  auth: Auth;
  marches: MarchView[];
  loading: boolean;
  usingSample: boolean;
  chips: Chip[];
  onChipsChanged: () => void;
  q: string;
}) {
  const { t } = useTranslation();
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

  const toggle = (
    value: string,
    list: string[],
    set: (v: string[]) => void,
  ) => {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return marches.filter((m) => {
      const hay = [m.title, m.cause, m.location, ...m.tags, ...m.organizer_names]
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

  return (
    <section className="feed container" aria-labelledby="feed-h">
      <div className="eyebrow">{t("feed.eyebrow")}</div>
      <h2 id="feed-h">{t("feed.heading")}</h2>

      {loading && <p className="muted">{t("common.loading")}</p>}

      {!loading && filtered.length > 0 && (
        <>
          <MapView marches={filtered} chips={chips} />
          {usingDemoMap && <p className="map-note">{t("feed.mapNote")}</p>}
        </>
      )}

      {!loading && filtered.length === 0 && marches.length > 0 && (
        <p className="muted">{t("search.none")}</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="carousel" role="list" aria-label={t("feed.heading")}>
          {filtered.map((m, i) => (
            <div className="carousel-item" role="listitem" key={m.id}>
              <MarchCard
                march={i === 0 ? { ...m, featured: true } : m}
                lang={lang}
                auth={auth}
                onChipsChanged={onChipsChanged}
              />
            </div>
          ))}
        </div>
      )}

      {!loading && allTags.length > 0 && (
        <div className="carousel-group">
          <span className="filter-label">{t("search.topics")}</span>
          <div className="carousel-chips">
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

      {!loading && allOrgs.length > 0 && (
        <div className="carousel-group">
          <span className="filter-label">{t("search.orgs")}</span>
          <div className="carousel-chips">
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

      {!loading && usingSample && (
        <p className="muted" style={{ marginTop: 4 }}>
          {t("common.sampleNote")}
        </p>
      )}
    </section>
  );
}
