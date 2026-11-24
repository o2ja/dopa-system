import Link from "next/link";
import { AlertTriangle, CheckCircle2, Printer } from "lucide-react";
import { formatJOD } from "@/lib/money";
import { ammanClock, getAnalytics, type Range } from "./analytics";
import { LiveRefresh } from "./live-refresh";
import { PageHeader } from "./ui";

const BRANCH_BG = ["bg-ink", "bg-gold"];
const PAY = [
  { key: "cash", label: "Cash", bg: "bg-sage" },
  { key: "cliq", label: "CliQ", bg: "bg-sky" },
  { key: "card", label: "Card", bg: "bg-gold" },
] as const;
const SOURCE_LABEL = { pos: "Point of sale", qr: "Table QR", pickup: "Pickup" };

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5 sm:pt-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 sm:mb-5">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export async function Dashboard({ range }: { range: Range }) {
  const d = await getAnalytics(range);
  const maxDay = Math.max(1, ...d.days.map((x) => Object.values(x.perBranch).reduce((a, b) => Math.max(a, b), 0)));
  const payTotal = d.payments.cash + d.payments.cliq + d.payments.card;
  const srcMax = Math.max(1, ...Object.values(d.sources));
  const topMax = Math.max(1, ...d.top.map((t) => t.qty));
  const heatMax = Math.max(1, ...d.hourly);
  const sum = (k: "today" | "week" | "ordersToday") => d.ledger.reduce((s, b) => s + b[k], 0);
  const rangeLabel = range === "today" ? "Today" : "7 days";

  return (
    <>
      <PageHeader
        title="Live sales"
        sub="Paid orders only. Times are Amman local."
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <LiveRefresh at={ammanClock()} />
            <div className="flex rounded-lg border border-line bg-card p-0.5 text-sm" role="group" aria-label="Range">
              {(
                [
                  ["today", "Today"],
                  ["7d", "7 days"],
                ] as const
              ).map(([r, label]) => (
                <Link
                  key={r}
                  href={r === "today" ? "/admin" : "/admin?range=7d"}
                  replace
                  aria-current={range === r ? "true" : undefined}
                  className={`flex min-h-10 items-center rounded-md px-4 transition-colors ${range === r ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        }
      />

      <div className="mb-8 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {d.pendingCliq > 0 && (
          <span className="inline-flex items-center gap-2 font-medium text-wine">
            <AlertTriangle className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="tabular">{d.pendingCliq}</span> CliQ {d.pendingCliq === 1 ? "order" : "orders"} awaiting payment check
          </span>
        )}
        {d.failedJobs > 0 && (
          <Link href="/admin/branches" className="inline-flex min-h-11 items-center gap-2 font-medium text-wine underline-offset-4 hover:underline">
            <Printer className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="tabular">{d.failedJobs}</span> failed print {d.failedJobs === 1 ? "job" : "jobs"}
          </Link>
        )}
        {d.pendingCliq === 0 && d.failedJobs === 0 && (
          <span className="inline-flex items-center gap-2 text-sage">
            <CheckCircle2 className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            No pending CliQ checks, no failed prints
          </span>
        )}
      </div>

      <div className="space-y-10">
        <Section
          title="Revenue"
          aside={
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {d.ledger.map((b, i) => (
                <li key={b.id} className="inline-flex items-center gap-1.5">
                  <span className={`size-2.5 rounded-sm ${BRANCH_BG[i % 2]}`} aria-hidden />
                  {b.name}
                </li>
              ))}
            </ul>
          }
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
            <div className="flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label="Revenue per day over the last seven days, per branch">
              {d.days.map((day, i) => (
                <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5">
                  <div className="flex flex-1 items-end justify-center gap-0.5 sm:gap-1">
                    {d.ledger.map((b, bi) => {
                      const v = day.perBranch[b.id] ?? 0;
                      return (
                        <div
                          key={b.id}
                          title={`${b.name}: ${formatJOD(v)}`}
                          style={{ height: `${(v / maxDay) * 100}%`, minHeight: v ? 3 : 1 }}
                          className={`w-full max-w-5 rounded-t-sm transition-[height] duration-500 ease-out ${v ? BRANCH_BG[bi % 2] : "bg-line"}`}
                        />
                      );
                    })}
                  </div>
                  <span className={`text-center text-xs ${i === 6 ? "font-semibold text-ink" : "text-muted"}`}>{day.label}</span>
                </div>
              ))}
            </div>

            <div className="tabular self-start text-sm">
              <div className="hidden grid-cols-[1fr_repeat(3,minmax(0,6.5rem))] gap-3 border-b border-line pb-2 text-xs text-muted sm:grid">
                <span>Branch</span>
                <span className="text-end">Today</span>
                <span className="text-end">7 days</span>
                <span className="text-end">Orders today</span>
              </div>
              {d.ledger.map((b) => (
                <div key={b.id} className="grid grid-cols-3 gap-x-3 gap-y-1 border-b border-line/70 py-3 sm:grid-cols-[1fr_repeat(3,minmax(0,6.5rem))]">
                  <span className="col-span-3 font-medium sm:col-span-1">{b.name}</span>
                  <Cell label="Today" value={formatJOD(b.today)} />
                  <Cell label="7 days" value={formatJOD(b.week)} muted />
                  <Cell label="Orders" value={String(b.ordersToday)} muted />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-x-3 gap-y-1 pt-3 font-semibold sm:grid-cols-[1fr_repeat(3,minmax(0,6.5rem))]">
                <span className="col-span-3 sm:col-span-1">Total</span>
                <Cell label="Today" value={formatJOD(sum("today"))} />
                <Cell label="7 days" value={formatJOD(sum("week"))} />
                <Cell label="Orders" value={String(sum("ordersToday"))} />
              </div>
            </div>
          </div>
        </Section>

        <div className="grid gap-10 lg:grid-cols-2">
          <Section title={`Payment methods · ${rangeLabel}`}>
            {payTotal === 0 ? (
              <p className="text-sm text-muted">No paid sales yet.</p>
            ) : (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-paper-2">
                  {PAY.map((p) => (
                    <div key={p.key} className={`${p.bg} transition-[width] duration-500`} style={{ width: `${(d.payments[p.key] / payTotal) * 100}%` }} />
                  ))}
                </div>
                <ul className="tabular mt-5 space-y-2.5 text-sm">
                  {PAY.map((p) => (
                    <li key={p.key} className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <span className={`size-2.5 rounded-sm ${p.bg}`} aria-hidden />
                        {p.label}
                      </span>
                      <span>
                        {formatJOD(d.payments[p.key])}
                        <span className="ms-3 inline-block w-10 text-end text-muted">{Math.round((d.payments[p.key] / payTotal) * 100)}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          <Section title={`Orders by source · ${rangeLabel}`}>
            <ul className="tabular space-y-4 text-sm">
              {(Object.keys(SOURCE_LABEL) as (keyof typeof SOURCE_LABEL)[]).map((k) => (
                <li key={k}>
                  <div className="mb-1.5 flex justify-between">
                    <span>{SOURCE_LABEL[k]}</span>
                    <span className="font-medium">{d.sources[k]}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-paper-2">
                    <div className="h-full rounded-full bg-ink-2 transition-[width] duration-500" style={{ width: `${(d.sources[k] / srcMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <Section title={`Top sellers · ${rangeLabel}`}>
          {d.top.length === 0 ? (
            <p className="text-sm text-muted">No paid sales yet.</p>
          ) : (
            <ol className="tabular text-sm">
              {d.top.map((t, i) => (
                <li key={t.name} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-line/70 py-3 sm:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,14rem)_7rem]">
                  <span className="text-xs text-muted">{i + 1}</span>
                  <span className="truncate font-medium">{t.name}</span>
                  <span className="text-end sm:order-last">{formatJOD(t.revenue)}</span>
                  <div className="col-span-3 col-start-1 flex items-center gap-3 sm:col-span-1 sm:col-start-auto">
                    <div className="h-1.5 flex-1 rounded-full bg-paper-2">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${(t.qty / topMax) * 100}%` }} />
                    </div>
                    <span className="w-14 text-end text-muted">{t.qty} sold</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Orders by hour · today">
          <div className="flex gap-0.5 sm:gap-1" role="img" aria-label="Number of orders in each hour of today">
            {d.hourly.map((n, h) => (
              <div key={h} className="min-w-0 flex-1" title={`${h}:00 · ${n} ${n === 1 ? "order" : "orders"}`}>
                <div className="h-10 rounded-sm bg-gold transition-opacity duration-500" style={{ opacity: n ? 0.18 + 0.82 * (n / heatMax) : 0.06 }} />
                <p className="tabular mt-1.5 text-center text-[0.6875rem] text-muted">{h % 6 === 0 ? h : ""}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

function Cell({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <span className="sm:text-end">
      <span className="block text-[0.6875rem] text-muted sm:hidden">{label}</span>
      <span className={muted ? "text-muted" : ""}>{value}</span>
    </span>
  );
}
