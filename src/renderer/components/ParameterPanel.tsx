import {
    Box,
    Chip,
    FormControl,
    InputLabel,
    ListSubheader,
    MenuItem,
    Select,
    Slider,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generation-store';
import { useAppStore } from '../stores/app-store';
import {
    COST_REFERENCE_DATE,
    GEMINI_ASPECT_RATIO_GROUP_ORDER,
    GEMINI_ASPECT_RATIO_OPTIONS,
    GEMINI_QUALITY_OPTIONS,
    GEMINI_VIDEO_DURATION_OPTIONS,
    GEMINI_VIDEO_RESOLUTION_OPTIONS,
    GENERATION_COUNT_MIN,
    MODEL_DEFINITIONS,
    OPENAI_BACKGROUND_OPTIONS,
    OPENAI_OUTPUT_FORMAT_OPTIONS,
    OPENAI_QUALITY_OPTIONS,
    OPENAI_SIZE_OPTIONS,
} from '../../shared/constants';
import type {
    GeminiAspectRatio,
    GeminiQuality,
    GeminiVideoDuration,
    GeminiVideoResolution,
    MediaType,
    OpenAIBackground,
    OpenAIImageQuality,
    OpenAIImageSize,
    OpenAIOutputFormat,
} from '../../shared/types';
import InfoIcon from '@mui/icons-material/Info';
import ImageIcon from '@mui/icons-material/Image';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import VideocamIcon from '@mui/icons-material/Videocam';

// Map mediaType to a small leading icon shown in the model selector items.
function MediaTypeIcon({ mediaType }: { mediaType: MediaType | undefined }) {
    const sx = { fontSize: 18, color: 'text.secondary', flexShrink: 0 };
    switch (mediaType) {
        case 'video':
            return <VideocamIcon sx={sx} />;
        case 'music':
            return <MusicNoteIcon sx={sx} />;
        case 'voice':
            return <RecordVoiceOverIcon sx={sx} />;
        case 'image':
        default:
            return <ImageIcon sx={sx} />;
    }
}

// Identify which costLabel section header (e.g. `< 1024x1024 >`) matches the
// current size for an OpenAI model so the panel can highlight that row plus
// the price row that immediately follows it.
function matchOpenAICostRowIndex(rows: string[] | undefined, size: OpenAIImageSize): number {
    if (!rows) return -1;
    for (let i = 0; i < rows.length; i++) {
        // Section headers are wrapped in `< ... >`; the same size may appear
        // unquoted inside grouped headers such as `< 1024x1536, 1536x1024 >`.
        if (rows[i].startsWith('<') && rows[i].includes(size)) return i;
    }
    return -1;
}

export default function ParameterPanel() {
    const { t } = useTranslation();
    const {
        provider,
        model,
        numberOfImages,
        gemini,
        openai,
        editMode,
        setProvider,
        setModel,
        setNumberOfImages,
        setGeminiAspectRatio,
        setGeminiQuality,
        setGeminiDuration,
        setGeminiResolution,
        setGeminiVoice,
        setOpenAISize,
        setOpenAIQuality,
        setOpenAIOutputFormat,
        setOpenAIBackground,
    } = useGenerationStore();
    const activeKeyInfo = useAppStore(s => s.activeKeyInfo);
    const isFreeTierKey = Boolean(activeKeyInfo?.isFreeTier);

    // Sync provider with the active API key. Switching the API key in the
    // title bar should immediately filter the model list to that provider.
    useEffect(() => {
        if (activeKeyInfo && activeKeyInfo.provider !== provider) {
            setProvider(activeKeyInfo.provider);
        }
    }, [activeKeyInfo, provider, setProvider]);

    const currentModel = MODEL_DEFINITIONS.find(m => m.id === model);
    const isGemini = currentModel?.provider === 'gemini';
    const isOpenAI = currentModel?.provider === 'openai';
    const isVideoModel = currentModel?.mediaType === 'video';
    const isVoiceModel = currentModel?.mediaType === 'voice';

    // Model list is filtered by provider (complete switch per user requirement).
    const filteredModels = useMemo(
        () => MODEL_DEFINITIONS.filter(m => m.provider === provider),
        [provider]
    );

    const maxImages = currentModel?.maxImages ?? 1;

    // Capability-driven gating using the provider-specific sub-object.
    const showAspectRatio = isGemini && (currentModel?.gemini?.supportedAspectRatios?.length ?? 0) > 0;
    const showGeminiQuality = isGemini && (currentModel?.gemini?.supportedQualities?.length ?? 0) > 0;
    const showDuration =
        isGemini && isVideoModel && (currentModel?.gemini?.supportedDurations?.length ?? 0) > 0;
    const showResolution =
        isGemini && isVideoModel && (currentModel?.gemini?.supportedResolutions?.length ?? 0) > 0;
    const showNumberOfImages = maxImages > 1;

    // OpenAI capability flag. supportsBackground === false hides the
    // background selector entirely (e.g. gpt-image-2).
    const showOpenAIBackground = isOpenAI && currentModel?.openai?.supportsBackground === true;

    const groupedAspectRatioItems = useMemo(() => {
        const supported = GEMINI_ASPECT_RATIO_OPTIONS.filter(
            opt => currentModel?.gemini?.supportedAspectRatios?.includes(opt.value) ?? true
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = [];
        for (const group of GEMINI_ASPECT_RATIO_GROUP_ORDER) {
            const groupItems = supported.filter(opt => opt.group === group);
            if (groupItems.length === 0) continue;
            items.push(
                <ListSubheader key={`group-${group}`}>{t(`gemini.aspectRatio.group.${group}`)}</ListSubheader>
            );
            for (const opt of groupItems) {
                items.push(
                    <MenuItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                    </MenuItem>
                );
            }
        }
        return items;
    }, [currentModel, t]);

    // OpenAI sizes are filtered per model (gpt-image-2 alone supports 2K/4K).
    // In edit mode, additionally narrow to `supportedEditSizes` when the model
    // declares one — anything outside that list is shown disabled so the user
    // can see *why* it's unavailable rather than having options silently vanish.
    const supportedOpenAISizes = currentModel?.openai?.supportedSizes ?? [];
    const editAllowedSizes = currentModel?.openai?.supportedEditSizes ?? supportedOpenAISizes;
    const visibleSizeOptions = OPENAI_SIZE_OPTIONS.filter(o => supportedOpenAISizes.includes(o.value));
    const isSizeAllowed = (value: OpenAIImageSize): boolean =>
        editMode ? editAllowedSizes.includes(value) : true;

    // When the user enables edit mode while a now-disallowed size is selected,
    // snap to the first allowed one so the request body never carries a value
    // the disabled MenuItem would suggest is rejected.
    useEffect(() => {
        if (!isOpenAI || !editMode) return;
        if (editAllowedSizes.length === 0) return;
        if (!editAllowedSizes.includes(openai.size)) {
            setOpenAISize(editAllowedSizes[0]);
        }
    }, [isOpenAI, editMode, editAllowedSizes, openai.size, setOpenAISize]);

    // When background=transparent, JPEG can't carry alpha, so drop it from the
    // format options. The store's setter also snaps to PNG defensively.
    const visibleFormatOptions = OPENAI_OUTPUT_FORMAT_OPTIONS.filter(
        f => !(openai.background === 'transparent' && f === 'jpeg')
    );

    const highlightedCostRowIndex = isOpenAI
        ? matchOpenAICostRowIndex(currentModel?.costLabel, openai.size)
        : -1;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Model */}
            <FormControl size='small' fullWidth>
                <InputLabel>{t('model.label')}</InputLabel>
                <Select
                    value={filteredModels.some(m => m.id === model) ? model : ''}
                    label={t('model.label')}
                    onChange={e => setModel(e.target.value)}
                    renderValue={value => {
                        const m = MODEL_DEFINITIONS.find(x => x.id === value);
                        const unavailable = isFreeTierKey && m?.freeTierAvailable === false;
                        return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <MediaTypeIcon mediaType={m?.mediaType} />
                                <Typography component='span' sx={{ fontSize: 'inherit' }}>
                                    {m?.displayName ?? value}
                                </Typography>
                                {unavailable && (
                                    <Chip
                                        size='small'
                                        color='warning'
                                        variant='outlined'
                                        label={t('model.freeTierUnavailable')}
                                        sx={{ height: 18, fontSize: '0.65rem' }}
                                    />
                                )}
                            </Box>
                        );
                    }}
                >
                    {filteredModels.map(m => {
                        const unavailable = isFreeTierKey && m.freeTierAvailable === false;
                        return (
                            <MenuItem key={m.id} value={m.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                    <MediaTypeIcon mediaType={m.mediaType} />
                                    <Typography component='span' sx={{ flexGrow: 1 }}>
                                        {m.displayName}
                                    </Typography>
                                    {unavailable && (
                                        <Chip
                                            size='small'
                                            color='warning'
                                            variant='outlined'
                                            label={t('model.freeTierUnavailable')}
                                            sx={{ height: 18, fontSize: '0.65rem' }}
                                        />
                                    )}
                                </Box>
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>
            {currentModel && (
                <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mt: -1, ml: 0.5, fontFamily: 'monospace', lineHeight: 1.4 }}
                >
                    {currentModel.id}
                </Typography>
            )}
            {isFreeTierKey && currentModel?.freeTierAvailable === true && currentModel.freeTierNoteKey ? (
                <Box sx={{ mt: -2, ml: 0.5 }}>
                    <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block', lineHeight: 1.4, whiteSpace: 'pre-line' }}
                    >
                        {t(currentModel.freeTierNoteKey)}
                    </Typography>
                </Box>
            ) : (
                currentModel?.costLabel &&
                currentModel.costLabel.length > 0 && (
                    <Box sx={{ mt: -2, ml: 0.5 }}>
                        {currentModel.costLabel.map((line, i) => {
                            // OpenAI cost entries are emitted as label/price pairs
                            // (two adjacent array rows), so a match at row `n`
                            // should also highlight `n + 1` as the price line.
                            const highlighted =
                                isOpenAI && highlightedCostRowIndex >= 0
                                    ? i === highlightedCostRowIndex || i === highlightedCostRowIndex + 1
                                    : i === highlightedCostRowIndex;
                            return (
                                <Typography
                                    key={i}
                                    variant='caption'
                                    color={highlighted ? 'primary.main' : 'text.secondary'}
                                    sx={{
                                        display: 'block',
                                        lineHeight: 1.4,
                                        fontWeight: highlighted ? 600 : 400,
                                        // Cost tables are aligned; render in mono so columns line up.
                                        fontFamily: isOpenAI ? 'monospace' : 'inherit',
                                    }}
                                >
                                    {line}
                                </Typography>
                            );
                        })}
                        <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ display: 'block', lineHeight: 1.4 }}
                        >
                            ({COST_REFERENCE_DATE})
                        </Typography>
                    </Box>
                )
            )}
            {currentModel?.noteKey && (
                <Typography variant='caption' color='text.secondary' sx={{ mt: -1, ml: 0.5, whiteSpace: 'pre-line' }}>
                    {t(currentModel.noteKey)}
                </Typography>
            )}

            {/* ----------------------------------------------------------- */}
            {/* Gemini-specific controls                                    */}
            {/* ----------------------------------------------------------- */}

            {showAspectRatio && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('gemini.aspectRatio.label')}</InputLabel>
                    <Select
                        value={gemini.aspectRatio}
                        label={t('gemini.aspectRatio.label')}
                        onChange={e => setGeminiAspectRatio(e.target.value as GeminiAspectRatio)}
                    >
                        {groupedAspectRatioItems}
                    </Select>
                </FormControl>
            )}

            {showGeminiQuality && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('gemini.quality.label')}</InputLabel>
                    <Select
                        value={gemini.quality}
                        label={t('gemini.quality.label')}
                        onChange={e => setGeminiQuality(e.target.value as GeminiQuality)}
                    >
                        {GEMINI_QUALITY_OPTIONS.map(opt => {
                            const supported = currentModel?.gemini?.supportedQualities?.includes(opt.value) ?? true;
                            return (
                                <MenuItem key={opt.value} value={opt.value} disabled={!supported}>
                                    {t(opt.labelKey)}
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>
            )}

            {showDuration && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('gemini.duration.label')}</InputLabel>
                    <Select
                        value={gemini.duration}
                        label={t('gemini.duration.label')}
                        onChange={e => setGeminiDuration(Number(e.target.value) as GeminiVideoDuration)}
                    >
                        {GEMINI_VIDEO_DURATION_OPTIONS.map(opt => {
                            const supported = currentModel?.gemini?.supportedDurations?.includes(opt.value) ?? true;
                            return (
                                <MenuItem key={opt.value} value={opt.value} disabled={!supported}>
                                    {t(opt.labelKey)}
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>
            )}

            {showResolution && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('gemini.resolution.label')}</InputLabel>
                    <Select
                        value={gemini.resolution}
                        label={t('gemini.resolution.label')}
                        onChange={e => setGeminiResolution(e.target.value as GeminiVideoResolution)}
                    >
                        {GEMINI_VIDEO_RESOLUTION_OPTIONS.map(opt => {
                            const supported = currentModel?.gemini?.supportedResolutions?.includes(opt.value) ?? true;
                            return (
                                <MenuItem key={opt.value} value={opt.value} disabled={!supported}>
                                    {t(opt.labelKey)}
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>
            )}

            {/* ----------------------------------------------------------- */}
            {/* OpenAI-specific controls                                    */}
            {/* ----------------------------------------------------------- */}

            {isOpenAI && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('openai.parameter.size.label')}</InputLabel>
                    <Select
                        value={
                            visibleSizeOptions.some(o => o.value === openai.size) && isSizeAllowed(openai.size)
                                ? openai.size
                                : ''
                        }
                        label={t('openai.parameter.size.label')}
                        onChange={e => setOpenAISize(e.target.value as OpenAIImageSize)}
                    >
                        {visibleSizeOptions.map(opt => (
                            <MenuItem key={opt.value} value={opt.value} disabled={!isSizeAllowed(opt.value)}>
                                {t(opt.labelKey)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {isOpenAI && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('openai.parameter.quality.label')}</InputLabel>
                    <Select
                        value={openai.quality}
                        label={t('openai.parameter.quality.label')}
                        onChange={e => setOpenAIQuality(e.target.value as OpenAIImageQuality)}
                    >
                        {OPENAI_QUALITY_OPTIONS.map(v => (
                            <MenuItem key={v} value={v}>
                                {t(`openai.quality.${v}`)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {isOpenAI && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('openai.parameter.outputFormat.label')}</InputLabel>
                    <Select
                        value={visibleFormatOptions.includes(openai.outputFormat) ? openai.outputFormat : 'png'}
                        label={t('openai.parameter.outputFormat.label')}
                        onChange={e => setOpenAIOutputFormat(e.target.value as OpenAIOutputFormat)}
                    >
                        {visibleFormatOptions.map(v => (
                            <MenuItem key={v} value={v}>
                                {v.toUpperCase()}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {showOpenAIBackground && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('openai.parameter.background.label')}</InputLabel>
                    <Select
                        value={openai.background}
                        label={t('openai.parameter.background.label')}
                        onChange={e => setOpenAIBackground(e.target.value as OpenAIBackground)}
                    >
                        {OPENAI_BACKGROUND_OPTIONS.map(v => (
                            <MenuItem key={v} value={v}>
                                {t(`openai.background.${v}`)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {/* ----------------------------------------------------------- */}
            {/* Shared controls                                              */}
            {/* ----------------------------------------------------------- */}

            {showNumberOfImages && (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Typography variant='body2' color='text.secondary'>
                            {t(isVideoModel ? 'numberOfVideos.label' : 'numberOfImages.label')}: {numberOfImages}
                        </Typography>
                        <Tooltip
                            title={t(isVideoModel ? 'numberOfVideos.warning' : 'numberOfImages.warning')}
                            arrow
                        >
                            <InfoIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </Tooltip>
                    </Box>
                    <Slider
                        value={Math.min(numberOfImages, maxImages)}
                        min={GENERATION_COUNT_MIN}
                        max={maxImages}
                        step={1}
                        marks
                        onChange={(_e, val) => setNumberOfImages(val as number)}
                        valueLabelDisplay='auto'
                        size='small'
                    />
                </Box>
            )}

            {isVoiceModel && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('gemini.tts.voice.label')}</InputLabel>
                    <Select
                        value={gemini.voice}
                        label={t('gemini.tts.voice.label')}
                        onChange={e => setGeminiVoice(e.target.value)}
                    >
                        {(
                            t('gemini.tts.voice.presets', { returnObjects: true }) as {
                                name: string;
                                gender: string;
                                characteristic: string;
                            }[]
                        ).map(v => (
                            <MenuItem key={v.name} value={v.name}>
                                {`${v.name} (${v.gender}) : ${v.characteristic}`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}
        </Box>
    );
}
