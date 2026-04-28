import React from 'react';
import { Snackbar, Box, Button, Typography, LinearProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { UpdateState } from '../../shared/types';

const initialState: UpdateState = { status: 'idle' };

export default function UpdateNotifier() {
    const { t } = useTranslation();
    const [state, setState] = React.useState<UpdateState>(initialState);
    const [dismissed, setDismissed] = React.useState(false);

    React.useEffect(() => {
        const unsubscribe = window.imaginai.updater.onStateChanged(next => {
            setState(next);
        });
        window.imaginai.updater
            .getState()
            .then(current => setState(prev => (prev.status === 'idle' ? current : prev)))
            .catch(() => {
                // Ignore: updater is no-op in dev builds.
            });
        return unsubscribe;
    }, []);

    const handleUpdate = React.useCallback(() => {
        window.imaginai.updater.download().catch(() => {
            // Errors are surfaced via state events, no-op here.
        });
    }, []);

    const handleLater = React.useCallback(() => {
        setDismissed(true);
    }, []);

    const showAvailable = state.status === 'available' && !dismissed;
    const showDownloading = state.status === 'downloading';
    const showDownloaded = state.status === 'downloaded';
    const open = showAvailable || showDownloading || showDownloaded;

    if (!open) return null;

    let content: React.ReactNode = null;
    if (showAvailable) {
        content = (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 320 }}>
                <Typography variant='body2'>
                    {t('updater.confirm', { version: state.version ?? '' })}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button size='small' onClick={handleLater} color='inherit'>
                        {t('updater.later')}
                    </Button>
                    <Button size='small' onClick={handleUpdate} variant='contained'>
                        {t('updater.update')}
                    </Button>
                </Box>
            </Box>
        );
    } else if (showDownloading) {
        const progress = Math.max(0, Math.min(100, state.progress ?? 0));
        content = (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 320 }}>
                <Typography variant='body2'>{t('updater.downloading', { progress })}</Typography>
                <LinearProgress variant='determinate' value={progress} />
            </Box>
        );
    } else if (showDownloaded) {
        content = (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 320 }}>
                <Typography variant='body2'>{t('updater.installing')}</Typography>
                <LinearProgress />
            </Box>
        );
    }

    return (
        <Snackbar
            open={open}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            autoHideDuration={null}
            slotProps={{
                content: {
                    sx: {
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        boxShadow: 4,
                        border: '1px solid',
                        borderColor: 'divider',
                    },
                },
            }}
            message={content}
        />
    );
}
