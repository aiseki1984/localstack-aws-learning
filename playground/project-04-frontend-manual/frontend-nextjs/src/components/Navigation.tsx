import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <ul className="flex gap-6">
          <li>
            <Link
              href="/"
              className="text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className="text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
            >
              About
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className="text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
            >
              Contact
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
