---
name: atend.io
description: WhatsApp operations hub for support agents and admins
colors:
  primary: "#fa5619"
  clearline-teal: "#18bc9c"
  signal-tint: "#fcefeb"
  fieldwork-gray: "#52665a"
  neutral-surface: "#f8f9fa"
  neutral-cool: "#f5f5f8"
  neutral-border: "#dee2e6"
  neutral-muted: "#6c757d"
  neutral-ink: "#333333"
  semantic-success: "#11ad66"
  semantic-warning: "#fa9819"
  semantic-danger: "#de1656"
  semantic-info: "#17a2b8"
typography:
  body:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  title:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  code:
    fontFamily: "Ubuntu, Menlo, 'Courier New', monospace"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "6px"
  pill: "50rem"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  button-primary-hover:
    backgroundColor: "#e04d15"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  button-success:
    backgroundColor: "{colors.clearline-teal}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  button-outline-success:
    backgroundColor: "transparent"
    textColor: "{colors.clearline-teal}"
    rounded: "{rounded.sm}"
    padding: "5px 14px"
  input-default:
    backgroundColor: "#ffffff"
    textColor: "{colors.fieldwork-gray}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  chat-bubble-sent:
    backgroundColor: "{colors.clearline-teal}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  chat-bubble-received:
    backgroundColor: "#f0f0f0"
    textColor: "#2c3e50"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  badge-status-success:
    backgroundColor: "{colors.clearline-teal}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
---

# Design System: atend.io

## 1. Overview

**Creative North Star: "The Steady Operator"**

atend.io's visual system is built for people who are always on. Support agents cycle through dozens of conversations in a shift; admins configure a system that other people depend on. The design does not try to impress either of them — it tries to disappear. Flat surfaces, a restrained palette, and a single moment of orange energy at the top of the viewport: that's the whole idea. The interface should feel like a trusted tool that has been used for years, not a product demo.

The orange (`#fa5619`, Signal Orange) is the system's one committed voice. It anchors the navigation bar, marks primary actions, and then steps back completely. Everything else lives in warm neutral territory: the Fieldwork Gray body text (`#52665a`) carries a green undertone that stops it feeling cold, and the Clearline Teal (`#18BC9C`) handles confirmations and outbound chat messages — a functional accent, not a decorative one. Neither surface competes for attention. They work.

The system explicitly rejects the two failure modes named in the product brief: the heavy enterprise gray of committee-built software (Salesforce, SAP — cold, dense, designed for procurement, not for people), and the performative polish of hyped SaaS products (Intercom, Notion — gradient text, hero metrics, surfaces that announce themselves). atend.io is neither. It is warm without being casual. It is operational without being cold.

**Key Characteristics:**
- Flat surfaces — no drop shadows, tonal layering through background shifts only
- Single accent strategy: Signal Orange for navigation and primary actions, Clearline Teal for confirmations and chat
- Jost as the sole typeface — geometric-humanist, readable at small sizes, consistent across headings and data
- Warm neutral body text, not gray — Fieldwork Gray's green undertone is the warmth carrier
- Generous, considered component sizing — built for all-day use, not a demo

## 2. Colors: The Steady Palette

A restrained strategy: neutral surfaces everywhere, two functional accents used with intent, a full semantic set for state communication.

### Primary
- **Signal Orange** (`#fa5619`): The system's one committed voice. Used exclusively on the navigation bar background, primary action buttons, and the selected state in list groups. Its rarity is load-bearing — the moment it appears anywhere else, it stops signaling "action" and starts being decoration.

### Secondary
- **Clearline Teal** (`#18bc9c`): Handles confirmations, send actions, and outbound chat message bubbles. It is the visual counterpart to Signal Orange — where orange says "go", teal says "done". Also used as the unread-count badge in the room list.
- **Signal Tint** (`#fcefeb`): The pale warm-orange background tint. Used for subtle hover states, active row highlights on orange-primary surfaces, or any context where a full Signal Orange fill would be too heavy.

