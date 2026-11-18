"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Seats } from "./seats";

const STEPS = [
  { title: "Pick your car and city", body: "Find the group for the car you want. If there isn't one yet, start it in a minute." },
  { title: "Take a seat", body: "Joining is free and you can leave any time. Invite friends and colleagues to fill the group faster." },
  { title: "We collect written quotes", body: "Authorised showrooms quote for the whole group. Every charge is listed, line by line." },
  { title: "You decide", body: "Like an offer? Book directly with the showroom. If not, walk away. No fee, no pressure." },
];

function Step({ i }: { i: number }) {
  const s = STEPS[i];
  return (
    <>
      <span className="font-display text-[5.5rem] font-medium leading-none tracking-[-0.06em] text-ink/15 lg:text-[11rem]" aria-hidden>
        {String(i + 1).padStart(2, "0")}
      </span>
      <div className="mt-6 lg:mt-10">
        <Seats filled={i + 1} total={4} size="md" showNext={false} tone="light" />
        <h3 className="mt-5 text-3xl leading-[1.05] text-ink lg:text-5xl">{s.title}</h3>
        <p className="mt-4 max-w-md text-base leading-relaxed text-ink/65 lg:text-lg">{s.body}</p>
      </div>
    </>
  );
}

/**
 * "How it works" on the one light surface of the site.
 * Desktop: the section pins and the four steps travel sideways as you scroll.
 * Phones and reduced motion: a plain vertical list.
 */
export function StepsScroll() {
  const wrap = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0.04, 0.96], ["0vw", "-138vw"]);
  const bar = useTransform(scrollYProgress, [0, 1], [0.05, 1]);

  return (
    <section className="bg-paper text-ink" aria-labelledby="how-title">
      {/* Phones, tablets, reduced motion */}
      <div className={`shell py-20 ${reduce ? "" : "lg:hidden"}`}>
        <h2 id={reduce ? "how-title" : undefined} className="max-w-xl text-4xl leading-[1.02] sm:text-6xl">Four steps from wanting a car to a better quote.</h2>
        <ol className="mt-12 grid gap-14 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title}><Step i={i} /></li>
          ))}
        </ol>
      </div>

      {/* Desktop */}
      {!reduce && (
        <div ref={wrap} className="relative hidden h-[340vh] lg:block">
          <div className="sticky top-0 flex h-screen flex-col overflow-hidden pt-[4.5rem]">
            <div className="shell flex items-end justify-between pb-6 pt-10">
              <h2 id="how-title" className="max-w-3xl text-6xl leading-[0.98] xl:text-7xl">Four steps from wanting a car to a better quote.</h2>
              <p className="pb-2 text-sm text-ink/55">Keep scrolling</p>
            </div>
            <motion.ol style={{ x }} className="flex flex-1 items-center gap-[4vw] pl-[max(3rem,calc((100vw-84rem)/2+3rem))] will-change-transform">
              {STEPS.map((s, i) => (
                <li key={s.title} className="w-[56vw] shrink-0 border-l border-ink/15 pl-10 xl:w-[52vw]">
                  <Step i={i} />
                </li>
              ))}
            </motion.ol>
            <div className="shell pb-10">
              <div className="h-px w-full bg-ink/15">
                <motion.div style={{ scaleX: bar }} className="h-px origin-left bg-ink" />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
