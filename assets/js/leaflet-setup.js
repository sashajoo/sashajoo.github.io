/* Renders ```geojson``` fenced blocks as a Leaflet map with refined styling. */
document.addEventListener("readystatechange", () => {
  if (document.readyState !== "complete") return;

  const LIGHT_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const DARK_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const TILE_OPTS = {
    maxZoom: 19,
    /* Render a single non-wrapping world so tiles don't duplicate into gaps
       when the viewport is wider than the world at low zoom levels. */
    noWrap: true,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };

  const isDark = () =>
    document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.hasAttribute("data-theme") && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);

  const markerBase = {
    radius: 6,
    color: "#ffffff",
    weight: 2,
    fillColor: "#e11d48",
    fillOpacity: 0.95,
  };
  const markerHover = { radius: 8, fillOpacity: 1 };

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  document.querySelectorAll("pre>code.language-geojson").forEach((elem) => {
    const jsonData = elem.textContent;
    const backup = elem.parentElement;
    backup.classList.add("unloaded");

    const mapElement = document.createElement("div");
    mapElement.classList.add("map");
    backup.after(mapElement);

    const map = L.map(mapElement, {
      scrollWheelZoom: false,
      minZoom: 1,
    });

    const tiles = L.tileLayer(isDark() ? DARK_TILES : LIGHT_TILES, TILE_OPTS).addTo(map);

    const geoJSON = L.geoJSON(JSON.parse(jsonData), {
      pointToLayer: (_, latlng) => L.circleMarker(latlng, markerBase),
      onEachFeature: (feature, layer) => {
        if (!feature.properties?.name) return;
        layer.bindPopup(`<span class="map-popup-name">${escapeHtml(feature.properties.name)}</span>`, { closeButton: false, offset: L.point(0, -2) });
        layer.on?.("mouseover", () => layer.setStyle(markerHover));
        layer.on?.("mouseout", () => layer.setStyle(markerBase));
      },
    }).addTo(map);

    const bounds = geoJSON.getBounds();

    /* Fix for "tiles broken into grid pieces": the container's final size isn't
       known at init, so fitBounds picks the wrong zoom and tiles render for the
       wrong viewport. Refit after the first paint; invalidate on every later resize. */
    const refit = () => {
      map.invalidateSize({ animate: false });
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] });
    };
    requestAnimationFrame(refit);

    const invalidate = () => map.invalidateSize({ animate: false });
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(invalidate).observe(mapElement);
    }
    window.addEventListener("resize", invalidate);

    new MutationObserver(() => tiles.setUrl(isDark() ? DARK_TILES : LIGHT_TILES)).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  });
});
