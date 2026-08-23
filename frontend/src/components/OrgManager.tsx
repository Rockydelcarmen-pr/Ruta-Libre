import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deleteOrganization,
  getOrganizations,
  updateOrganization,
  type OrgSummary,
} from "../lib/api";

export function OrgManager({ token }: { token: string }) {
  const { t } = useTranslation();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrganizations()
      .then(setOrgs)
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  }, []);

  const setField = (id: string, field: keyof OrgSummary, value: string) => {
    setOrgs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    );
  };

  const save = async (o: OrgSummary) => {
    setError(null);
    if (!o.name.trim()) {
      setError(t("org.needOrgName"));
      return;
    }
    setBusyId(o.id);
    try {
      await updateOrganization(token, o.id, {
        name: o.name.trim(),
        description: o.description || null,
        website: o.website || null,
      });
    } catch {
      setError(t("org.orgSaveError"));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (o: OrgSummary) => {
    if (!window.confirm(t("org.deleteConfirm", { name: o.name }))) return;
    setBusyId(o.id);
    try {
      await deleteOrganization(token, o.id);
      setOrgs((prev) => prev.filter((x) => x.id !== o.id));
    } catch {
      setError(t("org.orgDeleteError"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2 className="org-h">{t("org.manageOrgsHeading")}</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {t("org.manageOrgsNote")}
      </p>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">{t("common.loading")}</p>}

      {!loading &&
        orgs.map((o) => (
          <div key={o.id} className="pub-row">
            <label className="field-label">{t("org.orgName")}</label>
            <input
              className="text-input"
              value={o.name}
              onChange={(e) => setField(o.id, "name", e.target.value)}
            />
            <label className="field-label">{t("org.orgDesc")}</label>
            <textarea
              className="text-input"
              rows={2}
              value={o.description ?? ""}
              onChange={(e) => setField(o.id, "description", e.target.value)}
            />
            <label className="field-label">{t("org.orgWebsite")}</label>
            <input
              className="text-input"
              placeholder="https://..."
              value={o.website ?? ""}
              onChange={(e) => setField(o.id, "website", e.target.value)}
            />
            <div className="route-tools" style={{ marginTop: 10 }}>
              <span className="pill blue">
                {o.protest_count} {t("orgs.upcoming")}
              </span>
              <button
                type="button"
                className="mini-btn"
                disabled={busyId === o.id}
                onClick={() => void save(o)}
              >
                {t("org.saveChanges")}
              </button>
              <button
                type="button"
                className="mini-btn danger"
                disabled={busyId === o.id}
                onClick={() => void remove(o)}
              >
                {t("org.delete")}
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
