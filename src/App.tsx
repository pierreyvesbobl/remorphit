import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Layers,
  Mic,
  Pen,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import "./App.css";

/* ------------------------------------------------------------------ */
/*  Tiny SVG platform icons                                            */
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
    <span className="mb-4 inline-block rounded-full border border-remix-600/20 bg-remix-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-remix-600">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Platform badges                                                    */
/* ------------------------------------------------------------------ */

const platforms = [
  { name: "X", icon: XIcon },
  { name: "YouTube", icon: YouTubeIcon },
  { name: "LinkedIn", icon: LinkedInIcon },
  { name: "Instagram", icon: InstagramIcon },
  { name: "Facebook", icon: FacebookIcon },
];

/* ------------------------------------------------------------------ */
/*  Scroll Transformation Section                                      */
/* ------------------------------------------------------------------ */

const transformationPairs = [
  {
    platform: "X",
    icon: XIcon,
    fromTitle: "@marcuswei · 2h",
    fromContent: [
      "Hot take: AI won't replace writers.",
      "It will replace writers who don't",
      "use AI. Here's a 🧵 on why the",
      "future belongs to augmented creators...",
      "",
      "1/ The creative process is changing.",
      "Not dying. There's a huge difference.",
    ],
    toType: "Blog Article",
    toTitle: "The Future of AI-Augmented Creation",
    toSubtitle: "Why the best creators will be those who embrace AI tools",
    toContent: [
      "The narrative that AI will replace human creativity misses",
      "the point entirely. What we're witnessing isn't replacement",
      "— it's augmentation at an unprecedented scale.",
      "",
      "The Creative Shift",
      "The tools are changing, but the need for human insight,",
      "original thinking, and authentic voice remains irreplaceable.",
    ],
  },
  {
    platform: "YouTube",
    icon: YouTubeIcon,
    fromTitle: "10 Productivity Hacks That Actually Work",
    fromChannel: "Ali Productivity · 1.2M views",
    fromContent: [
      "00:00 Introduction",
      "02:15 The 2-Minute Rule",
      "05:30 Time Blocking Deep Work",
      "08:45 The Eisenhower Matrix",
      "12:00 Energy Management > Time",
    ],
    toType: "Newsletter",
    toTitle: "Weekly Productivity Digest",
    toSubtitle: "Subject: 5 proven systems to reclaim your focus",
    toContent: [
      "Hi there,",
      "",
      "This week I found a goldmine of productivity wisdom.",
      "Here are the key takeaways, filtered through my own",
      "experience building a startup:",
      "",
      "1. The 2-Minute Rule (with a twist)",
      "If it takes less than 2 minutes, do it now.",
    ],
  },
  {
    platform: "Facebook",
    icon: FacebookIcon,
    fromTitle: "Sarah Chen",
    fromContent: [
      "Just shipped our new onboarding flow after 3 months of",
      "work! 🚀 The team pulled some incredible late nights.",
      "We reduced drop-off by 40% and increased activation by",
      "25%. Sometimes the best features are the invisible ones.",
      "",
      "Grateful for this amazing team 🙏",
    ],
    toType: "LinkedIn Post",
    toTitle: "Why We Rebuilt Our Onboarding From Scratch",
    toSubtitle: "Lessons from a 40% improvement in user activation",
    toContent: [
      "Three months ago, our onboarding was broken.",
      "",
      "Not visibly broken — the kind of broken that hides in",
      "analytics dashboards. A 60% drop-off rate that we'd",
      "normalized.",
      "",
      "Here's what we learned rebuilding it from zero:",
      "",
      "1. Measure what matters, not what's easy to track",
    ],
  },
  {
    platform: "Instagram",
    icon: InstagramIcon,
    fromTitle: "Alex Hormozi",
    fromContent: [
      "Stop trading time for money.",
      "Start trading skills for equity.",
      "",
      "The math is simple:",
      "• $100/hr x 2000hrs = $200K/yr",
      "• 1% equity x $20M exit = $200K",
      "",
      "One takes 2000 hours.",
      "The other takes one decision.",
    ],
    toType: "X Thread",
    toTitle: "The Equity vs. Salary Framework",
    toSubtitle: "A thread on why smart operators choose ownership over income",
    toContent: [
      "1/ Most people are stuck in the salary trap.",
      "They optimize for hourly rate when they",
      "should optimize for ownership.",
      "",
      "Here's the math nobody talks about:",
      "",
      "2/ $100/hr sounds great until you realize",
      "it has a ceiling. Equity doesn't.",
      "",
      "3/ The real question isn't 'how much per hour?'",
      "It's 'what am I building towards?'",
    ],
  },
  {
    platform: "LinkedIn",
    icon: LinkedInIcon,
    fromTitle: "Elena Rodriguez",
    fromContent: [
      "Our Q4 results are in. 📊",
      "",
      "After switching to product-led growth:",
      "• CAC dropped 62%",
      "• Free-to-paid conversion: 12% → 23%",
      "• NRR hit 135%",
      "",
      "The data doesn't lie. PLG works.",
      "Full breakdown in comments 👇",
    ],
    toType: "Blog Post",
    toTitle: "How We Cut CAC by 62% With Product-Led Growth",
    toSubtitle: "A data-driven breakdown of our PLG transformation",
    toContent: [
      "When we decided to bet everything on product-led",
      "growth last year, the board was skeptical.",
      "",
      "Key Results",
      "The numbers told a clear story. Customer acquisition",
      "cost dropped from $340 to $129. Free-to-paid conversion",
      "nearly doubled.",
      "",
      "What Actually Moved the Needle",
      "It wasn't one thing — it was a system.",
    ],
  },
];

