"use client";

import { useState } from "react";
import { Check, Link2, MessageCircle } from "lucide-react";

export function ShareGroup({ path, text }: { path: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${path}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url());
    }
  };
  const whatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url()}`)}`, "_blank", "noopener");
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={whatsapp} className="btn btn-quiet btn-sm">
        <MessageCircle className="size-4" aria-hidden /> Share on WhatsApp
      </button>
      <button type="button" onClick={copy} className="btn btn-quiet btn-sm" aria-live="polite">
        {copied ? <Check className="size-4 text-mint" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
        {copied ? "Link copied" : "Copy invite link"}
      </button>
    </div>
  );
}
