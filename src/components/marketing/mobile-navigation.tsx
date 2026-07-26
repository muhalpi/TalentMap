"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

const navigationItems = [
  ["Platform", "/#platform"],
  ["How it works", "/#how-it-works"],
  ["Assessments", "/#assessments"],
  ["Security", "/#security"],
];

export function MobileNavigation() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    detailsRef.current?.removeAttribute("open");
  }

  return (
    <details ref={detailsRef} className="group relative lg:hidden">
      <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-600 [&::-webkit-details-marker]:hidden">
        <Menu aria-hidden="true" className="group-open:hidden" size={19} />
        <X aria-hidden="true" className="hidden group-open:block" size={19} />
        <span className="sr-only">Open navigation</span>
      </summary>
      <nav
        aria-label="Mobile navigation"
        className="absolute right-0 top-12 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgb(15_23_42/0.16)]"
      >
        {navigationItems.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            onClick={closeMenu}
            className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
          >
            {label}
          </Link>
        ))}
        <div className="my-2 border-t border-slate-200" />
        <Link
          href="/test"
          onClick={closeMenu}
          className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
        >
          Participant access
        </Link>
        <Link
          href="/login"
          onClick={closeMenu}
          className="mt-1 flex min-h-11 items-center justify-between rounded-lg bg-[#061a38] px-3 text-sm font-semibold text-white"
        >
          Tenant &amp; admin access
          <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </nav>
    </details>
  );
}
