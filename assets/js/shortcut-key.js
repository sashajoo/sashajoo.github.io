// Check if the user is on a Mac and update the shortcut key for search accordingly
document.addEventListener("readystatechange", () => {
  if (document.readyState === "interactive") {
    let isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    let shortcutKeyElement = document.querySelector("#search-toggle .search-hint");
    if (shortcutKeyElement && isMac) {
      // use the unicode for command key; the phone-menu "Search" word stays
      shortcutKeyElement.innerHTML = "&#x2318; k";
    }
  }
});
