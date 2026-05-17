"use client";

import { useState, useEffect } from "react";

const navLinks = [
  { label: "Data Journal", href: "#data" },
  { label: "Contact", href: "#contact" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-bg/90 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <a
          href="#hero"
          className="text-sm font-bold tracking-tight text-text hover:text-accent transition-colors duration-200 font-heading shrink-0"
        >
          NR.
        </a>
        <ul className="flex items-center gap-6 sm:gap-8 overflow-x-auto">
          {navLinks.map((link) => (
            <li key={link.href} className="shrink-0">
              <a
                href={link.href}
                className="text-xs sm:text-sm text-muted hover:text-text transition-colors duration-200"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
