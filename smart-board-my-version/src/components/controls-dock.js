/* ═══════════════════════════════════════════════════════════════════════
   RIGHT-SIDE CONTROLS DOCK
   A "◀ Controls" tab on the right edge lets a teacher standing on the right
   side of the board open the tool palette there. The palette stays hidden
   until the tab is tapped, and closes itself as soon as the teacher starts
   writing on the board (after picking a pen, shape, eraser, etc.).
   The existing left-side Controls toggle is unchanged.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var body = document.body;
  var tab = null;
  var wasCollapsed = false; // left palette state before opening on the right

  function isOpen() {
    return body.classList.contains('controls-dock-right');
  }

  function closeFlyouts() {
    if (window.UI && typeof window.UI.closeAllFlyouts === 'function') {
      try { window.UI.closeAllFlyouts(); } catch (e) { /* ignore */ }
    }
  }

  function resizeBoard() {
    setTimeout(function () {
      if (window.Canvas && typeof window.Canvas.resize === 'function') window.Canvas.resize();
    }, 60);
  }

  function syncTab() {
    if (!tab) return;
    var open = isOpen();
    tab.classList.toggle('active', open);
    tab.innerHTML = open ? '<span>Close ▶</span>' : '<span>◀ Controls</span>';
    tab.title = open ? 'Close controls' : 'Open controls on the right side';
    tab.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function openRight() {
    if (isOpen()) return;
    wasCollapsed = body.classList.contains('controls-collapsed');
    closeFlyouts();
    body.classList.remove('controls-collapsed');
    body.classList.add('controls-dock-right');
    syncTab();
    resizeBoard();
  }

  function closeRight() {
    if (!isOpen()) return;
    closeFlyouts();
    body.classList.remove('controls-dock-right');
    if (wasCollapsed) body.classList.add('controls-collapsed');
    syncTab();
    resizeBoard();
  }

  function toggleRight() {
    if (isOpen()) closeRight(); else openRight();
  }

  function createTab() {
    if (document.getElementById('right-controls-tab')) {
      tab = document.getElementById('right-controls-tab');
      return;
    }
    tab = document.createElement('button');
    tab.type = 'button';
    tab.id = 'right-controls-tab';
    tab.className = 'right-controls-tab';
    tab.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    tab.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleRight();
    });
    body.appendChild(tab);
    syncTab();

    // A close button that lives at the bottom of the palette (shown only when docked right)
    var palette = document.getElementById('tool-palette');
    if (palette && !document.getElementById('right-dock-close-btn')) {
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.id = 'right-dock-close-btn';
      closeBtn.className = 'right-dock-close-btn';
      closeBtn.title = 'Hide controls';
      closeBtn.innerHTML = '✕';
      closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeRight(); });
      palette.appendChild(closeBtn);
    }
  }

  // Auto-close: the first touch / pen / mouse press on the board itself
  // (not on the palette or its flyouts) means the teacher has started writing.
  function isBoardSurface(target) {
    if (!target || !target.closest) return false;
    if (target.closest('#tool-palette') || target.closest('#right-controls-tab')) return false;
    return !!(target.closest('#canvas-zone') || target.closest('#workspace-split-container'));
  }

  document.addEventListener('pointerdown', function (e) {
    if (isOpen() && isBoardSurface(e.target)) closeRight();
  }, true);

  // If the left "Controls" toggle is used while the palette is on the right,
  // simply close the right dock (returns the palette to its left position/state).
  function wrapLeftToggle() {
    if (!window.UI || typeof window.UI.toggleControlsPalette !== 'function' || window.UI.__dockWrapped) return;
    var original = window.UI.toggleControlsPalette;
    window.UI.toggleControlsPalette = function () {
      if (isOpen()) { closeRight(); return; }
      return original.apply(this, arguments);
    };
    window.UI.__dockWrapped = true;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) closeRight();
  });

  function init() {
    createTab();
    wrapLeftToggle();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.ControlsDock = { open: openRight, close: closeRight, toggle: toggleRight, isOpen: isOpen };
})();
