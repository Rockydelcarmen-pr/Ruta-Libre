import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Auth } from "../hooks/useAuth";
import type { Lang } from "../lib/types";
import { LoginForm } from "./LoginForm";
import { CreateProtest } from "./CreateProtest";
import { PublishedProtests } from "./PublishedProtests";
import { OrgManager } from "./OrgManager";

type Mode = "menu" | "create" | "view" | "orgs";

export function OrganizerPanel({
  auth,
  lang,
  onCreated,
}: {
  auth: Auth;
  lang: Lang;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("menu");
  const [editId, setEditId] = useState<string | null>(null);

  const isAdmin = auth.user?.role === "admin";
  const canCreate =
    auth.user && (auth.user.role === "approved" || auth.user.role === "admin");

  const backToMenu = () => {
    setMode("menu");
    setEditId(null);
  };

  // After create/edit, return to the management list (shows any status/date).
  const afterSave = () => {
    onCreated();
    setEditId(null);
    setMode("view");
  };

  return (
    <section className="feed container">
      {!auth.user && <LoginForm onLogin={auth.login} />}

      {auth.user && (
        <>
          <div className="org-bar">
            <span className="muted">
              {t("org.signedInAs")} <strong>{auth.user.email}</strong> ·{" "}
              {auth.user.role}
            </span>
            <button type="button" className="mini-btn" onClick={auth.logout}>
              {t("org.signOut")}
            </button>
          </div>

          {!canCreate && <p className="muted">{t("org.noAccess")}</p>}

          {canCreate && mode === "menu" && (
            <>
              <div className="eyebrow">{t("org.eyebrow")}</div>
              <h2 className="org-h">{t("org.dashboard")}</h2>
              <div className="org-menu">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setMode("view")}
                >
                  {t("org.viewPublished")}
                </button>
                <button
                  type="button"
                  className="btn go"
                  onClick={() => {
                    setEditId(null);
                    setMode("create");
                  }}
                >
                  {t("org.newProtest")}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setMode("orgs")}
                  >
                    {t("org.manageOrgs")}
                  </button>
                )}
              </div>
            </>
          )}

          {canCreate && mode !== "menu" && (
            <>
              <button type="button" className="mini-btn" onClick={backToMenu}>
                {t("org.backToMenu")}
              </button>
              <div style={{ marginTop: 12 }}>
                {mode === "create" && (
                  <CreateProtest
                    token={auth.token!}
                    editId={editId ?? undefined}
                    onCreated={afterSave}
                  />
                )}
                {mode === "view" && (
                  <PublishedProtests
                    lang={lang}
                    token={auth.token!}
                    onEdit={(id) => {
                      setEditId(id);
                      setMode("create");
                    }}
                  />
                )}
                {mode === "orgs" && isAdmin && (
                  <OrgManager token={auth.token!} />
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
