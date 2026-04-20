# Static SVG Travel Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Leaflet tile map on `_pages/beyond_work_travel.md` with a self-contained static SVG world map (single-request, no tile servers) that renders 48 city markers above the photo grid.

**Architecture:** One Liquid include inlines a pre-generated equirectangular SVG (country outlines only) + a JSON script tag (serialized from `_data/travel_cities.yml`) + a vanilla-JS file. The JS parses the JSON, projects each `{lat, lon}` to SVG viewBox coordinates (linear equirectangular math), and appends a `<circle>` per city. Hover drives an HTML tooltip div positioned inside the figure wrapper. Dark mode is handled purely in CSS via `html[data-theme="dark"]`.

**Tech Stack:** Jekyll 4 (al-folio), Liquid, SCSS, vanilla JS (no framework, no build tooling), Ruby stdlib (for one-off SVG generation from Natural Earth 110m GeoJSON — public domain).

**Approved spec:** `docs/superpowers/specs/2026-04-19-travel-map-static-svg-design.md` (commit `3c853a6`).

**Constraints carried in from brainstorming:**
- Do NOT modify `assets/js/leaflet-setup.js` — it stays to support any future `map: true` page.
- Do NOT touch the existing `.map { … }` block in `_sass/_utilities.scss` (lines 456–559) — same reason.
- Reuse the 48 city coordinates already in the fenced `geojson` block of `_pages/beyond_work_travel.md` **verbatim**. (Coordinates are embedded directly in Task 1 below so the execution agent doesn't need to re-extract them.)

**Dev server (run once at the start, leave running in a second terminal):**
```bash
cd /Users/neogong/Documents/Misc/Homepage/homepage_zhu_sha
docker compose down
docker compose run --rm --service-ports jekyll bash -c "bundle install && bundle exec jekyll serve --livereload --port 8080 --host 0.0.0.0"
```
Site serves at `http://localhost:8080`. Wait ~30–60 s for the first build. Live-reload picks up subsequent file edits.

---

## File structure

| File | Action | Purpose |
|---|---|---|
| `_data/travel_cities.yml` | **create** | Single source of truth: 48 `{name, lat, lon}` entries |
| `_includes/travel_map_world.svg` | **create** (generated, then committed) | Cleaned equirectangular world outline, `viewBox="0 0 1000 500"`, ~80 KB |
| `_includes/travel_map.liquid` | **create** | Wrapper `<figure>` + inline SVG + JSON data script + JS tag |
| `assets/js/travel-map.js` | **create** | Projects coords → adds `<circle>` markers → runs tooltip |
| `_sass/_utilities.scss` | **edit** (append only) | New `.travel-map`, `.travel-map__marker`, `.travel-map__tooltip` blocks |
| `_pages/beyond_work_travel.md` | **edit** | Remove `map: true`, replace geojson block with the Liquid include |
| `_scripts/build_world_svg.rb` | **create** (one-off generator, kept for future refresh) | Downloads Natural Earth 110m GeoJSON and emits the cleaned SVG |

All seven tasks below are additive or localized edits; none touch Leaflet, the existing `.map` block, or any page other than the travel page.

---

## Task 1: Create `_data/travel_cities.yml`

**Files:**
- Create: `_data/travel_cities.yml`

Migrate the 48 city entries from the existing geojson block at `_pages/beyond_work_travel.md:17-70` into a flat YAML list. GeoJSON is `[lon, lat]`; YAML is `{lat, lon}` — don't swap them.

- [ ] **Step 1: Write the data file**

Create `_data/travel_cities.yml` with exactly this content:

```yaml
- name: "Zurich, Switzerland"
  lat: 47.3769
  lon: 8.5417
- name: "Black Forest, Germany"
  lat: 48.0667
  lon: 8.2039
- name: "Cologne, Germany"
  lat: 50.9375
  lon: 6.9603
- name: "Düsseldorf, Germany"
  lat: 51.2277
  lon: 6.7735
- name: "Aachen, Germany"
  lat: 50.7753
  lon: 6.0839
- name: "Berlin, Germany"
  lat: 52.5200
  lon: 13.4050
- name: "Belgrade, Serbia"
  lat: 44.7866
  lon: 20.4489
- name: "Budapest, Hungary"
  lat: 47.4979
  lon: 19.0402
- name: "Milan, Italy"
  lat: 45.4642
  lon: 9.1900
- name: "Lake Como, Italy"
  lat: 45.9876
  lon: 9.2599
- name: "Venice, Italy"
  lat: 45.4408
  lon: 12.3155
- name: "Cortina d'Ampezzo, Italy"
  lat: 46.5405
  lon: 12.1357
- name: "Rome, Italy"
  lat: 41.9028
  lon: 12.4964
- name: "Florence, Italy"
  lat: 43.7696
  lon: 11.2558
- name: "Warsaw, Poland"
  lat: 52.2297
  lon: 21.0122
- name: "Ghent, Belgium"
  lat: 51.0543
  lon: 3.7174
- name: "Bruges, Belgium"
  lat: 51.2093
  lon: 3.2247
- name: "Paris, France"
  lat: 48.8566
  lon: 2.3522
- name: "Marseille, France"
  lat: 43.2965
  lon: 5.3698
- name: "Nice, France"
  lat: 43.7102
  lon: 7.2620
- name: "Reykjavik, Iceland"
  lat: 64.1466
  lon: -21.9426
- name: "Prague, Czech Republic"
  lat: 50.0755
  lon: 14.4378
- name: "Athens, Greece"
  lat: 37.9838
  lon: 23.7275
- name: "Santorini, Greece"
  lat: 36.3932
  lon: 25.3962
- name: "Amsterdam, Netherlands"
  lat: 52.3676
  lon: 4.9041
- name: "Yantai, China"
  lat: 37.4638
  lon: 121.4476
- name: "Jinan, China"
  lat: 36.6512
  lon: 117.0009
- name: "Guangzhou, China"
  lat: 23.1291
  lon: 113.2644
- name: "Beijing, China"
  lat: 39.9042
  lon: 116.4074
- name: "Kunming, China"
  lat: 24.8801
  lon: 102.8329
- name: "Leshan, China"
  lat: 29.5522
  lon: 103.7551
- name: "Emei Mountain, China"
  lat: 29.5208
  lon: 103.4840
- name: "Aksu, China"
  lat: 41.1682
  lon: 80.2654
- name: "Wensu Grand Canyon, China"
  lat: 41.8900
  lon: 80.2700
- name: "Seoul, South Korea"
  lat: 37.5665
  lon: 126.9780
- name: "Bali, Indonesia"
  lat: -8.4095
  lon: 115.1889
- name: "Brisbane, Australia"
  lat: -27.4698
  lon: 153.0251
- name: "Santa Cruz, USA"
  lat: 36.9741
  lon: -122.0308
- name: "Mount Tamalpais, USA"
  lat: 37.9235
  lon: -122.5960
- name: "Hearst Castle, USA"
  lat: 35.6852
  lon: -121.1685
- name: "New Orleans, USA"
  lat: 29.9511
  lon: -90.0715
- name: "San Francisco, USA"
  lat: 37.7749
  lon: -122.4194
- name: "Honolulu, USA"
  lat: 21.3099
  lon: -157.8583
- name: "Texas, USA"
  lat: 30.2672
  lon: -97.7431
- name: "Ann Arbor, USA"
  lat: 42.2808
  lon: -83.7430
- name: "Los Angeles, USA"
  lat: 34.0522
  lon: -118.2437
- name: "Las Vegas, USA"
  lat: 36.1699
  lon: -115.1398
- name: "Lake Tahoe, USA"
  lat: 39.0968
  lon: -120.0324
```

- [ ] **Step 2: Verify YAML parses and the count is 48**

Run from project root:
```bash
ruby -ryaml -e 'd = YAML.load_file("_data/travel_cities.yml"); puts d.length; puts d.all? { |c| c.key?("name") && c["lat"].is_a?(Numeric) && c["lon"].is_a?(Numeric) }'
```
Expected output:
```
48
true
```

- [ ] **Step 3: Commit**

```bash
git add _data/travel_cities.yml
git commit -m "$(cat <<'EOF'
Add travel_cities data file (48 cities)

Single source of truth for the Travel page map. Coordinates migrated
verbatim from the prior geojson block.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Generate `_includes/travel_map_world.svg` via a one-off Ruby script

**Files:**
- Create: `_scripts/build_world_svg.rb`
- Create: `_includes/travel_map_world.svg` (the generator's output, committed)

Natural Earth 110m countries (CC0 / public domain) has pre-simplified country polygons that render well at ~1000×500 px. We fetch once, project equirectangular-linear, and emit a clean SVG with country paths grouped under `.travel-map__countries`. The script is kept in `_scripts/` so we can regenerate if the source ever updates.

- [ ] **Step 1: Write the generator script**

Create `_scripts/build_world_svg.rb`:

```ruby
#!/usr/bin/env ruby
# Regenerate _includes/travel_map_world.svg from Natural Earth 110m countries.
# Run from project root:  ruby _scripts/build_world_svg.rb

require "net/http"
require "json"
require "uri"

SOURCE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/" \
         "master/geojson/ne_110m_admin_0_countries.geojson"
OUT = "_includes/travel_map_world.svg"
W = 1000
H = 500

puts "Fetching #{SOURCE}"
geojson = JSON.parse(Net::HTTP.get(URI(SOURCE)))

project = ->(lon, lat) {
  x = ((lon + 180.0) / 360.0) * W
  y = ((90.0 - lat) / 180.0) * H
  [format("%.2f", x), format("%.2f", y)]
}

ring_to_d = ->(ring) {
  ring.each_with_index.map { |(lon, lat), i|
    x, y = project.call(lon, lat)
    i.zero? ? "M#{x} #{y}" : "L#{x} #{y}"
  }.join(" ") + " Z"
}

paths = geojson["features"].map { |f|
  geom = f["geometry"]
  next nil unless geom
  polys = case geom["type"]
          when "Polygon"      then [geom["coordinates"]]
          when "MultiPolygon" then geom["coordinates"]
          else []
          end
  d = polys.flatten(1).map(&ring_to_d).join(" ")
  d.empty? ? nil : %(  <path d="#{d}"/>)
}.compact

File.write(OUT, <<~SVG)
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 #{W} #{H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
  <g class="travel-map__countries">
  #{paths.join("\n")}
  </g>
  </svg>
SVG

puts "Wrote #{OUT} (#{File.size(OUT)} bytes, #{paths.length} country paths)"
```

- [ ] **Step 2: Run the generator**

Run from project root:
```bash
ruby _scripts/build_world_svg.rb
```
Expected output (approximate):
```
Fetching https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
Wrote _includes/travel_map_world.svg (NNNNN bytes, 177 country paths)
```
Byte size should be between 40 KB and 150 KB. Path count should be between ~170 and ~260. If fetch fails with a TLS or HTTP error, retry once; if it still fails, abort and report back — we need the source to proceed.

- [ ] **Step 3: Sanity-check the generated SVG**

```bash
head -c 200 _includes/travel_map_world.svg
```
Expected first line (exact):
```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
```
Also confirm the file has both opening and closing `<svg>` and the `<g class="travel-map__countries">` wrapper:
```bash
grep -c '^<svg' _includes/travel_map_world.svg
grep -c 'travel-map__countries' _includes/travel_map_world.svg
grep -c '</svg>' _includes/travel_map_world.svg
```
Expected: `1`, `1`, `1`.

- [ ] **Step 4: Commit**

```bash
git add _scripts/build_world_svg.rb _includes/travel_map_world.svg
git commit -m "$(cat <<'EOF'
Add static equirectangular world map SVG

Generated from Natural Earth 110m countries (public domain). Country
paths projected to viewBox 0 0 1000 500 with no inline styles so CSS
drives all appearance. Generator script kept under _scripts/ for future
refresh.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create the Liquid include

**Files:**
- Create: `_includes/travel_map.liquid`

The include does three things: inlines the SVG, serializes the city data into a JSON script tag, and loads the JS with `defer` so execution waits for the DOM (the SVG element it targets is rendered earlier in the same include).

- [ ] **Step 1: Write the include**

Create `_includes/travel_map.liquid`:

```liquid
<figure class="travel-map" role="img" aria-label="World map of places Sasha has visited">
  {% include travel_map_world.svg %}
  <div class="travel-map__tooltip" aria-hidden="true"></div>
</figure>
<script id="travel-cities-data" type="application/json">
{{ site.data.travel_cities | jsonify }}
</script>
<script defer src="{{ '/assets/js/travel-map.js' | relative_url }}"></script>
```

- [ ] **Step 2: Commit**

```bash
git add _includes/travel_map.liquid
git commit -m "$(cat <<'EOF'
Add travel_map Liquid include

Wraps the inline world SVG, tooltip div, serialized city data, and
deferred JS loader. Consumed by the Travel page.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create `assets/js/travel-map.js`

**Files:**
- Create: `assets/js/travel-map.js`

Vanilla JS — no framework, no libraries. Runs once on load (`defer`), projects each city to viewBox coordinates, creates a `<g class="travel-map__markers">` and one `<circle>` per city (each with a child `<title>` for screen readers and hover handlers driving the HTML tooltip). Hover scales the radius via `setAttribute` so we don't depend on the `r` CSS property (inconsistent browser support).

- [ ] **Step 1: Write the JS file**

Create `assets/js/travel-map.js`:

```js
/* Renders city markers on the static world SVG in the Travel page figure.
   Reads city data from the #travel-cities-data JSON script tag emitted by
   the travel_map.liquid include. Uses equirectangular projection because
   the base SVG is equirectangular (viewBox 0 0 1000 500, 2:1). */
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

  const project = (lat, lon) => [
    ((lon + 180) / 360) * W,
    ((90 - lat) / 180) * H,
  ];

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

- [ ] **Step 2: Syntax-check the JS**

Run from project root:
```bash
node --check assets/js/travel-map.js
```
Expected output: (empty, exit code 0)

If `node` isn't available, substitute:
```bash
ruby -e 'content = File.read("assets/js/travel-map.js"); raise "unbalanced braces" unless content.count("{") == content.count("}"); raise "unbalanced parens" unless content.count("(") == content.count(")"); puts "ok"'
```
Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add assets/js/travel-map.js
git commit -m "$(cat <<'EOF'
Add travel-map.js marker renderer

Vanilla JS, no libraries. Reads city data from the JSON script tag,
projects each lat/lon with the equirectangular formula matching the
base SVG's 2:1 viewBox, appends circle markers, and wires up hover
tooltips.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Add `.travel-map` styles to `_sass/_utilities.scss`

**Files:**
- Modify: `_sass/_utilities.scss` — append a new block. **Do NOT edit** the existing `.map` block at lines 456–559 or the `html[data-theme="dark"] .map` block at 541–559.

Insert the new styles **after** the existing `html[data-theme="dark"] .map { … }` block (ends at line 559, just before `swiper-container` at line 561). This keeps the map-related rules grouped without altering the Leaflet block.

- [ ] **Step 1: Insert the new styles**

Apply this edit to `_sass/_utilities.scss`. Use Edit tool with `old_string` set to the line break between the dark-mode `.map` block and `swiper-container`:

Find this exact sequence in the file:
```scss
  .leaflet-control-zoom a {
    background: rgba(30, 41, 59, 0.94);

    &:hover {
      background: rgb(30, 41, 59);
    }
  }
}

swiper-container {
```

Replace with:
```scss
  .leaflet-control-zoom a {
    background: rgba(30, 41, 59, 0.94);

    &:hover {
      background: rgb(30, 41, 59);
    }
  }
}

// Static SVG travel map (see _includes/travel_map.liquid, assets/js/travel-map.js).
// Independent from the Leaflet `.map` block above — both may coexist on the site.
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

  .travel-map__countries path {
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
  .travel-map__countries path {
    fill: rgba(255, 255, 255, 0.13);
    stroke: var(--global-bg-color);
  }
}

swiper-container {
```

- [ ] **Step 2: Verify the existing `.map` block is untouched**

Run:
```bash
grep -n "^\.map {" _sass/_utilities.scss
grep -n "^\.travel-map {" _sass/_utilities.scss
grep -c "leaflet-control-attribution" _sass/_utilities.scss
```
Expected:
- `.map {` still at line 456 (or very close — live-reload may have shifted nothing here)
- `.travel-map {` exists at a higher line number than 456
- `leaflet-control-attribution` count = 2 (unchanged — one rule, one dark-mode override)

- [ ] **Step 3: Verify Jekyll still builds the stylesheet**

If the dev server is running, watch its log for "done in … seconds" after the file save. If you see a Sass compilation error ("Undefined variable", "Invalid CSS", etc.), fix it in place before proceeding. If no dev server, run a one-off build:
```bash
docker compose run --rm jekyll bash -c "bundle install && bundle exec jekyll build"
```
Expected: exits 0 with no Sass errors.

- [ ] **Step 4: Commit**

```bash
git add _sass/_utilities.scss
git commit -m "$(cat <<'EOF'
Add .travel-map styles for static SVG world map

New block sits next to the existing .map (Leaflet) block without
touching it. Theming via existing CSS variables so dark mode reacts
automatically.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire the map into `_pages/beyond_work_travel.md`

**Files:**
- Modify: `_pages/beyond_work_travel.md`

Two changes:
1. Remove `map: true` from frontmatter (prevents `leaflet-setup.js` + Leaflet CSS from loading on this page — they're gated on `page.map` via `_includes/head.liquid` and `_includes/scripts.liquid`).
2. Replace the entire fenced ```` ```geojson … ``` ```` block with `{% include travel_map.liquid %}`.

The intro paragraph above the block stays (lightly rewritten to match the new interaction). Everything under `## Photos` stays untouched.

- [ ] **Step 1: Remove `map: true` from frontmatter**

Apply this edit:

Find (lines 1–8):
```yaml
---
layout: page
permalink: /beyond-work/travel/
title: Travel
description: Trips, trails, and the views along the way.
nav: false
map: true
---
```

Replace with:
```yaml
---
layout: page
permalink: /beyond-work/travel/
title: Travel
description: Trips, trails, and the views along the way.
nav: false
---
```

- [ ] **Step 2: Replace the intro + geojson block with the include**

Find this block (line 14 through line 71 — the intro sentence, the fenced geojson, and its closing fence):
```markdown
A running map of the cities I've set foot in. Click a marker for the name.

```geojson
{
  "type": "FeatureCollection",
  "features": [
```

…through the closing backtick-fence at line 71:
```markdown
    { "type": "Feature", "properties": { "name": "Lake Tahoe, USA" }, "geometry": { "type": "Point", "coordinates": [-120.0324, 39.0968] } }
  ]
}
```
```

Replace the entire span (one-liner intro + fenced block) with:
```markdown
A running map of the cities I've set foot in — hover a dot for the name.

{% include travel_map.liquid %}
```

Use the Edit tool with `old_string` containing the full intro line + the full geojson fenced block including the closing three backticks, and `new_string` as the two lines above.

- [ ] **Step 3: Verify the file**

```bash
grep -c "map: true" _pages/beyond_work_travel.md
grep -c "language-geojson\|\`\`\`geojson" _pages/beyond_work_travel.md
grep -c "{% include travel_map.liquid %}" _pages/beyond_work_travel.md
grep -c "^## Photos" _pages/beyond_work_travel.md
```
Expected: `0`, `0`, `1`, `1`.

- [ ] **Step 4: Commit**

```bash
git add _pages/beyond_work_travel.md
git commit -m "$(cat <<'EOF'
Swap Leaflet map for static SVG travel map on Travel page

Removes map: true frontmatter so Leaflet assets no longer load on this
page; replaces the geojson fenced block with the travel_map include.
Photos section below is unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: End-to-end verification

**Files:** none (read-only checks against the running dev server).

With all edits committed, walk through the verification checklist from the spec. Because live-reload is on, no restart should be needed — but if any step below fails, restart the server first (the "Dev server" command at the top of this plan) before debugging further.

- [ ] **Step 1: Confirm the page returns 200 and has the expected markup**

```bash
curl -s http://localhost:8080/beyond-work/travel/ | grep -c 'class="travel-map"'
curl -s http://localhost:8080/beyond-work/travel/ | grep -c 'id="travel-cities-data"'
curl -s http://localhost:8080/beyond-work/travel/ | grep -c 'travel-map__countries'
curl -s http://localhost:8080/beyond-work/travel/ | grep -c 'src="/assets/js/travel-map.js"'
curl -s http://localhost:8080/beyond-work/travel/ | grep -c 'leaflet'
```
Expected: `1`, `1`, `1`, `1`, `0` (no `leaflet` references — confirms `map: true` was really removed).

- [ ] **Step 2: Confirm all 48 cities are serialized into the JSON script tag**

```bash
curl -s http://localhost:8080/beyond-work/travel/ \
  | ruby -e 'html = STDIN.read; m = html.match(/<script id="travel-cities-data"[^>]*>(.+?)<\/script>/m); raise "no data script" unless m; data = JSON.parse(m[1]); puts data.length; puts data.first.inspect'
```
Expected:
```
48
{"name"=>"Zurich, Switzerland", "lat"=>47.3769, "lon"=>8.5417}
```

- [ ] **Step 3: Confirm the country SVG inlines with a country count roughly matching Task 2**

```bash
curl -s http://localhost:8080/beyond-work/travel/ | grep -o '<path d=' | wc -l
```
Expected: between 170 and 260 (matches the `NNN country paths` message from Task 2 step 2).

- [ ] **Step 4: Open the page in a browser and eyeball it**

Browser: open `http://localhost:8080/beyond-work/travel/` and verify:
1. A world map renders above the Photos grid — clean equirectangular outlines, no tile grid, no broken-image icons, no blank columns.
2. 48 crimson dots distributed across 5 continents (Europe clusters dense; one dot in Brisbane; US dots from Hawaii across to Michigan; China + Southeast Asia dots; etc.).
3. Hover three sample markers: Reykjavik (top-left of Europe), Beijing (middle of China), Brisbane (bottom-right of Australia) — each shows a dark tooltip bubble with the "City, Country" label; the dot visibly grows.
4. Photos section below is unchanged.

If the dev environment blocks a browser, call out that the visual check cannot be completed automatically and request the user verify interactively.

- [ ] **Step 5: Dark mode + responsive check (browser only)**

1. Toggle dark mode via al-folio's theme switcher. Land fill darkens to a translucent off-white; markers stay clearly visible; tooltip inverts (dark text on light background in dark mode due to the `--global-text-color`/`--global-bg-color` swap).
2. Narrow the viewport to ~375 px wide (DevTools device toolbar). Map stays full-width, proportional, markers still aligned.
3. In DevTools, set Network to Offline and hard-reload. Map still renders (all assets are local).

Same caveat as Step 4 — if browser access isn't available, flag the skipped steps.

- [ ] **Step 6: Final confirmation — summarize the result**

Report back to the user:
- All 7 tasks complete.
- Commits created: one per task (6 real commits; Task 7 has no code changes).
- Remaining: any visual/dark-mode checks that had to be deferred to the user.

No commit in this task.

---

## Out of scope (per spec — do not implement here)

- Flight path lines between markers.
- Click-through from marker → photo below.
- Marker clustering or continent coloring.
- Robinson / Natural Earth projections (current equirectangular is intentional for math simplicity).
- A total-count caption beneath the map.

---

## Self-review notes

- **Spec coverage:** Each of the six spec file changes (`_data/travel_cities.yml`, `_includes/travel_map_world.svg`, `_includes/travel_map.liquid`, `assets/js/travel-map.js`, `_sass/_utilities.scss`, `_pages/beyond_work_travel.md`) has a dedicated task. Verification steps in Task 7 map 1:1 to the spec's Verification section.
- **Divergence from spec:** The spec recommended Wikimedia's `BlankMap-Equirectangular.svg` cleaned with SVGOMG. This plan uses Natural Earth 110m + a Ruby generator because (a) it's scriptable and deterministic, (b) it avoids a second toolchain (SVGOMG/svgo), (c) the output SVG is functionally equivalent — same projection, same viewBox, same country outlines. The visual result is the feature the spec cares about; the source is an implementation detail.
- **Type / name consistency:** `.travel-map`, `.travel-map__countries`, `.travel-map__marker`, `.travel-map__tooltip`, `#travel-cities-data`, `_data/travel_cities.yml`, `assets/js/travel-map.js`, `_includes/travel_map.liquid`, `_includes/travel_map_world.svg` — names match across Task 3 (Liquid), Task 4 (JS), Task 5 (SCSS), and Task 6 (page). JS reads `name`, `lat`, `lon` keys — Task 1 writes exactly those keys.
- **Placeholder scan:** No TBDs, no "add error handling," no "similar to above." All code blocks are complete.
