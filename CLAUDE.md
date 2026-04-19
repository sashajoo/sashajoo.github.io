# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the personal academic homepage of **Sasha Zhu, MD, PhD** (Sha Zhu), a Postdoctoral Scholar at UCSF. It is built on the [al-folio](https://github.com/alshedivat/al-folio) Jekyll theme for academics.

## Local Development

**Recommended (Docker):**

The Docker image has a git-based gem (`jekyll-terser`) that must be installed at runtime. Use this instead of plain `docker compose up`:
```bash
docker compose down  # stop any running instance first
docker compose run --rm --service-ports jekyll bash -c "bundle install && bundle exec jekyll serve --livereload --port 8080 --host 0.0.0.0"
```
Site runs at `http://localhost:8080` with live reload. The build takes ~30–60 s before the server starts.

**Slim image (faster startup):**
```bash
docker compose -f docker-compose-slim.yml up
```

**Without Docker (requires Ruby + Bundler + Python/pip):**
```bash
bundle install
pip install jupyter
bundle exec jekyll serve
# Site at http://localhost:4000
```

**Build only (no server):**
```bash
bundle exec jekyll build
# Output in _site/
```

## Content Architecture

All personal content lives in these directories — edit these to update the site:

| Directory / File | Purpose |
|---|---|
| `_pages/about.md` | Homepage bio and profile configuration |
| `_pages/beyond_work*.md` | "Beyond Work" dropdown: parent + child pages (`My cat`, `Travel`) |
| `_bibliography/papers.bib` | All publications in BibTeX format |
| `_news/` | News items shown on the homepage |
| `_data/` | Structured data (CV, social links, etc.) |
| `assets/` | Images, PDFs, JSON resume |
| `assets/img/beyond_work/` | Photos shown on the Beyond Work child pages |

## Publications (`papers.bib`)

Publications are managed entirely via `_bibliography/papers.bib`. Key custom BibTeX fields understood by the theme:

- `selected={true}` — shows paper in the "Selected Publications" section on the homepage
- `abbr={...}` — journal/conference badge shown on the publication card
- `preview={image.jpg}` — thumbnail image from `assets/img/publication_preview/`
- `pdf={...}`, `html={...}`, `code={...}`, `poster={...}` — link buttons on the card
- `google_scholar_id={...}` — enables the Google Scholar citation badge
- `abstract={...}` — shown in collapsible section
- `annotation={...}` — shown as a note below the citation

The scholar name matching for bold author highlighting is configured in `_config.yml` under `scholar.last_name` and `scholar.first_name`.

## Site Configuration (`_config.yml`)

Key settings to be aware of:
- `url` and `baseurl` — must be set correctly for deployment (left blank for local dev)
- `scholar.last_name` / `scholar.first_name` — controls which author name is bolded in publication lists
- `enable_publication_badges` — toggles Altmetric, Dimensions, Google Scholar badges
- `max_author_limit` — number of authors shown before "et al." collapse

## Pages

Pages in `_pages/` use Jekyll front matter. The `about.md` page controls:
- `selected_papers: true` — show selected publications section
- `announcements.enabled` — show news feed
- Profile image is `assets/img/prof_pic.jpg`

## Navbar and page visibility

Top-nav entries are driven by `nav: true` + `nav_order: N` in page frontmatter; the renderer is `_includes/header.liquid`. A page can exist without appearing in nav (`nav: false`, e.g. `_pages/cv.md` is hidden while still reachable at `/cv/`). Dropdowns use `dropdown: true` + a `children:` list of `{title, permalink}` on a parent page — see `_pages/beyond_work.md`. For dropdown active-state highlighting to work, the child page's own `title` frontmatter must match the parent's `children.*.title` exactly.

## Images

Photos live under `assets/img/`. The `jekyll-imagemagick` plugin (configured in `_config.yml`) auto-generates responsive WebP variants at 480/800/1400 px — but **only for lowercase extensions** (`.jpg`, `.jpeg`, `.png`, `.tiff`, `.gif`). A file named `IMG_0001.JPG` will be served at full resolution with no variants; rename to lowercase before committing. On the case-insensitive macOS filesystem a direct `mv foo.JPG foo.jpg` is a no-op — rename via a temp name (`mv foo.JPG foo.tmp && mv foo.tmp foo.jpg`).

Camera originals are often 8–15 MB each. Downsize to ~2400 px on the long edge before committing to keep the repo lean:
```bash
sips -Z 2400 source.JPG --out assets/img/beyond_work/python/source.jpg
```

Embed photos in markdown pages with the theme's include inside Bootstrap rows/cols:
```liquid
{% include figure.liquid path="assets/img/..." class="img-fluid rounded z-depth-1" zoomable=true %}
```

## Deployment

Pushing to `main` automatically triggers GitHub Actions deployment to GitHub Pages (`gh-pages` branch). Do **not** manually edit the `gh-pages` branch.
