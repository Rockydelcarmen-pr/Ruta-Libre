import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getOrganization, type OrgDetail, type OrgSummary } from "../lib/api";
import type { Lang } from "../lib/types";
import { MarchCard } from "./MarchCard";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function OrgProfile({
  org,
  lang,
  onBack,
}: {
  org: OrgSummary;
  lang: Lang;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOrganization(org.id, lang)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [org.id, lang]);

  const description = detail?.description ?? org.description;
  const website = detail?.website ?? org.website;
  const protests = detail?.protests ?? [];

  return (
    <section className="feed container">
      <button type="button" className="mini-btn" onClick={onBack}>
        {t("orgs.back")}
      </button>

      <h2 className="org-h" style={{ marginTop: 14 }}>
        {org.name}
      </h2>
      {description && <p>{description}</p>}
      {website && (
        <div className="linklist">
          <a
            className="chip-link"
            href={website}
            target="_blank"
            rel="noopener noreferrer"
          >
            {hostname(website)}
          </a>
        </div>
      )}

      <div className="eyebrow" style={{ marginTop: 18 }}>
        {t("orgs.theirMarches")}
      </div>

      {loading && <p className="muted">{t("orgs.loading")}</p>}
      {!loading && protests.length === 0 && (
        <p className="muted">{t("orgs.noMarches")}</p>
      )}
      {!loading &&
        protests.map((p, i) => (
          <MarchCard
            key={p.id}
            march={i === 0 ? { ...p, featured: true } : p}
            lang={lang}
          />
        ))}
    </section>
  );
}
