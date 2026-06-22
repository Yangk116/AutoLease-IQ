import Link from "next/link";

type SiteHeaderPage = "home" | "compare";

type SiteHeaderProps = {
  currentPage: SiteHeaderPage;
};

type NavigationItem = {
  label: string;
  href: string;
};

const homeNavigationItems: NavigationItem[] = [
  { label: "Overview", href: "#overview" },
  { label: "Calculator", href: "/compare#calculator" },
  { label: "Compare", href: "/compare#compare" },
  { label: "Report", href: "/compare#report" },
];

const compareNavigationItems: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "Calculator", href: "#calculator" },
  { label: "Compare", href: "#compare" },
  { label: "Report", href: "#report" },
];

export function SiteHeader({ currentPage }: SiteHeaderProps) {
  const isComparePage = currentPage === "compare";
  const navigationItems = isComparePage
    ? compareNavigationItems
    : homeNavigationItems;
  const brandHref = isComparePage ? "/" : "#overview";
  const compareHref = isComparePage ? "#compare" : "/compare";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2.5 px-4 py-2.5 sm:gap-x-6 sm:gap-y-3 sm:px-6 sm:py-3 lg:flex-nowrap lg:px-8">
        <Link
          href={brandHref}
          className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:ring-offset-2"
          aria-label={isComparePage ? "AutoLease IQ home" : "AutoLease IQ overview"}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black tracking-tight text-teal-300 shadow-sm">
            AI
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold tracking-tight text-slate-950">
              AutoLease IQ
            </span>
            <span className="hidden truncate text-xs text-slate-500 sm:block">
              Lease intelligence for real-world car shoppers
            </span>
          </span>
        </Link>

        <nav
          className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1 [scrollbar-width:none] lg:order-none lg:w-auto"
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-center text-[0.8125rem] font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-950 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-700/30 sm:px-3 sm:text-sm lg:flex-none"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href={compareHref}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 px-3 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(13,148,136,0.9)] transition-all hover:-translate-y-0.5 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0 sm:px-4"
        >
          <span className="sm:hidden">Compare</span>
          <span className="hidden sm:inline">Start comparing</span>
        </Link>
      </div>
    </header>
  );
}
