import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ListSubheader,
    Slider,
    TextField,
    Typography,
    Tooltip,
} from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generation-store';
import {
    MODEL_DEFINITIONS,
    ASPECT_RATIO_OPTIONS,
    ASPECT_RATIO_GROUP_ORDER,
    QUALITY_OPTIONS,
    DURATION_OPTIONS,
    RESOLUTION_OPTIONS,
    GENERATION_COUNT_MIN,
    COST_REFERENCE_DATE,
} from '../../shared/constants';
import type { AspectRatio, Quality, VideoDuration, VideoResolution } from '../../shared/types';
import InfoIcon from '@mui/icons-material/Info';

export default function ParameterPanel() {
    const { t } = useTranslation();
    const {
        model,
        aspectRatio,
        quality,
        numberOfImages,
        duration,
        resolution,
        seed,
        setModel,
        setAspectRatio,
        setQuality,
        setNumberOfImages,
        setDuration,
        setResolution,
        setSeed,
    } = useGenerationStore();

    const currentModel = MODEL_DEFINITIONS.find(m => m.id === model);
    const isVideoModel = currentModel?.mediaType === 'video';
    const isAudioModel = currentModel?.mediaType === 'audio';
    const maxImages = currentModel?.maxImages ?? 1;
    const showAspectRatio = !isAudioModel && (currentModel?.supportedAspectRatios?.length ?? 0) > 0;
    const showNumberOfImages = !isAudioModel && maxImages > 1;
    const showQuality =
        !isVideoModel && !isAudioModel && (!currentModel || (currentModel.supportedQualities?.length ?? 0) > 0);
    const showDuration = isVideoModel && (currentModel?.supportedDurations?.length ?? 0) > 0;
    const showResolution = isVideoModel && (currentModel?.supportedResolutions?.length ?? 0) > 0;
    const showSeed = isVideoModel && currentModel?.supportsSeed;

    const groupedAspectRatioItems = useMemo(() => {
        const supported = ASPECT_RATIO_OPTIONS.filter(
            opt => currentModel?.supportedAspectRatios.includes(opt.value) ?? true
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = [];
        for (const group of ASPECT_RATIO_GROUP_ORDER) {
            const groupItems = supported.filter(opt => opt.group === group);
            if (groupItems.length === 0) continue;
            items.push(
                <ListSubheader key={`group-${group}`}>{t(`aspectRatio.group.${group}`)}</ListSubheader>
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Model */}
            <FormControl size='small' fullWidth>
                <InputLabel>{t('model.label')}</InputLabel>
                <Select value={model} label={t('model.label')} onChange={e => setModel(e.target.value)}>
                    {MODEL_DEFINITIONS.map(m => (
                        <MenuItem key={m.id} value={m.id}>
                            {m.displayName}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            {currentModel?.costLabel && (
                <Typography variant='caption' color='text.secondary' sx={{ mt: -1, ml: 0.5 }}>
                    {currentModel.costLabel} ({COST_REFERENCE_DATE})
                </Typography>
            )}
            {currentModel?.noteKey && (
                <Typography variant='caption' color='text.secondary' sx={{ mt: -1, ml: 0.5, whiteSpace: 'pre-line' }}>
                    {t(currentModel.noteKey)}
                </Typography>
            )}

            {/* Aspect Ratio - hidden for audio models */}
            {showAspectRatio && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('aspectRatio.label')}</InputLabel>
                    <Select
                        value={aspectRatio}
                        label={t('aspectRatio.label')}
                        onChange={e => setAspectRatio(e.target.value as AspectRatio)}
                    >
                        {groupedAspectRatioItems}
                    </Select>
                </FormControl>
            )}

            {/* Quality - hidden when model has no resolution options */}
            {showQuality && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('quality.label')}</InputLabel>
                    <Select
                        value={quality}
                        label={t('quality.label')}
                        onChange={e => setQuality(e.target.value as Quality)}
                    >
                        {QUALITY_OPTIONS.map(opt => {
                            const supported = currentModel?.supportedQualities?.includes(opt.value) ?? true;
                            return (
                                <MenuItem key={opt.value} value={opt.value} disabled={!supported}>
                                    {t(opt.labelKey)}
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>
            )}

            {/* Duration - shown only for video models */}
            {showDuration && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('duration.label')}</InputLabel>
                    <Select
                        value={duration}
                        label={t('duration.label')}
                        onChange={e => setDuration(Number(e.target.value) as VideoDuration)}
                    >
                        {DURATION_OPTIONS.map(opt => {
                            const supported = currentModel?.supportedDurations?.includes(opt.value) ?? true;
                            return (
                                <MenuItem key={opt.value} value={opt.value} disabled={!supported}>
                                    {t(opt.labelKey)}
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>
            )}

            {/* Resolution - shown only for video models */}
            {showResolution && (
                <FormControl size='small' fullWidth>
                    <InputLabel>{t('resolution.label')}</InputLabel>
                    <Select
                        value={resolution}
                        label={t('resolution.label')}
                        onChange={e => setResolution(e.target.value as VideoResolution)}
                    >
                        {RESOLUTION_OPTIONS.map(opt => {
                            const supported = currentModel?.supportedResolutions?.includes(opt.value) ?? true;
                            return (
                                <MenuItem key={opt.value} value={opt.value} disabled={!supported}>
                                    {t(opt.labelKey)}
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>
            )}

            {/* Number of Images/Videos */}
            {showNumberOfImages && (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Typography variant='body2' color='text.secondary'>
                            {t(isVideoModel ? 'numberOfVideos.label' : 'numberOfImages.label')}: {numberOfImages}
                        </Typography>
                        <Tooltip title={t(isVideoModel ? 'numberOfVideos.warning' : 'numberOfImages.warning')} arrow>
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

            {/* Seed - shown only for video models */}
            {showSeed && (
                <TextField
                    size='small'
                    fullWidth
                    label={t('seed.label')}
                    placeholder={t('seed.placeholder')}
                    value={seed}
                    onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setSeed(val);
                    }}
                    inputProps={{ inputMode: 'numeric' }}
                />
            )}
        </Box>
    );
}