/* -- Mockup cards -------------------------------------------------- */

const transcriptionLines = [
  "so today I want to share the productivity systems",
  "that actually moved the needle for me...",
  "the first one is the two-minute rule, but with a twist.",
  "if something takes less than two minutes, do it now.",
  "don't add it to a list, don't schedule it...",
  "the second hack is time blocking for deep work.",
  "I block 3 hours every morning, no notifications...",
];

/* -- X / Twitter SVG icons ----------------------------------------- */

function XReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M1.751 10c-.036 0-.071 0-.107.002a.75.75 0 0 1-.639-.877C2.69 1.95 9.377.05 12.75.05c3.655 0 5.964 1.058 7.591 2.536A11.1 11.1 0 0 1 23.25 7.8a.75.75 0 0 1-1.49.175c-.258-2.18-1.268-3.96-2.595-5.14C17.878 1.688 15.953.8 12.75.8 9.872.8 3.94 2.502 2.393 9.109A.75.75 0 0 1 1.751 10z" />
    </svg>
  );
}

function XRetweetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
    </svg>
  );
}

function XHeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z" />
    </svg>
  );
}

function XViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M8.75 21V3h2v18h-2zM18.75 21V8.5h2V21h-2zM13.75 21v-9h2v9h-2zM3.75 21v-4h2v4h-2z" />
    </svg>
  );
}

function XBookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z" />
    </svg>
  );
}

function XShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" />
    </svg>
  );
}

/* -- Platform-specific source card renderers ----------------------- */

