import React from 'react';
import { Alert, Box, Typography, TextField, Button, IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generation-store';
import { MODEL_DEFINITIONS } from '../../shared/constants';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';

export default function PromptPanel() {
    const { t } = useTranslation();
    const {
        model,
        prompt,
        negativePrompt,
        referenceImagePaths,
        referenceImageThumbnails,
        setPrompt,
        setNegativePrompt,
        addReferenceImages,
        removeReferenceImage,
    } = useGenerationStore();

    const currentModel = MODEL_DEFINITIONS.find(m => m.id === model);
    const supportsImageInput = currentModel?.supportsImageInput ?? false;
    const supportsNegativePrompt = currentModel?.supportsNegativePrompt ?? false;

    const promptRef = React.useRef<HTMLTextAreaElement>(null);
    const [hasApiKey, setHasApiKey] = React.useState(true);

    React.useEffect(() => {
        promptRef.current?.focus();
        window.imaginai.getApiKey('gemini').then(key => setHasApiKey(!!key));
    }, []);

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

            {/* Prompt label */}
            <Typography variant='body2' fontWeight={500}>
                {t('prompt.label')}
            </Typography>

            {/* Reference image attachment block */}
            {supportsImageInput && referenceImagePaths.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
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
                    placeholder={t('prompt.placeholder')}
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
                    <Typography variant='body2' fontWeight={500}>
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
        </Box>
    );
}
