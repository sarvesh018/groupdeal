"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-quiet">
      <Printer className="size-4" aria-hidden /> Print or save as PDF
    </button>
  );
}
