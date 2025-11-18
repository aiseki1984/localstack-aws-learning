"use client";

import Link from "next/link";
import { useMenuStore } from "@/store/useMenuStore";
import ThemeToggle from "./ThemeToggle";

export default function Navigation() {
  const { isOpen, toggleMenu, closeMenu } = useMenuStore();

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm dark:shadow-zinc-900/50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Desktop Menu */}
          <ul className="hidden md:flex gap-6">
            <li>
              <Link
                href="/todos"
                className="text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Todos
              </Link>
            </li>
          </ul>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-900 dark:text-zinc-100"
            aria-label="Toggle menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
              role="img"
            >
              <title>Menu</title>
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>

          {/* Theme Toggle */}
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <ul className="md:hidden flex flex-col gap-4 mt-4 pb-4">
            <li>
              <Link
                href="/todos"
                onClick={closeMenu}
                className="block text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Todos
              </Link>
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
}
