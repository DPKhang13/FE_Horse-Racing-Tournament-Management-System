---
name: Equine Precision
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#44474d'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#75777e'
  outline-variant: '#c5c6cd'
  surface-tint: '#515f78'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#0d1c32'
  on-primary-container: '#76849f'
  inverse-primary: '#b9c7e4'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cba72f'
  on-tertiary-container: '#4e3d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b9c7e4'
  on-primary-fixed: '#0d1c32'
  on-primary-fixed-variant: '#39475f'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 48px
  margin-mobile: 16px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
  section-gap: 64px
---

## Brand & Style
The design system embodies the intersection of high-stakes athleticism and modern luxury. It is built for a discerning audience that values data-driven precision and a sophisticated sporting aesthetic. The visual direction is **Minimalist** with **Corporate/Modern** influences, prioritizing information architecture to ensure that complex racing statistics remain legible and actionable. 

The emotional response should be one of calm confidence—reminiscent of a high-end clubhouse or a premium financial terminal. We achieve this through a disciplined use of whitespace, a constrained but authoritative color palette, and a focus on structural clarity over decorative flair.

## Colors
The palette is rooted in tradition but executed with modern vibrance.
- **Primary (Midnight Navy):** Used for primary navigation, headings, and high-emphasis text. It provides the "anchor" for the brand.
- **Secondary (Emerald Green):** Represents growth, the track, and "success" states. Use this for primary calls to action, winning odds, and active status indicators.
- **Tertiary (Subtle Gold):** Reserved for premium tiers, trophies, "Best Bet" highlights, and subtle accents that signify quality.
- **Neutral (Off-White/Gray):** The foundation of the UI. #F8F9FA serves as the primary canvas to reduce eye strain and provide a clean backdrop for dense data.

## Typography
We utilize **Inter** across all levels to ensure maximum legibility and a systematic, technical feel. 
- **Headlines:** Use tight letter-spacing and heavy weights to convey authority.
- **Body:** Standardized weights for long-form content and race descriptions.
- **Labels:** Uppercase with increased letter-spacing for categorizing data points (e.g., "JOCKEY", "TRAINER", "WEIGHT").
- **Numerical Data:** For odds, times, and financial figures, ensure `tabular-nums` is enabled to keep columns aligned in data tables.

## Layout & Spacing
The layout follows a **Fixed Grid** model on desktop to maintain a premium, editorial feel, transitioning to a fluid layout on mobile devices.
- **Desktop (1280px+):** 12-column grid with 24px gutters. Use large exterior margins (48px+) to center the content and provide breathing room.
- **Tablet (768px - 1279px):** 8-column grid with 24px gutters and 32px margins.
- **Mobile (< 768px):** 4-column fluid grid with 16px margins. 

Spacing follows a strict 8px base unit. Vertical rhythm should be generous—favoring "too much" space over "too little" to prevent the interface from feeling like a cluttered betting shop.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Low-contrast Outlines** rather than heavy shadows. 
- **Surface Level 0:** #F8F9FA (Main background).
- **Surface Level 1:** #FFFFFF (Cards and content containers). Use a 1px solid border (#E5E7EB) to define boundaries.
- **Active States:** Apply a very soft, ambient shadow (0px 4px 20px rgba(10, 25, 47, 0.04)) to elevated cards or open menus.
- **Overlays:** Use a semi-transparent Midnight Navy backdrop blur (4px) for modals to maintain focus while keeping the context of the track or data table visible.

## Shapes
We use a **Soft** shape language (4px - 12px) to balance modern approachability with professional precision. 
- **Standard Elements:** 4px (0.25rem) radius for buttons, input fields, and small tags.
- **Containers:** 8px (0.5rem) radius for cards and larger content blocks.
- **Specialty:** 12px (0.75rem) for main promotional banners.
Avoid completely pill-shaped elements unless used for high-contrast "Win" badges or status chips.

## Components
- **Buttons:** Primary buttons are Solid Midnight Navy with White text. Secondary buttons use a 1px Midnight Navy border with no fill. The "Place Bet" button is a special Emerald Green high-contrast component.
- **Odds Chips:** Compact rectangles with 4px corners. Use Emerald Green text on a very light green tint for "shortening" odds, and Neutral Gray for stable odds.
- **Data Tables:** Clean, borderless rows with subtle 1px dividers. Header rows use `label-sm` typography with a light gray background (#F1F3F5).
- **Cards:** White background, 1px light gray border. No shadow by default; add a soft shadow and a 2px Emerald Green left-accent bar on hover.
- **Input Fields:** Minimalist design with a 1px border. On focus, the border transitions to Midnight Navy with a subtle 2px Gold outer glow to indicate the premium interaction.
- **Badges:** Small, uppercase tags for "Grade 1", "Turf", or "Dirt" track types, using subtle background tints of the primary colors.