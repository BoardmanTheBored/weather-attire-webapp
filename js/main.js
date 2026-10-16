// Wiring and routing. Two screens share one page; the hash decides which shows.
const screens = {
  main: document.getElementById('screen-main'),
  info: document.getElementById('screen-info'),
};

function route({ moveFocus }) {
  const showInfo = location.hash === '#/info';
  screens.main.hidden = showInfo;
  screens.info.hidden = !showInfo;
  window.scrollTo(0, 0);
  if (!moveFocus) return;
  // After navigating, move focus to the new screen's heading so keyboard and
  // screen-reader users land at the top. Skipped on first load.
  const heading = (showInfo ? screens.info : screens.main).querySelector('h1');
  heading.tabIndex = -1;
  heading.focus();
}

window.addEventListener('hashchange', () => route({ moveFocus: true }));
route({ moveFocus: false });
