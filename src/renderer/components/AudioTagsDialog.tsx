import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    Divider,
    IconButton,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';

type Props = {
    open: boolean;
    onClose: () => void;
};

type TagEntry = { tag: string; desc: string };

function TagList({ items }: { items: TagEntry[] }) {
    return (
        <List dense disablePadding>
            {items.map((it, i) => (
                <ListItem key={i} alignItems='flex-start' disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                        primary={
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                                <Typography
                                    component='code'
                                    sx={{
                                        fontFamily: 'monospace',
                                        bgcolor: 'action.hover',
                                        borderRadius: 0.5,
                                        px: 0.75,
                                        py: 0.25,
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {it.tag}
                                </Typography>
                                <Typography variant='body2' sx={{ lineHeight: 1.6 }}>
                                    {it.desc}
                                </Typography>
                            </Box>
                        }
                    />
                </ListItem>
            ))}
        </List>
    );
}

export default function AudioTagsDialog({ open, onClose }: Props) {
    const { t } = useTranslation();

    const expressions = t('audioTags.section.expressions.items', { returnObjects: true }) as TagEntry[];
    const prosody = t('audioTags.section.prosody.items', { returnObjects: true }) as TagEntry[];
    const pause = t('audioTags.section.pause.items', { returnObjects: true }) as TagEntry[];

    return (
        <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth scroll='paper'>
            <DialogTitle
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}
            >
                <span>{t('audioTags.dialog.title')}</span>
                <IconButton size='small' onClick={onClose} aria-label={t('audioTags.dialog.close')}>
                    <CloseIcon fontSize='small' />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    {t('audioTags.dialog.description')}
                </Typography>

                <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('audioTags.section.expressions.title')}
                    </Typography>
                    <TagList items={expressions} />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('audioTags.section.prosody.title')}
                    </Typography>
                    <TagList items={prosody} />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('audioTags.section.pause.title')}
                    </Typography>
                    <TagList items={pause} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant='contained'>
                    {t('audioTags.dialog.close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
