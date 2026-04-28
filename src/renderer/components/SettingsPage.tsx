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
    FormControlLabel,
    Switch,
    Divider,
    Tooltip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/app-store';
import type { AppTheme, AppLanguage, ApiKeyTestStatus, ApiKeysData, ApiKeyCustomEntry } from '../../shared/types';
import {
    API_KEY_CUSTOM_MAX,
    API_KEY_ID_DEFAULT,
    API_KEY_ID_FREE_TIER,
    API_KEY_ID_CUSTOM_PREFIX,
} from '../../shared/constants';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

type Props = {
    onClose: () => void;
};

const testStatusI18nMap: Record<ApiKeyTestStatus, string> = {
    KEY_NOT_SET: 'settings.apiKey.notSet',
    KEY_VALID: 'settings.apiKey.valid',
    KEY_INVALID: 'settings.apiKey.invalid',
    TEST_ERROR: 'settings.apiKey.testError',
};

type ApiKeyStatusState = {
    slotId: string;
    type: 'success' | 'error';
    message: string;
    rawMessage: string | null;
};

function emptyCustom(): ApiKeyCustomEntry {
    return { title: '', key: '', isFreeTier: false };
}

function emptyData(): ApiKeysData {
    return {
        defaultKey: '',
        defaultIsFreeTier: false,
        freeTierKey: '',
        customs: [],
        activeId: API_KEY_ID_DEFAULT,
    };
}

