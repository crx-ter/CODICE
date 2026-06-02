const SidebarVirtualizer = (() => {
  const PAGE_SIZE = 25; // items per "page" for deferred rendering
  let _visibleCount = PAGE_SIZE;
  let _currentItems = [];

  function render(container, items, makeItem) {
    _currentItems = items;
    _visibleCount = PAGE_SIZE;
    _flush(container, makeItem);
  }

  function _flush(container, makeItem) {
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    const visible = _currentItems.slice(0, _visibleCount);
    for (const item of visible) {
      try { frag.appendChild(makeItem(item)); } catch(e) { console.warn('[SidebarVirtualizer]', e); }
    }
    if (_visibleCount < _currentItems.length) {
      const more = document.createElement('button');
      more.className = 'sb-add-div';
      more.textContent = `▼ Mostrar más (${_currentItems.length - _visibleCount} restantes)`;
      more.addEventListener('click', () => {
        _visibleCount += PAGE_SIZE;
        _flush(container, makeItem);
      });
      frag.appendChild(more);
    }
    container.appendChild(frag);
  }

  return { render };
})();

