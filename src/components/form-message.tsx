import { AlertCircle, CheckCircle2 } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose/40 bg-rose/10 px-3.5 py-2.5 text-sm text-rose">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function FormSaved({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="status" className="flex items-start gap-2 rounded-xl border border-mint/40 bg-mint/10 px-3.5 py-2.5 text-sm text-mint">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
