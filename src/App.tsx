import {
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Layers,
  MessageSquare,
  Mic,
  Pen,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import "./App.css";

/* ------------------------------------------------------------------ */
/*  Tiny SVG platform icons (inline so we don't need extra assets)    */
/* ------------------------------------------------------------------ */

function XIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YouTubeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function LinkedInIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 0 1-2.88 0 1.441 1.441 0 0 1 2.88 0z" />
    </svg>
  );
}

function FacebookIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable section wrapper                                          */
/* ------------------------------------------------------------------ */

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`px-6 py-24 md:py-32 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-4 inline-block rounded-full border border-remix-600/30 bg-remix-600/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-remix-400">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Platform badge                                                    */
/* ------------------------------------------------------------------ */

const platforms = [
  { name: "X", icon: XIcon },
  { name: "YouTube", icon: YouTubeIcon },
  { name: "LinkedIn", icon: LinkedInIcon },
  { name: "Instagram", icon: InstagramIcon },
  { name: "Facebook", icon: FacebookIcon },
];

/* ------------------------------------------------------------------ */
/*  Transformation cards data                                         */
/* ------------------------------------------------------------------ */

const transformations = [
  {
    from: "X Post",
    to: "Ready-to-Publish Article",
    icon: FileText,
    items: [
      "A structured LinkedIn article",
      "A newsletter draft",
      "A blog-ready long-form post",
    ],
  },
  {
    from: "YouTube Video",
    to: "Multi-Platform Content",
    icon: Layers,
    items: [
      "Transcribe the video",
      "Extract key ideas",
      "Generate 5 X posts",
      "Create a LinkedIn thought-leadership post",
      "Draft a newsletter summary",
    ],
  },
  {
    from: "LinkedIn Post",
    to: "Deeper Analysis",
    icon: Eye,
    items: [
      "A long-form breakdown",
      "A contrarian take",
      "A structured educational article",
    ],
  },
  {
    from: "Instagram / Facebook",
    to: "Insight Content",
    icon: MessageSquare,
    items: [
      "Analytical commentary",
      "Expanded arguments",
      "Branded opinion pieces",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Steps data                                                        */
/* ------------------------------------------------------------------ */

const steps = [
  { text: "Install the extension", icon: Download },
  {
    text: "Browse normally on X, YouTube, LinkedIn, Instagram or Facebook",
    icon: Eye,
  },
  { text: 'Click "Remorph"', icon: Zap },
  { text: "Generate new content in your voice", icon: Pen },
  { text: "Publish", icon: ArrowRight },
];

/* ------------------------------------------------------------------ */
/*  App                                                               */
/* ------------------------------------------------------------------ */

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white antialiased selection:bg-remix-600/30">
      {/* ---- Nav ---- */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-gray-950/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2.5">
            <img src="/WhiteIcon512.png" alt="Remorph.it" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">
              Remorph<span className="text-remix-500">.it</span>
            </span>
          </a>
          <a
            href="#how"
            className="rounded-lg bg-remix-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-remix-500"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <Section className="relative overflow-hidden pt-40 md:pt-52 text-center">
        {/* background glow */}
        <div className="pointer-events-none absolute inset-0 -top-40 flex justify-center">
          <div className="h-[500px] w-[700px] rounded-full bg-remix-600/20 blur-[120px]" />
        </div>

        <div className="relative">
          <div className="animate-fade-in-up">
            <SectionLabel>Browser Extension</SectionLabel>
          </div>

          <h1 className="animate-fade-in-up delay-100 mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Turns Any Content{" "}
            <span className="bg-gradient-to-r from-remix-400 to-remix-600 bg-clip-text text-transparent">
              Into Your Voice
            </span>
          </h1>

          <p className="animate-fade-in-up delay-200 mx-auto mt-6 max-w-2xl text-lg text-gray-400 md:text-xl">
            Remorph.it transforms the content you're already consuming into new,
            ready-to-publish content written in your own style.
          </p>

          <div className="animate-fade-in-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#how"
              className="group inline-flex items-center gap-2 rounded-xl bg-remix-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-remix-600/25 transition hover:bg-remix-500 hover:shadow-remix-500/30"
            >
              Get Started
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* No-friction bullets */}
          <div className="animate-fade-in-up delay-400 mt-14 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            {["No tabs.", "No copy-paste workflows.", "No switching between tools."].map(
              (t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-remix-600" />
                  {t}
                </span>
              )
            )}
          </div>

          <p className="animate-fade-in-up delay-500 mt-6 font-mono text-sm text-gray-500">
            Just browse &rarr; click &rarr; remorph.
          </p>
        </div>
      </Section>

      {/* ---- Platforms ---- */}
      <Section id="platforms">
        <div className="text-center">
          <SectionLabel>Platforms</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            It Works Directly On The Platforms You Use
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            If you're scrolling it, watching it, or reading it, you can remorph
            it.
          </p>
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-6">
          {platforms.map(({ name, icon: Icon }) => (
            <div
              key={name}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-10 py-8 transition hover:border-remix-600/30 hover:bg-remix-600/5"
            >
              <Icon className="h-8 w-8 text-gray-400 transition group-hover:text-remix-400" />
              <span className="text-sm font-medium text-gray-300">{name}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-600">
          And more soon.
        </p>
      </Section>

      {/* ---- Transformations ---- */}
      <Section id="transformations" className="bg-gray-900/50">
        <div className="text-center">
          <SectionLabel>Use Cases</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Real Transformations
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {transformations.map(({ from, to, icon: Icon, items }) => (
            <div
              key={from}
              className="rounded-2xl border border-white/5 bg-gray-950/60 p-8 transition hover:border-remix-600/20"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-remix-600/10">
                  <Icon className="h-5 w-5 text-remix-400" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {from}
                  </span>
                  <p className="text-sm font-semibold text-white">{to}</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-gray-400"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-remix-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Understanding ---- */}
      <Section>
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <SectionLabel>Deep Analysis</SectionLabel>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Not Just Rewriting.{" "}
              <span className="text-remix-400">Real Understanding.</span>
            </h2>
            <p className="mt-4 text-gray-400">
              This is structured transformation, not surface-level paraphrasing.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Mic, text: "Transcribes video content" },
              { icon: Layers, text: "Extracts structure and arguments" },
              { icon: Eye, text: "Understands visual elements" },
              { icon: Sparkles, text: "Preserves meaning" },
              { icon: Pen, text: "Regenerates content in your defined voice" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 transition hover:border-remix-600/20"
              >
                <Icon className="h-5 w-5 shrink-0 text-remix-500" />
                <span className="text-sm text-gray-300">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ---- Voice Profile ---- */}
      <Section className="bg-gray-900/50">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Your Voice</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Define Your Style Once
          </h2>
          <p className="mt-4 text-gray-400">
            Create your voice profile. From that point on, every piece sounds
            like you.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {[
            {
              label: "Tone",
              description: "Sharp, analytical, concise, provocative",
            },
            {
              label: "Depth",
              description: "Level of reasoning and argumentation",
            },
            {
              label: "Structure",
              description: "Your preferred content structure",
            },
            {
              label: "Formatting",
              description: "Your formatting habits and patterns",
            },
          ].map(({ label, description }) => (
            <div
              key={label}
              className="rounded-xl border border-white/5 bg-gray-950/60 p-6"
            >
              <h3 className="text-base font-semibold text-white">{label}</h3>
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Built for ---- */}
      <Section>
        <div className="text-center">
          <SectionLabel>For Creators</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Built For People Who Publish
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            If you consume content daily, Remorph.it turns it into output.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {["Founders", "Creators", "Operators", "Marketing teams", "Agencies"].map(
            (role) => (
              <span
                key={role}
                className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-2.5 text-sm font-medium text-gray-300"
              >
                {role}
              </span>
            )
          )}
        </div>
      </Section>

      {/* ---- How it works ---- */}
      <Section id="how" className="bg-gray-900/50">
        <div className="text-center">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Five Steps. That's It.
          </h2>
        </div>

        <div className="mx-auto mt-14 max-w-2xl space-y-0">
          {steps.map(({ text, icon: Icon }, i) => (
            <div key={text} className="relative flex gap-5 pb-10 last:pb-0">
              {/* connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-5 top-12 h-full w-px bg-gradient-to-b from-remix-600/40 to-transparent" />
              )}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-remix-600/30 bg-remix-600/10 text-remix-400">
                <Icon className="h-4 w-4" />
              </div>
              <div className="pt-2">
                <span className="text-xs font-semibold uppercase text-gray-600">
                  Step {i + 1}
                </span>
                <p className="text-base font-medium text-gray-200">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center font-mono text-sm text-gray-500">
          Consumption becomes production.
        </p>
      </Section>

      {/* ---- CTA ---- */}
      <Section className="text-center">
        <div className="mx-auto max-w-2xl">
          <img
            src="/WhiteIcon512.png"
            alt="Remorph.it"
            className="animate-float mx-auto mb-8 h-20 w-20 opacity-80"
          />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to{" "}
            <span className="bg-gradient-to-r from-remix-400 to-remix-600 bg-clip-text text-transparent">
              Remorph
            </span>
            ?
          </h2>
          <p className="mt-4 text-gray-400">
            Stop copying. Stop switching. Start publishing.
          </p>
          <a
            href="#"
            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-remix-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-remix-600/25 transition hover:bg-remix-500 hover:shadow-remix-500/30"
          >
            <Users className="h-4 w-4" />
            Join the Waitlist
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </a>
        </div>
      </Section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/WhiteIcon512.png" alt="" className="h-5 w-5" />
            <span className="text-sm font-semibold text-gray-400">
              Remorph.it
            </span>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Remorph.it. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
