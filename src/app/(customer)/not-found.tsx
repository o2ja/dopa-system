import Link from "next/link";
import { TopBar } from "@/components/customer/Brand";

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-24 md:px-8 lg:py-32">
        <h1 className="max-w-2xl font-display text-4xl font-medium leading-[1.05] tracking-[-0.025em] md:text-6xl">We couldn&apos;t find that page</h1>
        <p className="mt-5 max-w-md text-lg text-muted">The link may be wrong, or the order doesn&apos;t exist.</p>
        <Link href="/" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-ink px-8 font-semibold text-paper transition-[background-color,transform] hover:bg-ink-2 active:scale-95">
          Back to home
        </Link>
      </main>
    </>
  );
}
