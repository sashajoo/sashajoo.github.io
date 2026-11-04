---
permalink: /assets/js/google-analytics-setup.js
---
// Visits from Sasha's own browsers are not counted.
// Open the site once with ?me=1 in a browser to mark it; ?me=0 removes the mark.
(function () {
  try {
    var me = new URLSearchParams(window.location.search).get("me");
    if (me === "1") window.localStorage.setItem("ga-not-me", "1");
    if (me === "0") window.localStorage.removeItem("ga-not-me");
    if (window.localStorage.getItem("ga-not-me") === "1") {
      window["ga-disable-{{ site.google_analytics }}"] = true;
    }
  } catch (e) {}
})();
window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}
gtag("js", new Date());
gtag("config", "{{ site.google_analytics }}");
