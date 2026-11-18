export default function Loading() {
  return (
    <div className="shell flex items-center gap-2 pt-24" role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2.5 animate-pulse rounded-full bg-accent" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </div>
  );
}
