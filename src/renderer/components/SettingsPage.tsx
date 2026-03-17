import React from 'react';
import {
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    IconButton,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    InputAdornment,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/app-store';
import type { AppTheme, AppLanguage } from '../../shared/types';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

type Props = {
    onClose: () => void;
};

export default function SettingsPage({ onClose }: Props) {
    const { t, i18n } = useTranslation();
    const { settings, setTheme, setLanguage, loadSettings } = useAppStore();

    const [apiKey, setApiKey] = React.useState('');
    const [showApiKey, setShowApiKey] = React.useState(false);
    const [apiKeyStatus, setApiKeyStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(
        null
    );
    const [isTesting, setIsTesting] = React.useState(false);
    const [historyDir, setHistoryDir] = React.useState('');
    const [moveDialog, setMoveDialog] = React.useState<{ open: boolean; newDir: string }>({
        open: false,
        newDir: '',
    });

    // Load initial values
    React.useEffect(() => {
        window.imaginai.getApiKey('gemini').then(key => setApiKey(key));
        window.imaginai.getHistoryDir().then(dir => setHistoryDir(dir));
    }, []);

    const handleLanguageChange = async (lang: AppLanguage) => {
        await setLanguage(lang);
        i18n.changeLanguage(lang);
    };

    const handleThemeChange = async (theme: AppTheme) => {
        await setTheme(theme);
    };

    const handleSaveApiKey = async () => {
        await window.imaginai.saveApiKey('gemini', apiKey);
        setApiKeyStatus({ type: 'success', message: t('settings.apiKey.saved') });
        setTimeout(() => setApiKeyStatus(null), 3000);
    };

    const handleTestApiKey = async () => {
        setIsTesting(true);
        setApiKeyStatus(null);
        try {
            // Save first, then test
            await window.imaginai.saveApiKey('gemini', apiKey);
            const result = await window.imaginai.testApiKey('gemini');
            setApiKeyStatus({
                type: result.success ? 'success' : 'error',
                message: result.success ? t('settings.apiKey.valid') : result.message,
            });
        } catch (err) {
            setApiKeyStatus({
                type: 'error',
                message: err instanceof Error ? err.message : t('settings.apiKey.invalid'),
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleChangeHistoryDir = async () => {
        const dir = await window.imaginai.selectDirectory();
        if (dir) {
            setMoveDialog({ open: true, newDir: dir });
        }
    };

    const handleMoveHistoryDir = async (move: boolean) => {
        const newDir = moveDialog.newDir;
        setMoveDialog({ open: false, newDir: '' });
        const result = await window.imaginai.changeHistoryDir(newDir, move);
        if (result.success) {
            setHistoryDir(result.historyDir);
            await loadSettings();
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: 'divider',
                    flexShrink: 0,
                }}
            >
                <IconButton onClick={onClose} size='small'>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant='h6' fontWeight={600}>
                    {t('settings.title')}
                </Typography>
            </Box>

            {/* Settings content */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', p: 3 }}>
                <Box sx={{ maxWidth: 600, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Language */}
                    <Box>
                        <Typography variant='subtitle2' fontWeight={600} gutterBottom>
                            {t('settings.language')}
                        </Typography>
                        <FormControl size='small' fullWidth>
                            <InputLabel>{t('settings.language')}</InputLabel>
                            <Select
                                value={settings?.language || 'en'}
                                label={t('settings.language')}
                                onChange={e => handleLanguageChange(e.target.value as AppLanguage)}
                            >
                                <MenuItem value='ja'>{t('settings.language.ja')}</MenuItem>
                                <MenuItem value='en'>{t('settings.language.en')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Theme */}
                    <Box>
                        <Typography variant='subtitle2' fontWeight={600} gutterBottom>
                            {t('settings.theme')}
                        </Typography>
                        <FormControl size='small' fullWidth>
                            <InputLabel>{t('settings.theme')}</InputLabel>
                            <Select
                                value={settings?.theme || 'system'}
                                label={t('settings.theme')}
                                onChange={e => handleThemeChange(e.target.value as AppTheme)}
                            >
                                <MenuItem value='light'>{t('settings.theme.light')}</MenuItem>
                                <MenuItem value='dark'>{t('settings.theme.dark')}</MenuItem>
                                <MenuItem value='system'>{t('settings.theme.system')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* API Key */}
                    <Box>
                        <Typography variant='subtitle2' fontWeight={600} gutterBottom>
                            {t('settings.apiKey.label')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                fullWidth
                                size='small'
                                type={showApiKey ? 'text' : 'password'}
                                placeholder={t('settings.apiKey.placeholder')}
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position='end'>
                                                <IconButton
                                                    size='small'
                                                    onClick={() => setShowApiKey(!showApiKey)}
                                                    edge='end'
                                                >
                                                    {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button variant='outlined' size='small' onClick={handleSaveApiKey}>
                                {t('common.save')}
                            </Button>
                            <Button
                                variant='outlined'
                                size='small'
                                onClick={handleTestApiKey}
                                disabled={isTesting || !apiKey}
                            >
                                {isTesting ? t('settings.apiKey.testing') : t('settings.apiKey.test')}
                            </Button>
                        </Box>
                        {apiKeyStatus && (
                            <Alert severity={apiKeyStatus.type} sx={{ mt: 1 }} variant='outlined'>
                                {apiKeyStatus.message}
                            </Alert>
                        )}
                    </Box>

                    {/* History Directory */}
                    <Box>
                        <Typography variant='subtitle2' fontWeight={600} gutterBottom>
                            {t('settings.historyDir')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                                fullWidth
                                size='small'
                                value={historyDir}
                                slotProps={{ input: { readOnly: true } }}
                            />
                            <Button
                                variant='outlined'
                                size='small'
                                startIcon={<FolderOpenIcon />}
                                onClick={handleChangeHistoryDir}
                                sx={{ flexShrink: 0 }}
                            >
                                {t('settings.historyDir.change')}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Move history dialog */}
            <Dialog open={moveDialog.open} onClose={() => setMoveDialog({ open: false, newDir: '' })}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('settings.historyDir.moveConfirm')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMoveDialog({ open: false, newDir: '' })}>{t('common.cancel')}</Button>
                    <Button onClick={() => handleMoveHistoryDir(false)} variant='outlined'>
                        {t('common.no')}
                    </Button>
                    <Button onClick={() => handleMoveHistoryDir(true)} variant='contained'>
                        {t('common.yes')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
