import React from 'react';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generation-store';
import { useHistoryStore } from '../stores/history-store';
import { HISTORY_MAX_COUNT, MODEL_DEFINITIONS } from '../../shared/constants';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VideocamIcon from '@mui/icons-material/Videocam';

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

// Translate error messages from main process (i18n keys like "api.error.xxx" or "key::param=value")
function translateError(error: string, t: (key: string, params?: Record<string, string>) => string): string {
    // Check if it looks like an i18n key (dotted notation starting with known prefixes)
    if (/^(api|ipc)\./.test(error)) {
        // Parse "key::param1=value1" format
        const separatorIndex = error.indexOf('::');
        if (separatorIndex !== -1) {
            const key = error.substring(0, separatorIndex);
            const paramStr = error.substring(separatorIndex + 2);
            const params: Record<string, string> = {};
            for (const pair of paramStr.split('&')) {
                const eqIndex = pair.indexOf('=');
                if (eqIndex !== -1) {
                    params[pair.substring(0, eqIndex)] = pair.substring(eqIndex + 1);
                }
            }
            return t(key, params);
        }
        return t(error);
    }
    return error;
}

export default function GenerateButton() {
    const { t } = useTranslation();
    const { prompt, model, isGenerating, generationProgress, error, generate, clearError } = useGenerationStore();
    const currentModel = MODEL_DEFINITIONS.find(m => m.id === model);
    const isVideoModel = currentModel?.mediaType === 'video';
    const { loadHistory, isOverLimit } = useHistoryStore();
    const overLimit = isOverLimit();
    const [diskWarning, setDiskWarning] = React.useState(false);

    const { duration, resolution } = useGenerationStore();
    const [validationError, setValidationError] = React.useState<string | null>(null);

    const handleGenerate = async () => {
        clearError();
        setDiskWarning(false);
        setValidationError(null);

        // Validate video parameters: 1080p/4K requires 8 seconds
        if (isVideoModel && (resolution === '1080p' || resolution === '4k') && duration !== 8) {
            setValidationError(t('generation.videoDurationConstraint'));
            return;
        }

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

            {validationError && (
                <Alert severity='warning' variant='outlined' onClose={() => setValidationError(null)}>
                    {validationError}
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
                    {networkError
                        ? t('generation.networkError')
                        : t('generation.error', { message: translateError(error, t) })}
                </Alert>
            )}

            <Button
                variant='contained'
                size='large'
                fullWidth
                disabled={isDisabled}
                onClick={handleGenerate}
                startIcon={
                    isGenerating ? (
                        <CircularProgress size={20} color='inherit' />
                    ) : isVideoModel ? (
                        <VideocamIcon />
                    ) : (
                        <AutoAwesomeIcon />
                    )
                }
                sx={{ py: 1.5, fontWeight: 600 }}
            >
                {isGenerating
                    ? isVideoModel && generationProgress
                        ? t('generation.generatingVideoProgress', {
                              elapsed: generationProgress.split(':')[1] || '0',
                          })
                        : isVideoModel
                          ? t('generation.generatingVideo')
                          : t('generation.generating')
                    : isVideoModel
                      ? t('common.generateVideo')
                      : t('common.generate')}
            </Button>
        </Box>
    );
}
