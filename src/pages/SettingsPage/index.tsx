import { FC } from 'react';
import { BulbOutlined, MoonOutlined, DesktopOutlined } from '@ant-design/icons';
import { useAppStore, ThemeMode } from '../../store';

interface ThemeOptionProps {
  mode: ThemeMode;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

// Theme option button component
const ThemeOption: FC<ThemeOptionProps> = ({
  icon,
  label,
  active,
  onClick,
}) => {
  return (
    <div
      className={`theme-option ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="option-icon">{icon}</span>
      <span className="option-label">{label}</span>
    </div>
  );
};

// Settings page - app configuration
export const SettingsPage: FC = () => {
  const { themeMode, setThemeMode, audios, playlists } = useAppStore();

  return (
    <div className="page settings-page">
      {/* <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure app preferences</p>
      </div> */}

      <div className="settings-section">
        <div className="section-title">Theme</div>
        <div className="theme-options">
          <ThemeOption
            mode="light"
            icon={<BulbOutlined />}
            label="Light"
            active={themeMode === 'light'}
            onClick={() => setThemeMode('light')}
          />
          <ThemeOption
            mode="dark"
            icon={<MoonOutlined />}
            label="Dark"
            active={themeMode === 'dark'}
            onClick={() => setThemeMode('dark')}
          />
          <ThemeOption
            mode="auto"
            icon={<DesktopOutlined />}
            label="System"
            active={themeMode === 'auto'}
            onClick={() => setThemeMode('auto')}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">Library</div>
        <div className="section-content">
          <div className="settings-item">
            <span className="item-label">Downloaded Tracks</span>
            <span className="item-value">{audios.length}</span>
          </div>
          <div className="settings-item">
            <span className="item-label">Playlists</span>
            <span className="item-value">{playlists.length}</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">About</div>
        <div className="section-content">
          <div className="settings-item">
            <span className="item-label">Version</span>
            <span className="item-value">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
