"use client";

import { useEffect, useRef, useState } from "react";

type ParsedAddress = { street: string; postcode: string; city: string; display: string };

const GEO_API = "https://api3.geo.admin.ch/rest/services/api/SearchServer";

function fixCaps(str: string): string {
  return str.replace(
    /\b([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ]{2,})\b/g,
    (w) => w.charAt(0) + w.slice(1).toLowerCase(),
  );
}

function parseLabel(rawHtml: string): ParsedAddress {
  const plain = rawHtml
    .replace(/<[^>]+>/g, "")
    .replace(/#/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const m = plain.match(/^(.+?)\s+(\d{4})\s+(.+)$/);
  const parsed = m
    ? { street: fixCaps(m[1].trim()), postcode: m[2], city: fixCaps(m[3].trim()) }
    : { street: fixCaps(plain), postcode: "", city: "" };
  const display =
    parsed.street +
    (parsed.postcode ? ", " + parsed.postcode : "") +
    (parsed.city ? " " + parsed.city : "");
  return { ...parsed, display };
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (parts: { street: string; postcode: string; city: string }) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}) {
  const [items, setItems] = useState<ParsedAddress[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function handleInput(v: string) {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 3) {
      setOpen(false);
      setItems([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `${GEO_API}?searchText=${encodeURIComponent(v.trim())}&type=locations&origins=address&limit=8&sr=4326`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        const parsed = ((json.results || []) as { attrs?: { label?: string } }[]).map((r) =>
          parseLabel(r.attrs?.label || ""),
        );
        setItems(parsed);
        setActiveIndex(-1);
        setOpen(parsed.length > 0);
      } catch {
        /* network error — silently skip */
      }
    }, 220);
  }

  function pick(item: ParsedAddress) {
    onChange(item.street);
    onSelect({ street: item.street, postcode: item.postcode, city: item.city });
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        id={id}
        type="text"
        value={value}
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(items.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            pick(items[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && items.length > 0 && (
        <ul
          className="addr-dropdown addr-dropdown--open"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            margin: 0,
            padding: 0,
            listStyle: "none",
            background: "white",
            border: "1px solid var(--gray-200)",
            borderTop: "none",
            borderRadius: "0 0 var(--radius) var(--radius)",
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 50,
            boxShadow: "var(--shadow)",
          }}
        >
          {items.map((item, i) => (
            <li
              key={i}
              className={`addr-item${i === activeIndex ? " addr-item--active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
              onMouseOver={() => setActiveIndex(i)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: ".875rem",
                background: i === activeIndex ? "var(--gray-100)" : undefined,
              }}
            >
              {item.display}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
