import { Box, Typography, IconButton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/app-store';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';

type Props = {
    onOpenSettings: () => void;
};

export default function TitleBar({ onOpenSettings }: Props) {
    const { t } = useTranslation();
    const info = useAppStore(s => s.info);
    const isMac = info?.os === 'darwin';

    return (
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
    );
}
