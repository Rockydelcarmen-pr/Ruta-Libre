import { useTranslation } from "react-i18next";

const MAP_STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL ?? "";

/**
 * Route-planning panel. The MapLibre map + routing wiring is deferred until a
 * map style URL is configured; until then this renders the layout with a clear
 * "pending" state so the rest of the app is usable.
 */
export function MatchPanel() {
  const { t } = useTranslation();
  const ready = MAP_STYLE_URL.length > 0;

  return (
    <section className="card match-panel" aria-labelledby="match-heading">
      <h2 id="match-heading">{t("match.heading")}</h2>

      <div className="match-fields">
        <label>
          <span>{t("match.origin")}</span>
          <input type="text" disabled={!ready} placeholder="—" />
        </label>
        <label>
          <span>{t("match.destination")}</span>
          <input type="text" disabled={!ready} placeholder="—" />
        </label>
      </div>

      <button type="button" className="btn-primary" disabled={!ready}>
        {t("match.check")}
      </button>

      <div className="map-placeholder" role="img" aria-label={t("match.pending")}>
        {!ready && <p>{t("match.pending")}</p>}
      </div>
    </section>
  );
}
