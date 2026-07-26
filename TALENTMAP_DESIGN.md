# TalentMap Product Design System

This document is the default visual direction for TalentMap. It captures the operational dashboard style implemented in July 2026 and replaces the previous Notion-inspired direction.

Use this system for new pages, components, and visual refinements unless the user supplies a more specific reference. A page may adapt the layout to its purpose, but it should still feel like the same product.

## Design Character

TalentMap is a refined, data-dense assessment operations product. The interface should feel trustworthy, calm, precise, and modern rather than playful or editorial.

The recognizable visual signature is:

- A deep navy navigation shell against a cool gray application canvas.
- Compact white data surfaces with crisp borders and restrained shadows.
- Blue as the primary action and navigation color, supported by semantic green, orange, red, and violet accents.
- High information density with clear hierarchy, generous internal card spacing, and minimal visual noise.
- Purposeful charts and status indicators that use live product data.

## Core Principles

1. **Data first.** Metrics, trends, status, and next actions should be visible without decoration competing for attention.
2. **Compact, not cramped.** Operational dashboards may use compact supporting text. Assessment questions and result interpretation prioritize 16px body text and 14px metadata. The short consent overview may use 14px body text and 12px supporting metadata when contrast, line spacing, and reflow remain accessible.
3. **Quiet depth.** Use light borders and very soft shadows. Avoid floating glass panels, heavy blur, or dramatic elevation.
4. **Color with meaning.** Blue is primary; green means healthy or complete; orange means pending or reserved; red means expired or destructive; violet distinguishes people and profiles.
5. **Real product behavior.** Filters, links, menus, charts, empty states, and responsive navigation should work rather than exist as decorative mock controls.
6. **Responsive by composition.** Reflow dense grids into readable stacks; never preserve desktop density by allowing page-level horizontal overflow.

## Color System

Canonical global tokens live in `src/app/globals.css`.

| Role               | Value                 | Usage                                |
| ------------------ | --------------------- | ------------------------------------ |
| Application canvas | `#f7f9fc`             | Page background                      |
| Primary text       | `#0f172a`             | Headings and important values        |
| Surface            | `#ffffff`             | Cards, top bar, popovers             |
| Muted surface      | `#f1f5f9`             | Inputs, tracks, subtle states        |
| Border             | `#e2e8f0`             | Card and control outlines            |
| Primary blue       | `#2563eb`             | Actions, links, active data          |
| Strong blue        | `#1d4ed8`             | Hover and pressed states             |
| Muted blue         | `#eaf2ff`             | Icon wells and selected backgrounds  |
| Navigation navy    | `#061a38`             | Desktop sidebar and mobile drawer    |
| Success green      | `#2fbd7d` / `#16a36a` | Completion, availability, compliance |
| Warning orange     | `#f97316` / `#fb8736` | In-progress, reserved, upcoming      |
| Danger red         | `#ef4444` / `#f0525f` | Expired, destructive, alerts         |
| Profile violet     | `#7c3aed`             | Participant and profile accents      |

Use saturated colors in small areas: icons, chart marks, progress fills, status text, and primary actions. Large surfaces should remain white, navy, or cool gray.

## Typography

- Primary family: Geist with system sans-serif fallbacks.
- Page title: 26–28px, semibold, approximately `-0.035em` tracking.
- Major metric: 22–28px, semibold, tight tracking.
- Section/card heading: 13–16px, semibold.
- Body and control text: 12–14px.
- Supporting metadata: 9–11px, used only when contrast and spacing remain accessible.
- Navigation section label: 10px uppercase with wide tracking.

Assessment results and participant-facing interpretation use a more readable scale:

- Interpretive body text: 16px minimum with approximately 1.6–1.75 line height.
- Supporting labels and metadata: 14px minimum.
- Section headings: 18px minimum; primary result titles: 28–32px.
- Do not truncate trait names or other meaning-bearing labels to preserve a compact layout.
- At 200% browser zoom, content must reflow without page-level horizontal scrolling or loss of information.

