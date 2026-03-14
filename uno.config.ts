import { defineConfig, presetUno, presetIcons, transformerDirectives } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      cdn: undefined,
      collections: {
        lucide: () => import('@iconify-json/lucide/icons.json').then((i) => i.default),
      },
    }),
  ],
  transformers: [transformerDirectives()],
  theme: {
    colors: {
      surface: 'var(--c-bg)',
      elevated: 'var(--c-bg-elevated)',
      hover: 'var(--c-bg-hover)',
      accent: {
        DEFAULT: 'var(--c-accent)',
        hover: 'var(--c-accent-hover)',
      },
      danger: 'var(--c-danger)',
      success: 'var(--c-success)',
      warning: 'var(--c-warning)',
      border: 'var(--c-border)',
      txt: {
        DEFAULT: 'var(--c-text)',
        secondary: 'var(--c-text-secondary)',
        muted: 'var(--c-text-muted)',
      },
    },
    fontFamily: {
      sans: 'var(--font-sans)',
      mono: 'var(--font-mono)',
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
  shortcuts: {
    'btn-base': 'inline-flex items-center justify-center cursor-pointer border-none outline-none transition-all duration-150 select-none',
    'btn-icon': 'btn-base w-10 h-10 rounded-lg hover:bg-hover text-txt',
    'btn-primary': 'btn-base px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover',
    'btn-secondary': 'btn-base px-4 py-2 rounded-lg bg-elevated text-txt border border-border hover:bg-hover',
    'btn-ghost': 'btn-base px-4 py-2 rounded-lg bg-transparent text-txt hover:bg-hover',
    'btn-danger': 'btn-base px-4 py-2 rounded-lg bg-danger text-white hover:opacity-90',
    'input-field': 'w-full h-10 px-3 rounded-lg border border-border bg-surface text-txt placeholder-txt-muted outline-none transition-all duration-150 focus:border-accent focus:ring-3 focus:ring-accent/15',
    'label-field': 'block text-sm font-medium text-txt-secondary mb-1',
  },
})
