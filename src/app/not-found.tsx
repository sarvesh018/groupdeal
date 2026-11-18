import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 pt-24 text-center">
      <h1 className="text-5xl leading-none">This page doesn&apos;t exist</h1>
      <p className="mt-3 text-dim">The group may have been removed, or the link is mistyped.</p>
      <Link href="/groups" className="btn btn-primary mt-8">Find a group</Link>
    </div>
  );
}
