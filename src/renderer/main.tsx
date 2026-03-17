import React from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, Box } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import './i18n/config';
import TitleBar from './components/TitleBar';
import MainPage from './components/MainPage';
import SettingsPage from './components/SettingsPage';
import { useAppStore } from './stores/app-store';
import { useHistoryStore } from './stores/history-store';

function App() {
    const { i18n } = useTranslation();
    const { info, initialized, initialize } = useAppStore();
    const loadHistory = useHistoryStore(s => s.loadHistory);
    const [showSettings, setShowSettings] = React.useState(false);

    // Initialize app
    React.useEffect(() => {
        initialize().then(() => {
            const appInfo = useAppStore.getState().info;
            if (appInfo) {
                i18n.changeLanguage(appInfo.language);
            }
        });
        loadHistory();
    }, [initialize, i18n, loadHistory]);

    // Resolve theme mode
    const themeMode = React.useMemo(() => {
        const theme = info?.theme ?? 'system';
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme as 'light' | 'dark';
    }, [info?.theme]);

    const muiTheme = React.useMemo(() => createTheme({ palette: { mode: themeMode } }), [themeMode]);

    if (!initialized) {
        return null;
    }

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                <TitleBar onOpenSettings={() => setShowSettings(true)} />
                <Box
                    sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: 'background.default',
                        overflow: 'hidden',
                    }}
                >
                    {showSettings ? <SettingsPage onClose={() => setShowSettings(false)} /> : <MainPage />}
                </Box>
            </Box>
        </ThemeProvider>
    );
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
