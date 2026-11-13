# stellargrid.in: Apple-style redesign

A static site with no build step: plain HTML, one CSS file and two small JS files.
Deploy the contents of this folder as the site root (Vercel: set **Root Directory** to `stellargrid`).

```
index.html          Home
services.html       Services (anchors: #rooftop #ground-mount #open-access #finance #om)
projects.html       Portfolio with filters
calculator.html     Solar savings calculator + 20-year financial snapshot
contact.html        Lead form
blog/               Insights (SEO articles)
assets/css/style.css
assets/js/site.js        nav, theme, animations, carousel, filters, lead form
assets/js/calculator.js  calculator (same math as the previous site)
images/projects/    put real project photos here
sitemap.xml, robots.txt, 404.html
dark.html           old link kept: switches to dark theme, then opens the home page
```

Preview locally: `python3 -m http.server` inside this folder, then open http://localhost:8000.

## Adding real project photos

1. Export photos as JPG/WebP, about 1600 px wide, under 400 KB each.
   Name them descriptively, for example `500kw-rooftop-jaipur.jpg`. Descriptive names help SEO.
2. Put them in `images/projects/`.
3. In `projects.html`, find the commented `ADD A REAL PROJECT` block. Copy it below the comment,
   remove the `<!--` and `-->`, then fill in the photo path, alt text, title and specs.
   `data-category` controls the filter buttons: `rooftop`, `ground`, `residential` or `om`.
   Add `wide` to the class (`class="project wide reveal"`) for a double-width feature card.
4. To swap a stock image anywhere else, replace its `src="https://images.unsplash.com/..."` with your
   `images/projects/...` path.

## Adding a blog post

1. Copy `blog/capex-vs-resco-vs-ppa.html` to a new file with a keyword-rich name, for example
   `blog/rooftop-solar-cost-rajasthan.html`.
2. Update `<title>`, `<meta name="description">`, `canonical`, the `og:` tags, the JSON-LD block
   (headline, description, dates, URL), and the article body.
3. Add a card for it in `blog/index.html` (copy the existing `<a class="post-card">` block).
4. Add its URL to `sitemap.xml`.

## Lead form

The previous site used Netlify Forms, but it's hosted on Vercel, so enquiries were not being saved.
The form now opens WhatsApp (+91 97775 29953) with the visitor's details already filled in.
To also receive enquiries by email, create a free form at Formspree (or Getform or Web3Forms) and paste its
endpoint URL into `FORM_ENDPOINT` at the top of `assets/js/site.js`.

## Calculator

`assets/js/calculator.js` keeps the original tariff table, price slabs (₹45k / 35k / 27k / 25k per kW),
EMI at 10.5% with 25:75 equity:debt, 5% tariff and O&M escalation, degradation, the 20-year table, chart
and one-pager download. It was tested against the live calculator and produces identical outputs.
Edit `tariffTable` or `rateForCapacity()` there to update rates.
