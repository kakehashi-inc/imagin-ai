import React from 'react';
import { Box, Button, CircularProgress, Alert, Link, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generation-store';
import { useHistoryStore } from '../stores/history-store';
import { useAppStore } from '../stores/app-store';
import { HISTORY_MAX_COUNT, MODEL_DEFINITIONS } from '../../shared/constants';
import type { ApiErrorDetail } from '../../shared/types';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VideocamIcon from '@mui/icons-material/Videocam';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

// Map structured API error to an i18n key using httpStatus and apiStatus (code/status based, no message parsing)
function errorToI18nKey(error: ApiErrorDetail): string {
    const { httpStatus, apiStatus } = error;

    // Application-level errors (httpStatus === 0): internal app errors, not from API
    if (httpStatus === 0 && apiStatus) {
        const appErrorMap: Record<string, string> = {
            API_KEY_NOT_SET: 'api.error.keyNotSet',
            NO_IMAGES_GENERATED: 'api.error.noImagesGenerated',
            NO_VIDEO_GENERATED: 'api.error.noVideoGenerated',
            NO_AUDIO_GENERATED: 'api.error.noAudioGenerated',
            NO_RESPONSE: 'api.error.noResponse',
            HISTORY_LIMIT_EXCEEDED: 'api.error.historyLimitExceeded',
        };
        return appErrorMap[apiStatus] ?? 'api.error.unknown';
    }

    // API errors: determine by apiStatus first (most specific), then fall back to httpStatus
    if (apiStatus) {
        const statusMap: Record<string, string> = {
            INVALID_ARGUMENT: 'api.error.invalidArgument',
            FAILED_PRECONDITION: 'api.error.failedPrecondition',
            OUT_OF_RANGE: 'api.error.outOfRange',
            UNAUTHENTICATED: 'api.error.unauthenticated',
            PERMISSION_DENIED: 'api.error.permissionDenied',
            NOT_FOUND: 'api.error.notFound',
            ALREADY_EXISTS: 'api.error.alreadyExists',
            RESOURCE_EXHAUSTED: 'api.error.resourceExhausted',
            CANCELLED: 'api.error.cancelled',
            INTERNAL: 'api.error.internal',
            UNKNOWN: 'api.error.internal',
            UNIMPLEMENTED: 'api.error.unimplemented',
            UNAVAILABLE: 'api.error.unavailable',
            DEADLINE_EXCEEDED: 'api.error.deadlineExceeded',
            DATA_LOSS: 'api.error.internal',
            CONFLICT: 'api.error.alreadyExists',
            ABORTED: 'api.error.internal',
            PAYLOAD_TOO_LARGE: 'api.error.payloadTooLarge',
        };
        if (statusMap[apiStatus]) {
            return statusMap[apiStatus];
        }
    }

    // Fallback to httpStatus
    const httpMap: Record<number, string> = {
        400: 'api.error.invalidArgument',
        401: 'api.error.unauthenticated',
        403: 'api.error.permissionDenied',
        404: 'api.error.notFound',
        409: 'api.error.alreadyExists',
        413: 'api.error.payloadTooLarge',
        429: 'api.error.resourceExhausted',
        499: 'api.error.cancelled',
        500: 'api.error.internal',
        501: 'api.error.unimplemented',
        503: 'api.error.unavailable',
        504: 'api.error.deadlineExceeded',
    };
    return httpMap[httpStatus] ?? 'api.error.unknown';
}

// Check if error is a network-level failure (no HTTP response received)
function isNetworkError(error: ApiErrorDetail): boolean {
    if (error.httpStatus !== 0 || error.apiStatus) return false;
    const msg = error.apiMessage?.toLowerCase() ?? '';
    return ['fetch failed', 'econnrefused', 'enotfound', 'etimedout', 'econnreset', 'network'].some(p =>
        msg.includes(p)
    );
}

// Build the detail text for the expandable details section
function buildDetailText(error: ApiErrorDetail): string {
    const parts: string[] = [];
    if (error.httpStatus > 0) parts.push(`HTTP ${error.httpStatus}`);
    if (error.apiStatus) parts.push(`Status: ${error.apiStatus}`);
    if (error.apiMessage) parts.push(error.apiMessage);
    return parts.join('\n');
}

export default function GenerateButton() {
    const { t } = useTranslation();
    const { prompt, model, isGenerating, generationProgress, error, generate, clearError } = useGenerationStore();
    const activeKeyInfo = useAppStore(s => s.activeKeyInfo);
    const currentModel = MODEL_DEFINITIONS.find(m => m.id === model);
    const isVideoModel = currentModel?.mediaType === 'video';
    const isAudioModel = currentModel?.mediaType === 'audio';
    const freeTierBlocked = !!activeKeyInfo?.isFreeTier && currentModel?.freeTierAvailable === false;
    const { loadHistory, isOverLimit } = useHistoryStore();
    const overLimit = isOverLimit();
    const [diskWarning, setDiskWarning] = React.useState(false);

    const { duration, resolution } = useGenerationStore();
    const [validationError, setValidationError] = React.useState<string | null>(null);
    const [showDetails, setShowDetails] = React.useState(false);

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
    const isDisabled = isGenerating || !prompt.trim() || overLimit || freeTierBlocked;
    const detailText = error ? buildDetailText(error) : '';
    const hasDetails = detailText.length > 0;

    // Build the user-facing error message
    const errorMessage = error
        ? networkError
            ? t('generation.networkError')
            : error.apiStatus === 'HISTORY_LIMIT_EXCEEDED'
              ? t('api.error.historyLimitExceeded', { limit: error.apiMessage ?? String(HISTORY_MAX_COUNT) })
              : t('generation.error', { message: t(errorToI18nKey(error)) })
        : '';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {freeTierBlocked && (
                <Alert severity='warning' variant='outlined'>
                    {t('generation.freeTierBlocked')}
                </Alert>
            )}

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
                    onClose={() => {
                        clearError();
                        setShowDetails(false);
                    }}
                    action={
                        networkError ? (
                            <Button color='error' size='small' onClick={handleGenerate}>
                                {t('generation.errorRetry')}
                            </Button>
                        ) : undefined
                    }
                >
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{errorMessage}</span>
                            {hasDetails && (
                                <Link
                                    component='button'
                                    variant='body2'
                                    color='error'
                                    underline='hover'
                                    onClick={() => setShowDetails(prev => !prev)}
                                    sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                                >
                                    {showDetails ? t('generation.errorHideDetails') : t('generation.errorDetails')}
                                </Link>
                            )}
                        </Box>
                        {showDetails && hasDetails && (
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
                                {detailText}
                            </Typography>
                        )}
                    </Box>
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
                    ) : isAudioModel ? (
                        <MusicNoteIcon />
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
                              elapsed: String(generationProgress.elapsedSeconds),
                          })
                        : isVideoModel
                          ? t('generation.generatingVideo')
                          : isAudioModel
                            ? t('generation.generatingMusic')
                            : t('generation.generating')
                    : isAudioModel
                      ? t('common.generateMusic')
                      : isVideoModel
                        ? t('common.generateVideo')
                        : t('common.generate')}
            </Button>
        </Box>
    );
}
