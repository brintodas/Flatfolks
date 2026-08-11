# Flatfolks Project — Design Style Rules

## Purpose
UI and design decisions should look like they were made by a student who knows
basic web design but isn't a professional UI/UX designer. Avoid "too polished" or
"AI-generated design system" look.

---

## Layout & Spacing
- Spacing does not need to be perfectly consistent across every section.
  Some sections can have more padding, some less — this is natural.
- Not every section needs a centered title + subtitle + content layout.
  Mix it up — some sections can be left-aligned, some split into two columns.
- Avoid making every single section exactly the same height or rhythm.
- It's okay for some pages to feel slightly denser or slightly more sparse.
- Don't add decorative background blobs/circles to every dark section.
  Use them occasionally, not everywhere.

## Colors
- Stick to the white and blue palette but it does not need to be perfectly
  harmonious everywhere. Use plain `#1e40af`, `#2563eb`, `#3b82f6`, white, and slate grays.
- Avoid using 10 different shades of blue in one component. Pick 2-3 and use them.
- Not every button needs a gradient. Solid colors look more natural for student work.
- Avoid glassmorphism (backdrop-blur + semi-transparent backgrounds) everywhere.
  Use it in 1-2 places max, like the hero floating badges.

## Typography
- Use Inter font throughout. Font sizes don't need micro-adjustment on every element.
- Headings: bold or black weight. Body: normal or medium. Keep it simple.
- Avoid using too many font-size variations in one section (e.g., text-xs, sm, base, lg, xl all together).
- Letter-spacing and line-height tweaks should be minimal and only where really needed.

## Components & Cards
- Cards don't all need to be identical. Slight variation in what's shown is fine.
- Not every card needs a hover animation. Some can be static — that is human.
- Avoid adding shadows to absolutely everything. Use shadows only on cards, modals, navbars.
- Badges and tags should be simple. Don't stack too many visual elements in one small space.
- Icons should be used meaningfully, not decoratively on every single element.

## Animations & Interactions
- Keep animations minimal. 1-2 subtle hover effects per section is enough.
- Avoid animating every element on page load with staggered delays.
- Do NOT add scroll-reveal animations to every single section — this screams AI/template.
- Simple `hover:bg-blue-700` transitions are more natural than complex keyframe animations.
- Floating/bouncing elements should be used only in the hero, not everywhere.

## Forms
- Forms should be simple and clean. Not every input needs an icon inside it.
- Labels above inputs, basic placeholder text. No over-styled form fields.
- Submit button should be straightforward — solid color, simple label.

## What to AVOID (these make UI look AI-generated)
- Do NOT put a decorative gradient blob in every section background.
- Do NOT give every single element a hover:shadow and hover:-translate-y effect.
- Do NOT use glassmorphism cards everywhere.
- Do NOT add a colored left-border accent to every card or stat.
- Do NOT use perfectly identical card grids for every single section.
- Do NOT add "See all →" links to every section header.
- Do NOT wrap every icon in a perfectly rounded colored box with a shadow.
- Avoid making the page feel like a Tailwind component library showcase.
- Avoid perfectly symmetric 3-column or 4-column grids for absolutely everything.

## Things That Make It Look Student-Made (Good)
- One or two sections that are just plain text + a button, nothing fancy.
- A footer that works but isn't overly designed.
- Some inconsistency in card heights or layouts across sections.
- A form page that is functional but simply styled.
- Occasional use of plain `<hr>` or `border-t` dividers between sections.
- Some buttons are outlined, some are filled — not everything is the same button style.
