// Shared Tailwind config for every Mobile DevTools app — matches kit.css tokens.
tailwind.config = { darkMode: 'class', theme: { extend: {
  colors: { ink: '#0A0B0F', panel: '#13151B', raised: '#1B1E26', sunken: '#0E1014', edge: '#23272F', edge2: '#2F3543', brand: '#7B7BFF', iris: '#A5A2FF', ink2: 'var(--ink2)', muted: 'var(--muted)' },
  fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'], display: ['"Bricolage Grotesque"', '"Space Grotesk"', 'system-ui', 'sans-serif'] },
  boxShadow: { card: '0 1px 0 0 rgba(255,255,255,.02) inset, 0 10px 30px -18px rgba(0,0,0,.7)' },
} } };
