import Link from "next/link";
import { TopBar } from "@/components/customer/Brand";

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="mx-auto grid w-full max-w-7xl flex-1 place-content-center gap-4 px-4 py-24 text-center md:px-8">
        <h1 className="text-4xl font-bold md:text-5xl">We couldn&apos;t find that page</h1>
        <p className="text-lg text-muted">The link may be wrong, or the order doesn&apos;t exist.</p>
        <Link href="/" className="mx-auto mt-2 inline-flex min-h-12 items-center rounded-full bg-ink px-8 font-semibold text-paper hover:bg-ink-2 active:scale-95">
          Back to home
        </Link>
      </main>
    </>
  );
}
