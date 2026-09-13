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
