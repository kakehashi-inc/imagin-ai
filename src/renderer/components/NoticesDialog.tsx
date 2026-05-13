import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ProviderIcon from './ProviderIcon';
import { API_PROVIDERS, type ApiProvider } from '../../shared/types';

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

// Renders a single provider's notice block (title + precautions + recommendations).
// Both providers share the same shape so neither feels like an afterthought.
function ProviderNoticesSection({ provider }: { provider: ApiProvider }) {
    const { t } = useTranslation();
    const precautionsRaw = t(`notices.${provider}.precautions.items`, { returnObjects: true });
    const recommendationsRaw = t(`notices.${provider}.recommendations.items`, { returnObjects: true });
    const precautions = Array.isArray(precautionsRaw) ? (precautionsRaw as string[]) : [];
    const recommendations = Array.isArray(recommendationsRaw) ? (recommendationsRaw as string[]) : [];

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ProviderIcon provider={provider} />
                <Typography variant='h6' sx={{ fontWeight: 600 }}>
                    {t(`notices.${provider}.title`)}
                </Typography>
            </Box>

            {/* Hide whole subsections when their item list is empty so the dialog
                doesn't show a heading with nothing under it. */}
            {precautions.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t(`notices.${provider}.precautions.title`)}
                    </Typography>
                    <BulletList items={precautions} />
                </Box>
            )}

            {recommendations.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t(`notices.${provider}.recommendations.title`)}
                    </Typography>
                    <BulletList items={recommendations} />
                </Box>
            )}
        </Box>
    );
}

export default function NoticesDialog({ open, onClose }: Props) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth scroll='paper'>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                <span>{t('notices.dialog.title')}</span>
                <IconButton size='small' onClick={onClose} aria-label={t('notices.dialog.close')}>
                    <CloseIcon fontSize='small' />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {API_PROVIDERS.map((provider, i) => (
                    <Box key={provider}>
                        {i > 0 && <Divider sx={{ my: 3 }} />}
                        <ProviderNoticesSection provider={provider} />
                    </Box>
                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant='contained'>
                    {t('notices.dialog.close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
