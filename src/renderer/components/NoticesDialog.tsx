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
    ListItemIcon,
    ListItemText,
    Divider,
    IconButton,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

type Props = {
    open: boolean;
    onClose: () => void;
};

function BulletList({ items }: { items: string[] }) {
    return (
        <List dense disablePadding>
            {items.map((text, i) => (
                <ListItem key={i} alignItems='flex-start' disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 20, mt: '10px' }}>
                        <FiberManualRecordIcon sx={{ fontSize: 6, color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <Typography variant='body2' sx={{ lineHeight: 1.6 }}>
                                {text}
                            </Typography>
                        }
                    />
                </ListItem>
            ))}
        </List>
    );
}

export default function NoticesDialog({ open, onClose }: Props) {
    const { t } = useTranslation();

    const precautions = t('notices.googleAiStudio.precautions.items', { returnObjects: true }) as string[];
    const recommendations = t('notices.googleAiStudio.recommendations.items', { returnObjects: true }) as string[];

    return (
        <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth scroll='paper'>
            <DialogTitle
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}
            >
                <span>{t('notices.dialog.title')}</span>
                <IconButton size='small' onClick={onClose} aria-label={t('notices.dialog.close')}>
                    <CloseIcon fontSize='small' />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
                    {t('notices.googleAiStudio.title')}
                </Typography>

                <Box sx={{ mt: 2 }}>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('notices.googleAiStudio.precautions.title')}
                    </Typography>
                    <BulletList items={precautions} />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('notices.googleAiStudio.recommendations.title')}
                    </Typography>
                    <BulletList items={recommendations} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant='contained'>
                    {t('notices.dialog.close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