### Neutral
- **Fieldwork Gray** (`#52665a`): The default body text color. Not a standard cool gray — its faint green undertone prevents the cold, corporate gray-on-white look. Use it for all body copy, labels, placeholder-adjacent text in context.
- **Neutral Surface** (`#f8f9fa`): Page and component backgrounds. Cards, conversation headers, sidebar backgrounds.
- **Neutral Cool** (`#f5f5f8`): A slightly cooler, blue-tinted surface for secondary panels. Used in conversation headers to separate them from the message area.
- **Neutral Border** (`#dee2e6`): Dividers between sidebar panels, conversation header from message list, message input from message area.
- **Neutral Muted** (`#6c757d`): Secondary text — phone numbers, timestamps, last-message previews in the room list.
- **Neutral Ink** (`#333333`): Headings, bold labels, table header cells.

### Semantic
- **Success Green** (`#11ad66`): Active licensees, positive confirmations outside chat (distinct from Clearline Teal, which owns the chat send action).
- **Warning Amber** (`#fa9819`): Pending conversation status, queue alerts.
- **Danger Red** (`#de1656`): Errors, destructive actions, failed message states.
- **Info Cyan** (`#17a2b8`): Informational callouts and neutral status badges.

### Named Rules
**The One Voice Rule.** Signal Orange appears on ≤ 15% of any given screen. It lives in the nav bar and on primary buttons. Any other use — decorative borders, background fills, gradient accents — is prohibited. Its authority comes from its restraint.

**The Teal Ownership Rule.** Clearline Teal owns the chat send action and outbound message bubbles. Do not use it for non-chat primary buttons or as a general success color — that's what Semantic Success (`#11ad66`) is for. The distinction is meaningful: teal = "message sent", green = "operation succeeded".

## 3. Typography

**Body Font:** Jost (with `system-ui, sans-serif` fallback)
**Code / Mono Font:** Ubuntu (with `Menlo, 'Courier New', monospace` fallback)

**Character:** A single geometric-humanist sans-serif carries everything — headings, labels, body copy, table cells, button text. This is the product register's right call: one well-tuned family maintains visual consistency across dense information surfaces. Jost's slightly rounded forms prevent it feeling sterile; its weight range (400–700) provides enough hierarchy without reaching for a second typeface.

**Note:** Jost must be loaded via Google Fonts (`@import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&display=swap')`). The current codebase declares it in `index.css` without a font-face source — verify this is loaded in `index.html` or the stylesheet entry point to prevent system-font fallback in production.

### Hierarchy
- **Title** (600, 1.25rem / 20px, 1.3): Section headings, card headers, modal titles. Used sparingly — most screens don't need a display-weight headline.
- **Body** (400, 1rem / 16px, 1.5): All prose and descriptive text. Max line length 65–75ch on desktop; tables and compact panels may run denser.
- **Label** (500, 0.875rem / 14px, 1.4): Button text, form labels, nav items, table header cells, badge text. The primary weight in UI chrome.
- **Code** (400, 0.875rem / 14px, 1.6): Inline code, JSON viewers, API values, phone numbers in technical contexts.

### Named Rules
**The Single Family Rule.** Jost is the only typeface in this system. Do not introduce a display serif, a decorative script, or a second sans for headings. Hierarchy lives in weight (400/500/600) and size, not in family contrast.

**The Label Weight Rule.** Interactive elements — buttons, nav links, form labels — always render at weight 500 (Label level). Weight 400 (Body) in a button reads as a UI bug, not a design choice.

## 4. Elevation

This system is flat by default. Bootswatch Flatly removes Bootstrap's default card and component shadows; depth is expressed through tonal surface shifts, not drop shadows. A card reads as elevated because its background is `#ffffff` against a `#f8f9fa` page surface — not because it casts a shadow.

