# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

**Next.js 16 App Router** · **React 19** · **TypeScript** · **Tailwind CSS v4**

UI icons: `lucide-react` | Charts: `recharts` | Drag & drop: `@dnd-kit/core` | DB: `@supabase/supabase-js` (optional, currently using mock data)

### Directory structure

```
src/
  app/
    layout.tsx          # Root layout — imports AppNav, sets sidebar offset (lg:ml-56 / pb-24 mobile)
    page.tsx            # Redirects → /dashboard
    dashboard/          # Admin dashboard: KPI cards, workload chart, issue reminders, evaluation timeline
    record/             # Mobile-optimised staff input: star ratings (1–10) + voice input
    calendar/           # Weekly DnD calendar + CSV import modal
    knowledge/          # PDCA issue management per menu
  components/
    nav/AppNav.tsx      # Responsive: left sidebar (lg) / bottom nav (mobile)
    dashboard/          # WorkloadChart (recharts), IssueReminders, EvaluationTimeline
    record/             # StarRating, VoiceInput (Web Speech API)
    calendar/           # WeeklyCalendar (DndContext + useDraggable/useDroppable)
    knowledge/          # IssueCard (expandable, inline status/next-action editing)
  lib/
    types.ts            # All shared TS interfaces: Menu, Schedule, WorkRecord, Issue, NutritionSummary
    mockData.ts         # 20 menus, week of schedules, 5 records, 5 issues — used while Supabase is not connected
    utils.ts            # calcNutrition(), getWeekDates(), formatDate(), SALT_LIMIT_PER_MEAL, CALORIE_LIMIT_PER_MEAL
    supabase.ts         # createClient() — returns null when env vars are absent
supabase/
  schema.sql            # Production Supabase DDL for Menu / Schedule / Record / Issue tables
.env.local.example      # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Key conventions

- **All components using hooks / browser APIs** must have `'use client'` at the top. This includes every component that uses recharts, `@dnd-kit`, Web Speech API, or `usePathname`.
- **Nutrition calculation** always goes through `calcNutrition(schedules: Schedule[])` in `utils.ts`. Never inline it.
- **Tailwind v4** uses `@import "tailwindcss"` in `globals.css` — no `tailwind.config.js`. Custom theme tokens go in the `@theme inline { }` block.
- **Mock data vs real DB**: pages import from `@/lib/mockData` today. Swap for `supabase` queries once env vars are set. The `supabase` client returns `null` when env vars are missing — always null-check it.
- **DnD calendar state** (`WeeklyCalendar`) is keyed by `"YYYY-MM-DD_MealType"` strings. Moving a menu item updates that key-value map and re-derives `NutritionSummary` for the affected cell.
- **Warnings**: salt ≥ 2.5 g/meal → red, calories ≥ 800 kcal/meal → amber. Thresholds are exported constants in `utils.ts`.
- **CSV import** format: `日付,食事区分,カテゴリ,メニュー名` (header row optional). Parser lives in `calendar/page.tsx`.
