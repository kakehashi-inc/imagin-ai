import { SvgIcon, type SvgIconProps } from '@mui/material';
import type { ApiProvider } from '../../shared/types';

type ProviderIconProps = SvgIconProps & {
    provider: ApiProvider;
};

// Renders a brand glyph for each supported provider. Sized like other MUI
// icons (1em) so it composes inside MenuItems, ListSubheaders, badges, etc.
// Both glyphs are intentionally monochrome so they inherit the surrounding
// text color (and theme accent) without forcing brand colors into the UI.
export default function ProviderIcon({ provider, ...props }: ProviderIconProps) {
    if (provider === 'gemini') {
        // Stylized Google-AI-Studio spark mark. Drawn as a four-pointed star to
        // match Google's Gemini "sparkle" branding without depending on a
        // bundled SVG asset.
        return (
            <SvgIcon viewBox='0 0 24 24' {...props}>
                <path
                    fill='currentColor'
                    d='M12 2c.4 4.6 3.4 7.6 8 8-4.6.4-7.6 3.4-8 8-.4-4.6-3.4-7.6-8-8 4.6-.4 7.6-3.4 8-8z'
                />
            </SvgIcon>
        );
    }
    // OpenAI knot/spiral mark, simplified to a single path so it renders crisply at icon size.
    return (
        <SvgIcon viewBox='0 0 24 24' {...props}>
            <path
                fill='currentColor'
                d='M21.3 10.1a5.4 5.4 0 0 0-.5-4.4 5.4 5.4 0 0 0-5.9-2.6 5.4 5.4 0 0 0-4.1-1.8 5.4 5.4 0 0 0-5.2 3.8A5.4 5.4 0 0 0 2 7.7a5.4 5.4 0 0 0 .7 6.3 5.4 5.4 0 0 0 .5 4.4 5.4 5.4 0 0 0 5.9 2.6 5.4 5.4 0 0 0 4.1 1.8 5.4 5.4 0 0 0 5.2-3.8 5.4 5.4 0 0 0 3.6-2.6 5.4 5.4 0 0 0-.7-6.3zM13.2 20.2a4 4 0 0 1-2.6-.9l.1-.1 4.4-2.5a.7.7 0 0 0 .4-.6v-6.2l1.9 1.1v5a4 4 0 0 1-4 4zm-8.7-3.7a4 4 0 0 1-.5-2.7l.1.1 4.4 2.5a.7.7 0 0 0 .7 0L15.5 13v2.2a.1.1 0 0 1-.1.1l-4.5 2.6a4 4 0 0 1-5.5-1.4zm-1.2-9.6a4 4 0 0 1 2.1-1.8v5.2a.7.7 0 0 0 .4.6L11.2 13l-1.9 1.1-4.5-2.6a4 4 0 0 1-1.5-5.5zm15.2 3.5L13.3 7.9l1.9-1.1 4.5 2.6a4 4 0 0 1-.6 7.2v-5.2a.7.7 0 0 0-.4-.6zM20.4 7l-.1-.1-4.4-2.5a.7.7 0 0 0-.7 0L9 8V5.8a.1.1 0 0 1 .1-.1l4.5-2.6a4 4 0 0 1 5.9 4.1zM7.9 14.2l-1.9-1.1v-5a4 4 0 0 1 6.6-3.1l-.1.1-4.4 2.5a.7.7 0 0 0-.4.6zm1-2.2L11 10.8l1.9 1.1v2.2L11 15.2l-1.9-1.1z'
            />
        </SvgIcon>
    );
}
