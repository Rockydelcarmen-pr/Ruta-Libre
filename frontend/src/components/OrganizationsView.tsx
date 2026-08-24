import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getOrganizations, type OrgSummary } from "../lib/api";
import type { Lang } from "../lib/types";
import { OrgProfile } from "./OrgProfile";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function OrganizationsView({ lang }: { lang: Lang }) {
  const { t } = useTranslation();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrgSummary | null>(null);

  useEffect(() => {
    getOrganizations()
      .then(setOrgs)
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return (
      <OrgProfile org={selected} lang={lang} onBack={() => setSelected(null)} />
    );
  }

  return (
    <section className="feed container">
      <div className="eyebrow">{t("orgs.eyebrow")}</div>
      <h2>{t("orgs.heading")}</h2>

      {loading && <p className="muted">{t("orgs.loading")}</p>}

      {!loading &&
        orgs.map((o) => (
          <button
            key={o.id}
            type="button"
            className="org-card"
            onClick={() => setSelected(o)}
          >
            <div className="org-card-name">{o.name}</div>
            {o.description && (
              <div className="org-card-desc">{o.description}</div>
            )}
            <div className="org-card-meta">
              <span className="pill blue">
                {o.protest_count} {t("orgs.upcoming")}
              </span>
              {o.website && (
                <span className="muted">{hostname(o.website)}</span>
              )}
              {(["instagram", "twitter", "facebook", "tiktok"] as const)
                .filter((key) => o.social_links[key])
                .map((key) => (
                  <span key={key} className="muted">
                    {t(`org.socialLabel.${key}`)}
                  </span>
                ))}
            </div>
          </button>
        ))}
    </section>
  );
}
