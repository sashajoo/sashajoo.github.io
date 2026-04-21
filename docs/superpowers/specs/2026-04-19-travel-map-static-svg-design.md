# Static SVG World Map for the Travel Page

## Context

`_pages/beyond_work_travel.md` on the user's al-folio Jekyll homepage shows
their trip photos and needs a world map above the photo grid displaying the
~48 cities they've visited.

The prior attempt used al-folio's built-in Leaflet + a fenced `geojson` code
block + a `map: true` frontmatter flag. After four iterations (bounds,
noWrap, invalidateSize/ResizeObserver, different tile CDNs, OpenStreetMap
fallback), tiles still rendered with visible gaps and unloaded chunks in the
user's browser. Tile-based rendering is inherently fragile: dozens of
separate HTTP requests, any one of which can fail silently due to network
conditions, browser extensions, caching, or CDN throttling.

This spec replaces that approach with a **self-contained static SVG world
map + vanilla-JS marker overlay**. No tile servers, no CDN-dependent
rendering — the map is a single SVG committed to the repo, and markers are
projected from a data file at page load.

## Goals

- Render a polished world map on the Travel page above the photo grid, with
  all ~48 cities visible as markers.
- Zero external network requests for the map itself.
- Identical render for every visitor, every time.
- Accessible: markers have accessible names; native `<title>` tooltips
  supplement the custom visual tooltip.
- Visually consistent with the rest of the al-folio site — a calm,
  editorial "framed print" feel; dark-mode aware.
- Easy to extend: add a city by appending an entry to one data file.

## Non-goals

- Interactive zoom or pan.
- Flight path lines, animated transitions, or click-through to photos.
- Country-level click interactions.
- Marker clustering.
- Regenerating the base SVG at runtime or from TopoJSON.

## Architecture

```
_pages/beyond_work_travel.md
  └── {% include travel_map.liquid %}
        ├── <figure class="travel-map">
        │     ├── {% include travel_map_world.svg %}  ← inlined base map
        │     └── <div class="travel-map__tooltip">   ← visual tooltip
        └── <script id="travel-cities-data">          ← {{ site.data.travel_cities | jsonify }}
        └── <script defer src="/assets/js/travel-map.js">

_data/travel_cities.yml            ← 48 entries (single source of truth)
_includes/travel_map.liquid        ← wrapper + inline SVG + data + script
_includes/travel_map_world.svg     ← base world outline, static
assets/js/travel-map.js            ← projects coords, appends markers, runs tooltip
_sass/_utilities.scss              ← .travel-map + .travel-map__marker styling
```

**Page-load flow:**

1. Jekyll renders `{% include travel_map.liquid %}` into the travel page,
   inlining the SVG and serializing `_data/travel_cities.yml` to a JSON
   script tag.
2. The SVG renders immediately with country outlines (no markers yet).
3. `travel-map.js` runs on DOMContentLoaded, parses the embedded JSON,
   projects each `{lat, lon}` to SVG viewBox coordinates using the
   equirectangular formula, and appends a `<circle>` element (with a
   `<title>` child for a11y) into a `<g class="travel-map__markers">` under
   the SVG.
4. The JS also wires up mouseenter/move/leave handlers on each marker that
   drive the `.travel-map__tooltip` div (a standard HTML element, not an
   SVG element, positioned absolutely within the `.travel-map` wrapper).

## File-by-file

### `_data/travel_cities.yml` (new)

The single source of truth for all markers. Jekyll reads any `_data/*.yml`
file and exposes it as `site.data.travel_cities`. Format:

```yaml
- name: "Zurich, Switzerland"
  lat: 47.3769
  lon: 8.5417
- name: "Black Forest, Germany"
  lat: 48.0667
  lon: 8.2039
# ... 46 more entries, reusing the exact coordinates from the old geojson block
```

Adding a new city later = one new YAML entry. No code touched.

### `_includes/travel_map_world.svg` (new, ~30 KB)

A static world map — country outlines only, no labels.

