import type { Theme } from "../lib/theme";
import { Brand } from "./Brand";
import { SettingsMenu } from "./SettingsMenu";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  organizerActive: boolean;
  onToggleOrganizer: () => void;
}

export function Header({
  theme,
  onToggleTheme,
  organizerActive,
  onToggleOrganizer,
}: Props) {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Brand />
        <div className="header-controls">
          <SettingsMenu
            theme={theme}
            onToggleTheme={onToggleTheme}
            organizerActive={organizerActive}
            onToggleOrganizer={onToggleOrganizer}
          />
        </div>
      </div>
    </header>
  );
}
