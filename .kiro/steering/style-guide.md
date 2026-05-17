---
inclusion: always
---

# UI Style Guide

The mini-app is a neon-on-dark Telegram WebApp. Keep new screens consistent
with what's already there — the goal is one cohesive product, not a collage.

## Brand identity

Each tab gets its own brand line in the header (rendered by `SectionHeader`):

| Tab | Brand | Title |
|---|---|---|
| Home | `ZHub` | "Привет, {name}" or "Главная" |
| Fitness | `ZTrainer` | "Тренировки" |
| Cinema | `CinemaZ` | "Кино" |
| Profile | `ZProfile` | "Мой профиль" |

The brand string is rendered in 10–12px uppercase, letter-spaced wide,
filled with the gradient `from-cyan-400 to-purple-500`.

When introducing a new section, reuse `SectionHeader` from
`@/components/layout/SectionHeader`. Don't reinvent.

## Colour palette (Tailwind v4)

- Backgrounds: `bg-slate-950` (page), `bg-slate-900` (workspace), `bg-slate-800/80` (controls)
- Accent (primary actions, fitness, hub): **cyan** — `cyan-300/400/500`
- Accent (cinema, secondary): **magenta** — `magenta-300/400/500`
- Accent (AI, special, news): **purple** — `purple-300/400/500`
- Warning / spoilers: `red-300/400/500`
- Success: `emerald-300/500`
- Stars / ratings: `amber-300`

## Surfaces

`.glass` is the standard card surface — semi-transparent slate background,
1px white border, soft backdrop blur. **On touch devices** (`(hover: none) and
(pointer: coarse)`) blur is disabled and background opacity bumped — cheaper
on weak GPUs.

Standard radius: `rounded-2xl` for cards, `rounded-xl` for inputs/buttons,
`rounded-3xl` for modal sheets.

## Modals

All modals follow one shape (see `AboutModal`, `TarotModal`, `MovieDetailsModal`):

```tsx
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
  <div
    className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-{accent}-500/30 max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
    onClick={(e) => e.stopPropagation()}
  >
    <header /* X button + brand + title */ />
    <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
      {/* body */}
    </div>
  </div>
</div>
```

Mobile = bottom sheet (`items-end`, `rounded-t-3xl`). Desktop ≥ sm = centered card.

## Buttons

- Primary action (per accent): `bg-{accent}-500/15 border border-{accent}-500/40 text-{accent}-200 hover:bg-{accent}-500/25`
- Hero CTA: `bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-[0_4px_20px_rgba(6,182,212,0.3)]`
- Destructive: `bg-slate-800/60 border border-slate-700 hover:border-red-500/40 hover:text-red-300`
- Always include `active:scale-95` (or `active:scale-[0.97]` for big tiles) — physical feel.

## Animations

We use `tailwindcss-animate` (vendored). Standard combo:
- Modal open: `animate-in fade-in slide-in-from-bottom-4 duration-300`
- Tab content: `animate-in fade-in slide-in-from-right-4 duration-300`
- Loading: cyan/magenta/purple ring spinners (`border-2 border-{accent}-500/30 border-t-{accent}-400 rounded-full animate-spin`)

## Don'ts

- Don't add new colour tokens without checking if an existing one fits.
- Don't use `**bold**` markdown in UI strings — Tailwind classes handle weight.
- Don't add `box-shadow: 0 0 30px ...` to elements that scroll — kills mobile fps.
- Don't put non-trivial content above the bottom nav (`pb-24` on tab roots leaves space).
- Don't force a solid title bar — we have a gradient brand instead, lets background glows show through.
