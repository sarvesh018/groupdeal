"use client";

import { Component, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// The 3D code is loaded only in the browser, and only after the page is interactive.
const SeatRingScene = dynamic(() => import("./seat-ring-scene"), { ssr: false });

/** A flat version of the ring, for browsers without WebGL and while 3D loads. */
function FlatRing({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden>
      <div className="relative aspect-square w-[min(70%,26rem)]" style={{ transform: "perspective(900px) rotateX(58deg)" }}>
        <span className="absolute inset-0 rounded-full border border-line-strong" />
        {Array.from({ length: total }, (_, i) => {
          const a = (i / total) * Math.PI * 2 - Math.PI / 2;
          return (
            <span
              key={i}
              className={`absolute size-[11%] -translate-x-1/2 -translate-y-1/2 rounded-full ${
                i < filled ? "bg-accent" : i === filled ? "border-2 border-accent" : "border border-line-strong bg-raised"
              }`}
              style={{ left: `${50 + Math.cos(a) * 50}%`, top: `${50 + Math.sin(a) * 50}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

class Boundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function HeroVisual({ filled, total }: { filled: number; total: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "3d" | "flat">("loading");
  const [still, setStill] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    // Decide once, in the browser, whether this device gets the 3D scene.
    const id = requestAnimationFrame(() => {
      setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      setMode(hasWebGL() ? "3d" : "flat");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Stop rendering frames once the hero has scrolled out of view.
  useEffect(() => {
    if (!box.current) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.01 });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);

  const flat = <FlatRing filled={filled} total={total} />;
  return (
    <div ref={box} className="absolute inset-0">
      {mode === "3d" ? (
        <Boundary fallback={flat}>
          <SeatRingScene filled={filled} total={total} still={still} active={active} />
        </Boundary>
      ) : mode === "flat" ? (
        flat
      ) : null}
    </div>
  );
}
