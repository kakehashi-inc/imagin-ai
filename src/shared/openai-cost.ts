import type { OpenAIImageQuality, OpenAIImageSize } from './types';

// Token-cost profiles of the GPT Image models, mirroring the cost calculator on
// developers.openai.com (image generation guide). A profile holds the long-edge
// patch coefficient for each quality tier and an optional per-tier multiplier
// applied to the resulting token count.
export type OpenAICostProfile = 'gpt-image-2.6';

const COST_PROFILES: Record<
    OpenAICostProfile,
    {
        coefficients: Partial<Record<OpenAIImageQuality, number>>;
        multipliers?: Partial<Record<OpenAIImageQuality, number>>;
    }
> = {
    'gpt-image-2.6': {
        coefficients: { low: 16, medium: 24, high: 48, xhigh: 64, max: 96 },
        multipliers: { low: 4.2, medium: 3.3, high: 1, xhigh: 1, max: 1 },
    },
};

// Price of one million image output tokens, shared by every GPT Image model.
const OPENAI_IMAGE_OUTPUT_USD_PER_MILLION = 30;

function parseSize(size: OpenAIImageSize): { width: number; height: number } {
    const [width, height] = size.split('x').map(Number);
    return { width, height };
}

// Image output tokens for one image, computed exactly as the official
// calculator does: a patch grid whose long side is the quality coefficient and
// whose short side is that coefficient scaled by the aspect ratio (half-way
// values round to even), then ceil(grid area * (2M + pixels) / 4M), then the
// profile's per-tier multiplier. Returns null for a tier the profile lacks.
function estimateOutputTokens(
    profile: OpenAICostProfile,
    size: OpenAIImageSize,
    quality: OpenAIImageQuality
): number | null {
    const { coefficients, multipliers } = COST_PROFILES[profile];
    const coefficient = coefficients[quality];
    if (coefficient === undefined) return null;
    const { width, height } = parseSize(size);
    const longEdge = Math.max(width, height);
    const shortEdge = Math.min(width, height);
    const scaled = coefficient / (longEdge / shortEdge);
    const floor = Math.floor(scaled);
    const shortPatches = scaled - floor === 0.5 ? floor + (floor % 2) : Math.round(scaled);
    const gridArea = width >= height ? coefficient * shortPatches : shortPatches * coefficient;
    const tokens = Math.ceil((gridArea * (2_000_000 + width * height)) / 4_000_000);
    const multiplier = multipliers?.[quality];
    return multiplier === undefined ? tokens : Math.round(tokens * multiplier);
}

// Dollar amount rounded to three decimals, the precision OpenAI's own tables use.
function formatUsd(amount: number): string {
    return `$${amount.toFixed(3)}`;
}

const QUALITY_SHORT_LABELS: Record<OpenAIImageQuality, string> = {
    low: 'Low',
    medium: 'Med',
    high: 'High',
    xhigh: 'XHigh',
    max: 'Max',
};

// Per-image price table for a model, in the costLabel row format: each size
// group is a `< WIDTHxHEIGHT >` header followed by price lines of at most three
// tiers each. Sizes whose prices are identical share one header, and groups are
// ordered by their cheapest tier's price (stable on the given size order).
export function buildOpenAICostLabel(
    profile: OpenAICostProfile,
    sizes: OpenAIImageSize[],
    qualities: OpenAIImageQuality[]
): string[] {
    const groups: { sizes: OpenAIImageSize[]; prices: string[]; sortKey: number }[] = [];
    for (const size of sizes) {
        const costs = qualities.map(
            q => ((estimateOutputTokens(profile, size, q) ?? 0) * OPENAI_IMAGE_OUTPUT_USD_PER_MILLION) / 1_000_000
        );
        const prices = costs.map((cost, i) => `${formatUsd(cost)}(${QUALITY_SHORT_LABELS[qualities[i]]})`);
        const existing = groups.find(g => g.prices.join() === prices.join());
        if (existing) {
            existing.sizes.push(size);
        } else {
            groups.push({ sizes: [size], prices, sortKey: Number(formatUsd(costs[0]).slice(1)) });
        }
    }
    groups.sort((a, b) => a.sortKey - b.sortKey);
    const rows: string[] = [];
    for (const group of groups) {
        rows.push(`< ${group.sizes.join(', ')} >`);
        for (let i = 0; i < group.prices.length; i += 3) {
            rows.push(group.prices.slice(i, i + 3).join(' / '));
        }
    }
    return rows;
}
