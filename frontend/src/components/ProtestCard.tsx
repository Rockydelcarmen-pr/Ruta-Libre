import { useTranslation } from "react-i18next";
import { apiBase } from "../lib/api";
import type { Lang, Protest } from "../lib/types";

function formatWhen(protest: Protest, lang: Lang): string {
  const date = new Date(`${protest.event_date}T00:00:00`);
  const dateStr = date.toLocaleDateString(lang, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = protest.start_time ? protest.start_time.slice(0, 5) : null;
  return time ? `${dateStr} · ${time}` : dateStr;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function ProtestCard({
  protest,
  lang,
}: {
  protest: Protest;
  lang: Lang;
}) {
  const { t } = useTranslation();
  const icsUrl = `${apiBase}/api/protests/${protest.id}/calendar.ics?lang=${lang}`;
  const duration = protest.estimated_duration_minutes;

  return (
    <article className="card protest-card">
      <h3>{protest.title}</h3>
      <p className="when">
        {formatWhen(protest, lang)}
        {duration ? ` · ${duration} ${t("common.minutes")}` : ""}
      </p>

      {protest.cause && (
        <p>
          <strong>{t("protest.cause")}:</strong> {protest.cause}
        </p>
      )}
      {protest.goal && (
        <p>
          <strong>{t("protest.goal")}:</strong> {protest.goal}
        </p>
      )}

      {protest.organizers.length > 0 && (
        <p className="orgs">
          <strong>{t("protest.organizers")}:</strong>{" "}
          {protest.organizers.map((o, i) => (
            <span key={o.id}>
              {i > 0 ? ", " : ""}
              {o.website ? (
                <a href={o.website} target="_blank" rel="noopener noreferrer">
                  {o.name}
                </a>
              ) : (
                o.name
              )}
            </span>
          ))}
        </p>
      )}

      {protest.external_links.length > 0 && (
        <p className="links">
          <strong>{t("protest.links")}:</strong>{" "}
          {protest.external_links.map((link, i) => (
            <span key={link}>
              {i > 0 ? " · " : ""}
              <a href={link} target="_blank" rel="noopener noreferrer">
                {hostname(link)}
              </a>
            </span>
          ))}
        </p>
      )}

      <a className="btn-secondary" href={icsUrl}>
        {t("protest.downloadIcs")}
      </a>
    </article>
  );
}
