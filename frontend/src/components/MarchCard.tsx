import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Auth } from "../hooks/useAuth";
import type { Chip, Lang } from "../lib/types";
import type { MarchView } from "../lib/sampleProtests";
import { MapView } from "./MapView";
import { ParkingSection } from "./ParkingSection";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function stampFloating(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/** Client-side Google Calendar link, so it works without the backend. */
function googleCalUrl(m: MarchView): string {
  const start = new Date(`${m.event_date}T${m.start_time ?? "09:00"}:00`);
  const end = new Date(
    start.getTime() + (m.estimated_duration_minutes ?? 120) * 60000,
  );
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: m.title ?? "Protest",
    dates: `${stampFloating(start)}/${stampFloating(end)}`,
    details: m.goal ?? "",
    location: m.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function whenLabel(m: MarchView, lang: Lang): string {
  const date = new Date(`${m.event_date}T00:00:00`);
  const dateStr = date.toLocaleDateString(lang, {
    day: "numeric",
    month: "short",
  });
  const time = m.start_time ? m.start_time.slice(0, 5) : null;
  return time ? `${dateStr} · ${time}` : dateStr;
}

export function MarchCard({
  march,
  lang,
  auth,
  onChipsChanged,
}: {
  march: MarchView;
  lang: Lang;
  auth?: Auth;
  onChipsChanged?: () => void;
}) {
  const { t } = useTranslation();
  const [going, setGoing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [streetsOpen, setStreetsOpen] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);

  const baseGoing = march.going ?? 0;
  const count = baseGoing + (going ? 1 : 0);
  const hasGoing = typeof march.going === "number";
  const featured = march.featured === true;
  const statusApproved = march.status === "approved";

  const share = async () => {
    const url = window.location.href;
    const title = march.title ?? "Ruta Libre";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      /* user cancelled or unsupported, fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked, nothing else to do */
    }
  };

  return (
    <article className={featured ? "card feature" : "card"}>
      <div>
        <span className={statusApproved ? "pill red" : "pill blue"}>
          {statusApproved ? t("feed.approved") : t("feed.upcoming")}
        </span>
        <span className="pill">{whenLabel(march, lang)}</span>
      </div>

      <h3 className="card-title">{march.title}</h3>

      <div className="card-meta">
        {march.location && <span>{march.location}</span>}
        {march.estimated_duration_minutes && (
          <span>
            {march.estimated_duration_minutes} {t("common.minutes")}
          </span>
        )}
      </div>

      {march.organizer_names.length > 0 && (
        <div className="by-orgs">{march.organizer_names.join(" · ")}</div>
      )}

      {march.cause && (
        <p className="cause-line">
          <b>{t("protest.cause")}:</b> {march.cause}
        </p>
      )}

      {march.tags.length > 0 && (
        <div className="tags">
          {march.tags.map((tag) => (
            <span
              key={tag}
              className={/^(ejemplo|mock|prueba|demo)$/i.test(tag) ? "tag mock" : "tag"}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {hasGoing && (
        <div className="going">
          <span className="faces" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </span>
          <span className="going-n">{count}</span>
          <span className="going-l">{t("feed.going")}</span>
        </div>
      )}

      <button
        type="button"
        className={going ? "btn go rsvp going-on" : "btn go rsvp"}
        aria-pressed={going}
        onClick={() => setGoing((g) => !g)}
      >
        {going ? t("feed.imGoingOn") : t("feed.imGoing")}
      </button>

      <div className="actions">
        <a
          className="btn small secondary"
          href={googleCalUrl(march)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("feed.addToCalendar")}
        </a>
        <button
          type="button"
          className="share-btn"
          onClick={() => void share()}
          aria-label={copied ? t("feed.shareCopied") : t("feed.share")}
          title={copied ? t("feed.shareCopied") : t("feed.share")}
        >
          <svg
            viewBox="0 0 24 24"
            width="17"
            height="17"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        className="mini-btn seemore-btn"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? t("feed.seeLess") : t("feed.seeMore")}
      </button>

      {open && (
        <div className="details">
          {march.route_geojson && (
            <div className="card-map">
              <MapView marches={[march]} chips={chips} />
            </div>
          )}
          {march.streets.length > 0 && (
            <>
              <button
                type="button"
                className="lbl streets-toggle"
                aria-expanded={streetsOpen}
                onClick={() => setStreetsOpen((o) => !o)}
              >
                {t("protest.streets")} {streetsOpen ? "▾" : "▸"}
              </button>
              {streetsOpen && (
                <ol className="route-streets">
                  {march.streets.map((street, i) => (
                    <li key={i}>{street}</li>
                  ))}
                </ol>
              )}
            </>
          )}
          {march.goal && (
            <>
              <div className="lbl">{t("protest.goal")}</div>
              <p>{march.goal}</p>
            </>
          )}
          {march.description && (
            <>
              <div className="lbl">{t("protest.details")}</div>
              <p>{march.description}</p>
            </>
          )}
          {march.organizer_names.length > 0 && (
            <>
              <div className="lbl">{t("protest.organizers")}</div>
              <p>{march.organizer_names.join(" · ")}</p>
            </>
          )}
          {march.external_links.length > 0 && (
            <>
              <div className="lbl">{t("protest.links")}</div>
              <div className="linklist">
                {march.external_links.map((l) => (
                  <a
                    key={l}
                    className="chip-link"
                    href={l}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {hostname(l)}
                  </a>
                ))}
              </div>
            </>
          )}
          {march.route_geojson && (
            <ParkingSection
              march={march}
              auth={auth}
              onChipsChange={(next) => {
                setChips(next);
                onChipsChanged?.();
              }}
            />
          )}
        </div>
      )}
    </article>
  );
}
