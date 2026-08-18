import { useTranslation } from "react-i18next";
import { useTheme } from "./hooks/useTheme";
import { Header } from "./components/Header";
import { MatchPanel } from "./components/MatchPanel";
import { ProtestList } from "./components/ProtestList";
import type { Lang } from "./lib/types";

export function App() {
  const { i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const lang: Lang = i18n.language.startsWith("es") ? "es" : "en";

  return (
    <>
      <Header theme={theme} onToggleTheme={toggle} />
      <main className="container app-main">
        <MatchPanel />
        <ProtestList lang={lang} />
      </main>
    </>
  );
}
