/**
 * Swiss federal address autocomplete
 * Uses api3.geo.admin.ch — no API key required, free, official Swiss gov data.
 * Covers all Swiss addresses (street + number + NPA + city).
 *
 * Usage:
 *   initAddressAutocomplete('input-id');
 *   initAddressAutocomplete('input-id', { onSelect: (label) => console.log(label) });
 */

const GEO_API = 'https://api3.geo.admin.ch/rest/services/api/SearchServer';

function initAddressAutocomplete(inputId, opts = {}) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // Wrap input in a positioned container
  const wrapper = document.createElement('div');
  wrapper.className = 'addr-wrap';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const dropdown = document.createElement('ul');
  dropdown.className = 'addr-dropdown';
  wrapper.appendChild(dropdown);

  let debounceTimer = null;
  let activeIndex = -1;
  let currentItems = [];

  input.setAttribute('autocomplete', 'off');

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 3) { closeDropdown(); return; }
    debounceTimer = setTimeout(() => fetchSuggestions(q), 220);
  });

  input.addEventListener('keydown', (e) => {
    if (!dropdown.classList.contains('addr-dropdown--open')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectItem(currentItems[activeIndex]);
    } else if (e.key === 'Escape') { closeDropdown(); }
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) closeDropdown();
  });

  async function fetchSuggestions(query) {
    try {
      const url = `${GEO_API}?searchText=${encodeURIComponent(query)}&type=locations&origins=address&limit=8&sr=4326`;
      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      renderDropdown(json.results || []);
    } catch (_) { /* network error — silently skip */ }
  }

  function renderDropdown(results) {
    activeIndex = -1;
    currentItems = results.map(r => {
      // Strip HTML tags from the label (API returns <b> highlights)
      const raw = r.attrs?.label || '';
      return raw.replace(/<[^>]+>/g, '');
    });

    if (currentItems.length === 0) { closeDropdown(); return; }

    dropdown.innerHTML = currentItems.map((label, i) =>
      `<li class="addr-item" data-i="${i}">${label}</li>`
    ).join('');

    dropdown.querySelectorAll('.addr-item').forEach(li => {
      li.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent blur before click
        selectItem(currentItems[parseInt(li.dataset.i)]);
      });
      li.addEventListener('mouseover', () => {
        setActive(parseInt(li.dataset.i));
      });
    });

    dropdown.classList.add('addr-dropdown--open');
  }

  function selectItem(label) {
    input.value = label;
    closeDropdown();
    if (opts.onSelect) opts.onSelect(label);
    input.dispatchEvent(new Event('change'));
  }

  function moveActive(delta) {
    setActive(Math.max(0, Math.min(currentItems.length - 1, activeIndex + delta)));
  }

  function setActive(i) {
    const items = dropdown.querySelectorAll('.addr-item');
    items.forEach(el => el.classList.remove('addr-item--active'));
    if (items[i]) {
      items[i].classList.add('addr-item--active');
      items[i].scrollIntoView({ block: 'nearest' });
    }
    activeIndex = i;
  }

  function closeDropdown() {
    dropdown.classList.remove('addr-dropdown--open');
    dropdown.innerHTML = '';
    activeIndex = -1;
    currentItems = [];
  }
}
