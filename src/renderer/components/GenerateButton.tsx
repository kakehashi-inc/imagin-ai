import { Box, Button, CircularProgress, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generation-store';
import { useHistoryStore } from '../stores/history-store';
import { HISTORY_MAX_COUNT } from '../../shared/constants';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export default function GenerateButton() {
    const { t } = useTranslation();
    const { prompt, isGenerating, error, generate, clearError } = useGenerationStore();
    const { loadHistory, isOverLimit } = useHistoryStore();
    const overLimit = isOverLimit();

    const handleGenerate = async () => {
        clearError();
        try {
            await generate();
            await loadHistory();
        } catch {
            // Error is handled by the store
        }
    };

    const isDisabled = isGenerating || !prompt.trim() || overLimit;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {overLimit && (
                <Alert severity='warning' variant='outlined'>
                    {t('generation.historyLimitExceeded', { limit: HISTORY_MAX_COUNT })}
                </Alert>
            )}

            {error && (
                <Alert severity='error' variant='outlined' onClose={clearError}>
                    {t('generation.error', { message: error })}
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