Use sentence case for headings and labels. Avoid oversized marketing typography inside the authenticated application.

## Application Shell

The canonical shell is `src/components/layout/app-shell.tsx`.

### Desktop

- Sidebar width: 224px.
- Sidebar background: `#061a38`.
- Top bar height: 64px with a translucent white background and subtle bottom border.
- Main content width: up to 1600px.
- Main gutters: 28px on desktop, 24px on tablet, 16px on mobile.
- Active navigation uses a translucent blue fill, blue icon, and subtle inset border.
- Navigation groups use short uppercase section labels.

### Mobile

- Sidebar becomes a 256px off-canvas drawer with a dimmed backdrop.
- The top bar retains the client context, notifications, and menu trigger.
- Content grids become a single column unless two compact columns remain clearly readable.
- Page-level horizontal scrolling is prohibited. Wide tables may scroll inside their own card.

## Surfaces and Cards

Default analytics card treatment:

```text
background: white
border: slate-200 at roughly 90% opacity
radius: 12px
padding: 16–20px
shadow: 0 3px 12px rgba(15, 23, 42, 0.035)
```

- Use 8–12px radii for most controls and cards.
- Reserve fully rounded shapes for avatars, icon wells, badges, progress tracks, and donut charts.
- Hover elevation may move a compact interactive card up by 2px with a slightly stronger shadow.
- Do not apply the same hover lift to static reporting panels.
- Use borders to organize content before adding extra backgrounds.

## Dashboard Composition

The canonical implementation is `src/components/dashboard/dashboard-overview.tsx`.

Preferred sequence:

1. Greeting, concise context, and date range.
2. Five primary metrics with optional sparklines or progress.
3. A wide trend panel supported by quota and activity panels.
4. Assessment performance, result distribution, and compliance panels.
5. A low-emphasis operational notice or next action.

For complex desktop rows, use explicit fractional grids with `minmax(0, …)` so charts and tables cannot force page overflow.

## Participant Experience

The canonical participant components are:

- `src/components/test/participant-experience-shell.tsx`
- `src/components/test/participant-consent-gate.tsx`
- `src/components/test/participant-test-runner.tsx`

Participant pages use the same cool-gray canvas, cobalt actions, white bordered cards, compact typography, and restrained shadows as the administration interface. They use a horizontal organization and assessment header instead of the authenticated navy sidebar so the test remains focused and works for external participants.

The assessment identity is the primary element in the participant header: show the full test name at a larger semibold size, with the issuing organization as secondary context beneath it. Never give the organization and test name equal weight or truncate the test name. Distinguish journey stages with a textual status plus a small semantic accent: blue for consent, orange for in progress, and green for completed. The consent overview may use a dark navy title band, and the active question card repeats the test name with the in-progress orange accent so participants can immediately confirm which assessment they are taking.

The participant journey has three visually consistent states:

1. **Consent:** a compact, centered stack gives the assessment overview and privacy notice equal white-card treatment, with the assessment overview first. It clearly states the assessment name, purpose, question count, estimated time, organization, and participant. Privacy disclosures use a divided list instead of individual cards, followed by one explicit consent control and 40px action targets. Small supporting text must retain AA contrast, comfortable line height, and full access to meaning-bearing names and versions without truncation.
2. **In progress:** a focused question surface with the current question number and progress bar visible at the top on every viewport. The desktop question map uses a comfortable seven-column layout and remains visible, while mobile uses a compact, collapsed, tap-to-open menu. The sticky header shows elapsed time; estimated time, save status, and operational metadata are not repeated during the assessment. Choosing an answer saves it and automatically advances after brief visual feedback; the final question retains an explicit submit action. The previous action sits immediately below the answer choices.
3. **Completed:** a compact, profile-first result hierarchy with a consistent green completion notice, the participant type, recorded completion duration, dimension snapshot, interpretation, strengths, and detailed insights. Preference dimensions must spell out each selected concept and briefly explain its meaning rather than relying on instrument letters alone. Participant results read as a continuous report: primary interpretation must use 16px body text with generous line height and remain in the page flow, never inside fixed-height or nested scrolling cards. Break long source narratives into readable semantic paragraphs with a constrained reading measure. Do not pair substantially different narrative lengths in equal-height side-by-side cards; use full-width editorial sections or independently sized surfaces instead. Supplemental sections can use responsive grids, but they must collapse cleanly into one column at 200% zoom without hiding meaning.

