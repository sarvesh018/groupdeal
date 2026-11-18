"use client";

import { useState, useTransition } from "react";

/** A dropdown that saves as soon as you pick a value. */
export function ActionSelect({
  action,
  idName,
  id,
  name,
  value,
  options,
  label,
  className = "field min-w-40 py-1.5",
  selectId,
}: {
  action: (fd: FormData) => Promise<void>;
  idName: string;
  id: number;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
  selectId?: string;
}) {
  const [val, setVal] = useState(value);
  const [pending, start] = useTransition();
  return (
    <select
      id={selectId}
      aria-label={label}
      value={val}
      disabled={pending}
      className={`${className} ${pending ? "opacity-60" : ""}`}
      onChange={(e) => {
        const next = e.target.value;
        setVal(next);
        start(async () => {
          const fd = new FormData();
          fd.set(idName, String(id));
          fd.set(name, next);
          await action(fd);
        });
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
