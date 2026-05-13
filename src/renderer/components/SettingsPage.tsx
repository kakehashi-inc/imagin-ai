import React from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    InputAdornment,
    InputLabel,
    Link,
    MenuItem,
    Select,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/app-store';
import type {
    ApiKeySlot,
    ApiKeysData,
    ApiKeyTestStatus,
    ApiProvider,
    ProviderKeySet,
} from '../../shared/types';
import { API_KEY_CUSTOM_MAX, API_KEY_SCHEMA_VERSION, makeApiKeyId, parseApiKeyId } from '../../shared/constants';
import type { AppLanguage, AppTheme } from '../../shared/types';
import ProviderIcon from './ProviderIcon';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

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

function emptySlot(isFreeTier: boolean): ApiKeySlot {
    return { key: '', isFreeTier, title: '' };
}
function emptyProviderKeySet(): ProviderKeySet {
    return { default: emptySlot(false), freeTier: emptySlot(true), customs: [] };
}
function emptyData(): ApiKeysData {
    return {
        schemaVersion: API_KEY_SCHEMA_VERSION,
        providers: { gemini: emptyProviderKeySet(), openai: emptyProviderKeySet() },
        activeId: makeApiKeyId('gemini', 'default'),
    };
}

// =============================================================================
// ProviderApiKeySection
// =============================================================================
// Renders the API-key configuration block for a single provider. The shape of
// the block is identical for both providers; provider-specific differences
// (only Gemini exposes the free-tier slot and the per-key isFreeTier flag) are
// gated by the `provider` prop. Keeping the rendering symmetric in code is the
// whole point of the v2 schema rework.

type ProviderApiKeySectionProps = {
    provider: ApiProvider;
    set: ProviderKeySet;
    onChange: (next: ProviderKeySet) => void;
    onActiveIdResetTo: (id: string) => void;
    visibility: Record<string, boolean>;
    onToggleVisibility: (slotId: string) => void;
    customErrors: Record<number, { title?: boolean; key?: boolean }>;
    setCustomErrors: React.Dispatch<React.SetStateAction<Record<string, Record<number, { title?: boolean; key?: boolean }>>>>;
    testingSlot: string | null;
    onTestKey: (slotId: string, rawKey: string, provider: ApiProvider) => void;
    apiKeyStatus: ApiKeyStatusState | null;
    onClearStatus: () => void;
    showApiKeyDetails: boolean;
    onToggleDetails: () => void;
    activeId: string;
};

