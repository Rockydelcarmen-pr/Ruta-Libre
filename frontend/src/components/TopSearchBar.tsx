import { useTranslation } from "react-i18next";
import { PR_MUNICIPALITIES } from "../lib/municipalities";

export function TopSearchBar({
  q,
  onQChange,
}: {
  q: string;
  onQChange: (q: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="top-search-wrap">
      <div className="bottom-pill search-pill">
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          className="search-pill-input"
          placeholder={t("search.placeholder")}
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          aria-label={t("search.placeholder")}
          list="pr-municipalities"
        />
        <datalist id="pr-municipalities">
          {PR_MUNICIPALITIES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
