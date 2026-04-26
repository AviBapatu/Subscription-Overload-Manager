// ─── Categories list ──────────────────────────────────────────────────────────
export const CATEGORIES = [
    'Entertainment', 'Software', 'News', 'Gaming',
    'Music', 'Fitness', 'Education', 'Cloud', 'Other',
];

// ─── Category → visual theme ──────────────────────────────────────────────────
export const getCardTheme = (category) => {
    const themes = {
        Entertainment: { bg: 'bg-primary',    text: 'text-primary',    grad: 'from-primary/10',    ring: 'shadow-primary/30',    icon: 'movie' },
        Software:      { bg: 'bg-secondary',   text: 'text-secondary',  grad: 'from-secondary/10',  ring: 'shadow-secondary/30',  icon: 'terminal' },
        News:          { bg: 'bg-tertiary',    text: 'text-tertiary',   grad: 'from-tertiary/10',   ring: 'shadow-tertiary/30',   icon: 'newspaper' },
        Gaming:        { bg: 'bg-error',       text: 'text-error',      grad: 'from-error/10',      ring: 'shadow-error/30',      icon: 'sports_esports' },
        Music:         { bg: 'bg-on-secondary-fixed-variant', text: 'text-on-secondary-fixed-variant', grad: 'from-on-secondary-fixed-variant/10', ring: 'shadow-on-secondary-fixed-variant/30', icon: 'music_note' },
        Fitness:       { bg: 'bg-primary',    text: 'text-primary',    grad: 'from-primary/10',    ring: 'shadow-primary/30',    icon: 'fitness_center' },
        Cloud:         { bg: 'bg-tertiary',   text: 'text-tertiary',   grad: 'from-tertiary/10',   ring: 'shadow-tertiary/30',   icon: 'cloud' },
    };
    return themes[category] || {
        bg: 'bg-on-background', text: 'text-on-background',
        grad: 'from-on-background/10', ring: 'shadow-on-background/30', icon: 'sell',
    };
};
