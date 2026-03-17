import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Slider,
    Typography,
    Tooltip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generation-store';
import {
    MODEL_DEFINITIONS,
    ASPECT_RATIO_OPTIONS,
    QUALITY_OPTIONS,
    GENERATION_COUNT_MIN,
} from '../../shared/constants';
import type { AspectRatio, Quality } from '../../shared/types';
import InfoIcon from '@mui/icons-material/Info';

export default function ParameterPanel() {
    const { t } = useTranslation();
    const {
        model,
        aspectRatio,
        quality,
        numberOfImages,
        setModel,
        setAspectRatio,
        setQuality,
        setNumberOfImages,
    } = useGenerationStore();

    const currentModel = MODEL_DEFINITIONS.find(m => m.id === model);
    const maxImages = currentModel?.maxImages ?? 4;
    const showNumberOfImages = maxImages > 1;

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

            {/* Aspect Ratio */}
            <FormControl size='small' fullWidth>
                <InputLabel>{t('aspectRatio.label')}</InputLabel>
                <Select
                    value={aspectRatio}
                    label={t('aspectRatio.label')}
                    onChange={e => setAspectRatio(e.target.value as AspectRatio)}
                >
                    {ASPECT_RATIO_OPTIONS.map(opt => {
                        const supported = currentModel?.supportedAspectRatios.includes(opt.value) ?? true;
                        return (
                            <MenuItem key={opt.value} value={opt.value} disabled={!supported}>
                                {t(opt.labelKey)}
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>

            {/* Quality */}
            <FormControl size='small' fullWidth>
                <InputLabel>{t('quality.label')}</InputLabel>
                <Select
                    value={quality}
                    label={t('quality.label')}
                    onChange={e => setQuality(e.target.value as Quality)}
                >
                    {QUALITY_OPTIONS.map(opt => {
                        const supported = currentModel?.supportedQualities.includes(opt.value) ?? true;
                        return (
                            <MenuItem key={opt.value} value={opt.value} disabled={!supported}>
                                {t(opt.labelKey)}
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>

            {/* Number of Images - hidden when model supports only 1 */}
            {showNumberOfImages && (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Typography variant='body2' color='text.secondary'>
                            {t('numberOfImages.label')}: {numberOfImages}
                        </Typography>
                        <Tooltip title={t('numberOfImages.warning')} arrow>
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
        </Box>
    );
}
