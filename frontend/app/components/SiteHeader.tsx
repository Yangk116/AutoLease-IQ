import Link from "next/link";

type SiteHeaderPage = "home" | "compare" | "review" | "report" | "saved";

type SiteHeaderProps = {
  currentPage: SiteHeaderPage;
};

type NavigationItem = {
  label: string;
  href: string;
  page: SiteHeaderPage;
};

const navigationItems: NavigationItem[] = [
  { label: "Home", href: "/", page: "home" },
  { label: "Compare", href: "/compare", page: "compare" },
  { label: "Review", href: "/review", page: "review" },
  { label: "Report", href: "/report", page: "report" },
  { label: "Saved", href: "/saved", page: "saved" },
];

const pageCtas: Record<SiteHeaderPage, { href: string; label: string }> = {
  home: { href: "/compare", label: "Compare lease offers" },
  compare: { href: "#comparison-offers-inputs", label: "Enter quotes" },
  review: { href: "/compare", label: "Edit quotes" },
  report: { href: "/compare", label: "New comparison" },
  saved: { href: "/compare", label: "New comparison" },
};

export function SiteHeader({ currentPage }: SiteHeaderProps) {
  const pageCta = pageCtas[currentPage];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.55)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:gap-x-6 sm:gap-y-2.5 sm:px-6 sm:py-3 lg:flex-nowrap lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:ring-offset-2 sm:gap-3"
          aria-label="AutoLease IQ home"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#0f172a,#134e4a)] text-sm font-black tracking-tight text-teal-200 shadow-[0_8px_20px_-10px_rgba(15,23,42,0.9)] ring-1 ring-slate-800">
            IQ
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold tracking-tight text-slate-950">
              AutoLease IQ
            </span>
            <span className="hidden truncate text-xs text-slate-500 sm:block">
              Lease comparison workspace
            </span>
          </span>
        </Link>

        <nav
          className="order-3 flex w-full items-center gap-1 overflow-x-auto overscroll-x-contain rounded-xl bg-slate-100/90 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:order-none lg:w-auto"
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) => {
            const isActive = currentPage === item.page;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex-none whitespace-nowrap rounded-lg px-3 py-2 text-center text-[0.8125rem] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-teal-700/30 sm:px-3.5 sm:text-sm ${
                  isActive
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href={pageCta.href}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 px-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(13,148,136,0.9)] transition-all hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 active:translate-y-0 sm:px-4"
        >
          {pageCta.label}
        </Link>
      </div>
    </header>
  );
}