export default function SettingsPage({ onClose }: Props) {
    const { t, i18n } = useTranslation();
    const { settings, setTheme, setLanguage, loadSettings, refreshActiveKeyInfo } = useAppStore();

    const [keysData, setKeysData] = React.useState<ApiKeysData>(emptyData());
    const [keyVisibility, setKeyVisibility] = React.useState<Record<string, boolean>>({});
    const [customErrors, setCustomErrors] = React.useState<Record<number, { title?: boolean; key?: boolean }>>({});
    const [apiKeyStatus, setApiKeyStatus] = React.useState<ApiKeyStatusState | null>(null);
    const [showApiKeyDetails, setShowApiKeyDetails] = React.useState(false);
    const [testingSlot, setTestingSlot] = React.useState<string | null>(null);
    const [historyDir, setHistoryDir] = React.useState('');
    const [moveDialog, setMoveDialog] = React.useState<{ open: boolean; newDir: string }>({
        open: false,
        newDir: '',
    });

    React.useEffect(() => {
        window.imaginai.getApiKeysData().then(data => setKeysData(data));
        window.imaginai.getHistoryDir().then(dir => setHistoryDir(dir));
    }, []);

    const handleLanguageChange = async (lang: AppLanguage) => {
        await setLanguage(lang);
        i18n.changeLanguage(lang);
    };

    const handleThemeChange = async (theme: AppTheme) => {
        await setTheme(theme);
    };

    const toggleVisibility = (slotId: string) => {
        setKeyVisibility(prev => ({ ...prev, [slotId]: !prev[slotId] }));
    };

    const updateDefaultKey = (value: string) => setKeysData(prev => ({ ...prev, defaultKey: value }));
    const updateFreeTierKey = (value: string) => setKeysData(prev => ({ ...prev, freeTierKey: value }));

    const updateCustom = (index: number, patch: Partial<ApiKeyCustomEntry>) => {
        setKeysData(prev => {
            const next = [...prev.customs];
            next[index] = { ...next[index], ...patch };
            return { ...prev, customs: next };
        });
        if (patch.title !== undefined || patch.key !== undefined) {
            setCustomErrors(prev => {
                if (!prev[index]) return prev;
                const entry = { ...prev[index] };
                if (patch.title !== undefined) delete entry.title;
                if (patch.key !== undefined) delete entry.key;
                const next = { ...prev };
                if (!entry.title && !entry.key) delete next[index];
                else next[index] = entry;
                return next;
            });
        }
    };

    const addCustom = () => {
        setKeysData(prev => {
            if (prev.customs.length >= API_KEY_CUSTOM_MAX) return prev;
            return { ...prev, customs: [...prev.customs, emptyCustom()] };
        });
    };

    const removeCustom = (index: number) => {
        setKeysData(prev => {
            const nextCustoms = prev.customs.filter((_, i) => i !== index);
            // If active id referenced a custom whose index shifted, reset to default.
            let nextActive = prev.activeId;
            if (prev.activeId.startsWith(API_KEY_ID_CUSTOM_PREFIX)) {
                const idx = Number(prev.activeId.slice(API_KEY_ID_CUSTOM_PREFIX.length));
                if (idx === index) {
                    nextActive = API_KEY_ID_DEFAULT;
                } else if (idx > index) {
                    nextActive = `${API_KEY_ID_CUSTOM_PREFIX}${idx - 1}`;
                }
            }
            return { ...prev, customs: nextCustoms, activeId: nextActive };
        });
        setCustomErrors(prev => {
            const next: typeof prev = {};
            Object.entries(prev).forEach(([k, v]) => {
                const i = Number(k);
                if (i === index) return;
                next[i > index ? i - 1 : i] = v;
            });
            return next;
        });
    };

    const handleSaveAll = async () => {
        // Validation: custom keys require both title and key
        const errors: Record<number, { title?: boolean; key?: boolean }> = {};
        keysData.customs.forEach((c, i) => {
            const titleEmpty = !c.title.trim();
            const keyEmpty = !c.key.trim();
            if (titleEmpty || keyEmpty) {
                errors[i] = {};
                if (titleEmpty) errors[i].title = true;
                if (keyEmpty) errors[i].key = true;
            }
        });
        if (Object.keys(errors).length > 0) {
            setCustomErrors(errors);
            setApiKeyStatus({
                slotId: 'all',
                type: 'error',
                message: t('settings.apiKey.customs.validationError'),
                rawMessage: null,
            });
            return;
        }
        setCustomErrors({});

        const result = await window.imaginai.saveApiKeysData(keysData);
        if (result.success) {
            setKeysData(result.data);
            await refreshActiveKeyInfo();
            setApiKeyStatus({
                slotId: 'all',
                type: 'success',
                message: t('settings.apiKey.saved'),
                rawMessage: null,
            });
        } else {
            setApiKeyStatus({
                slotId: 'all',
                type: 'error',
                message: t('settings.apiKey.encryptionUnavailable'),
                rawMessage: null,
            });
        }
        setTimeout(() => setApiKeyStatus(null), 3000);
    };

    const handleTestKey = async (slotId: string, rawKey: string) => {
        setTestingSlot(slotId);
        setApiKeyStatus(null);
        setShowApiKeyDetails(false);
        try {
            const result = await window.imaginai.testApiKey(rawKey);
            const i18nKey = testStatusI18nMap[result.status];
            setApiKeyStatus({
                slotId,
                type: result.success ? 'success' : 'error',
                message: t(i18nKey),
                rawMessage: result.rawMessage,
            });
        } catch (err) {
            setApiKeyStatus({
                slotId,
                type: 'error',
                message: t('settings.apiKey.testError'),
                rawMessage: err instanceof Error ? err.message : String(err),
            });
        } finally {
            setTestingSlot(null);
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

    const renderKeyField = (
        slotId: string,
        value: string,
        onChangeValue: (v: string) => void,
        label: string,
        freeTier?: { checked: boolean; onChange: (v: boolean) => void },
        error?: boolean,
        errorText?: string
    ) => {
        const isVisible = !!keyVisibility[slotId];
        return (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                    fullWidth
                    size='small'
                    type={isVisible ? 'text' : 'password'}
                    label={label}
                    placeholder={t('settings.apiKey.placeholder')}
                    value={value}
                    onChange={e => onChangeValue(e.target.value)}
                    error={!!error}
                    helperText={error ? errorText : undefined}
                    slotProps={{
                        input: {
                            endAdornment: (
                                <InputAdornment position='end'>
                                    <IconButton size='small' onClick={() => toggleVisibility(slotId)} edge='end'>
                                        {isVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                {freeTier && (
                    <FormControlLabel
                        sx={{ mx: 0, flexShrink: 0 }}
                        control={
                            <Switch
                                size='small'
                                checked={freeTier.checked}
                                onChange={e => freeTier.onChange(e.target.checked)}
                            />
                        }
                        label={
                            <Typography variant='caption' sx={{ whiteSpace: 'nowrap' }}>
                                {t('settings.apiKey.isFreeTierShort')}
                            </Typography>
                        }
                    />
                )}
                <Button
                    variant='outlined'
                    size='small'
                    onClick={() => handleTestKey(slotId, value)}
                    disabled={!value || testingSlot === slotId}
                    sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                    {testingSlot === slotId ? t('settings.apiKey.testing') : t('settings.apiKey.test')}
                </Button>
            </Box>
        );
    };

    const renderStatusForSlot = (slotId: string) => {
        if (!apiKeyStatus || apiKeyStatus.slotId !== slotId) return null;
        return (
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
                                {showApiKeyDetails ? t('generation.errorHideDetails') : t('generation.errorDetails')}
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
        );
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                <Typography variant='h6' sx={{ fontWeight: 600 }}>
                    {t('settings.title')}
                </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', p: 3 }}>
                <Box sx={{ maxWidth: 720, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Language */}
                    <Box>
                        <Typography variant='subtitle2' gutterBottom sx={{ fontWeight: 600 }}>
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
                        <Typography variant='subtitle2' gutterBottom sx={{ fontWeight: 600 }}>
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

                    {/* History Directory */}
                    <Box>
                        <Typography variant='subtitle2' gutterBottom sx={{ fontWeight: 600 }}>
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

                    {/* API Keys */}
                    <Box>
                        <Typography variant='subtitle2' gutterBottom sx={{ fontWeight: 600 }}>
                            {t('settings.apiKey.label')}
                        </Typography>
                        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                            {t('settings.apiKey.hintPrefix')}
                            <Link href='https://aistudio.google.com/apikey' target='_blank' rel='noopener noreferrer'>
                                {t('settings.apiKey.hintPrefixLink')}
                            </Link>
                            {t('settings.apiKey.hintPrefixSuffix')}
                            <br />
                            {t('settings.apiKey.hintTierRequirement')}
                        </Typography>

                        <Box
                            sx={{
                                p: 2,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                bgcolor: 'action.hover',
                            }}
                        >
                            {/* Default key (untitled) */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                                    {t('settings.apiKey.default.title')}
                                </Typography>
                                {renderKeyField(
                                    API_KEY_ID_DEFAULT,
                                    keysData.defaultKey,
                                    updateDefaultKey,
                                    t('settings.apiKey.default.label'),
                                    {
                                        checked: keysData.defaultIsFreeTier,
                                        onChange: v =>
                                            setKeysData(prev => ({ ...prev, defaultIsFreeTier: v })),
                                    }
                                )}
                                {renderStatusForSlot(API_KEY_ID_DEFAULT)}
                            </Box>

                            {/* Free-tier key (untitled) */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                                    {t('settings.apiKey.freeTier.title')}
                                </Typography>
                                {renderKeyField(
                                    API_KEY_ID_FREE_TIER,
                                    keysData.freeTierKey,
                                    updateFreeTierKey,
                                    t('settings.apiKey.freeTier.label')
                                )}
                                {renderStatusForSlot(API_KEY_ID_FREE_TIER)}
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            {/* Custom keys */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 1,
                                }}
                            >
                                <Typography variant='caption' color='text.secondary'>
                                    {t('settings.apiKey.customs.title', {
                                        count: keysData.customs.length,
                                        max: API_KEY_CUSTOM_MAX,
                                    })}
                                </Typography>
                                <Button
                                    size='small'
                                    variant='outlined'
                                    startIcon={<AddIcon />}
                                    onClick={addCustom}
                                    disabled={keysData.customs.length >= API_KEY_CUSTOM_MAX}
                                >
                                    {t('settings.apiKey.customs.add')}
                                </Button>
                            </Box>

                            {keysData.customs.map((c, idx) => {
                                const slotId = `${API_KEY_ID_CUSTOM_PREFIX}${idx}`;
                                return (
                                    <Box
                                        key={slotId}
                                        sx={{
                                            mb: 2,
                                            p: 1.5,
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            bgcolor: 'background.paper',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1,
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <TextField
                                                fullWidth
                                                size='small'
                                                label={t('settings.apiKey.customs.titleLabel')}
                                                value={c.title}
                                                onChange={e => updateCustom(idx, { title: e.target.value })}
                                                error={!!customErrors[idx]?.title}
                                                helperText={customErrors[idx]?.title ? t('settings.apiKey.customs.titleRequired') : undefined}
                                            />
                                            <Tooltip title={t('settings.apiKey.customs.remove')}>
                                                <IconButton size='small' onClick={() => removeCustom(idx)}>
                                                    <DeleteIcon fontSize='small' />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                        {renderKeyField(
                                            slotId,
                                            c.key,
                                            v => updateCustom(idx, { key: v }),
                                            t('settings.apiKey.default.label'),
                                            {
                                                checked: c.isFreeTier,
                                                onChange: v => updateCustom(idx, { isFreeTier: v }),
                                            },
                                            !!customErrors[idx]?.key,
                                            t('settings.apiKey.customs.keyRequired')
                                        )}
                                        {renderStatusForSlot(slotId)}
                                    </Box>
                                );
                            })}

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button variant='contained' size='small' onClick={handleSaveAll}>
                                    {t('settings.apiKey.saveAll')}
                                </Button>
                            </Box>
                            {renderStatusForSlot('all')}
                        </Box>
                    </Box>

                </Box>
            </Box>

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
