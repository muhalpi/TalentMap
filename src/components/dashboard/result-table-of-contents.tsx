"use client";

import { useEffect, useMemo, useState } from "react";

export interface ResultTableOfContentsItem {
  id: string;
  label: string;
}

export function ResultTableOfContents({
  items,
}: {
  items: ResultTableOfContentsItem[];
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  useEffect(() => {
    if (!itemIds.length) {
      return;
    }

    let frame = 0;

    function updateActiveHeading() {
      const headings = itemIds
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => Boolean(element));

      if (!headings.length) {
        return;
      }

      let nextActiveId = headings[0].id;
      const activationLine = 140;

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= activationLine) {
          nextActiveId = heading.id;
        }
      }

      const nearPageEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;

      if (nearPageEnd) {
        nextActiveId = headings[headings.length - 1].id;
      }

      setActiveId(nextActiveId);
    }

    function scheduleUpdate() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateActiveHeading);
    }

    updateActiveHeading();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [itemIds]);

  return (
    <nav className="mt-5 space-y-1 text-sm leading-6">
      {items.map((item) => {
        const active = item.id === activeId;

        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={() => setActiveId(item.id)}
            className={`block rounded-sm border-l-2 px-3 py-1 transition-colors ${
              active
                ? "border-accent bg-surface font-semibold text-accent"
                : "border-transparent text-foreground/75 hover:border-border hover:bg-surface hover:text-foreground"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
