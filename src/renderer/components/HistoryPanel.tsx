import React from 'react';
import {
    Box,
    Typography,
    TextField,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    InputAdornment,
    LinearProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useHistoryStore } from '../stores/history-store';
import { useGenerationStore } from '../stores/generation-store';
import type { HistoryEntry } from '../../shared/types';
import { MODEL_DEFINITIONS } from '../../shared/constants';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SearchIcon from '@mui/icons-material/Search';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

type ContextMenuState = {
    mouseX: number;
    mouseY: number;
    entry: HistoryEntry;
} | null;

type ConfirmDialogState = {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
};

function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

export default function HistoryPanel() {
    const { t } = useTranslation();
    const {
        thumbnails,
        searchQuery,
        setSearchQuery,
        deleteEntry,
        deleteAll,
        exportAll,
        getFilteredEntries,
        loadThumbnail,
    } = useHistoryStore();
    const { model, addReferenceImages, restoreParams } = useGenerationStore();

    const currentModel = MODEL_DEFINITIONS.find(m => m.id === model);
    const supportsImageInput = currentModel?.supportsImageInput ?? false;

    const [contextMenu, setContextMenu] = React.useState<ContextMenuState>(null);
    const [headerMenuAnchor, setHeaderMenuAnchor] = React.useState<HTMLElement | null>(null);
    const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialogState>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });
    const [exportProgress, setExportProgress] = React.useState<number | null>(null);
    const [panelHeight, setPanelHeight] = React.useState(300);
    const resizeRef = React.useRef<{ startY: number; startHeight: number } | null>(null);

    // Listen for export progress events
    React.useEffect(() => {
        const unsubscribe = window.imaginai.onExportProgress((percent: number) => {
            setExportProgress(percent);
        });
        return unsubscribe;
    }, []);

    const filteredEntries = getFilteredEntries();

    // Resize handler
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        resizeRef.current = { startY: e.clientY, startHeight: panelHeight };

        const handleMouseMove = (ev: MouseEvent) => {
            if (resizeRef.current) {
                const delta = resizeRef.current.startY - ev.clientY;
                const newHeight = Math.max(150, Math.min(800, resizeRef.current.startHeight + delta));
                setPanelHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            resizeRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Context menu handlers
    const handleContextMenu = (e: React.MouseEvent, entry: HistoryEntry) => {
        e.preventDefault();
        setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, entry });
    };

    const handleCloseContextMenu = () => setContextMenu(null);

    const handleAddToPrompt = () => {
        if (contextMenu?.entry) {
            addReferenceImages(contextMenu.entry.generatedImagePaths);
        }
        handleCloseContextMenu();
    };

    const handleSaveAs = async () => {
        if (contextMenu?.entry) {
            const mediaType = contextMenu.entry.mediaType;
            for (const filePath of contextMenu.entry.generatedImagePaths) {
                if (mediaType === 'audio') {
                    await window.imaginai.saveAudioAs(filePath);
                } else if (mediaType === 'video') {
                    await window.imaginai.saveVideoAs(filePath);
                } else {
                    await window.imaginai.saveImageAs(filePath);
                }
            }
        }
        handleCloseContextMenu();
    };

    const handleRestoreParams = () => {
        if (contextMenu?.entry) {
            const e = contextMenu.entry;
            restoreParams({
                model: e.model,
                prompt: e.prompt,
                negativePrompt: e.negativePrompt,
                aspectRatio: e.aspectRatio,
                quality: e.quality,
                numberOfImages: e.numberOfImages,
                duration: e.videoDuration,
                resolution: e.videoResolution,
                seed: e.seed,
            });
        }
        handleCloseContextMenu();
    };

    const handleDeleteEntry = () => {
        if (contextMenu?.entry) {
            const entryId = contextMenu.entry.id;
            setConfirmDialog({
                open: true,
                title: t('common.confirm'),
                message: t('history.deleteConfirm'),
                onConfirm: () => {
                    deleteEntry(entryId);
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                },
            });
        }
        handleCloseContextMenu();
    };

    // Header menu handlers
    const handleDeleteAll = () => {
        setHeaderMenuAnchor(null);
        setConfirmDialog({
            open: true,
            title: t('common.confirm'),
            message: t('history.deleteAllConfirm'),
            onConfirm: async () => {
                await deleteAll();
                setConfirmDialog(prev => ({ ...prev, open: false }));
            },
        });
    };

    const handleExportAll = () => {
        setHeaderMenuAnchor(null);
        setExportProgress(0);
        exportAll().finally(() => setExportProgress(null));
    };

    // Click to open viewer - open all generated images/videos/audio as separate modeless windows
    const handleEntryClick = (entry: HistoryEntry) => {
        const mediaType = entry.mediaType;
        const baseTitle =
            entry.prompt.substring(0, 60) ||
            (mediaType === 'audio' ? 'Generated Music' : mediaType === 'video' ? 'Generated Video' : 'Generated Image');
        for (let i = 0; i < entry.generatedImagePaths.length; i++) {
            const title =
                entry.generatedImagePaths.length > 1
                    ? `${baseTitle} (${i + 1}/${entry.generatedImagePaths.length})`
                    : baseTitle;
            if (mediaType === 'audio') {
                window.imaginai.openAudioPlayer(entry.generatedImagePaths[i], title, entry.audioTexts);
            } else if (mediaType === 'video') {
                window.imaginai.openVideoViewer(entry.generatedImagePaths[i], title);
            } else {
                window.imaginai.openImageViewer(entry.generatedImagePaths[i], title);
            }
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {/* Resize handle */}
            <Box
                onMouseDown={handleResizeStart}
                sx={{
                    height: 6,
                    cursor: 'ns-resize',
                    bgcolor: 'divider',
                    '&:hover': { bgcolor: 'primary.main', opacity: 0.5 },
                    flexShrink: 0,
                }}
            />

            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    flexShrink: 0,
                }}
            >
                <Typography variant='subtitle2' fontWeight={600} sx={{ flexShrink: 0 }}>
                    {t('history.title')}
                </Typography>
                <IconButton size='small' onClick={e => setHeaderMenuAnchor(e.currentTarget)}>
                    <MoreHorizIcon fontSize='small' />
                </IconButton>
                <TextField
                    size='small'
                    placeholder={t('history.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <SearchIcon fontSize='small' />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ ml: 'auto', maxWidth: 280 }}
                />
            </Box>

            {/* Thumbnail grid */}
            <Box
                sx={{
                    height: panelHeight,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    px: 2,
                    pb: 2,
                }}
            >
                {filteredEntries.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant='body2' color='text.secondary'>
                            {t('history.empty')}
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        {filteredEntries.map(entry => {
                            const thumbPath = entry.generatedImagePaths[0];
                            const thumbUrl = thumbPath ? thumbnails.get(thumbPath) : undefined;

                            // Lazy load thumbnail
                            if (thumbPath && !thumbnails.has(thumbPath)) {
                                loadThumbnail(thumbPath);
                            }

                            return (
                                <Box
                                    key={entry.id}
                                    onClick={() => handleEntryClick(entry)}
                                    onContextMenu={e => handleContextMenu(e, entry)}
                                    sx={{
                                        width: 160,
                                        cursor: 'pointer',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        border: 1,
                                        borderColor: 'divider',
                                        transition: 'box-shadow 0.2s',
                                        '&:hover': {
                                            boxShadow: 4,
                                            borderColor: 'primary.main',
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: 120,
                                            bgcolor: 'action.hover',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative',
                                        }}
                                    >
                                        {entry.mediaType === 'audio' ? (
                                            <MusicNoteIcon
                                                sx={{ fontSize: 48, color: 'text.disabled' }}
                                            />
                                        ) : thumbUrl ? (
                                            <Box
                                                component='img'
                                                src={thumbUrl}
                                                alt=''
                                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <Typography variant='caption' color='text.disabled'>
                                                ...
                                            </Typography>
                                        )}
                                        {entry.mediaType === 'video' && (
                                            <PlayCircleOutlineIcon
                                                sx={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    fontSize: 40,
                                                    color: 'rgba(255,255,255,0.85)',
                                                    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <Box sx={{ p: 0.75 }}>
                                        <Typography
                                            variant='caption'
                                            sx={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                lineHeight: 1.3,
                                                fontSize: '0.7rem',
                                            }}
                                        >
                                            {entry.prompt}
                                        </Typography>
                                        <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.6rem', lineHeight: 1.3 }}>
                                                    {entry.modelDisplayName.replace(/\s*\(.*\)$/, '')}
                                                </Typography>
                                                {entry.mediaType === 'audio' ? (
                                                    <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.6rem', lineHeight: 1.3 }}>
                                                        MP3
                                                    </Typography>
                                                ) : entry.mediaType === 'video' && entry.videoDuration ? (
                                                    <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.6rem', lineHeight: 1.3 }}>
                                                        {entry.videoDuration}s {entry.videoResolution ?? ''}
                                                    </Typography>
                                                ) : entry.imageWidth && entry.imageHeight ? (
                                                    <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.6rem', lineHeight: 1.3 }}>
                                                        {entry.imageWidth} x {entry.imageHeight}
                                                    </Typography>
                                                ) : null}
                                                {entry.fileSize != null ? (
                                                    <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.6rem', lineHeight: 1.3 }}>
                                                        {formatFileSize(entry.fileSize)}
                                                    </Typography>
                                                ) : null}
                                            </Box>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.6rem', lineHeight: 1.3 }}>
                                                    {new Date(entry.updatedAt).toLocaleDateString()}
                                                </Typography>
                                                <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.6rem', lineHeight: 1.3 }}>
                                                    {new Date(entry.updatedAt).toLocaleTimeString()}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>

            {/* Context menu */}
            <Menu
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference='anchorPosition'
                anchorPosition={
                    contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
                }
            >
                <MenuItem onClick={handleAddToPrompt} disabled={!supportsImageInput || contextMenu?.entry?.mediaType === 'video' || contextMenu?.entry?.mediaType === 'audio'}>
                    {t('contextMenu.addToPrompt')}
                </MenuItem>
                <MenuItem onClick={handleSaveAs}>{t('contextMenu.saveAs')}</MenuItem>
                <MenuItem onClick={handleRestoreParams}>{t('contextMenu.restoreParams')}</MenuItem>
                <MenuItem onClick={handleDeleteEntry}>{t('contextMenu.delete')}</MenuItem>
            </Menu>

            {/* Header menu */}
            <Menu
                anchorEl={headerMenuAnchor}
                open={Boolean(headerMenuAnchor)}
                onClose={() => setHeaderMenuAnchor(null)}
            >
                <MenuItem onClick={handleExportAll}>{t('historyMenu.exportAll')}</MenuItem>
                <MenuItem onClick={handleDeleteAll}>{t('historyMenu.deleteAll')}</MenuItem>
            </Menu>

            {/* Confirm dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
                <DialogTitle>{confirmDialog.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{confirmDialog.message}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={confirmDialog.onConfirm} color='error' variant='contained'>
                        {t('common.confirm')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Export progress dialog */}
            <Dialog open={exportProgress !== null}>
                <DialogTitle>{t('history.exporting')}</DialogTitle>
                <DialogContent sx={{ minWidth: 320 }}>
                    <Typography variant='body2' sx={{ mb: 1 }}>
                        {t('history.exportProgress', { percent: exportProgress ?? 0 })}
                    </Typography>
                    <LinearProgress variant='determinate' value={exportProgress ?? 0} />
                </DialogContent>
            </Dialog>
        </Box>
    );
}
