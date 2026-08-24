import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deleteOrganization,
  getMyOrganizations,
  getUsers,
  updateOrganization,
  type AppUser,
  type OrgManageSummary,
  type SocialLinks,
} from "../lib/api";

const SOCIAL_KEYS = ["instagram", "twitter", "facebook", "tiktok"] as const;

export function OrgManager({
  token,
  isAdmin,
}: {
  token: string;
  isAdmin: boolean;
}) {
  const { t } = useTranslation();
  const [orgs, setOrgs] = useState<OrgManageSummary[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyOrganizations(token)
      .then(setOrgs)
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
    if (isAdmin) {
      getUsers(token)
        .then(setUsers)
        .catch(() => setUsers([]));
    }
  }, [token, isAdmin]);

  const setField = (
    id: string,
    field: "name" | "description" | "website",
    value: string,
  ) => {
    setOrgs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    );
  };

  const setSocial = (id: string, key: keyof SocialLinks, value: string) => {
    setOrgs((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, social_links: { ...o.social_links, [key]: value } }
          : o,
      ),
    );
  };

  const setOwner = (id: string, ownerUserId: string) => {
    setOrgs((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, owner_user_id: ownerUserId || null } : o,
      ),
    );
  };

  const save = async (o: OrgManageSummary) => {
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
        social_links: o.social_links,
        ...(isAdmin ? { owner_user_id: o.owner_user_id } : {}),
      });
    } catch {
      setError(t("org.orgSaveError"));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (o: OrgManageSummary) => {
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
        {isAdmin ? t("org.manageOrgsNote") : t("org.manageMyOrgsNote")}
      </p>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">{t("common.loading")}</p>}
      {!loading && orgs.length === 0 && (
        <p className="muted">{t("org.noOwnedOrgs")}</p>
      )}

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

            <label className="field-label">{t("org.orgSocial")}</label>
            <div className="grid-2">
              {SOCIAL_KEYS.map((key) => (
                <input
                  key={key}
                  className="text-input"
                  placeholder={t(`org.social.${key}`)}
                  value={o.social_links[key] ?? ""}
                  onChange={(e) => setSocial(o.id, key, e.target.value)}
                />
              ))}
            </div>

            {isAdmin && (
              <>
                <label className="field-label">{t("org.orgOwner")}</label>
                <select
                  className="text-input"
                  value={o.owner_user_id ?? ""}
                  onChange={(e) => setOwner(o.id, e.target.value)}
                >
                  <option value="">{t("org.orgOwnerNone")}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="route-tools" style={{ marginTop: 10 }}>
              <span className="pill blue">
                {o.protest_count} {t("orgs.upcoming")}
              </span>
              {!o.listed && <span className="pill">{t("org.unlisted")}</span>}
              <button
                type="button"
                className="mini-btn"
                disabled={busyId === o.id}
                onClick={() => void save(o)}
              >
                {t("org.saveChanges")}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="mini-btn danger"
                  disabled={busyId === o.id}
                  onClick={() => void remove(o)}
                >
                  {t("org.delete")}
                </button>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
