import { useEffect, useState } from "react";
import { LucideIcon } from "@/components/common/lucide-icon";
import board from "@/assets/login/login-board.png";
import collaborate from "@/assets/login/login-collaborate.png";
import gantt from "@/assets/login/login-gantt.png";
import progress from "@/assets/login/login-progress.png";

const SLIDES = [
  {
    image: gantt,
    kicker: "01",
    title: "Keep your projects on track",
    body: "Plan, monitor, and manage your work from start to finish — all in one place.",
  },
  {
    image: board,
    kicker: "02",
    title: "Plan with clarity",
    body: "Break work into tasks, set timelines, and see status at a glance.",
  },
  {
    image: collaborate,
    kicker: "03",
    title: "Collaborate seamlessly",
    body: "Assign owners and keep everyone aligned on the same step.",
  },
  {
    image: progress,
    kicker: "04",
    title: "Track progress in real time",
    body: "Follow status, dates, and what still needs attention.",
  },
] as const;

const INTERVAL_MS = 5000;

export function LoginShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = SLIDES.length;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduce) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <section
      className="login-showcase"
      aria-roledescription="carousel"
      aria-label="Project Tracker"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) setPaused(false);
      }}
    >
      <div className="login-brand">
        <span className="login-mark" aria-hidden="true">PT</span>
        <span>Project Tracker</span>
      </div>
      {SLIDES.map((slide, slideIndex) => {
        const active = slideIndex === index;
        return (
          <article key={slide.kicker} className={`login-slide${active ? " is-active" : ""}`} aria-hidden={!active}>
            <p className="login-kicker">{slide.kicker}</p>
            <h2>{slide.title}</h2>
            <p>{slide.body}</p>
            <img src={slide.image} alt="" />
          </article>
        );
      })}
      <div className="login-showcase-nav">
        <button type="button" className="login-arrow" aria-label="Previous slide" onClick={() => go(index - 1)}>
          <LucideIcon name="chevron-left" size={18} />
        </button>
        <div className="login-dots" role="tablist" aria-label="Slides">
          {SLIDES.map((slide, slideIndex) => (
            <button
              key={slide.kicker}
              type="button"
              role="tab"
              className={slideIndex === index ? "is-active" : ""}
              aria-label={slide.title}
              aria-selected={slideIndex === index}
              onClick={() => go(slideIndex)}
            />
          ))}
        </div>
        <button type="button" className="login-arrow" aria-label="Next slide" onClick={() => go(index + 1)}>
          <LucideIcon name="chevron-right" size={18} />
        </button>
      </div>
    </section>
  );
}
