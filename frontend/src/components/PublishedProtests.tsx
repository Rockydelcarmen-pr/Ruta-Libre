import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteProtest, getManagedProtests } from "../lib/api";
import type { Lang, Protest } from "../lib/types";

function isMock(tag: string): boolean {
  return /^(ejemplo|mock|prueba|demo)$/i.test(tag);
}

function whenLabel(p: Protest, lang: Lang): string {
  const date = new Date(`${p.event_date}T00:00:00`).toLocaleDateString(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = p.start_time ? p.start_time.slice(0, 5) : null;
  return time ? `${date} · ${time}` : date;
}

function isPast(p: Protest): boolean {
  return new Date(`${p.event_date}T23:59:59`) < new Date();
}

export function PublishedProtests({
  lang,
  token,
  onEdit,
}: {
  lang: Lang;
  token: string;
  onEdit: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Protest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getManagedProtests(token, lang)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [lang, token]);

  const remove = async (p: Protest) => {
    if (!window.confirm(t("org.deleteProtestConfirm", { title: p.title ?? "" })))
      return;
    setBusyId(p.id);
    try {
      await deleteProtest(token, p.id);
      setItems((prev) => prev.filter((x) => x.id !== p.id));
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (s: string): string =>
    s === "approved"
      ? t("org.stApproved")
      : s === "cancelled"
        ? t("org.stCancelled")
        : t("org.stPending");

  const statusClass = (s: string): string =>
    s === "approved" ? "pill go" : s === "cancelled" ? "pill red" : "pill blue";

  return (
    <div>
      <h2 className="org-h">{t("org.publishedHeading")}</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {t("org.manageNote")}
      </p>

      {loading && <p className="muted">{t("common.loading")}</p>}
      {!loading && items.length === 0 && (
        <p className="muted">{t("org.publishedEmpty")}</p>
      )}

      {!loading &&
        items.map((p) => (
          <div key={p.id} className="pub-row">
            <div className="pub-status">
              <span className={statusClass(p.status)}>
                {statusLabel(p.status)}
              </span>
              {isPast(p) && <span className="pill">{t("org.past")}</span>}
            </div>
            <div className="pub-title">{p.title}</div>
            <div className="pub-meta">
              {whenLabel(p, lang)}
              {p.organizer_names.length > 0 &&
                ` · ${p.organizer_names.join(", ")}`}
            </div>
            {p.tags.length > 0 && (
              <div className="tags">
                {p.tags.map((tag) => (
                  <span key={tag} className={isMock(tag) ? "tag mock" : "tag"}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="route-tools" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="mini-btn"
                disabled={busyId === p.id}
                onClick={() => onEdit(p.id)}
              >
                {t("org.edit")}
              </button>
              <button
                type="button"
                className="mini-btn danger"
                disabled={busyId === p.id}
                onClick={() => void remove(p)}
              >
                {t("org.delete")}
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
