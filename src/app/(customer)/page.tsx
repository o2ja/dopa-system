import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BranchFacts, StatusBadge, TopBar, Wordmark } from "@/components/customer/Brand";
import { getBranches, getPopularItems } from "@/components/customer/data";
import { hoursLabel } from "@/components/customer/hours";
import { LandingMotion } from "@/components/customer/LandingMotion";
import { fromPrice } from "@/components/customer/types";
import { formatJOD } from "@/lib/money";

const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 font-semibold transition-[background-color,transform] active:scale-[0.98]";
const primary = `${btn} bg-ink text-paper hover:bg-ink-2`;
const frame = "mx-auto w-full max-w-7xl px-4 md:px-8";

export default async function HomePage() {
  const [branches, popular] = await Promise.all([getBranches(), getPopularItems()]);

  return (
    <LandingMotion>
      <TopBar
        action={
          <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
            {popular.length > 0 && (
              <a href="#menu" className="hidden min-h-11 items-center px-4 text-ink-2 transition-colors hover:text-ink sm:inline-flex">Most ordered</a>
            )}
            <a href="#how" className="hidden min-h-11 items-center px-4 text-ink-2 transition-colors hover:text-ink sm:inline-flex">How it works</a>
            <a href="#branches" className={`${btn} ms-2 min-h-11 bg-ink px-6 text-paper hover:bg-ink-2`}>Order now</a>
          </nav>
        }
      />

      <main className="flex-1">
        <section className={`${frame} grid gap-14 pt-14 pb-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-20 lg:pt-24 lg:pb-32`}>
          <div>
            <h1 data-hero-title className="max-w-[14ch] font-display text-[2.75rem] font-medium leading-[1.02] tracking-[-0.03em] sm:text-6xl xl:text-[5.25rem]">
              Specialty coffee and an all-day kitchen
            </h1>
            <p data-hero className="mt-7 max-w-md text-lg leading-relaxed text-ink-2">
              Dopa Cafe House &amp; Restaurant, in Amman. Scan the code at your table, or order ahead and collect it ready.
            </p>
            <div data-hero className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">
              <a href="#branches" className={primary}>
                Order now <ArrowRight className="size-4" />
              </a>
              <a href="#how" className="inline-flex min-h-12 items-center font-semibold underline decoration-gold decoration-2 underline-offset-8">
                How it works
              </a>
            </div>
            <ul data-hero className="mt-12 max-w-md divide-y divide-line border-y border-line text-sm">
              {branches.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                  <span className="font-medium">{b.name}</span>
                  <span className="flex items-center gap-3 text-muted">
                    <StatusBadge open={b.isOpen} />
                    <span className="tabular">{hoursLabel(b.hours)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {popular.length > 0 && (
            <section id="menu" aria-labelledby="menu-h" data-hero className="scroll-mt-6 rounded-card border border-line bg-card p-7 md:p-10">
              <h2 id="menu-h" className="font-display text-3xl font-medium tracking-tight">Most ordered</h2>
              <p className="mt-1 text-muted">What our regulars come back for.</p>
              <ul className="mt-8 space-y-4">
                {popular.map((it) => {
                  const { price, from } = fromPrice(it);
                  return (
                    <li key={it.id} className="flex items-baseline gap-3">
                      <span className="min-w-0 truncate font-display text-lg">{it.name}</span>
                      <span aria-hidden className="min-w-4 flex-1 border-b border-dotted border-sand" />
                      <span className="tabular shrink-0 font-medium">
                        {from && <span className="me-1.5 text-sm font-normal text-muted">from</span>}
                        {formatJOD(price)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-8 border-t border-line pt-5 text-sm text-muted">The full menu is inside each branch.</p>
            </section>
          )}
        </section>

        <section id="branches" aria-labelledby="branches-h" data-reveal className={`${frame} scroll-mt-4 pb-24 lg:pb-36`}>
          <h2 id="branches-h" data-r className="mb-10 max-w-2xl font-display text-4xl font-medium leading-[1.05] tracking-[-0.025em] md:text-5xl">
            Two branches. Order from the closest.
          </h2>
          <div className="border-b border-line">
            {branches.map((b) => (
              <article key={b.id} data-r className="grid gap-6 border-t border-line py-9 md:grid-cols-[1fr_1.2fr] lg:grid-cols-[1fr_1.2fr_auto] lg:items-center lg:gap-12">
                <div>
                  <h3 className="font-display text-3xl font-medium tracking-tight">{b.name}</h3>
                  <StatusBadge open={b.isOpen} className="mt-2" />
                </div>
                <BranchFacts branch={b} />
                <Link href={`/b/${b.slug}`} className={`${primary} self-start md:col-span-2 md:justify-self-start lg:col-span-1 lg:justify-self-end`}>
                  Order from this branch <ArrowRight className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="how" aria-labelledby="how-h" data-reveal className="scroll-mt-4 bg-paper-2 py-20 lg:py-32">
          <div className={frame}>
            <h2 id="how-h" data-r className="mb-12 max-w-2xl font-display text-4xl font-medium leading-[1.05] tracking-[-0.025em] md:text-5xl">
              Order the way that suits you
            </h2>
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-line">
              <article data-r className="lg:pe-16">
                <h3 className="font-display text-2xl font-medium tracking-tight md:text-3xl">From your table</h3>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-2">
                  Scan the QR code on your table, choose what you fancy, and we bring it to you. Pay cash at the counter or with CliQ.
                </p>
              </article>
              <article data-r className="lg:ps-16">
                <h3 className="font-display text-2xl font-medium tracking-tight md:text-3xl">Order ahead, then collect</h3>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-2">
                  Pick a pickup time, pay with CliQ and upload the receipt. We start preparing once the cashier confirms the transfer, so it&apos;s ready when you arrive.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={`${frame} pt-16`}>
          {/* leading >1 keeps the "p" descender inside its own box so it never reaches the columns below */}
          <p className="select-none font-display text-[clamp(5rem,26vw,16rem)] font-medium leading-[1.1] tracking-[-0.04em] text-sand" aria-hidden>Dopa</p>
          <div className="mt-8 grid gap-10 border-t border-line pt-10 pb-12 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => (
              <div key={b.id}>
                <p className="mb-3 font-display text-xl">{b.name}</p>
                <div className="text-ink-2"><BranchFacts branch={b} /></div>
              </div>
            ))}
            <div>
              <Wordmark />
              <p className="mt-2 text-sm text-muted">Amman, Jordan</p>
            </div>
          </div>
        </div>
        <div className="border-t border-line text-sm text-muted">
          <div className={`${frame} flex flex-wrap items-center gap-x-1 py-2`}>
            <span className="me-2">Demo</span>
            <Link href="/" className="inline-flex min-h-11 items-center px-3 hover:text-ink">Home</Link>
            <Link href="/b/branch-1?table=5" className="inline-flex min-h-11 items-center px-3 hover:text-ink">QR · Table 5</Link>
            <a href="/pos" className="inline-flex min-h-11 items-center px-3 hover:text-ink">POS</a>
            <a href="/admin" className="inline-flex min-h-11 items-center px-3 hover:text-ink">Admin</a>
          </div>
        </div>
      </footer>
    </LandingMotion>
  );
}
