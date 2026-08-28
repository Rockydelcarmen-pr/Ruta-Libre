import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Auth } from "../hooks/useAuth";
import type { Chip, Lang } from "../lib/types";
import type { MarchView } from "../lib/sampleProtests";
import { MapView } from "./MapView";
import { MarchCard } from "./MarchCard";

export function MapScreen({
  marches,
  chips,
  q,
  lang,
  auth,
  onChipsChanged,
}: {
  marches: MarchView[];
  chips: Chip[];
  q: string;
  lang: Lang;
  auth: Auth;
  onChipsChanged: () => void;
}) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const text = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      text
        ? marches.filter((m) => {
            const hay = [m.title, m.cause, m.location, ...m.tags, ...m.organizer_names]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return hay.includes(text);
          })
        : marches,
    [marches, text],
  );

  const selected = selectedId
    ? (marches.find((m) => m.id === selectedId) ?? null)
    : null;

  return (
    <div className="map-screen">
      <MapView
        marches={filtered}
        chips={chips}
        className="map-view map-view-full"
        onSelect={setSelectedId}
      />
      {filtered.length === 0 && (
        <p className="map-screen-empty muted">{t("search.none")}</p>
      )}

      {selected && (
        <div className="map-sheet">
          <button
            type="button"
            className="map-sheet-close"
            aria-label={t("common.close", "Close")}
            onClick={() => setSelectedId(null)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M5 5l14 14M19 5 5 19"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <MarchCard
            march={selected}
            lang={lang}
            auth={auth}
            onChipsChanged={onChipsChanged}
          />
        </div>
      )}
    </div>
  );
}
