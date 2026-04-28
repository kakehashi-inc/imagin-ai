import React from 'react';
import {
    Alert,
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generation-store';
import { useAppStore } from '../stores/app-store';
import {
    MODEL_DEFINITIONS,
    TTS_STYLE_CUSTOM_ID,
} from '../../shared/constants';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import AudioTagsDialog from './AudioTagsDialog';

export default function PromptPanel() {
    const { t } = useTranslation();
    const {
        model,
        prompt,
        negativePrompt,
        referenceImagePaths,
        referenceImageThumbnails,
        styleSelection,
        styleInstruction,
        setPrompt,
        setNegativePrompt,
        addReferenceImages,
        removeReferenceImage,
        setStyleSelection,
        setStyleInstruction,
    } = useGenerationStore();

    const currentModel = MODEL_DEFINITIONS.find(m => m.id === model);
    const supportsImageInput = (currentModel?.maxReferenceImages ?? 0) > 0;
    const supportsNegativePrompt = currentModel?.supportsNegativePrompt ?? false;
    const isMusicModel = currentModel?.mediaType === 'music';
    const isVoiceModel = currentModel?.mediaType === 'voice';
    const isVideoModel = currentModel?.mediaType === 'video';
    const supportsAudioTags = currentModel?.supportsAudioTags ?? false;

    const promptRef = React.useRef<HTMLTextAreaElement>(null);
    const [hasApiKey, setHasApiKey] = React.useState(true);
    const [audioTagsOpen, setAudioTagsOpen] = React.useState(false);

    const activeKeyInfo = useAppStore(s => s.activeKeyInfo);

    React.useEffect(() => {
        promptRef.current?.focus();
    }, []);

    React.useEffect(() => {
        if (activeKeyInfo) setHasApiKey(activeKeyInfo.hasKey);
    }, [activeKeyInfo]);

    const handleSelectFiles = async () => {
        const paths = await window.imaginai.selectImages();
        if (paths.length > 0) {
            addReferenceImages(paths);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!supportsImageInput) return;
        const files = Array.from(e.dataTransfer.files);
        const imagePaths = files
            .filter(f => /\.(png|jpe?g|webp)$/i.test(f.name))
            .map(f => f.path);
        if (imagePaths.length > 0) {
            addReferenceImages(imagePaths);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* API key not set banner */}
            {!hasApiKey && (
                <Alert severity='warning' variant='outlined'>
                    {t('apiKeyBanner.message')}
                </Alert>
            )}

            {/* TTS-only: Style preset + Style instruction (above the prompt) */}
            {isVoiceModel && (
                <>
                    <FormControl size='small' fullWidth>
                        <InputLabel>{t('tts.style.label')}</InputLabel>
                        <Select
                            value={styleSelection}
                            label={t('tts.style.label')}
                            onChange={e => setStyleSelection(e.target.value)}
                        >
                            {(
                                t('tts.style.presets', { returnObjects: true }) as {
                                    name: string;
                                    effect: string;
                                    instruction: string;
                                }[]
                            ).map(p => (
                                <MenuItem key={p.instruction} value={p.instruction}>
                                    {`${p.name} : ${p.effect}`}
                                </MenuItem>
                            ))}
                            <MenuItem value={TTS_STYLE_CUSTOM_ID}>{t('tts.style.custom')}</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        size='small'
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={4}
                        label={t('tts.style.instructionLabel')}
                        value={styleInstruction}
                        onChange={e => setStyleInstruction(e.target.value)}
                    />
                </>
            )}

            {/* Prompt label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    {t(isVoiceModel ? 'prompt.labelTts' : 'prompt.label')}
                </Typography>
                {supportsAudioTags && (
                    <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setAudioTagsOpen(true)}
                        sx={{ py: 0, px: 1, minHeight: 22, fontSize: '0.75rem', lineHeight: 1.4 }}
                    >
                        {t('audioTags.button.label')}
                    </Button>
                )}
            </Box>

            {/* Reference image attachment block */}
            {supportsImageInput && referenceImagePaths.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                    }}
                >
                    {referenceImagePaths.map(imgPath => (
                        <Box
                            key={imgPath}
                            sx={{
                                position: 'relative',
                                width: 72,
                                height: 72,
                                borderRadius: 1,
                                overflow: 'hidden',
                                border: 1,
                                borderColor: 'divider',
                            }}
                        >
                            <Box
                                component='img'
                                src={referenceImageThumbnails.get(imgPath) || ''}
                                alt=''
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                            <IconButton
                                size='small'
                                onClick={() => removeReferenceImage(imgPath)}
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    bgcolor: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    p: 0.25,
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                                }}
                            >
                                <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Box>
                    ))}
                    {isVideoModel && (
                        <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
                            {t('prompt.startingFrame')}
                        </Typography>
                    )}
                </Box>
            )}

            {/* Prompt textarea */}
            <Box onDrop={handleDrop} onDragOver={handleDragOver}>
                <TextField
                    inputRef={promptRef}
                    multiline
                    minRows={3}
                    maxRows={8}
                    fullWidth
                    size='small'
                    placeholder={t(
                        isVoiceModel
                            ? 'prompt.placeholderTts'
                            : isMusicModel
                              ? 'prompt.placeholderMusic'
                              : 'prompt.placeholder'
                    )}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant='caption' color='text.secondary'>
                        {t('prompt.charCount', { count: prompt.length })}
                    </Typography>
                    {supportsImageInput && (
                        <Tooltip title=''>
                            <Button
                                size='small'
                                startIcon={<AttachFileIcon />}
                                onClick={handleSelectFiles}
                                variant='text'
                            >
                                {t('referenceImages.selectFiles')}
                            </Button>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            {/* Negative Prompt - hidden when model does not support it */}
            {supportsNegativePrompt && (
                <>
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                        {t('negativePrompt.label')}
                    </Typography>
                    <TextField
                        multiline
                        minRows={2}
                        maxRows={4}
                        fullWidth
                        size='small'
                        placeholder={t('negativePrompt.placeholder')}
                        value={negativePrompt}
                        onChange={e => setNegativePrompt(e.target.value)}
                    />
                </>
            )}

            {supportsAudioTags && (
                <AudioTagsDialog open={audioTagsOpen} onClose={() => setAudioTagsOpen(false)} />
            )}
        </Box>
    );
}
