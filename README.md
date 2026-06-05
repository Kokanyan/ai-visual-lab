# AI Visual Lab

Landing page for **AI Visual Lab** — an online course on generative AI for visuals (photos, video, visual taste, faster workflows). Implemented from the Claude Design handoff bundle. The site is **100% in Armenian**, with a bold & pop light aesthetic on a violet (`#7C5CFF`) brand.

## Files

- `index.html` — the page markup (single-page, all sections).
- `styles.css` — the design system + section styles.
- `script.js` — interactions (nav-on-scroll, scroll reveal, tools marquee, FAQ accordion, demo email form, smooth anchor scroll) and the `<image-slot>` custom element.
- `assets/` — brand visuals: `star.jpg` (signature star), `waves.jpg` (decor), `squiggle.jpg`, `gradient.jpg`.

## Sections

Nav · Hero (mega headline + scribble underline + star collage) · Tools marquee · Modules (6 cards) · Stats band (violet) · Audience (4) · Gallery (masonry image-slots) · Mentor · Testimonials (3) · Pricing (3 packages in ֏, featured "Պրո") · FAQ · Final CTA (email) · Footer.

## `<image-slot>` placeholders

Gallery, hero, mentor photo, and testimonial avatars use a self-contained `<image-slot>` web component. Click a slot to browse, or drag an image onto it — it fills with `object-fit: cover`. Fills are session-only (no backend persistence in this static build). All copy is placeholder Armenian text, ready to be swapped for real content.

## Run locally

Any static server, e.g.:

```bash
npx serve .
```
