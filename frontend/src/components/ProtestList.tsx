import { useTranslation } from "react-i18next";
import { useProtests } from "../hooks/useProtests";
import type { Lang } from "../lib/types";
import { ProtestCard } from "./ProtestCard";

export function ProtestList({ lang }: { lang: Lang }) {
  const { t } = useTranslation();
  const { protests, loading, error } = useProtests(lang);

  return (
    <section aria-labelledby="protests-heading">
      <h2 id="protests-heading">{t("protests.heading")}</h2>
      {loading && <p className="muted">{t("protests.loading")}</p>}
      {error && <p className="error-text">{t("protests.error")}</p>}
      {!loading && !error && protests.length === 0 && (
        <p className="muted">{t("protests.empty")}</p>
      )}
      <div className="protest-grid">
        {protests.map((p) => (
          <ProtestCard key={p.id} protest={p} lang={lang} />
        ))}
      </div>
    </section>
  );
}
