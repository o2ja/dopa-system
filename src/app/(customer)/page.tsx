import { ArrowRight, QrCode, Store } from "lucide-react";
import Link from "next/link";
import { BranchFacts, StatusBadge, TopBar, Wordmark } from "@/components/customer/Brand";
import { getBranches, getPopularItems } from "@/components/customer/data";
import { hoursLabel } from "@/components/customer/hours";
import { fromPrice } from "@/components/customer/types";
import { formatJOD } from "@/lib/money";

const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 font-semibold transition active:scale-[0.98]";
const frame = "mx-auto w-full max-w-7xl px-4 md:px-8";

export default async function HomePage() {
  const [branches, popular] = await Promise.all([getBranches(), getPopularItems()]);

  return (
    <>
      <TopBar
        action={
          <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
            <a href="#menu" className="hidden min-h-11 items-center rounded-full px-4 hover:bg-paper-2 sm:inline-flex">Popular</a>
            <a href="#how" className="hidden min-h-11 items-center rounded-full px-4 hover:bg-paper-2 sm:inline-flex">How it works</a>
            <a href="#branches" className={`${btn} bg-ink px-6 text-paper hover:bg-ink-2`}>Order now</a>
          </nav>
        }
      />

      <main className="flex-1">
        <section className={`${frame} grid gap-6 pt-4 pb-16 lg:min-h-[34rem] lg:grid-cols-2 lg:items-stretch lg:gap-10 lg:pb-24`}>
          <div className="flex flex-col justify-center py-4">
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl xl:text-7xl">Specialty coffee and an everyday kitchen in Amman</h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">
              Dopa Cafe House &amp; Restaurant, in two branches. Scan the code at your table, or order ahead and collect it ready.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href="#branches" className={`${btn} bg-ink text-paper hover:bg-ink-2`}>
                Order now <ArrowRight className="size-4" />
              </a>
              <a href="#menu" className="inline-flex min-h-12 items-center font-semibold underline decoration-gold decoration-2 underline-offset-8">
                See what&apos;s popular
              </a>
            </div>
            <ul className="mt-10 space-y-1 text-sm">
              {branches.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={`size-2 rounded-full ${b.isOpen ? "bg-sage" : "bg-wine"}`} />
                  <span className="font-medium">{b.name}</span>
                  <span className="text-muted">{b.isOpen ? "Open" : "Closed"} · <span className="tabular">{hoursLabel(b.hours)}</span></span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex min-h-72 flex-col justify-between overflow-hidden rounded-card bg-sand p-6 md:min-h-96 md:p-10" aria-hidden>
            <p className="text-lg font-medium text-ink-2">Cafe House &amp; Restaurant</p>
            <p className="select-none text-[8rem] font-bold leading-[0.8] tracking-tighter text-ink sm:text-[12rem] md:text-[14rem] lg:text-[10rem] xl:text-[13rem]">Dopa</p>
            <p className="self-end text-lg font-medium text-ink-2">Amman · Jordan</p>
          </div>
        </section>

        <section id="branches" aria-labelledby="branches-h" className={`${frame} scroll-mt-4 pb-20 lg:pb-32`}>
          <h2 id="branches-h" className="mb-8 text-4xl font-bold md:text-5xl">Two branches. Pick the closest.</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {branches.map((b, i) => {
              const dark = i % 2 === 1;
              return (
                <article key={b.id} className={`flex flex-col rounded-card p-7 md:p-8 lg:p-10 ${dark ? "bg-ink text-paper" : "bg-card"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <h3 className="text-2xl font-bold md:text-3xl">{b.name}</h3>
                    <StatusBadge open={b.isOpen} onDark={dark} />
                  </div>
                  <div className="mt-8 flex-1"><BranchFacts branch={b} /></div>
                  <Link
                    href={`/b/${b.slug}`}
                    className={`${btn} mt-8 self-start ${dark ? "bg-gold text-ink hover:bg-sand" : "bg-ink text-paper hover:bg-ink-2"}`}
                  >
                    Order now <ArrowRight className="size-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        {popular.length > 0 && (
          <section id="menu" aria-labelledby="menu-h" className="bg-paper-2 py-20 lg:py-32">
            <div className={`${frame} grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16`}>
              <div>
                <h2 id="menu-h" className="text-4xl font-bold leading-tight md:text-5xl">What our regulars come back for</h2>
                <p className="mt-4 max-w-sm text-lg text-ink-2">The most-ordered items at Dopa. The full menu is waiting inside each branch.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {branches.map((b) => (
                    <Link key={b.id} href={`/b/${b.slug}`} className={`${btn} bg-ink text-paper hover:bg-ink-2`}>
                      Menu · {b.name.split(/[·—-]/).pop()?.trim() ?? b.name}
                    </Link>
                  ))}
                </div>
              </div>
              <ul className="grid content-start gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {popular.map((it) => {
                  const { price, from } = fromPrice(it);
                  return (
                    <li key={it.id} className="flex items-baseline justify-between gap-4">
                      <span className="min-w-0 truncate text-lg font-semibold">{it.name}</span>
                      <span className="tabular shrink-0 font-semibold text-gold-2">
                        {from && <span className="me-1 text-sm font-normal text-muted">from</span>}
                        {formatJOD(price)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        <section id="how" aria-labelledby="how-h" className={`${frame} py-20 lg:py-32`}>
          <h2 id="how-h" className="mb-8 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">Order the way that suits you</h2>
          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <article className="rounded-card bg-sage p-7 text-paper md:p-10">
              <QrCode className="size-9" />
              <h3 className="mt-6 text-3xl font-bold">From your table</h3>
              <p className="mt-3 max-w-md text-lg leading-relaxed text-paper/90">
                Scan the QR code on your table, choose what you fancy, and we bring it to you. Pay cash at the counter or with CliQ.
              </p>
            </article>
            <article className="rounded-card bg-sand p-7 md:p-10">
              <Store className="size-9" />
              <h3 className="mt-6 text-3xl font-bold">Order ahead, then collect</h3>
              <p className="mt-3 text-lg leading-relaxed text-ink-2">
                Pick a pickup time, pay with CliQ and upload the receipt. We start preparing once the cashier confirms the transfer, so it&apos;s ready when you arrive.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-paper">
        <div className={`${frame} pt-16`}>
          <p className="select-none text-[34vw] font-bold leading-[0.85] tracking-tighter text-paper/95 md:text-[22rem]" aria-hidden>Dopa</p>
          <div className="mt-8 grid gap-8 pb-10 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => (
              <div key={b.id}>
                <p className="mb-2 font-semibold">{b.name}</p>
                <div className="text-paper/80"><BranchFacts branch={b} /></div>
              </div>
            ))}
            <div>
              <Wordmark dim="text-paper/60" />
              <p className="mt-2 text-sm text-paper/60">Amman, Jordan</p>
            </div>
          </div>
        </div>
        <div className="bg-ink-2 text-sm text-paper/60">
          <div className={`${frame} flex flex-wrap items-center gap-x-1 py-2`}>
            <span className="me-2">Demo</span>
            <Link href="/" className="inline-flex min-h-11 items-center px-3 hover:text-paper">Home</Link>
            <Link href="/b/branch-1?table=5" className="inline-flex min-h-11 items-center px-3 hover:text-paper">QR · Table 5</Link>
            <a href="/pos" className="inline-flex min-h-11 items-center px-3 hover:text-paper">POS</a>
            <a href="/admin" className="inline-flex min-h-11 items-center px-3 hover:text-paper">Admin</a>
          </div>
        </div>
      </footer>
    </>
  );
}