**The Flat-By-Default Rule.** Surfaces are flat at rest. The only permitted shadow in the current system is Bootstrap's focus-ring on form inputs (`0 0 0 0.25rem rgba(250, 86, 25, 0.25)` for the primary-colored focus glow). Do not add `box-shadow` to cards, nav bars, modals, or buttons as decoration.

If a future state requires visible elevation (e.g. a floating action panel, a toast notification above page content), use a single restrained ambient shadow: `0 4px 16px rgba(0,0,0,0.10)`. Nothing more dramatic.

## 5. Components

### Buttons
Warm and considered — slightly generous padding, rounded corners (4px, `{rounded.sm}`), clear weight hierarchy between variants.

- **Shape:** Gently rounded corners, 4px radius. Not pill-shaped except for badge-style elements.
- **Primary:** Signal Orange background (`#fa5619`), white text, weight 500. Padding `6px 16px`. Hover darkens to `#e04d15`. Focus ring: `0 0 0 0.25rem rgba(250, 86, 25, 0.25)`.
- **Success (Send / Confirm):** Clearline Teal background (`#18bc9c`), white text. Same shape and weight as primary. Used exclusively in chat send actions and confirmation contexts.
- **Outline Success:** Transparent background, Clearline Teal border and text. For secondary actions adjacent to a success primary (e.g. "Nova conversa" in the room list header).
- **Ghost / Link:** Bootstrap `.btn-link` — no background, no border, Clearline Teal or Signal Orange text depending on context. Reserve for tertiary actions.
- **States:** All buttons require hover, focus-visible (ring), active (slight press), and disabled (50% opacity, no cursor pointer) states.

### Cards / Containers
Flat white containers on a light-gray surface. No shadows.

