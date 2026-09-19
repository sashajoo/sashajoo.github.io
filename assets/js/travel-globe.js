/* Renders the turning globe on the Travel page (see _includes/travel_map.liquid).
   Reads city data from the #travel-cities-data JSON script tag. The globe starts
   over China and turns west; each place lights up the first time it faces front,
   together with its country (or US state). The counts above it are fixed text. Colours come from CSS, so the light
   and dark themes switch without any JS. Needs d3-geo and topojson-client
   (assets/js/travel-globe-vendor.min.js). */
(() => {
  const fig = document.querySelector(".travel-globe");
  const svg = fig?.querySelector("svg");
  const tooltip = fig?.querySelector(".travel-globe__tooltip");
  const dataEl = document.getElementById("travel-cities-data");
  if (!fig || !svg || !tooltip || !dataEl || !window.d3 || !window.topojson) return;

  let cities;
  try {
    cities = JSON.parse(dataEl.textContent);
  } catch (err) {
    console.warn("travel-globe: could not parse city data", err);
    return;
  }
  // Day hikes near home (kind: hike) are not travel, so they are not drawn or counted here.
  cities = cities.filter((c) => typeof c.lat === "number" && typeof c.lon === "number" && c.kind !== "hike");

  const ns = "http://www.w3.org/2000/svg";
  const SIZE = 640;
  const START = [-112, -28]; // centred on China
  const LIGHT_UP_WITHIN = 40; // degrees of longitude from the middle of the view
  const INTRO_SPEED = 0.03; // degrees per ms, one full turn in 12 s
  const IDLE_SPEED = 0.008;
  // Names in travel_cities.yml that differ from the names in the atlas file.
  const ALIAS = { USA: "United States of America", "Czech Republic": "Czechia" };
  const USA = "United States of America";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const el = (name, cls, parent) => {
    const node = document.createElementNS(ns, name);
    if (cls) node.setAttribute("class", cls);
    parent.appendChild(node);
    return node;
  };

  const getJSON = (url) => fetch(url).then((r) => r.json());

  Promise.all([getJSON(fig.dataset.countries), getJSON(fig.dataset.states)])
    .then(([world, us]) => {
      const countries = topojson
        .feature(world, world.objects.countries)
        .features.filter((f) => f.properties.name !== "Antarctica");
      const states = topojson.feature(us, us.objects.states).features;

      // A place lights up its country, or its state when it is in the US.
      cities.forEach((c) => {
        const last = c.name.split(", ").pop();
        c.country = ALIAS[last] || last;
        c.region = c.country;
        if (c.country === USA) {
          const state = states.find((s) => d3.geoContains(s, [c.lon, c.lat]));
          c.region = state ? state.properties.name : null;
        }
      });
      const visitedStates = states.filter((s) => cities.some((c) => c.region === s.properties.name));

      const projection = d3.geoOrthographic().fitExtent(
        [
          [14, 14],
          [SIZE - 14, SIZE - 14],
        ],
        { type: "Sphere" }
      );
      const path = d3.geoPath(projection);

      // Halo is only visible in the dark theme (see _utilities.scss).
      const defs = el("defs", null, svg);
      const grad = el("radialGradient", null, defs);
      grad.setAttribute("id", "travel-globe-halo");
      [
        ["86%", 0.35],
        ["100%", 0],
      ].forEach(([offset, opacity]) => {
        const stop = el("stop", null, grad);
        stop.setAttribute("offset", offset);
        stop.setAttribute("stop-color", "#7fa8ff");
        stop.setAttribute("stop-opacity", opacity);
      });
      const halo = el("circle", "travel-globe__halo", svg);
      halo.setAttribute("cx", SIZE / 2);
      halo.setAttribute("cy", SIZE / 2);
      halo.setAttribute("r", SIZE / 2);
      halo.setAttribute("fill", "url(#travel-globe-halo)");

      const sphere = el("path", "travel-globe__sphere", svg);
      const graticule = el("path", "travel-globe__graticule", svg);
      const graticuleLines = d3.geoGraticule10();
      const landGroup = el("g", null, svg);
      const lands = countries.concat(visitedStates).map((feature) => ({
        feature,
        // The US is lit state by state, never as a whole country.
        key: feature.properties.name === USA ? null : feature.properties.name,
        node: el("path", "travel-globe__land", landGroup),
      }));
      const dotGroup = el("g", "travel-globe__dots", svg);
      const dots = cities.map((city) => {
        const node = el("circle", "travel-globe__dot", dotGroup);
        node.setAttribute("r", "3.8");
        node.addEventListener("mousemove", (evt) => {
          const bounds = fig.getBoundingClientRect();
          tooltip.textContent = city.name;
          tooltip.style.left = `${evt.clientX - bounds.left + 12}px`;
          tooltip.style.top = `${evt.clientY - bounds.top - 28}px`;
          tooltip.classList.add("is-visible");
        });
        node.addEventListener("mouseleave", () => tooltip.classList.remove("is-visible"));
        return { city, node, lit: false };
      });

      // The place and country counts above the globe are fixed text from the include, never animated.
      let litRegions = new Set();

      const updateLands = () => {
        lands.forEach((l) => l.node.classList.toggle("is-lit", l.key !== null && litRegions.has(l.key)));
      };

      const render = () => {
        sphere.setAttribute("d", path({ type: "Sphere" }));
        graticule.setAttribute("d", path(graticuleLines));
        lands.forEach((l) => l.node.setAttribute("d", path(l.feature) || ""));
        const [lambda, phi] = projection.rotate();
        const centre = [-lambda, -phi];
        let changed = false;
        dots.forEach((d) => {
          const point = [d.city.lon, d.city.lat];
          const distance = d3.geoDistance(point, centre);
          const offMiddle = Math.abs(((d.city.lon - centre[0] + 540) % 360) - 180);
          if (!d.lit && offMiddle < LIGHT_UP_WITHIN && distance < Math.PI / 2 - 0.1) {
            d.lit = true;
            changed = true;
            d.node.classList.add("is-lit");
            if (d.city.region) litRegions.add(d.city.region);
          }
          const [x, y] = projection(point);
          d.node.setAttribute("cx", x);
          d.node.setAttribute("cy", y);
          d.node.style.display = d.lit && distance < Math.PI / 2 - 0.04 ? "inline" : "none";
        });
        if (changed) updateLands();
      };

      let intro = true;
      let turned = 0;
      const reset = () => {
        intro = !reduceMotion;
        turned = 0;
        litRegions = new Set();
        projection.rotate(START);
        dots.forEach((d) => {
          d.lit = reduceMotion;
          d.node.classList.toggle("is-lit", reduceMotion);
          if (reduceMotion && d.city.region) litRegions.add(d.city.region);
        });
        updateLands();
        render();
      };
      reset();

      // Turn by itself, but not while the pointer is on it or it is off screen.
      let paused = false;
      let onScreen = true;
      let last = null;
      fig.addEventListener("mouseenter", () => (paused = true));
      fig.addEventListener("mouseleave", () => (paused = false));
      new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting)).observe(fig);
      const tick = (now) => {
        if (last !== null && !paused && onScreen) {
          const dt = Math.min(now - last, 50);
          const step = dt * (intro ? INTRO_SPEED : IDLE_SPEED);
          const [lambda, phi] = projection.rotate();
          projection.rotate([lambda + step, phi]);
          turned += step;
          if (turned > 380) intro = false;
          render();
        }
        last = now;
        requestAnimationFrame(tick);
      };
      if (!reduceMotion) requestAnimationFrame(tick);

      // Drag to spin. Vertical swipes on a phone still scroll the page (touch-action: pan-y).
      let dragFrom = null;
      svg.addEventListener("pointerdown", (evt) => {
        dragFrom = [evt.clientX, evt.clientY];
        svg.setPointerCapture(evt.pointerId);
        svg.classList.add("is-dragging");
      });
      svg.addEventListener("pointermove", (evt) => {
        if (!dragFrom) return;
        const scale = (SIZE / svg.getBoundingClientRect().width) * 0.3;
        const [lambda, phi] = projection.rotate();
        const dx = (evt.clientX - dragFrom[0]) * scale;
        const dy = evt.pointerType === "touch" ? 0 : (evt.clientY - dragFrom[1]) * scale;
        projection.rotate([lambda + dx, Math.max(-60, Math.min(60, phi - dy))]);
        dragFrom = [evt.clientX, evt.clientY];
        render();
      });
      const endDrag = () => {
        dragFrom = null;
        svg.classList.remove("is-dragging");
      };
      svg.addEventListener("pointerup", endDrag);
      svg.addEventListener("pointercancel", endDrag);

      fig.querySelector(".travel-globe__replay").addEventListener("click", reset);
      fig.classList.add("travel-globe--ready");
    })
    .catch((err) => console.warn("travel-globe: could not load map data", err));
})();
