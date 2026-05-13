import { Box, Button, Chip, IconButton, ListSubheader, MenuItem, Select, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../stores/app-store';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import NoticesDialog from './NoticesDialog';
import ProviderIcon from './ProviderIcon';
import { API_PROVIDERS, type ApiKeyOption, type ApiProvider } from '../../shared/types';
import { makeApiKeyId } from '../../shared/constants';

type Props = {
    onOpenSettings: () => void;
};

export default function TitleBar({ onOpenSettings }: Props) {
    const { t } = useTranslation();
    const info = useAppStore(s => s.info);
    const activeKeyInfo = useAppStore(s => s.activeKeyInfo);
    const setActiveApiKey = useAppStore(s => s.setActiveApiKey);
    const isMac = info?.os === 'darwin';

    const [options, setOptions] = useState<ApiKeyOption[]>([]);
    const [noticesOpen, setNoticesOpen] = useState(false);

    // Mirror main's listApiKeyOptions output: gemini slots first, then openai.
    // We rebuild here from getApiKeysData so the dropdown can update without
    // an extra IPC round-trip after writes.
    const refreshOptions = useCallback(async () => {
        const data = await window.imaginai.getApiKeysData();
        const list: ApiKeyOption[] = [];
        for (const provider of API_PROVIDERS) {
            const set = data.providers[provider];
            list.push({
                id: makeApiKeyId(provider, 'default'),
                provider,
                kind: 'default',
                title: '',
                hasKey: set.default.key.length > 0,
                isFreeTier: set.default.isFreeTier,
            });
            // The free-tier slot is structurally present for all providers, but
            // only Gemini surfaces it in the UI (see ApiKeysData docs in types.ts).
            if (provider === 'gemini') {
                list.push({
                    id: makeApiKeyId(provider, 'freeTier'),
                    provider,
                    kind: 'freeTier',
                    title: '',
                    hasKey: set.freeTier.key.length > 0,
                    isFreeTier: true,
                });
            }
            set.customs.forEach((c, i) => {
                list.push({
                    id: makeApiKeyId(provider, `custom:${i}` as const),
                    provider,
                    kind: 'custom',
                    title: c.title ?? '',
                    hasKey: c.key.length > 0,
                    isFreeTier: c.isFreeTier,
                });
            });
        }
        setOptions(list);
    }, []);

    useEffect(() => {
        refreshOptions();
    }, [refreshOptions, activeKeyInfo]);

    const handleChange = async (id: string) => {
        await setActiveApiKey(id);
        await refreshOptions();
    };

    const getOptionLabel = (opt: ApiKeyOption): string => {
        if (opt.kind === 'default') return t('titleBar.apiKey.default');
        if (opt.kind === 'freeTier') return t('titleBar.apiKey.freeTier');
        return opt.title || t('titleBar.apiKey.untitled');
    };

    // Build menu items grouped by provider. Each provider group leads with a
    // ListSubheader containing the provider's display name and brand glyph.
    const providerOrder: ApiProvider[] = ['gemini', 'openai'];
    const menuItems: React.ReactNode[] = [];
    for (const provider of providerOrder) {
        const providerOpts = options.filter(o => o.provider === provider);
        if (providerOpts.length === 0) continue;
        menuItems.push(
            <ListSubheader key={`hdr-${provider}`} sx={{ lineHeight: '32px', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <ProviderIcon provider={provider} fontSize='small' />
                <span>{t(`titleBar.apiKey.group.${provider}`)}</span>
            </ListSubheader>
        );
        providerOpts.forEach(opt => {
            menuItems.push(
                <MenuItem key={opt.id} value={opt.id} disabled={!opt.hasKey}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography variant='body2' sx={{ flexGrow: 1 }}>
                            {getOptionLabel(opt)}
                        </Typography>
                        {opt.isFreeTier && (
                            <Chip
                                size='small'
                                color='success'
                                variant='outlined'
                                label={t('titleBar.apiKey.freeTierBadge')}
                                sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                        )}
                        {!opt.hasKey && (
                            <Typography variant='caption' color='text.disabled'>
                                {t('titleBar.apiKey.noKey')}
                            </Typography>
                        )}
                    </Box>
                </MenuItem>
            );
        });
    }

    return (
        <>
            <Box
                sx={{
                    WebkitAppRegion: 'drag',
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    height: 48,
                    bgcolor: 'background.paper',
                    borderBottom: 1,
                    borderColor: 'divider',
                    userSelect: 'none',
                    flexShrink: 0,
                }}
            >
                <Box sx={{ flexGrow: 1, ml: isMac ? 10 : 0, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant='body1' sx={{ fontWeight: 500, fontSize: '0.95rem' }}>
                        {t('appTitle')}
                    </Typography>
                    {info?.version && (
                        <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                            v{info.version}
                        </Typography>
                    )}
                </Box>

                {/* Usage notes + API key switcher */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mr: 1,
                        WebkitAppRegion: 'no-drag',
                    }}
                >
                    <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setNoticesOpen(true)}
                        sx={{
                            py: 0,
                            px: 1,
                            minHeight: 30,
                            fontSize: '0.75rem',
                            lineHeight: 1.4,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {t('notices.button.label')}
                    </Button>
                    <Select
                        size='small'
                        value={activeKeyInfo?.id ?? makeApiKeyId('gemini', 'default')}
                        onChange={e => handleChange(e.target.value)}
                        sx={{
                            minWidth: 200,
                            maxWidth: 280,
                            height: 30,
                            '& .MuiSelect-select': {
                                py: 0.5,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                            },
                        }}
                        renderValue={value => {
                            const opt = options.find(o => o.id === value);
                            if (!opt) return t('titleBar.apiKey.default');
                            return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                                    <ProviderIcon provider={opt.provider} fontSize='inherit' />
                                    <Typography
                                        variant='body2'
                                        sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        {getOptionLabel(opt)}
                                    </Typography>
                                    {opt.isFreeTier && (
                                        <Chip
                                            size='small'
                                            color='success'
                                            variant='outlined'
                                            label={t('titleBar.apiKey.freeTierBadge')}
                                            sx={{ height: 18, fontSize: '0.65rem' }}
                                        />
                                    )}
                                </Box>
                            );
                        }}
                    >
                        {menuItems}
                    </Select>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
                    <IconButton
                        size='medium'
                        onClick={onOpenSettings}
                        sx={{
                            borderRadius: 0,
                            width: 48,
                            height: 48,
                            color: 'text.primary',
                            '&:hover': { bgcolor: 'action.hover' },
                        }}
                    >
                        <SettingsIcon fontSize='small' />
                    </IconButton>
                    {!isMac && (
                        <>
                            <IconButton
                                size='medium'
                                onClick={() => window.imaginai.minimize()}
                                sx={{
                                    borderRadius: 0,
                                    width: 48,
                                    height: 48,
                                    color: 'text.primary',
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <MinimizeIcon />
                            </IconButton>
                            <IconButton
                                size='medium'
                                onClick={async () => {
                                    await window.imaginai.maximizeOrRestore();
                                }}
                                sx={{
                                    borderRadius: 0,
                                    width: 48,
                                    height: 48,
                                    color: 'text.primary',
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <CropSquareIcon />
                            </IconButton>
                            <IconButton
                                size='medium'
                                onClick={() => window.imaginai.close()}
                                sx={{
                                    borderRadius: 0,
                                    width: 48,
                                    height: 48,
                                    color: 'text.primary',
                                    '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' },
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </>
                    )}
                </Box>
            </Box>
            <NoticesDialog open={noticesOpen} onClose={() => setNoticesOpen(false)} />
        </>
    );
}
