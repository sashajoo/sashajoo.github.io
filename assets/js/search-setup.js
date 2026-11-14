let searchTheme = determineComputedTheme();
const ninjaKeys = document.querySelector("ninja-keys");

if (searchTheme === "dark") {
  ninjaKeys.classList.add("dark");
} else {
  ninjaKeys.classList.remove("dark");
}

const openSearchModal = () => {
  // collapse navbarNav if expanded on mobile
  const $navbarNav = $("#navbarNav");
  if ($navbarNav.hasClass("show")) {
    $navbarNav.collapse("hide");
  }
  ninjaKeys.open();
};

// Paging Sasha (/urology-notes/) has the same menu bar but no search of its own.
// Its search icon links to "/#search", which opens the search here (14 Nov 2026).
if (location.hash === "#search") {
  history.replaceState(null, "", location.pathname + location.search);
  window.addEventListener("load", () => setTimeout(openSearchModal, 200));
}
