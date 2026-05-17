import Image from "next/image";
import Nav from "@/components/Nav";
import { db } from "@/lib/db";
import { sets } from "@/lib/schema";
import { count, sql } from "drizzle-orm";

// ── Components ────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-widest text-muted font-mono block mb-3">
      {children}
    </span>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[month - 1]} ${day}, ${year}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  const [gymStats] = await db
    .select({
      totalSets: count(),
      latestDate: sql<string | null>`MAX(${sets.date})`,
    })
    .from(sets);

  return (
    <>
      <Nav />

      <main className="max-w-[1200px] mx-auto px-6">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section
          id="hero"
          className="min-h-screen flex flex-col justify-center pt-24 pb-20"
        >
          <div className="flex flex-col-reverse lg:flex-row lg:items-center lg:gap-16">
            {/* Text */}
            <div className="flex-1">
              <p className="text-sm font-mono text-muted mb-5 tracking-wide">
                nigel rimando
              </p>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-heading tracking-tight leading-[1.05] text-text mb-6">
                Data, Stats, Fitness,
                <br className="hidden sm:block" />
                Padel, and Milk Tea
              </h1>
              <p className="text-lg text-muted leading-relaxed max-w-[600px] mb-10">
                This is my corner of the internet where I share what I build,
                what I learn, and random insights on data I&apos;ve been journaling
                over the years. Let&apos;s talk about how I can help you build
                something with data too.
              </p>
              <div className="flex flex-wrap gap-3 mb-12">
                <a
                  href="#data"
                  className="px-5 py-2.5 rounded-[14px] bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors duration-[180ms]"
                >
                  Explore my data journal
                </a>
                <a
                  href="#contact"
                  className="px-5 py-2.5 rounded-[14px] border border-border hover:bg-surface-alt text-text font-semibold text-sm transition-colors duration-[180ms]"
                >
                  Get in touch
                </a>
              </div>
              <div className="flex items-center gap-5">
                <span className="text-sm font-mono text-text">
                  nfrimando@gmail.com
                </span>
                <span className="text-border">·</span>
                <a
                  href="https://linkedin.com/in/nfrimando"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted hover:text-text transition-colors duration-[180ms] font-medium"
                >
                  LinkedIn
                </a>
              </div>
            </div>

            {/* Photo */}
            <div className="shrink-0 mb-10 lg:mb-0">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-[20px] overflow-hidden border border-border shadow-sm">
                <Image
                  src="/assets/gabe.jpeg"
                  alt="Nigel Rimando"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ── Data Journal ──────────────────────────────────────────────── */}
        <section id="data" className="py-24">
          <div className="mb-10">
            <SectionLabel>Personal data journal</SectionLabel>
            <h2 className="text-3xl font-bold font-heading text-text mb-2">
              What the numbers say
            </h2>
            <p className="text-muted text-sm">
              I log my workouts and track personal data over time. Live data,
              updated as I go.
            </p>
          </div>

          {/* Exercise Log card */}
          <div className="rounded-[20px] bg-surface border border-border p-7 max-w-sm">
            <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">
              Exercise Log
            </p>
            <p className="text-lg font-bold font-heading text-text mb-1">
              Gym sets
            </p>
            <p className="text-sm text-muted mb-6">
              Strength training, logged set by set.
            </p>
            <div className="flex gap-8 mb-7">
              <div>
                <p className="text-2xl font-bold font-heading text-text leading-none">
                  {gymStats?.totalSets.toLocaleString() ?? "—"}
                </p>
                <p className="text-xs text-muted mt-1">sets recorded</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-heading text-text leading-none">
                  {formatDate(gymStats?.latestDate ?? null)}
                </p>
                <p className="text-xs text-muted mt-1">last gym day</p>
              </div>
            </div>
            <a
              href="/journal/sets"
              className="inline-block px-4 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors duration-[180ms]"
            >
              View log →
            </a>
          </div>
        </section>

        <Divider />

        {/* ── Personal Note ─────────────────────────────────────────────── */}
        <section className="py-24">
          <div className="max-w-[760px]">
            <SectionLabel>A bit about me</SectionLabel>
            <h2 className="text-3xl font-bold font-heading text-text mb-6">
              Your math and stats guy turned coder and data nerd.
            </h2>
            <p className="text-muted leading-relaxed mb-5">
              I&apos;m a systems thinker who spent years working end-to-end with
              data and how it flows from raw information to actionable insights.
              I care about building things that are genuinely useful — not just
              technically impressive.
            </p>
            <p className="text-muted leading-relaxed mb-5">
              Outside of work, I&apos;m deep into fitness, I drink at least two milk
              teas everyday, and i&apos;m super active in our local padel community.
              I track a lot of personal data out of curiosity, and live with our
              rescued cats. Estoy tambien aprendiendo Español poco a poco.
            </p>
            <p className="text-sm text-muted font-mono">
              Based in the Philippines · Currently working full-time for Tala
              Financing Inc.
            </p>
          </div>
        </section>

        <Divider />

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section id="contact" className="py-24 pb-32">
          <div className="max-w-[760px]">
            <SectionLabel>Get in touch</SectionLabel>
            <h2 className="text-3xl font-bold font-heading text-text mb-4">
              Let&apos;s work together
            </h2>
            <p className="text-muted leading-relaxed mb-10 max-w-lg">
              Whether you have a project in mind, need a data guy sounding
              board, or just want to say hello — my inbox is always open.
            </p>
            <div className="flex items-center gap-5">
              <span className="text-sm font-mono text-text">
                nfrimando@gmail.com
              </span>
              <span className="text-border">·</span>
              <a
                href="https://linkedin.com/in/nigel-rimando"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted hover:text-text transition-colors duration-[180ms] font-medium"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted text-xs font-mono">
            © {new Date().getFullYear()} Nigel Rimando
          </p>
          <p className="text-muted text-xs">
            Meow -- congrats, you found this one.
          </p>
        </div>
      </footer>
    </>
  );
}