function XPostMockup({ pair }: { pair: (typeof transformationPairs)[number] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* X dark header bar */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <XIcon className="h-4 w-4 text-gray-900" />
        <span className="text-[10px] text-gray-400">Post</span>
      </div>
      <div className="p-4">
        {/* Author row */}
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white">
            MW
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold text-gray-900">Marcus Wei</span>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-blue-500" fill="currentColor">
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">@marcuswei · 2h</span>

            {/* Tweet text */}
            <div className="mt-2.5 space-y-0.5">
              {pair.fromContent.map((line, i) =>
                line === "" ? (
                  <div key={i} className="h-1.5" />
                ) : (
                  <p key={i} className="text-[13px] leading-[1.4] text-gray-900">
                    {line}
                  </p>
                )
              )}
            </div>

            {/* Engagement bar — X style */}
            <div className="mt-3 flex items-center justify-between pr-8 text-gray-500">
              <button className="flex items-center gap-1 hover:text-blue-500">
                <XReplyIcon />
                <span className="text-[11px]">48</span>
              </button>
              <button className="flex items-center gap-1 hover:text-green-500">
                <XRetweetIcon />
                <span className="text-[11px]">312</span>
              </button>
              <button className="flex items-center gap-1 hover:text-pink-500">
                <XHeartIcon />
                <span className="text-[11px]">1.2K</span>
              </button>
              <button className="flex items-center gap-1 hover:text-blue-500">
                <XViewIcon />
                <span className="text-[11px]">42K</span>
              </button>
              <div className="flex items-center gap-2">
                <XBookmarkIcon />
                <XShareIcon />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function YouTubeMockup({
  pair,
  localProgress,
}: {
  pair: (typeof transformationPairs)[number];
  localProgress: number;
}) {
  const transcriptionProgress = Math.max(
    0,
    Math.min(1, (localProgress - 0.15) / 0.3)
  );
  const visibleLines = Math.floor(
    transcriptionProgress * transcriptionLines.length
  );
  const showTranscription = localProgress > 0.1;
  const videoProgress = Math.max(0, Math.min(1, localProgress / 0.5));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Video player */}
      <div className="relative aspect-video w-full bg-gray-900">
        <img
          src="/scan.webp"
          alt=""
          className="h-full w-full object-cover opacity-70"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-red-600/90 pl-0.5">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
          14:32
        </div>
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
          <div
            className="h-full bg-red-600"
            style={{ width: `${videoProgress * 100}%`, transition: "none" }}
          />
        </div>
      </div>

      {/* Video info */}
      <div className="p-3">
        <div className="flex gap-3">
          {/* Channel avatar */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-[10px] font-bold text-white">
            AP
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-tight text-gray-900">
              {pair.fromTitle}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Ali Productivity
            </p>
            <p className="text-xs text-gray-500">
              1.2M views · 3 days ago
            </p>
          </div>
        </div>

        {/* Transcription overlay */}
        {showTranscription && (
          <div
            className="mt-3 rounded-lg border border-remix-200 bg-remix-50/50 p-3"
            style={{
              opacity: Math.min(1, (localProgress - 0.1) / 0.08),
            }}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-remix-500" />
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-remix-400"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-remix-300"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-remix-600">
                Transcribing...
              </span>
            </div>
            <div className="space-y-1 font-mono">
              {transcriptionLines.slice(0, visibleLines).map((line, i) => (
                <p
                  key={i}
                  className="text-[10px] leading-relaxed text-gray-500"
                  style={{
                    opacity: i === visibleLines - 1 ? 0.7 : 1,
                  }}
                >
                  {line}
                </p>
              ))}
              {visibleLines < transcriptionLines.length &&
                visibleLines > 0 && (
                  <span className="inline-block h-3 w-px animate-blink bg-remix-500" />
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FacebookMockup({
  pair,
}: {
  pair: (typeof transformationPairs)[number];
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Facebook header bar */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
        <FacebookIcon className="h-4 w-4 text-[#1877F2]" />
        <span className="text-[10px] font-semibold text-gray-400">facebook</span>
      </div>

      <div className="p-4">
        {/* Author row */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white">
            SC
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-900">
              {pair.fromTitle}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>2h</span>
              <span>·</span>
              {/* Globe icon for public */}
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm-.5 1.04C5.56 1.55 4 3.97 4 7H1.05A7 7 0 0 1 7.5 1.04zM3.25 8H1.05a7 7 0 0 0 6.45 5.96C5.56 13.45 4 11.03 4 8h-.75zM8 14c-1.66 0-3-2.69-3-6s1.34-6 3-6 3 2.69 3 6-1.34 6-3 6zm3.95-7a7 7 0 0 0-3.45-5.96C10.44 1.55 12 3.97 12 7h2.95zM12 8c0 3.03-1.56 5.45-3.5 5.96A7 7 0 0 0 14.95 8H12z" />
              </svg>
            </div>
          </div>
          {/* Three-dots menu */}
          <div className="ml-auto text-gray-400">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </div>
        </div>

        {/* Post text */}
        <div className="mt-3 space-y-0.5">
          {pair.fromContent.map((line, i) =>
            line === "" ? (
              <div key={i} className="h-1.5" />
            ) : (
              <p key={i} className="text-[13px] leading-[1.4] text-gray-900">
                {line}
              </p>
            )
          )}
        </div>

        {/* Reactions summary */}
        <div className="mt-3 flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-1">
            {/* Stacked reaction emojis */}
            <div className="flex -space-x-1">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-blue-500 text-[10px] ring-2 ring-white">👍</span>
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] ring-2 ring-white">❤️</span>
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-yellow-400 text-[10px] ring-2 ring-white">😮</span>
            </div>
            <span className="ml-1 text-xs text-gray-500">234</span>
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            <span>45 comments</span>
            <span>12 shares</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-1 grid grid-cols-3 gap-1">
          {[
            { label: "Like", icon: "👍" },
            { label: "Comment", icon: "💬" },
            { label: "Share", icon: "↗" },
          ].map(({ label, icon }) => (
            <button
              key={label}
              className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              <span className="text-sm">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstagramReelMockup({
  pair,
}: {
  pair: (typeof transformationPairs)[number];
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-black shadow-lg overflow-hidden" style={{ maxHeight: 480 }}>
      {/* Reel video area — dark vertical format */}
      <div className="relative" style={{ aspectRatio: "9/14" }}>
        {/* Gradient background simulating a reel */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-gray-900 to-black" />

        {/* Reel text overlay (center) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <div className="space-y-1 text-center">
            {pair.fromContent.map((line, i) =>
              line === "" ? (
                <div key={i} className="h-2" />
              ) : (
                <p
                  key={i}
                  className={`leading-[1.3] text-white ${
                    line.startsWith("•") || line.startsWith("The")
                      ? "text-sm"
                      : line.length < 35
                      ? "text-base font-bold"
                      : "text-sm"
                  }`}
                >
                  {line}
                </p>
              )
            )}
          </div>
        </div>

        {/* Top bar — Instagram camera UI */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-white">Reels</span>
          {/* Camera icon */}
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>

        {/* Right sidebar — Instagram action icons */}
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5">
          {[
            { icon: "♥", count: "24.3K" },
            { icon: "💬", count: "892" },
            { icon: "➤", count: "" },
          ].map(({ icon, count }, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-lg text-white">{icon}</span>
              {count && <span className="text-[9px] font-semibold text-white">{count}</span>}
            </div>
          ))}
          {/* Bookmark */}
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {/* Three dots */}
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </div>

        {/* Bottom info — Author */}
        <div className="absolute bottom-0 left-0 right-12 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 text-[9px] font-bold text-white ring-2 ring-pink-500">
              AH
            </div>
            <span className="text-[13px] font-semibold text-white">{pair.fromTitle}</span>
            <button className="rounded-md border border-white/40 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              Follow
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-white/70">
            Stop trading time for money 💰 #entrepreneurship #equity #wealth
          </p>
          {/* Audio bar */}
          <div className="mt-2 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-white/60" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-1/3 rounded-full bg-white/60" />
            </div>
          </div>
        </div>

        {/* Progress dots at very bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
          <div className="h-full w-2/3 bg-white/60" />
        </div>
      </div>
    </div>
  );
}

/* -- Image analysis lines for LinkedIn ----------------------------- */

const imageAnalysisLines = [
  "Detecting chart type... bar chart identified",
  "Extracting data points: CAC, Conversion, NRR",
  "Reading values: CAC $340→$129 (−62%)",
  "Reading values: Conv 12%→23% (+92%)",
  "Reading values: NRR 135%",
  "Analysis complete. Key insight: PLG pivot successful",
];

function LinkedInMockup({
  pair,
  localProgress,
}: {
  pair: (typeof transformationPairs)[number];
  localProgress: number;
}) {
  // Image analysis animation
  const analysisProgress = Math.max(0, Math.min(1, (localProgress - 0.12) / 0.3));
  const visibleAnalysisLines = Math.floor(analysisProgress * imageAnalysisLines.length);
  const showAnalysis = localProgress > 0.08;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* LinkedIn header bar */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
        <LinkedInIcon className="h-4 w-4 text-[#0A66C2]" />
        <span className="text-[10px] font-semibold text-gray-400">LinkedIn</span>
      </div>

      <div className="p-4">
        {/* Author row */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 text-xs font-bold text-white">
            ER
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="text-[13px] font-semibold text-gray-900">
                {pair.fromTitle}
              </p>
              <span className="text-[10px] text-gray-400">· 1st</span>
            </div>
            <p className="text-[11px] text-gray-500">VP Growth @ Dataflow · SaaS · PLG</p>
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <span>3d</span>
              <span>·</span>
              {/* Globe icon */}
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm-.5 1.04C5.56 1.55 4 3.97 4 7H1.05A7 7 0 0 1 7.5 1.04zM3.25 8H1.05a7 7 0 0 0 6.45 5.96C5.56 13.45 4 11.03 4 8h-.75zM8 14c-1.66 0-3-2.69-3-6s1.34-6 3-6 3 2.69 3 6-1.34 6-3 6zm3.95-7a7 7 0 0 0-3.45-5.96C10.44 1.55 12 3.97 12 7h2.95zM12 8c0 3.03-1.56 5.45-3.5 5.96A7 7 0 0 0 14.95 8H12z" />
              </svg>
            </div>
          </div>
          {/* Three-dots */}
          <div className="text-gray-400">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </div>
        </div>

        {/* Post text */}
        <div className="mt-3 space-y-0.5">
          {pair.fromContent.map((line, i) =>
            line === "" ? (
              <div key={i} className="h-1.5" />
            ) : (
              <p key={i} className="text-[13px] leading-[1.4] text-gray-900">
                {line}
              </p>
            )
          )}
        </div>

        {/* Chart image mockup */}
        <div className="relative mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 overflow-hidden">
          {/* Fake bar chart */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Q4 Results — PLG Impact</p>
          <div className="flex items-end gap-3 h-20">
            {/* CAC */}
            <div className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end gap-1 justify-center">
                <div className="w-5 rounded-t bg-gray-300" style={{ height: 60 }} />
                <div className="w-5 rounded-t bg-[#0A66C2]" style={{ height: 23 }} />
              </div>
              <span className="text-[8px] font-medium text-gray-500">CAC</span>
            </div>
            {/* Conversion */}
            <div className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end gap-1 justify-center">
                <div className="w-5 rounded-t bg-gray-300" style={{ height: 22 }} />
                <div className="w-5 rounded-t bg-[#0A66C2]" style={{ height: 42 }} />
              </div>
              <span className="text-[8px] font-medium text-gray-500">Conv.</span>
            </div>
            {/* NRR */}
            <div className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end gap-1 justify-center">
                <div className="w-5 rounded-t bg-gray-300" style={{ height: 38 }} />
                <div className="w-5 rounded-t bg-[#0A66C2]" style={{ height: 55 }} />
              </div>
              <span className="text-[8px] font-medium text-gray-500">NRR</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[8px] text-gray-400">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-gray-300" /> Before</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[#0A66C2]" /> After PLG</span>
          </div>

          {/* Image analysis overlay */}
          {showAnalysis && (
            <div
              className="absolute inset-0 rounded-lg bg-black/70 backdrop-blur-sm p-3 flex flex-col"
              style={{
                opacity: Math.min(1, (localProgress - 0.08) / 0.08),
              }}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-remix-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-remix-400">
                  Analyzing image...
                </span>
              </div>
              <div className="space-y-1 flex-1 font-mono">
                {imageAnalysisLines.slice(0, visibleAnalysisLines).map((line, i) => (
                  <p
                    key={i}
                    className="text-[9px] leading-relaxed text-green-400"
                    style={{
                      opacity: i === visibleAnalysisLines - 1 ? 0.7 : 1,
                    }}
                  >
                    &gt; {line}
                  </p>
                ))}
                {visibleAnalysisLines < imageAnalysisLines.length &&
                  visibleAnalysisLines > 0 && (
                    <span className="inline-block h-3 w-px animate-blink bg-green-400" />
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Reactions bar — LinkedIn style */}
        <div className="mt-3 flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-blue-600 text-[8px] ring-1 ring-white">👍</span>
              <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-red-500 text-[8px] ring-1 ring-white">❤️</span>
              <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-green-500 text-[8px] ring-1 ring-white">👏</span>
            </div>
            <span className="ml-1 text-[11px] text-gray-500">1,847</span>
          </div>
          <span className="text-[11px] text-gray-500">86 comments · 34 reposts</span>
        </div>

        {/* Action buttons — LinkedIn style */}
        <div className="mt-1 grid grid-cols-4 gap-0.5">
          {[
            { label: "Like", icon: "👍" },
            { label: "Comment", icon: "💬" },
            { label: "Repost", icon: "🔁" },
            { label: "Send", icon: "➤" },
          ].map(({ label, icon }) => (
            <button
              key={label}
              className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
            >
              <span className="text-xs">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -- Generic source card wrapper ----------------------------------- */

function SourceCard({
  pair,
  opacity,
  translateX,
  translateY,
  blur,
  localProgress,
  isMobile,
}: {
  pair: (typeof transformationPairs)[number];
  opacity: number;
  translateX: number;
  translateY: number;
  blur: number;
  localProgress: number;
  isMobile: boolean;
}) {
  return (
    <div
      className={
        isMobile
          ? "absolute left-1/2 top-[12%] w-[270px]"
          : "absolute left-0 top-1/2 w-[320px] md:w-[380px]"
      }
      style={{
        opacity,
        transform: isMobile
          ? `translateX(-50%) translateY(${translateY}px) scale(0.88)`
          : `translateY(-50%) translateX(${translateX}px)`,
        transformOrigin: "center top",
        filter: `blur(${blur}px)`,
        transition: "none",
      }}
    >
      {pair.platform === "X" && <XPostMockup pair={pair} />}
      {pair.platform === "YouTube" && (
        <YouTubeMockup pair={pair} localProgress={localProgress} />
      )}
      {pair.platform === "Facebook" && <FacebookMockup pair={pair} />}
      {pair.platform === "Instagram" && <InstagramReelMockup pair={pair} />}
      {pair.platform === "LinkedIn" && (
        <LinkedInMockup pair={pair} localProgress={localProgress} />
      )}
    </div>
  );
}

function ResultCard({
  pair,
  opacity,
  translateX,
  translateY,
  blur,
  badgeOpacity,
  isMobile,
}: {
  pair: (typeof transformationPairs)[number];
  opacity: number;
  translateX: number;
  translateY: number;
  blur: number;
  badgeOpacity: number;
  isMobile: boolean;
}) {
  return (
    <div
      className={
        isMobile
          ? "absolute left-1/2 top-[58%] w-[270px]"
          : "absolute right-0 top-1/2 w-[320px] md:w-[380px]"
      }
      style={{
        opacity,
        transform: isMobile
          ? `translateX(-50%) translateY(${translateY}px) scale(0.88)`
          : `translateY(-50%) translateX(${translateX}px)`,
        transformOrigin: "center top",
        filter: `blur(${blur}px)`,
        transition: "none",
      }}
    >
      <div className="rounded-2xl border border-remix-200 bg-white p-5 shadow-lg ring-1 ring-remix-100">
        {/* Type badge */}
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-remix-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-remix-500">
            {pair.toType}
          </span>
        </div>

        {/* Title */}
        <h4 className="mb-1 text-base font-bold text-gray-900">
          {pair.toTitle}
        </h4>
        <p className="mb-3 text-xs text-gray-400">{pair.toSubtitle}</p>

        {/* Content */}
        <div className="space-y-0.5">
          {pair.toContent.map((line, i) =>
            line === "" ? (
              <div key={i} className="h-2" />
            ) : line === line.replace(/^[a-z]/, "") &&
              !line.startsWith("Hi") &&
              !line.startsWith("This") &&
              !line.startsWith("Here") &&
              !line.startsWith("Not") &&
              !line.startsWith("Three") &&
              !line.startsWith("A ") &&
              !line.startsWith("If ") &&
              line.length < 50 &&
              i > 0 ? (
              <p
                key={i}
                className="mt-2 text-xs font-semibold text-gray-800"
              >
                {line}
              </p>
            ) : (
              <p key={i} className="text-xs leading-relaxed text-gray-600">
                {line}
              </p>
            )
          )}
        </div>

        {/* Your Style Applied badge */}
        <div
          className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3"
          style={{ opacity: badgeOpacity }}
        >
          {["Your Tone", "Your Structure", "Your Depth"].map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-remix-50 px-2.5 py-1 text-[10px] font-medium text-remix-600"
            >
              <Check className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransformationSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScroll =
        containerRef.current.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScroll));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const numPairs = transformationPairs.length;

  return (
    <div ref={containerRef} style={{ height: `${numPairs * 100 + 50}vh` }}>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6">
        <div className="relative mx-auto w-full max-w-6xl">
          {/* Center Remorph button + animated cursor */}
          {(() => {
            const intensity = getOrbIntensity(scrollProgress, numPairs);
            const isClicking = intensity > 0.7;
            // Cursor travels from resting position to button center
            const cursorOffsetX = 44 - intensity * 40; // 44px → 4px
            const cursorOffsetY = -40 + intensity * 32; // -40px → -8px
            return (
              <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                <div className="flex flex-col items-center gap-3">
                  {/* Button */}
                  <div className="relative">
                    <button
                      className="relative flex items-center gap-2.5 rounded-xl px-6 py-3 text-base font-bold text-white shadow-xl transition-transform md:px-8 md:py-3.5 md:text-lg"
                      style={{
                        background: "linear-gradient(135deg, #e64533 0%, #b91c1c 100%)",
                        transform: isClicking ? "scale(0.92)" : "scale(1)",
                        boxShadow: `0 0 ${20 + intensity * 50}px rgba(230,69,51,${0.2 + intensity * 0.4}), 0 4px 20px rgba(230,69,51,0.3)`,
                        transition: "transform 0.15s ease, box-shadow 0.2s ease",
                      }}
                    >
                      <img src="/WhiteIcon512.png" alt="" className="h-5 w-5 md:h-6 md:w-6" />
                      Remorph
                    </button>
                    {/* Click ripple */}
                    {isClicking && (
                      <div
                        className="pointer-events-none absolute inset-0 rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.3)",
                          animation: "click-ripple 0.6s ease-out forwards",
                        }}
                      />
                    )}
                    {/* Cursor */}
                    <svg
                      width="32"
                      height="38"
                      viewBox="0 0 20 24"
                      className="pointer-events-none absolute drop-shadow-lg"
                      style={{
                        right: `${-cursorOffsetX}px`,
                        top: `${-cursorOffsetY}px`,
                        opacity: scrollProgress > 0.01 ? 0.95 : 0,
                        transform: isClicking ? "scale(0.82) rotate(-5deg)" : "scale(1) rotate(0deg)",
                        transition: "transform 0.12s ease, opacity 0.3s ease",
                      }}
                    >
                      {/* Classic pointer cursor */}
                      <path
                        d="M2 1L2 17L6.5 13L10.5 21L13.5 19.5L9.5 11.5L15 11L2 1Z"
                        fill="white"
                        stroke="#1a1a1a"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Cards */}
          {transformationPairs.map((pair, index) => {
            const phaseSize = 1 / numPairs;
            const phaseStart = index * phaseSize;
            const localProgress = Math.max(
              0,
              Math.min(1, (scrollProgress - phaseStart) / phaseSize)
            );

            // Source card animation
            const srcOpacity =
              localProgress < 0.05
                ? localProgress / 0.05
                : localProgress > 0.55
                ? Math.max(0, 1 - (localProgress - 0.55) / 0.1)
                : 1;
            const srcTranslateX =
              localProgress < 0.3
                ? -60 + localProgress * (60 / 0.3)
                : localProgress < 0.5
                ? ((localProgress - 0.3) / 0.2) * 80
                : 80;
            // Mobile: source travels down from top toward center button
            const srcTranslateY =
              localProgress < 0.05
                ? -20
                : localProgress < 0.3
                ? 0
                : localProgress < 0.5
                ? ((localProgress - 0.3) / 0.2) * 160
                : 160;
            const srcBlur =
              localProgress < 0.3
                ? 0
                : Math.min(8, ((localProgress - 0.3) / 0.2) * 8);

            // Result card animation
            const resOpacity =
              localProgress < 0.45
                ? 0
                : localProgress < 0.55
                ? (localProgress - 0.45) / 0.1
                : 1;
            const resTranslateX =
              localProgress < 0.5
                ? -80
                : localProgress < 0.7
                ? -80 + ((localProgress - 0.5) / 0.2) * 80
                : 0;
            // Mobile: result emerges from above (near center) and settles down
            const resTranslateY =
              localProgress < 0.5
                ? -60
                : localProgress < 0.7
                ? -60 + ((localProgress - 0.5) / 0.2) * 60
                : 0;
            const resBlur =
              localProgress < 0.55
                ? 8
                : Math.max(0, 8 - ((localProgress - 0.55) / 0.15) * 8);
            const badgeOpacity =
              localProgress < 0.75 ? 0 : (localProgress - 0.75) / 0.15;

            return (
              <div key={index}>
                <SourceCard
                  pair={pair}
                  opacity={srcOpacity}
                  translateX={srcTranslateX}
                  translateY={srcTranslateY}
                  blur={srcBlur}
                  localProgress={localProgress}
                  isMobile={isMobile}
                />
                <ResultCard
                  pair={pair}
                  opacity={resOpacity}
                  translateX={resTranslateX}
                  translateY={resTranslateY}
                  blur={resBlur}
                  badgeOpacity={Math.min(1, badgeOpacity)}
                  isMobile={isMobile}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getOrbIntensity(scrollProgress: number, numPairs: number): number {
  let maxIntensity = 0;
  for (let i = 0; i < numPairs; i++) {
    const phaseSize = 1 / numPairs;
    const phaseStart = i * phaseSize;
    const local = (scrollProgress - phaseStart) / phaseSize;
    if (local > 0.35 && local < 0.65) {
      const dist = Math.abs(local - 0.5) / 0.15;
      maxIntensity = Math.max(maxIntensity, 1 - dist);
    }
  }
  return Math.max(0, Math.min(1, maxIntensity));
}

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
    <div className="min-h-screen bg-white text-gray-900 antialiased selection:bg-remix-100">
      {/* ---- Nav ---- */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2.5">
            <img src="/RedIcon512.png" alt="Remorph.it" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-gray-900">
              Remorph<span className="text-remix-600">.it</span>
            </span>
          </a>
          <div className="flex items-center gap-6">
            <a href="#pricing" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">
              Pricing
            </a>
            <a
              href="#how"
              className="rounded-lg bg-remix-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-remix-500"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <Section className="relative overflow-hidden pt-40 md:pt-52 text-center">
        {/* background glow */}
        <div className="pointer-events-none absolute inset-0 -top-40 flex justify-center">
          <div className="h-[500px] w-[700px] rounded-full bg-remix-100 blur-[120px]" />
        </div>

        <div className="relative">
          <div className="animate-fade-in-up">
            <SectionLabel>Browser Extension</SectionLabel>
          </div>

          <h1 className="animate-fade-in-up delay-100 mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Turns Any Content{" "}
            <span className="bg-gradient-to-r from-remix-500 to-remix-700 bg-clip-text text-transparent">
              Into Your Voice
            </span>
          </h1>

          <p className="animate-fade-in-up delay-200 mx-auto mt-6 max-w-2xl text-lg text-gray-500 md:text-xl">
            Remorph.it transforms the content you're already consuming into new,
            ready-to-publish content written in your own style.
          </p>

          <div className="animate-fade-in-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#how"
              className="group inline-flex items-center gap-2 rounded-xl bg-remix-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-remix-600/20 transition hover:bg-remix-500 hover:shadow-remix-500/25"
            >
              Get Started
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* No-friction bullets */}
          <div className="animate-fade-in-up delay-400 mt-14 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            {[
              "No tabs.",
              "No copy-paste workflows.",
              "No switching between tools.",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-remix-500" />
                {t}
              </span>
            ))}
          </div>

          <p className="animate-fade-in-up delay-500 mt-6 font-mono text-sm text-gray-400">
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
          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            If you're scrolling it, watching it, or reading it, you can remorph
            it.
          </p>
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-6">
          {platforms.map(({ name, icon: Icon }) => (
            <div
              key={name}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-10 py-8 transition hover:border-remix-300 hover:bg-remix-50"
            >
              <Icon className="h-8 w-8 text-gray-400 transition group-hover:text-remix-500" />
              <span className="text-sm font-medium text-gray-700">
                {name}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-400">And more soon.</p>
      </Section>

      {/* ---- Scroll Transformation ---- */}
      <TransformationSection />

      {/* ---- Understanding ---- */}
      <Section>
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <SectionLabel>Deep Analysis</SectionLabel>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Not Just Rewriting.{" "}
              <span className="text-remix-600">Real Understanding.</span>
            </h2>
            <p className="mt-4 text-gray-500">
              This is structured transformation, not surface-level paraphrasing.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Mic, text: "Transcribes video content" },
              { icon: Layers, text: "Extracts structure and arguments" },
              { icon: Eye, text: "Understands visual elements" },
              { icon: Sparkles, text: "Preserves meaning" },
              {
                icon: Pen,
                text: "Regenerates content in your defined voice",
              },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 transition hover:border-remix-300"
              >
                <Icon className="h-5 w-5 shrink-0 text-remix-500" />
                <span className="text-sm text-gray-700">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ---- Voice Profile ---- */}
      <Section className="bg-gray-50">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Your Voice</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Define Your Style Once
          </h2>
          <p className="mt-4 text-gray-500">
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
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <h3 className="text-base font-semibold text-gray-900">
                {label}
              </h3>
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
          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            If you consume content daily, Remorph.it turns it into output.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {[
            "Founders",
            "Creators",
            "Operators",
            "Marketing teams",
            "Agencies",
          ].map((role) => (
            <span
              key={role}
              className="rounded-full border border-gray-200 bg-gray-50 px-6 py-2.5 text-sm font-medium text-gray-700"
            >
              {role}
            </span>
          ))}
        </div>
      </Section>

      {/* ---- How it works ---- */}
      <Section id="how" className="bg-gray-50">
        <div className="text-center">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Five Steps. That's It.
          </h2>
        </div>

        <div className="mx-auto mt-14 max-w-2xl space-y-0">
          {steps.map(({ text, icon: Icon }, i) => (
            <div key={text} className="relative flex gap-5 pb-10 last:pb-0">
              {i < steps.length - 1 && (
                <div className="absolute left-5 top-12 h-full w-px bg-gradient-to-b from-remix-300 to-transparent" />
              )}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-remix-200 bg-remix-50 text-remix-600">
                <Icon className="h-4 w-4" />
              </div>
              <div className="pt-2">
                <span className="text-xs font-semibold uppercase text-gray-400">
                  Step {i + 1}
                </span>
                <p className="text-base font-medium text-gray-800">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center font-mono text-sm text-gray-400">
          Consumption becomes production.
        </p>
      </Section>

      {/* ---- Pricing ---- */}
      <Section id="pricing" className="bg-gray-50">
        <div className="text-center">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            Start free. Upgrade when you're ready.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-3">
          {/* Trial */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <div className="mb-6">
              <span className="text-2xl">🎁</span>
              <h3 className="mt-2 text-lg font-bold text-gray-900">Trial</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-900">Free</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">7 days</p>
            </div>
            <ul className="space-y-3">
              {["15 transformations", "Pre-defined templates", "1 custom template"].map(
                (f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Check className="h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ),
              )}
            </ul>
            <a
              href="#how"
              className="mt-8 block w-full rounded-xl border border-gray-300 py-3 text-center text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              Get Started
            </a>
          </div>

          {/* Starter */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <div className="mb-6">
              <span className="text-2xl">💡</span>
              <h3 className="mt-2 text-lg font-bold text-gray-900">Starter</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-900">€9</span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">or €79/year</p>
            </div>
            <ul className="space-y-3">
              {[
                "50 transformations/month",
                "3 custom templates",
                "All source platforms",
                "30-day history",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="#how"
              className="mt-8 block w-full rounded-xl border border-gray-300 py-3 text-center text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              Choose Starter
            </a>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl border-2 border-remix-500 bg-white p-8">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-remix-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Recommended
              </span>
            </div>
            <div className="mb-6">
              <span className="text-2xl">🚀</span>
              <h3 className="mt-2 text-lg font-bold text-gray-900">Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-900">€29</span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">or €249/year</p>
            </div>
            <ul className="space-y-3">
              {[
                "250 transformations/month",
                "Unlimited custom templates",
                "Unlimited history",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="#how"
              className="mt-8 block w-full rounded-xl bg-remix-600 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-remix-600/20 transition hover:bg-remix-500"
            >
              Choose Pro
            </a>
          </div>
        </div>
      </Section>

      {/* ---- CTA ---- */}
      <Section className="text-center">
        <div className="mx-auto max-w-2xl">
          <img
            src="/RedIcon512.png"
            alt="Remorph.it"
            className="animate-float mx-auto mb-8 h-20 w-20"
          />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to{" "}
            <span className="bg-gradient-to-r from-remix-500 to-remix-700 bg-clip-text text-transparent">
              Remorph
            </span>
            ?
          </h2>
          <p className="mt-4 text-gray-500">
            Stop copying. Stop switching. Start publishing.
          </p>
          <a
            href="#"
            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-remix-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-remix-600/20 transition hover:bg-remix-500 hover:shadow-remix-500/25"
          >
            <Users className="h-4 w-4" />
            Join the Waitlist
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </a>
        </div>
      </Section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-gray-200 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/RedIcon512.png" alt="" className="h-5 w-5" />
            <span className="text-sm font-semibold text-gray-500">
              Remorph.it
            </span>
          </div>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Remorph.it. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