**Source:** Wikimedia Commons `BlankMap-Equirectangular.svg`
(<https://commons.wikimedia.org/wiki/File:BlankMap-Equirectangular.svg>) —
Public Domain. Equirectangular projection so our projection math is trivial
(a single lat/lon → x/y division).

**Preprocessing steps (done once, committed output):**

1. Download the SVG file.
2. Run through SVGOMG (or `svgo` CLI) with default settings to strip editor
   metadata, comments, and unused attributes.
3. Ensure `viewBox="0 0 1000 500"` (2:1 aspect matches equirectangular's
   360:180 degrees).
4. Remove inline `fill`, `stroke`, `style` attributes from country paths so
   CSS controls appearance fully.
5. Wrap country paths in `<g class="travel-map__countries">` if not
   already grouped.

The cleaned SVG lives in `_includes/` (not `assets/img/`) because Jekyll's
`{% include file.svg %}` directive inlines files from that directory
verbatim, giving us single-request delivery with no FOUC.

### `_includes/travel_map.liquid` (new)

```liquid
<figure
  class="travel-map"
  role="img"
  aria-label="World map of places Sasha has visited"
>
  {% include travel_map_world.svg %}
  <div class="travel-map__tooltip" aria-hidden="true"></div>
</figure>
<script id="travel-cities-data" type="application/json">
  {{ site.data.travel_cities | jsonify }}
</script>
<script defer src="{{ '/assets/js/travel-map.js' | relative_url }}"></script>
```

`jsonify` converts the YAML data to JSON at build time — no runtime fetch,
no CORS concerns.

### `assets/js/travel-map.js` (new, ~60 lines)

```js
(() => {
  const container = document.querySelector(".travel-map");
  const svg = container?.querySelector("svg");
  const tooltip = container?.querySelector(".travel-map__tooltip");
  const dataEl = document.getElementById("travel-cities-data");
  if (!container || !svg || !tooltip || !dataEl) return;

  let cities;
  try {
    cities = JSON.parse(dataEl.textContent);
  } catch (err) {
    console.warn("travel-map: could not parse city data", err);
    return;
  }

  const ns = "http://www.w3.org/2000/svg";
  const viewBox = svg.viewBox.baseVal;
  const W = viewBox.width || 1000;
  const H = viewBox.height || 500;

  /* Equirectangular projection: lon in [-180,180] maps linearly across W,
     lat in [-90,90] maps linearly (inverted) down H. */
  const project = (lat, lon) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];

  const markers = document.createElementNS(ns, "g");
  markers.setAttribute("class", "travel-map__markers");

  const positionTooltip = (evt) => {
    const bounds = container.getBoundingClientRect();
    tooltip.style.left = `${evt.clientX - bounds.left + 12}px`;
    tooltip.style.top = `${evt.clientY - bounds.top - 28}px`;
  };

  cities.forEach(({ name, lat, lon }) => {
    if (typeof lat !== "number" || typeof lon !== "number") return;
    const [cx, cy] = project(lat, lon);

    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", "4");
    circle.setAttribute("class", "travel-map__marker");

    const title = document.createElementNS(ns, "title");
    title.textContent = name;
    circle.appendChild(title);

    circle.addEventListener("mouseenter", (e) => {
      circle.setAttribute("r", "6");
      tooltip.textContent = name;
      tooltip.classList.add("is-visible");
      positionTooltip(e);
    });
    circle.addEventListener("mousemove", positionTooltip);
    circle.addEventListener("mouseleave", () => {
      circle.setAttribute("r", "4");
      tooltip.classList.remove("is-visible");
    });

    markers.appendChild(circle);
  });

  svg.appendChild(markers);
  container.classList.add("travel-map--ready");
})();
```

Hover state is handled in JS (rather than CSS `r:`) so it works in all
browsers regardless of whether they support the `r` CSS property on SVG
circles.

### `_sass/_utilities.scss` additions

Append a new block (do NOT touch the existing `.map { ... }` block — it is
still used by `_posts.disabled/2024-01-26-geojson-map.md` and any future
`map: true` page):

```scss
.travel-map {
  position: relative;
  margin: 1.75rem 0 2.25rem;
  padding: 0.75rem;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--global-divider-color);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.05),
    0 18px 40px -20px rgba(15, 23, 42, 0.22);
  background: var(--global-bg-color);

  svg {
    display: block;
    width: 100%;
    height: auto;
    max-height: 520px;
  }

  .travel-map__countries path,
  svg > path,
  svg g path {
    fill: var(--global-divider-color);
    stroke: var(--global-bg-color);
    stroke-width: 0.5;
    vector-effect: non-scaling-stroke;
    opacity: 0.55;
  }
}

.travel-map__marker {
  fill: #e11d48;
  stroke: #ffffff;
  stroke-width: 1.25;
  fill-opacity: 0.92;
  cursor: pointer;
  transition: fill-opacity 120ms ease;

  &:hover {
    fill-opacity: 1;
  }
}

.travel-map__tooltip {
  position: absolute;
  pointer-events: none;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  background: var(--global-text-color);
  color: var(--global-bg-color);
  border-radius: 6px;
  opacity: 0;
  transform: translateY(2px);
  transition:
    opacity 120ms,
    transform 120ms;
  white-space: nowrap;
  z-index: 10;

  &.is-visible {
    opacity: 0.92;
    transform: translateY(0);
  }
}

html[data-theme="dark"] .travel-map {
  svg path {
    fill: rgba(255, 255, 255, 0.13);
    stroke: var(--global-bg-color);
  }
}
```

### `_pages/beyond_work_travel.md` (edit)

Remove `map: true` from frontmatter. Replace the `## Places I've been`
section contents (the intro paragraph + the entire ```geojson block) with a
single Liquid include. Keep the `## Photos` heading and existing photo
grid below untouched.

Before (abridged):

````markdown
---
… nav: false
map: true
---

Outside the lab…

## Places I've been

A running map of the cities I've set foot in. Click a marker for the name.

```geojson
{ …48 features… }
```
````

## Photos

A few recent favorites:

<div class="row mt-3">…photos…</div>
```

After:

```markdown
---
… nav: false
---

Outside the lab…

## Places I've been

A running map of the cities I've set foot in — hover a dot for the name.

{% include travel_map.liquid %}

## Photos

A few recent favorites:

<div class="row mt-3">…photos…</div>
```

No other files (`assets/js/leaflet-setup.js`, the existing `.map` CSS
block) need reverting. They stay useful for any future `map: true` page.

## Verification

1. From project root, restart the dev server (the Docker image requires the
   runtime `bundle install`):
   ```bash
   docker compose down
   docker compose run --rm --service-ports jekyll \
     bash -c "bundle install && bundle exec jekyll serve --livereload --port 8080 --host 0.0.0.0"
   ```
2. Open `http://localhost:8080/beyond-work/travel/`.
3. Confirm: the world map renders as a clean static outline above the
   Photos section, with 48 crimson dots distributed across five continents.
4. Confirm there are **no blank columns, no missing tiles, no broken-image
   icons** — the map is a single SVG, rendered atomically.
5. Hover 3 markers (e.g., Reykjavik, Beijing, Brisbane). Each shows its
   "City, Country" label beside the cursor; the dot grows slightly on
   hover.
6. Resize the viewport from 1400 px down to 320 px. Map stays proportional,
   markers stay aligned to their continents.
7. Toggle dark mode (al-folio's theme switcher). Land fill darkens; markers
   remain clearly visible; tooltip contrast inverts correctly.
8. In DevTools, go offline and hard-reload. Map still renders (all assets
   are local).
9. Screen reader check: NVDA / VoiceOver announces each marker's name
   when focused via keyboard traversal (driven by the inline `<title>`).

## Risks & mitigations

| Risk                                                             | Mitigation                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| FOUC: markers appear ~50–100 ms after the SVG                    | Accept. The base map alone is still a meaningful rendering; markers pop in almost instantly on cached loads. |
| Source SVG has unexpected viewBox or nested transforms           | Resolved during preprocessing. Spec requires `viewBox="0 0 1000 500"` after cleanup.                         |
| `vector-effect: non-scaling-stroke` is a progressive enhancement | Gracefully degrades to scaled strokes in old browsers; purely cosmetic.                                      |
| Editor copies YAML with tabs (Jekyll rejects tabs)               | Standard — authors use spaces; we're not introducing a new convention.                                       |
| User toggles dark mode after page loads                          | CSS `html[data-theme="dark"]` selector handles it reactively. No JS needed.                                  |

## Out of scope (explicit non-goals for this change; candidates for future work)

- Swap equirectangular for Robinson or Natural Earth projection (more
  visually elegant but needs runtime projection library or pre-computed
  marker coordinates).
- Color markers by continent.
- Click a marker to scroll to / highlight a photo below.
- A caption or total-count ("48 cities on 5 continents") beneath the map.
- A separate stats widget elsewhere on the site using the same
  `_data/travel_cities.yml` source.
