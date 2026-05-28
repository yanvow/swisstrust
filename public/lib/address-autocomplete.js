/**
 * Swiss federal address autocomplete
 * Uses api3.geo.admin.ch — no API key required, free, official Swiss gov data.
 * Covers all Swiss addresses (street + number + NPA + city).
 *
 * Usage:
 *   initAddressAutocomplete('input-id');
 *   initAddressAutocomplete('input-id', {
 *     onSelect: ({ street, postcode, city}) => { ... }
 *   });
 *
 * The street input is filled with only "Street Name Number".
 * The dropdown shows the full address for disambiguation.
 * onSelect receives the parsed components to auto-fill separate fields.
 */

const GEO_API = 'https://api3.geo.admin.ch/rest/services/api/SearchServer';

// Fix words that are entirely uppercase (3+ chars) → title-case.
// Leaves 2-char canton codes (GE, ZH, VD…) and numbers unchanged.
function _fixCaps(str) {
  return str.replace(/\b([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ]{2,})\b/g,
    w => w.charAt(0) + w.slice(1).toLowerCase()
  );
}

// Parse an address label into { street, postcode, city }.
// Strips all HTML tags and '#' chars, then splits on the 4-digit Swiss postcode
// which naturally separates the street from the city.
// e.g. "Rue de Rive 14 # <b>1204 Genève</b>" → { street: "Rue de Rive 14", postcode: "1204", city: "Genève" }
function _parseLabel(rawHtml) {
  const plain = rawHtml
    .replace(/<[^>]+>/g, '') // strip HTML tags
    .replace(/#/g, '')       // remove # separators
    .replace(/\s+/g, ' ')   // collapse whitespace
    .trim();

  // Split on the 4-digit postcode: everything before = street, everything after = city
  const m = plain.match(/^(.+?)\s+(\d{4})\s+(.+)$/);
  if (m) {
    return {
      street:   _fixCaps(m[1].trim()),
      postcode: m[2],
      city:     _fixCaps(m[3].trim()),
    };
  }

  // Fallback: no postcode found, treat the whole thing as the street
  return { street: _fixCaps(plain), postcode: '', city: '' };
}

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
  let activeIndex   = -1;
  let currentItems  = []; // array of { street, postcode, city, display }

  input.setAttribute('autocomplete', 'off');

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 3) { closeDropdown(); return; }
    debounceTimer = setTimeout(() => fetchSuggestions(q), 220);
  });

  input.addEventListener('keydown', (e) => {
    if (!dropdown.classList.contains('addr-dropdown--open')) return;
    if (e.key === 'ArrowDown')                        { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp')                     { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter' && activeIndex >= 0)   { e.preventDefault(); selectItem(currentItems[activeIndex]); }
    else if (e.key === 'Escape')                      { closeDropdown(); }
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
    activeIndex  = -1;
    currentItems = results.map(r => {
      const rawHtml = r.attrs?.label || '';
      const parsed  = _parseLabel(rawHtml);
      // Full address shown in dropdown for easy disambiguation
      const display  = parsed.street
        + (parsed.postcode ? ', ' + parsed.postcode : '')
        + (parsed.city     ? ' ' + parsed.city      : '')
        ;
      return { ...parsed, display };
    });

    if (currentItems.length === 0) { closeDropdown(); return; }

    dropdown.innerHTML = currentItems.map((item, i) =>
      `<li class="addr-item" data-i="${i}">${item.display}</li>`
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

  function selectItem(item) {
    input.value = opts.fillFull ? item.display : item.street;
    closeDropdown();
    if (opts.onSelect) opts.onSelect(item);
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
    activeIndex  = -1;
    currentItems = [];
  }
}
