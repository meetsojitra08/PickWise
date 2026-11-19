/* global window, document */
(function initPickwiseTheme() {
  try {
    var stored = window.localStorage.getItem('pickwise-theme');
    var isDark =
      stored === 'dark' ||
      (stored !== 'light' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.classList.toggle('dark', isDark);
  } catch {
    // Ignore storage or matchMedia access errors in restricted contexts.
  }
})();