- **Corner Style:** 4px radius (`{rounded.sm}`)
- **Background:** White (`#ffffff`) against page surface (`#f8f9fa`)
- **Shadow Strategy:** None — flat by system rule
- **Border:** None by default (Flatly removes Bootstrap's default card border). Use `border: 1px solid {colors.neutral-border}` only when a card needs explicit separation from its surroundings (e.g. within a white page surface)
- **Card Header:** `#f8f9fa` background, `{colors.neutral-ink}` text, 500 weight. Bottom border at `{colors.neutral-border}`.
- **Internal Padding:** `16px` (`{spacing.md}`) on all sides

### Inputs / Fields
Standard Bootstrap form controls, not reinvented.

- **Style:** White background, `{colors.neutral-border}` stroke (1px), 4px radius, Fieldwork Gray text, Neutral Muted placeholder.
- **Focus:** Signal Orange focus ring (`0 0 0 0.25rem rgba(250, 86, 25, 0.25)`), border shifts to `#fa5619`.
- **Disabled:** 50% opacity, `not-allowed` cursor.
- **Error:** Danger Red border (`#de1656`) + inline error text below the field. No red background fill on the input.
- **Input Group:** Icon prepend using Bootstrap's `.input-group-text`. Icon must match the field's body text color — don't use colored icons in neutral input groups.

### Navigation
The primary navigation band is the most committed use of Signal Orange in the system.

- **Style:** Bootstrap `.navbar.navbar-dark.bg-primary` — full-width horizontal bar, Signal Orange background, white text.
- **Nav links:** White at rest, slightly dimmed on hover (`rgba(255,255,255,0.75)`). Active link at full white. No underlines.
- **Dropdowns:** `.dropdown-menu` — white background, Neutral Ink text, Clearline Teal on hover background tint.
- **User menu:** Right-aligned dropdown, Signal Orange button with white icon and name. Consistent with the nav bar register.
- **Mobile:** Standard Bootstrap collapse toggle. The hamburger icon maintains white-on-orange treatment.

### Room List (Signature Component)
The left sidebar panel in the Chat view. The primary interface for support agents.

- **Container:** 30% viewport width (minimum 280px), right border at `{colors.neutral-border}`, full-height flex column.
- **Header:** Flex row, "Conversas" label at weight 600, Outline Success button for new conversation. Bottom border separator.
- **List Items:** Bootstrap `.list-group-item-action`. Contact name at weight 600, phone number and last message preview at Neutral Muted / small. Unread count badge at Clearline Teal.
- **Selected State:** Signal Orange background, white text — the one place inside the chat panel where Signal Orange appears below the nav bar. The orange selection makes the active conversation unmistakable in a long list.
- **Empty State:** Neutral Muted text, left-padded, no icon. "Nenhuma conversa." — direct, not decorative.

### Chat Bubbles (Signature Component)
The message surface. Two variants: sent (outbound, agent) and received (inbound, contact).

- **Sent bubble:** Clearline Teal background (`#18bc9c`), white text, 6px radius (`{rounded.md}`), max-width 70%, right-aligned (`align-self: flex-end`).
- **Received bubble:** Light gray background (`#f0f0f0`), dark navy text (`#2c3e50`), same radius and max-width, left-aligned (`align-self: flex-start`).
- **Spacing:** 8px gap between bubbles. Padding `8px 12px` inside each bubble.
- **Text:** Body weight (400), word-break on long URLs.

### Badges
Status and count indicators. Pill-shaped, semantic by color.

- **Unread count:** Clearline Teal, pill, white text. Used exclusively in the room list for message counts.
- **Conversation status — open:** Success Green (`#11ad66`).
- **Conversation status — pending:** Warning Amber (`#fa9819`).
- **Conversation status — closed:** Neutral Muted (`#6c757d`).
- **Text in badges:** Label weight (500), 0.75rem, uppercase is permitted here as it's part of Bootstrap's badge system.

## 6. Do's and Don'ts

### Do:
- **Do** reserve Signal Orange for the navigation bar and primary action buttons. Its authority comes from its scarcity.
- **Do** use Clearline Teal for the send button, sent message bubbles, and unread count badges — it owns the "message in flight" semantic.
- **Do** use Fieldwork Gray (`#52665a`) for body text. Its warmth is the system's warmth — don't replace it with a cooler gray.
- **Do** keep surfaces flat — white on light gray, no shadows. The depth is in the contrast between the surfaces, not in drop shadows.
- **Do** size interactive elements generously (minimum touch target 44×44px on mobile). This tool is used all day; ergonomics matter.
- **Do** use semantic badges for conversation status (open / pending / closed) — the color communicates state, not decoration.
- **Do** load Jost via a `<link>` or `@import` in the HTML entry — the font declaration in CSS without a source file will silently fall back to system-ui in production.
- **Do** keep the chat sidebar at 30% width / 280px minimum — below that, contact names and message previews truncate awkwardly.

### Don't:
- **Don't** build cold, gray, committee-designed layouts. Dense tables and small text don't earn their keep unless the data warrants it. Fieldwork Gray, not bootstrap-default text-muted, is the base text register.
- **Don't** add gradient fills, hero-metric templates (big number + label + accent gradient), or performative surface polish. This is not Intercom. This is not Notion.
- **Don't** add `box-shadow` to cards, buttons, or panels as decoration. The system is flat; a single shadow breaks the system's visual contract.
- **Don't** use Signal Orange anywhere outside the nav bar and primary action buttons — no orange borders, no orange card accents, no orange table row highlights.
- **Don't** introduce a second typeface. If Jost doesn't serve a context, solve it with weight and size, not a different family.
- **Don't** use `.text-muted` (Neutral Muted, `#6c757d`) for primary body content — it fails 4.5:1 contrast on white. Reserve it for secondary context labels (timestamps, phone numbers, last-message previews).
- **Don't** reinvent standard affordances. Bootstrap's form controls, modals, and navigation are the vocabulary. Custom scrollbars, non-standard dropdowns, and invented form patterns cost consistency without buying anything.
- **Don't** use modals as a first choice for action flows. Most interactions can be inline or progressive disclosure. A modal is earned, not defaulted to.
