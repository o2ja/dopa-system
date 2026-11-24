export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 animate-pulse px-4 py-6 md:px-8" aria-busy aria-label="Loading">
      <div className="h-10 w-40 rounded-xl bg-paper-2" />
      <div className="mt-8 h-14 w-full max-w-xl rounded-2xl bg-paper-2" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-28 rounded-card bg-paper-2" />
        ))}
      </div>
    </div>
  );
}
