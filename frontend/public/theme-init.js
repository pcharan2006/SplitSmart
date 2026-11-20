// Runs before the page paints so there is no flash of the wrong theme.
// (Kept as its own file because the production Content-Security-Policy blocks inline scripts.)
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
