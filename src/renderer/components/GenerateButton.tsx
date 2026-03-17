import React from 'react';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generation-store';
import { useHistoryStore } from '../stores/history-store';
import { HISTORY_MAX_COUNT } from '../../shared/constants';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

function isNetworkError(error: string): boolean {
    const patterns = [
        'fetch failed',
        'network',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'ECONNRESET',
        'ERR_INTERNET_DISCONNECTED',
    ];
    const lower = error.toLowerCase();
    return patterns.some(p => lower.includes(p.toLowerCase()));
}

export default function GenerateButton() {
    const { t } = useTranslation();
    const { prompt, isGenerating, error, generate, clearError } = useGenerationStore();
    const { loadHistory, isOverLimit } = useHistoryStore();
    const overLimit = isOverLimit();
    const [diskWarning, setDiskWarning] = React.useState(false);

    const handleGenerate = async () => {
        clearError();
        setDiskWarning(false);

        // Check disk space before generation
        try {
            const space = await window.imaginai.checkDiskSpace();
            if (space.low) {
                setDiskWarning(true);
            }
        } catch {
            // Ignore disk check failure
        }

        try {
            await generate();
            await loadHistory();
        } catch {
            // Error is handled by the store
        }
    };

    const networkError = error ? isNetworkError(error) : false;
    const isDisabled = isGenerating || !prompt.trim() || overLimit;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {overLimit && (
                <Alert severity='warning' variant='outlined'>
                    {t('generation.historyLimitExceeded', { limit: HISTORY_MAX_COUNT })}
                </Alert>
            )}

            {diskWarning && (
                <Alert severity='warning' variant='outlined' onClose={() => setDiskWarning(false)}>
                    {t('generation.diskSpaceWarning')}
                </Alert>
            )}

            {error && (
                <Alert
                    severity='error'
                    variant='outlined'
                    onClose={clearError}
                    action={
                        networkError ? (
                            <Button color='error' size='small' onClick={handleGenerate}>
                                {t('generation.errorRetry')}
                            </Button>
                        ) : undefined
                    }
                >
                    {networkError ? t('generation.networkError') : t('generation.error', { message: error })}
                </Alert>
            )}

            <Button
                variant='contained'
                size='large'
                fullWidth
                disabled={isDisabled}
                onClick={handleGenerate}
                startIcon={isGenerating ? <CircularProgress size={20} color='inherit' /> : <AutoAwesomeIcon />}
                sx={{ py: 1.5, fontWeight: 600 }}
            >
                {isGenerating ? t('generation.generating') : t('common.generate')}
            </Button>
        </Box>
    );
}
