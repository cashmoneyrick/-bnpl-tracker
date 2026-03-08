import { SettingsPage } from '../../pages/SettingsPage';

export function SettingsSection() {
  return (
    <div id="settings-section" className="hud-section">
      <div className="hud-section-inner relative">
        <div className="px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">SETTINGS</span>
        </div>
        <SettingsPage />
      </div>
    </div>
  );
}
