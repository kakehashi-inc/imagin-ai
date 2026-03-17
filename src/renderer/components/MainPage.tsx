import { Box } from '@mui/material';
import ParameterPanel from './ParameterPanel';
import PromptPanel from './PromptPanel';
import GenerateButton from './GenerateButton';
import HistoryPanel from './HistoryPanel';

export default function MainPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                overflow: 'hidden',
            }}
        >
            {/* Upper area: params + prompt */}
            <Box
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    p: 2,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        gap: 3,
                        maxWidth: 1200,
                        mx: 'auto',
                    }}
                >
                    {/* Left: Parameters */}
                    <Box sx={{ width: 280, flexShrink: 0 }}>
                        <ParameterPanel />
                    </Box>

                    {/* Right: Prompt + Generate */}
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <PromptPanel />
                        <GenerateButton />
                    </Box>
                </Box>
            </Box>

            {/* History panel at the bottom */}
            <HistoryPanel />
        </Box>
    );
}
