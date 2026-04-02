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
    Link,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/app-store';
import type { AppTheme, AppLanguage, ApiKeyTestStatus } from '../../shared/types';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

type Props = {
    onClose: () => void;
};

// Map API key test status to i18n key
const testStatusI18nMap: Record<ApiKeyTestStatus, string> = {
    KEY_NOT_SET: 'settings.apiKey.notSet',
    KEY_VALID: 'settings.apiKey.valid',
    KEY_INVALID: 'settings.apiKey.invalid',
    TEST_ERROR: 'settings.apiKey.testError',
};

type ApiKeyStatusState = {
    type: 'success' | 'error';
    message: string;
    rawMessage: string | null;
};

export default function SettingsPage({ onClose }: Props) {
    const { t, i18n } = useTranslation();
    const { settings, setTheme, setLanguage, loadSettings } = useAppStore();

    const [apiKey, setApiKey] = React.useState('');
    const [showApiKey, setShowApiKey] = React.useState(false);
    const [apiKeyStatus, setApiKeyStatus] = React.useState<ApiKeyStatusState | null>(null);
    const [showApiKeyDetails, setShowApiKeyDetails] = React.useState(false);
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
        const result = await window.imaginai.saveApiKey('gemini', apiKey);
        if (result.success) {
            setApiKeyStatus({ type: 'success', message: t('settings.apiKey.saved'), rawMessage: null });
        } else {
            setApiKeyStatus({ type: 'error', message: t('settings.apiKey.encryptionUnavailable'), rawMessage: null });
        }
        setTimeout(() => setApiKeyStatus(null), 3000);
    };

    const handleTestApiKey = async () => {
        setIsTesting(true);
        setApiKeyStatus(null);
        setShowApiKeyDetails(false);
        try {
            // Save first, then test
            await window.imaginai.saveApiKey('gemini', apiKey);
            const result = await window.imaginai.testApiKey('gemini');
            const i18nKey = testStatusI18nMap[result.status];
            setApiKeyStatus({
                type: result.success ? 'success' : 'error',
                message: t(i18nKey),
                rawMessage: result.rawMessage,
            });
        } catch (err) {
            setApiKeyStatus({
                type: 'error',
                message: t('settings.apiKey.testError'),
                rawMessage: err instanceof Error ? err.message : String(err),
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
                        <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                            {t('settings.apiKey.hintPrefix')}
                            <Link
                                href='https://aistudio.google.com/apikey'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                {t('settings.apiKey.hintPrefixLink')}
                            </Link>
                            {t('settings.apiKey.hintPrefixSuffix')}
                            <br />
                            {t('settings.apiKey.hintTierRequirement')}
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
                            <Alert
                                severity={apiKeyStatus.type}
                                sx={{ mt: 1 }}
                                variant='outlined'
                                onClose={() => {
                                    setApiKeyStatus(null);
                                    setShowApiKeyDetails(false);
                                }}
                            >
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <span>{apiKeyStatus.message}</span>
                                        {apiKeyStatus.rawMessage && (
                                            <Link
                                                component='button'
                                                variant='body2'
                                                color={apiKeyStatus.type === 'error' ? 'error' : 'success'}
                                                underline='hover'
                                                onClick={() => setShowApiKeyDetails(prev => !prev)}
                                                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                                            >
                                                {showApiKeyDetails
                                                    ? t('generation.errorHideDetails')
                                                    : t('generation.errorDetails')}
                                            </Link>
                                        )}
                                    </Box>
                                    {showApiKeyDetails && apiKeyStatus.rawMessage && (
                                        <Typography
                                            variant='caption'
                                            component='pre'
                                            sx={{
                                                mt: 1,
                                                p: 1,
                                                bgcolor: 'action.hover',
                                                borderRadius: 1,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-all',
                                                fontFamily: 'monospace',
                                                maxHeight: 200,
                                                overflow: 'auto',
                                            }}
                                        >
                                            {apiKeyStatus.rawMessage}
                                        </Typography>
                                    )}
                                </Box>
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