function ProviderApiKeySection(props: ProviderApiKeySectionProps) {
    const { t } = useTranslation();
    const {
        provider,
        set,
        onChange,
        onActiveIdResetTo,
        visibility,
        onToggleVisibility,
        customErrors,
        setCustomErrors,
        testingSlot,
        onTestKey,
        apiKeyStatus,
        onClearStatus,
        showApiKeyDetails,
        onToggleDetails,
        activeId,
    } = props;

    const showFreeTier = provider === 'gemini';

    const slotIdFor = (kind: 'default' | 'freeTier' | 'custom', index?: number): string =>
        makeApiKeyId(
            provider,
            kind === 'custom' ? (`custom:${index ?? 0}` as const) : kind
        );

    const updateDefault = (patch: Partial<ApiKeySlot>) =>
        onChange({ ...set, default: { ...set.default, ...patch } });
    const updateFreeTier = (patch: Partial<ApiKeySlot>) =>
        onChange({ ...set, freeTier: { ...set.freeTier, ...patch } });
    const updateCustom = (index: number, patch: Partial<ApiKeySlot>) => {
        const customs = [...set.customs];
        customs[index] = { ...customs[index], ...patch };
        onChange({ ...set, customs });
        if (patch.title !== undefined || patch.key !== undefined) {
            setCustomErrors(prev => {
                const providerErrors = { ...(prev[provider] ?? {}) };
                if (!providerErrors[index]) return prev;
                const entry = { ...providerErrors[index] };
                if (patch.title !== undefined) delete entry.title;
                if (patch.key !== undefined) delete entry.key;
                if (!entry.title && !entry.key) delete providerErrors[index];
                else providerErrors[index] = entry;
                return { ...prev, [provider]: providerErrors };
            });
        }
    };
    const addCustom = () => {
        if (set.customs.length >= API_KEY_CUSTOM_MAX) return;
        onChange({ ...set, customs: [...set.customs, emptySlot(false)] });
    };
    const removeCustom = (index: number) => {
        const customs = set.customs.filter((_, i) => i !== index);
        onChange({ ...set, customs });
        // If the active id pointed at a custom slot that shifted, fall back to default.
        const parsed = parseApiKeyId(activeId);
        if (parsed?.provider === provider && parsed.kind === 'custom') {
            if (parsed.index === index) onActiveIdResetTo(makeApiKeyId(provider, 'default'));
            else if ((parsed.index ?? -1) > index)
                onActiveIdResetTo(makeApiKeyId(provider, `custom:${(parsed.index ?? 0) - 1}` as const));
        }
        setCustomErrors(prev => {
            const prevProv = prev[provider] ?? {};
            const next: Record<number, { title?: boolean; key?: boolean }> = {};
            Object.entries(prevProv).forEach(([k, v]) => {
                const i = Number(k);
                if (i === index) return;
                next[i > index ? i - 1 : i] = v;
            });
            return { ...prev, [provider]: next };
        });
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
        const isVisible = !!visibility[slotId];
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
                                    <IconButton size='small' onClick={() => onToggleVisibility(slotId)} edge='end'>
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
                    onClick={() => onTestKey(slotId, value, provider)}
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
                onClose={onClearStatus}
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
                                onClick={onToggleDetails}
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

    const providerCustomErrors = customErrors;

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ProviderIcon provider={provider} fontSize='small' />
                <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                    {t(`settings.apiKey.${provider}.title`)}
                </Typography>
            </Box>
            <Box
                sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                }}
            >
                {/* Default key */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                        {t('settings.apiKey.default.title')}
                    </Typography>
                    {renderKeyField(
                        slotIdFor('default'),
                        set.default.key,
                        v => updateDefault({ key: v }),
                        t('settings.apiKey.default.label'),
                        showFreeTier
                            ? {
                                  checked: set.default.isFreeTier,
                                  onChange: v => updateDefault({ isFreeTier: v }),
                              }
                            : undefined
                    )}
                    {renderStatusForSlot(slotIdFor('default'))}
                </Box>

                {/* Free-tier slot (Gemini only). The OpenAI provider keeps the slot
                    structurally in storage but hides it from the UI. */}
                {showFreeTier && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                            {t('settings.apiKey.freeTier.title')}
                        </Typography>
                        {renderKeyField(
                            slotIdFor('freeTier'),
                            set.freeTier.key,
                            v => updateFreeTier({ key: v }),
                            t('settings.apiKey.freeTier.label')
                        )}
                        {renderStatusForSlot(slotIdFor('freeTier'))}
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Custom keys */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant='caption' color='text.secondary'>
                        {t('settings.apiKey.customs.title', {
                            count: set.customs.length,
                            max: API_KEY_CUSTOM_MAX,
                        })}
                    </Typography>
                    <Button
                        size='small'
                        variant='outlined'
                        startIcon={<AddIcon />}
                        onClick={addCustom}
                        disabled={set.customs.length >= API_KEY_CUSTOM_MAX}
                    >
                        {t('settings.apiKey.customs.add')}
                    </Button>
                </Box>

                {set.customs.map((c, idx) => {
                    const sId = slotIdFor('custom', idx);
                    return (
                        <Box
                            key={sId}
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
                                    value={c.title ?? ''}
                                    onChange={e => updateCustom(idx, { title: e.target.value })}
                                    error={!!providerCustomErrors[idx]?.title}
                                    helperText={
                                        providerCustomErrors[idx]?.title
                                            ? t('settings.apiKey.customs.titleRequired')
                                            : undefined
                                    }
                                />
                                <Tooltip title={t('settings.apiKey.customs.remove')}>
                                    <IconButton size='small' onClick={() => removeCustom(idx)}>
                                        <DeleteIcon fontSize='small' />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            {renderKeyField(
                                sId,
                                c.key,
                                v => updateCustom(idx, { key: v }),
                                t('settings.apiKey.default.label'),
                                showFreeTier
                                    ? {
                                          checked: c.isFreeTier,
                                          onChange: v => updateCustom(idx, { isFreeTier: v }),
                                      }
                                    : undefined,
                                !!providerCustomErrors[idx]?.key,
                                t('settings.apiKey.customs.keyRequired')
                            )}
                            {renderStatusForSlot(sId)}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

// =============================================================================
// SettingsPage
// =============================================================================

export default function SettingsPage({ onClose }: Props) {
    const { t, i18n } = useTranslation();
    const { settings, setTheme, setLanguage, loadSettings, refreshActiveKeyInfo } = useAppStore();

    const [keysData, setKeysData] = React.useState<ApiKeysData>(emptyData());
    const [keyVisibility, setKeyVisibility] = React.useState<Record<string, boolean>>({});
    // Indexed by provider so each section maintains its own per-row error map.
    const [customErrorsByProvider, setCustomErrorsByProvider] = React.useState<
        Record<string, Record<number, { title?: boolean; key?: boolean }>>
    >({});
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

    const toggleVisibility = (slotId: string) =>
        setKeyVisibility(prev => ({ ...prev, [slotId]: !prev[slotId] }));

    const handleSaveAll = async () => {
        // Validation: custom keys require both title and key. Run per provider so
        // each section's errors stay scoped to its own custom rows.
        const errs: Record<string, Record<number, { title?: boolean; key?: boolean }>> = {};
        let hasError = false;
        for (const provider of ['gemini', 'openai'] as const) {
            const customs = keysData.providers[provider].customs;
            const providerErrs: Record<number, { title?: boolean; key?: boolean }> = {};
            customs.forEach((c, i) => {
                const titleEmpty = !(c.title ?? '').trim();
                const keyEmpty = !c.key.trim();
                if (titleEmpty || keyEmpty) {
                    providerErrs[i] = {};
                    if (titleEmpty) providerErrs[i].title = true;
                    if (keyEmpty) providerErrs[i].key = true;
                    hasError = true;
                }
            });
            errs[provider] = providerErrs;
        }
        if (hasError) {
            setCustomErrorsByProvider(errs);
            setApiKeyStatus({
                slotId: 'all',
                type: 'error',
                message: t('settings.apiKey.customs.validationError'),
                rawMessage: null,
            });
            return;
        }
        setCustomErrorsByProvider({});

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

    const handleTestKey = async (slotId: string, rawKey: string, provider: ApiProvider) => {
        setTestingSlot(slotId);
        setApiKeyStatus(null);
        setShowApiKeyDetails(false);
        try {
            const result = await window.imaginai.testApiKey(provider, rawKey);
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
        if (dir) setMoveDialog({ open: true, newDir: dir });
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

    const renderStatusForAll = () => {
        if (!apiKeyStatus || apiKeyStatus.slotId !== 'all') return null;
        return (
            <Alert
                severity={apiKeyStatus.type}
                sx={{ mt: 1 }}
                variant='outlined'
                onClose={() => setApiKeyStatus(null)}
            >
                {apiKeyStatus.message}
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

                    {/* API Keys (per-provider, symmetric) */}
                    <Box>
                        <Typography variant='subtitle2' gutterBottom sx={{ fontWeight: 600 }}>
                            {t('settings.apiKey.label')}
                        </Typography>
                        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                            {t('settings.apiKey.hintPrefix')}
                            <Link href='https://aistudio.google.com/apikey' target='_blank' rel='noopener noreferrer'>
                                {t('settings.apiKey.hintGeminiLink')}
                            </Link>
                            {t('settings.apiKey.hintMiddle')}
                            <Link
                                href='https://platform.openai.com/api-keys'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                {t('settings.apiKey.hintOpenaiLink')}
                            </Link>
                            {t('settings.apiKey.hintSuffix')}
                            <br />
                            {t('settings.apiKey.hintTierRequirement')}
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <ProviderApiKeySection
                                provider='gemini'
                                set={keysData.providers.gemini}
                                onChange={next =>
                                    setKeysData(prev => ({
                                        ...prev,
                                        providers: { ...prev.providers, gemini: next },
                                    }))
                                }
                                onActiveIdResetTo={id => setKeysData(prev => ({ ...prev, activeId: id }))}
                                visibility={keyVisibility}
                                onToggleVisibility={toggleVisibility}
                                customErrors={customErrorsByProvider.gemini ?? {}}
                                setCustomErrors={setCustomErrorsByProvider}
                                testingSlot={testingSlot}
                                onTestKey={handleTestKey}
                                apiKeyStatus={apiKeyStatus}
                                onClearStatus={() => {
                                    setApiKeyStatus(null);
                                    setShowApiKeyDetails(false);
                                }}
                                showApiKeyDetails={showApiKeyDetails}
                                onToggleDetails={() => setShowApiKeyDetails(prev => !prev)}
                                activeId={keysData.activeId}
                            />
                            <ProviderApiKeySection
                                provider='openai'
                                set={keysData.providers.openai}
                                onChange={next =>
                                    setKeysData(prev => ({
                                        ...prev,
                                        providers: { ...prev.providers, openai: next },
                                    }))
                                }
                                onActiveIdResetTo={id => setKeysData(prev => ({ ...prev, activeId: id }))}
                                visibility={keyVisibility}
                                onToggleVisibility={toggleVisibility}
                                customErrors={customErrorsByProvider.openai ?? {}}
                                setCustomErrors={setCustomErrorsByProvider}
                                testingSlot={testingSlot}
                                onTestKey={handleTestKey}
                                apiKeyStatus={apiKeyStatus}
                                onClearStatus={() => {
                                    setApiKeyStatus(null);
                                    setShowApiKeyDetails(false);
                                }}
                                showApiKeyDetails={showApiKeyDetails}
                                onToggleDetails={() => setShowApiKeyDetails(prev => !prev)}
                                activeId={keysData.activeId}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                            <Button variant='contained' size='small' onClick={handleSaveAll}>
                                {t('settings.apiKey.saveAll')}
                            </Button>
                        </Box>
                        {renderStatusForAll()}
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
