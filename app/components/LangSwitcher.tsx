"use client";

import { SUPPORTED_LANGS, useI18n } from "@/lib/i18n";

export default function LangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-0.5 mr-2">
      {SUPPORTED_LANGS.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={[
              "px-[7px] py-1 text-[0.72rem] font-semibold tracking-wider leading-none border rounded-[2px] transition-colors",
              active
                ? "text-charcoal border-charcoal bg-gray-100"
                : "text-gray-400 border-gray-200 bg-transparent hover:text-charcoal hover:border-gray-400",
            ].join(" ")}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