The participant shell must never introduce page-level horizontal overflow. Answer choices need full-row click targets, visible selected/focus states, and semantic radio behavior.

Every assessment records an authoritative total duration from token start to result submission, plus cumulative per-question answering times. Timing data is persisted with drafts so a refresh does not discard the partial record. Estimated duration is shown only before the assessment starts.

## Metrics and Data Visualization

- Metrics must come from the application data layer. Do not invent percentage changes or comparison periods.
- If a metric is not meaningful for an assessment type, replace it with a truthful operational measure and explain the choice.
- Sparklines should be compact, unlabelled summaries supporting a primary value.
- Full charts should include a title, legend, scale, date/category labels, and an accessible name.
- Chart palette:
  - Completed/available: `#2fbd7d`
  - In progress/primary series: `#2f7df6`
  - Expired/error: `#f0525f`
  - Reserved: `#fb8736`
- Grid lines should be subtle (`#e8edf4`) and may be dashed.
- Empty data must render an intentional empty state rather than fake chart values.

## Tables and Activity Lists

- Keep header labels small and muted.
- Use dividers sparingly; soft row separators are preferred over boxed cells.
- Pair entity names with colored circular icon wells where it improves scanning.
- Truncate long secondary text while preserving the primary label.
- On mobile, place wide tables inside a horizontally scrollable card rather than widening the page.
- Recent activity should combine a semantic icon, event title, short description, and relative timestamp.

## Controls and Interaction

- Standard control height: 32–40px.
- Primary actions use blue fill with white text.
- Secondary actions use white surfaces, slate borders, and blue hover states.
- Focus rings use the primary blue with a soft transparent halo.
- Icon-only controls require accessible labels.
- Avoid decorative buttons with no action. Use plain text or a static container when something is informational.

## Motion

- Default interaction transition: about 160ms for color, border, shadow, and small transforms.
- Page reveal: subtle 8px upward motion with a 420ms ease-out.
- Motion should clarify state changes, not run continuously.
- Always honor `prefers-reduced-motion`.

## Accessibility and Quality

- Treat WCAG 2.2 AA as the baseline and use `C:\Users\alpi\Downloads\wcag-accessibility_SKILL.md` when reviewing or changing UI.
- Maintain at least 4.5:1 contrast for normal text and 3:1 for large text and meaningful UI graphics.
- Use 44px targets for primary result-page controls where space allows; never go below the WCAG AA 24px minimum.
- Maintain readable contrast on the navy sidebar and muted metadata.
- Every chart needs a useful accessible label.
- Every icon-only action needs an `aria-label` or screen-reader label.
- Keyboard focus must remain visible.
- Verify desktop and mobile widths for page-level overflow.
- Use responsive empty states and loading states where data may be absent.
- Keep server-derived metrics truthful and tenant-scoped.

## Avoid

- The old Notion-inspired monochrome document aesthetic.
- Purple gradients as a dominant product theme.
- Excessive glassmorphism, blur, glow, or oversized shadows.
- Uniform pills for every control.
- Huge headings or marketing-page spacing inside dashboards.
- Decorative charts, fabricated deltas, or fake activity.
- Dense desktop layouts that simply shrink on mobile.
- Introducing a second shell, card system, or color vocabulary without a product reason.

## Source of Truth

When documentation and implementation disagree, first determine whether the implementation was an intentional later design change. Then update this file and the shared tokens/components together so the system stays synchronized.

Primary implementation references:

- `src/app/globals.css`
- `src/components/layout/app-shell.tsx`
- `src/components/dashboard/dashboard-overview.tsx`
