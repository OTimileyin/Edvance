import Link from "next/link";

const pipeline = ["Question", "Concept", "Evidence", "Consistency", "Mastery", "Revision"];

/* ---------- Poster scene (hero illustration) ---------- */

function PosterScene() {
  return (
    <svg
      className="poster-scene"
      viewBox="0 0 760 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8F2E2" />
          <stop offset="52%" stopColor="#E4E7D3" />
          <stop offset="100%" stopColor="#BFDCD6" />
        </linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A9A96" />
          <stop offset="55%" stopColor="#2C6E70" />
          <stop offset="100%" stopColor="#123A3C" />
        </linearGradient>
      </defs>

      <rect width="760" height="360" fill="url(#sky)" />

      {/* clouds */}
      <g fill="#FFFCF3" opacity="0.92">
        <g transform="translate(104 92)">
          <circle cx="0" cy="0" r="22" />
          <circle cx="34" cy="-9" r="29" />
          <circle cx="74" cy="2" r="19" />
          <rect x="-22" y="0" width="118" height="22" rx="11" />
        </g>
        <g transform="translate(392 58)" opacity="0.85">
          <circle cx="0" cy="0" r="16" />
          <circle cx="24" cy="-7" r="21" />
          <rect x="-16" y="0" width="76" height="16" rx="8" />
        </g>
        <g transform="translate(214 206)" opacity="0.7">
          <circle cx="0" cy="0" r="13" />
          <circle cx="20" cy="-6" r="17" />
          <rect x="-13" y="0" width="64" height="14" rx="7" />
        </g>
      </g>

      {/* the seal-sun */}
      <circle cx="604" cy="134" r="58" fill="#DC6338" />
      <circle
        cx="604"
        cy="134"
        r="78"
        fill="none"
        stroke="#C9502E"
        strokeOpacity="0.32"
        strokeWidth="2"
        strokeDasharray="6 11"
      />

      {/* birds */}
      <g fill="none" stroke="#3F6E68" strokeWidth="2.2" strokeLinecap="round" opacity="0.72">
        <path d="M138 252q10-8 20 0q10-8 20 0" />
        <path d="M196 228q7-6 14 0q7-6 14 0" />
      </g>

      {/* far range */}
      <path
        d="M0 302 L92 236 L178 288 L288 212 L392 276 L494 222 L598 284 L700 236 L760 266 L760 372 L0 372 Z"
        fill="#A9C6BF"
      />
      <path
        d="M288 212 L316 246 L300 238 L288 252 L274 238 L256 246 Z"
        fill="#FBF6EA"
        opacity="0.85"
      />
      <path
        d="M494 222 L520 254 L506 246 L494 260 L480 246 L464 254 Z"
        fill="#FBF6EA"
        opacity="0.8"
      />
      <path d="M92 236 L116 266 L102 258 L92 270 L80 258 L64 266 Z" fill="#FBF6EA" opacity="0.7" />
      <path
        d="M700 236 L722 264 L710 256 L700 268 L688 256 L674 264 Z"
        fill="#FBF6EA"
        opacity="0.7"
      />

      {/* mid range */}
      <path
        d="M0 372 L124 318 L252 358 L384 300 L516 352 L652 306 L760 346 L760 452 L0 452 Z"
        fill="#6E9E96"
      />

      {/* sea */}
      <rect y="430" width="760" height="470" fill="url(#sea)" />

      {/* headland with lighthouse */}
      <path
        d="M556 470 C 592 432, 648 414, 712 420 C 736 422, 752 428, 760 434 L760 470 Z"
        fill="#3F6E68"
      />
      <g fill="#12474A">
        <path d="M556 424c-6-16-5-42 0-56 5 14 6 40 0 56Z" />
        <path d="M582 430c-5-13-4-34 0-45 4 11 5 32 0 45Z" />
        <path d="M672 428c-5-12-4-32 0-42 4 10 5 30 0 42Z" />
      </g>
      <g transform="translate(636 434)">
        <path d="M-16 0 L-10 -78 L10 -78 L16 0 Z" fill="#FBF6EA" />
        <path d="M-14 -18 L14 -18 L12.6 -30 L-12.6 -30 Z" fill="#C9502E" />
        <path d="M-12 -42 L12 -42 L10.8 -54 L-10.8 -54 Z" fill="#C9502E" />
        <rect x="-8" y="-90" width="16" height="13" fill="#123236" />
        <path d="M-13 -90 L0 -103 L13 -90 Z" fill="#123236" />
        <path d="M-8 -85 L-56 -98 L-56 -70 Z" fill="#F5ECD4" opacity="0.5" />
        <path d="M8 -85 L56 -98 L56 -70 Z" fill="#F5ECD4" opacity="0.5" />
      </g>

      {/* sailboat */}
      <g transform="translate(140 468)">
        <ellipse cx="0" cy="24" rx="48" ry="8" fill="#0E2C2B" opacity="0.32" />
        <path d="M-7 0 L-7 -48 L30 0 Z" fill="#FBF6EA" />
        <path d="M-12 0 L-12 -34 L-34 0 Z" fill="#EFE6D7" />
        <path d="M-7 -52 L-7 0" stroke="#123236" strokeWidth="2.4" />
        <path d="M-33 0 L33 0 L22 15 L-22 15 Z" fill="#A03B1E" />
      </g>

      {/* wave strokes (kept above the caption card) */}
      <g fill="none" stroke="#9EDCD2" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round">
        <path d="M60 452q16-8 32 0t32 0" />
        <path d="M300 448q16-8 32 0t32 0" />
        <path d="M470 458q16-8 32 0t32 0" />
        <path d="M96 498q16-8 32 0t32 0" opacity="0.7" />
        <path d="M40 560q16-8 32 0t32 0" opacity="0.5" />
        <path d="M70 700q16-8 32 0t32 0" opacity="0.35" />
        <path d="M690 520q16-8 32 0t32 0" opacity="0.4" />
      </g>
    </svg>
  );
}

/* ---------- Band 1 illustration tiles ---------- */

function TileSourceMap() {
  return (
    <svg viewBox="0 0 320 240" aria-hidden="true">
      <rect width="320" height="240" fill="#6B8A5E" />
      <circle cx="252" cy="62" r="46" fill="#FBF6EA" opacity="0.16" />
      <g transform="translate(58 38)">
        <rect width="132" height="164" rx="10" fill="#FBF6EA" />
        <rect x="18" y="24" width="88" height="9" rx="4.5" fill="#DBC9A8" />
        <rect x="18" y="46" width="96" height="9" rx="4.5" fill="#C9502E" />
        <rect x="18" y="68" width="70" height="9" rx="4.5" fill="#DBC9A8" />
        <rect x="18" y="90" width="88" height="9" rx="4.5" fill="#DBC9A8" />
        <rect x="18" y="112" width="56" height="9" rx="4.5" fill="#2C6E70" />
      </g>
      <g transform="translate(196 158)">
        <rect width="76" height="52" rx="9" fill="#F6EFDD" stroke="#123236" strokeWidth="3" />
        <rect x="14" y="16" width="48" height="7" rx="3.5" fill="#A9C6BF" />
        <rect x="14" y="31" width="34" height="7" rx="3.5" fill="#C9502E" />
      </g>
      <path
        d="M186 122 L200 158"
        stroke="#123236"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="7 8"
      />
    </svg>
  );
}

function TileConsistency() {
  return (
    <svg viewBox="0 0 320 240" aria-hidden="true">
      <rect width="320" height="240" fill="#C9502E" />
      <circle cx="66" cy="196" r="52" fill="#FBF6EA" opacity="0.12" />
      <g transform="rotate(-9 108 110)">
        <rect x="46" y="40" width="118" height="150" rx="10" fill="#FBF6EA" />
        <rect x="62" y="64" width="86" height="9" rx="4.5" fill="#DBC9A8" />
        <rect x="62" y="86" width="62" height="9" rx="4.5" fill="#DBC9A8" />
        <rect x="62" y="108" width="78" height="9" rx="4.5" fill="#123236" />
      </g>
      <g transform="rotate(10 226 128)">
        <rect x="168" y="52" width="118" height="150" rx="10" fill="#F6EFDD" />
        <rect x="184" y="78" width="86" height="9" rx="4.5" fill="#DBC9A8" />
        <rect x="184" y="100" width="70" height="9" rx="4.5" fill="#DBC9A8" />
        <rect x="184" y="122" width="52" height="9" rx="4.5" fill="#123236" />
      </g>
      <g transform="translate(160 122)">
        <circle cx="0" cy="0" r="30" fill="#F5ECD4" stroke="#123236" strokeWidth="4" />
        <path d="M0 -12v14" stroke="#A03B1E" strokeWidth="5" strokeLinecap="round" />
        <circle cx="0" cy="12" r="3.4" fill="#A03B1E" />
      </g>
    </svg>
  );
}

function TileMastery() {
  return (
    <svg viewBox="0 0 320 240" aria-hidden="true">
      <rect width="320" height="240" fill="#2C6E70" />
      <circle
        cx="150"
        cy="112"
        r="80"
        fill="none"
        stroke="#FBF6EA"
        strokeOpacity="0.28"
        strokeWidth="14"
      />
      <path
        d="M150 32a80 80 0 0 1 62 128"
        fill="none"
        stroke="#FBF6EA"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <circle cx="150" cy="112" r="30" fill="#123236" />
      <circle cx="150" cy="112" r="10" fill="#DC6338" />
      <g fill="#FBF6EA">
        <rect x="62" y="176" width="18" height="46" rx="6" />
        <rect x="92" y="152" width="18" height="70" rx="6" />
        <rect x="122" y="194" width="18" height="28" rx="6" opacity="0.6" />
      </g>
      <rect x="176" y="120" width="104" height="26" rx="13" fill="#FBF6EA" opacity="0.9" />
      <rect x="176" y="120" width="66" height="26" rx="13" fill="#DC6338" />
    </svg>
  );
}

/* ---------- Medallion icons ---------- */

const expectationIcon = (
  <svg
    viewBox="0 0 96 96"
    fill="none"
    stroke="currentColor"
    strokeWidth="5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <rect x="26" y="16" width="44" height="64" rx="7" />
    <path d="M36 36h24M36 50h24M36 64h14" />
  </svg>
);

const taughtIcon = (
  <svg
    viewBox="0 0 96 96"
    fill="none"
    stroke="currentColor"
    strokeWidth="5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="43" cy="41" r="21" />
    <path d="M58 57l17 17" />
    <path d="M35 41h16M43 33v16" />
  </svg>
);

const consistentIcon = (
  <svg
    viewBox="0 0 96 96"
    fill="none"
    stroke="currentColor"
    strokeWidth="5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 34h52M16 34l11-11M16 34l11 11" />
    <path d="M80 62H28M80 62 69 51M80 62 69 73" />
  </svg>
);

const masteryIcon = (
  <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="5" aria-hidden="true">
    <circle cx="48" cy="48" r="31" />
    <circle cx="48" cy="48" r="16" />
    <circle cx="48" cy="48" r="5" fill="currentColor" stroke="none" />
  </svg>
);

/* ---------- Editorial illustration ---------- */

function DeskArt() {
  return (
    <svg viewBox="0 0 460 400" aria-hidden="true">
      <circle cx="232" cy="200" r="188" fill="#FBF6EA" />
      <circle
        cx="232"
        cy="200"
        r="176"
        fill="none"
        stroke="#DBC9A8"
        strokeWidth="3"
        strokeDasharray="4 12"
        strokeLinecap="round"
      />

      {/* two source cards, linked */}
      <g transform="rotate(-8 132 150)">
        <rect
          x="46"
          y="96"
          width="164"
          height="118"
          rx="14"
          fill="#FFFCF3"
          stroke="#DBC9A8"
          strokeWidth="3"
        />
        <rect x="68" y="122" width="104" height="11" rx="5.5" fill="#2C6E70" />
        <rect x="68" y="146" width="120" height="11" rx="5.5" fill="#EDE2C9" />
        <rect x="68" y="170" width="78" height="11" rx="5.5" fill="#EDE2C9" />
      </g>
      <g transform="rotate(7 320 214)">
        <rect
          x="238"
          y="160"
          width="164"
          height="118"
          rx="14"
          fill="#FFFCF3"
          stroke="#DBC9A8"
          strokeWidth="3"
        />
        <rect x="260" y="186" width="118" height="11" rx="5.5" fill="#C9502E" />
        <rect x="260" y="210" width="92" height="11" rx="5.5" fill="#EDE2C9" />
        <rect x="260" y="234" width="110" height="11" rx="5.5" fill="#EDE2C9" />
      </g>
      <path
        d="M150 236 C 196 288, 262 286, 300 258"
        fill="none"
        stroke="#123236"
        strokeWidth="4"
        strokeDasharray="8 10"
        strokeLinecap="round"
      />
      <circle cx="226" cy="272" r="13" fill="#C9502E" stroke="#FBF6EA" strokeWidth="4" />

      {/* plant, echoing the reference medallions */}
      <g transform="translate(392 320)">
        <path d="M-26 0 h52 l-9 40 h-34 Z" fill="#A03B1E" />
        <path d="M-30 0 h60" stroke="#7E2C14" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M0 -4 C -4 -34, -22 -44, -30 -52"
          stroke="#6B8A5E"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M0 -4 C 4 -40, 22 -52, 32 -60"
          stroke="#6B8A5E"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M0 -4 C 0 -40, -2 -58, 2 -74"
          stroke="#6B8A5E"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="-32" cy="-56" rx="16" ry="10" fill="#83A072" transform="rotate(-28 -32 -56)" />
        <ellipse cx="34" cy="-64" rx="16" ry="10" fill="#83A072" transform="rotate(26 34 -64)" />
        <ellipse cx="4" cy="-78" rx="14" ry="9" fill="#AEC294" transform="rotate(6 4 -78)" />
      </g>
    </svg>
  );
}

/* ---------- Content ---------- */

const jobs = [
  {
    no: "01",
    title: "Assessment-to-source mapping",
    text: "Every question is wired to the lesson, slide, and transcript segment where its answer was taught. “What do I study?” stops being guesswork.",
    art: <TileSourceMap />,
  },
  {
    no: "02",
    title: "Course consistency intelligence",
    text: "Contradictions between slide decks, transcripts, and notes are surfaced as flagged inconsistencies — not silent traps.",
    art: <TileConsistency />,
  },
  {
    no: "03",
    title: "Per-concept mastery",
    text: "Results update mastery at the concept and question level, so your revision list is built from evidence instead of vibes.",
    art: <TileMastery />,
  },
];

const questions = [
  {
    no: "01",
    tone: "var(--teal-900)",
    icon: expectationIcon,
    title: "What exactly am I expected to know?",
    text: "Every assessment maps to a defined concept set, made explicit up front.",
  },
  {
    no: "02",
    tone: "var(--teal-600)",
    icon: taughtIcon,
    title: "Where was it taught?",
    text: "Each question links back to the exact lesson, slide, and timestamp.",
  },
  {
    no: "03",
    tone: "var(--sage-600)",
    icon: consistentIcon,
    title: "Do the materials agree?",
    text: "Sources that contradict each other or the assessment get flagged.",
  },
  {
    no: "04",
    tone: "var(--rust-600)",
    icon: masteryIcon,
    title: "What have I not mastered yet?",
    text: "Concepts scored by evidence, so the next revision is obvious.",
  },
];

const steps = [
  "Create a workspace",
  "Add materials",
  "Extract concepts",
  "Add a question",
  "Check evidence",
  "Get a revision list",
];

export default function Home() {
  return (
    <>
      <section className="poster-hero">
        <div className="container">
          <div className="poster">
            <div className="poster-copy">
              <p className="kicker">Evidence-first assessment intelligence</p>
              <h1 className="hero-title">
                Know <em className="em-coral">what is tested</em>, where it was taught, and what to
                study next.
              </h1>
              <p className="hero-lede">
                Edvance connects each assessment question to the exact lecture, slide, transcript,
                and note where the answer was taught — flags where your materials disagree — and
                scores what you have and haven&rsquo;t mastered.
              </p>
              <div className="cta-row">
                <Link className="btn btn-primary" href="/signup">
                  Get started
                </Link>
                <Link className="btn btn-secondary" href="/signin">
                  Sign in
                </Link>
              </div>
              <p className="hero-note">
                Evidence-first · every citation checked before it is stored
              </p>
            </div>

            <div className="poster-art">
              <PosterScene />
              <span className="poster-tag">Evidence checked · 6 sources</span>
            </div>

            <div className="poster-aside">
              <div className="evidence-glass" aria-label="Example of an Edvance evidence view">
                <div className="eg-head">
                  <span className="badge badge-error">Possible inconsistency</span>
                  <span className="eg-ref">Lesson 2 · slide 7</span>
                </div>
                <h2>
                  &ldquo;What are the <em className="em-coral">five</em> components of the PROMPT
                  framework?&rdquo;
                </h2>
                <p className="eg-note">The question says five — the lesson evidence names six.</p>
                <ol className="pipeline">
                  {pipeline.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <div className="eg-foot">
                  <div className="eg-mastery">
                    <span className="progress-track" aria-hidden="true">
                      <span className="progress-fill progress-mastered" style={{ width: "62%" }} />
                    </span>
                    <em>62%</em>
                  </div>
                  <Link className="btn btn-sm btn-primary" href="/signup">
                    Open a workspace
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band band--ink" id="features" aria-labelledby="f-heading">
        <div className="container">
          <div className="band-head band-head--rule">
            <p className="kicker">What Edvance does</p>
            <h2 className="landing-heading" id="f-heading">
              Three jobs, done together
            </h2>
            <p className="landing-leading">
              Mapping, consistency, and mastery are one system. Each feeds the next, so a flagged
              contradiction changes your revision list.
            </p>
          </div>
          <div className="ptile-grid">
            {jobs.map((job) => (
              <article className="ptile" key={job.title}>
                <div className="ptile-media">{job.art}</div>
                <div className="ptile-body">
                  <div>
                    <h3>{job.title}</h3>
                    <p>{job.text}</p>
                  </div>
                  <span className="ptile-no">{job.no}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--cream" id="questions" aria-labelledby="q-heading">
        <div className="container">
          <div className="band-head">
            <p className="kicker">Why it exists</p>
            <h2 className="landing-heading" id="q-heading">
              The four questions Edvance answers
            </h2>
            <p className="landing-leading">
              Assessment intelligence only matters if it resolves real exam uncertainty.
            </p>
          </div>
          <div className="medallion-row">
            {questions.map((q) => (
              <article className="medallion" key={q.no}>
                <span
                  className="medallion-disc"
                  style={{ background: q.tone, color: "var(--cream-50)" }}
                >
                  <svg className="medallion-rim" viewBox="0 0 162 162" aria-hidden="true">
                    <circle
                      cx="81"
                      cy="81"
                      r="77"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray="2 10"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="medallion-art" aria-hidden="true">
                    {q.icon}
                  </span>
                </span>
                <span className="medallion-no">{q.no}</span>
                <h3>{q.title}</h3>
                <p>{q.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--sand" id="how-it-works" aria-labelledby="h-heading">
        <div className="container editorial">
          <div className="editorial-art">
            <DeskArt />
          </div>
          <div>
            <p className="kicker">How it works</p>
            <h2 id="h-heading">From a blank workspace to a list worth revising</h2>
            <p className="lede-quiet">
              Six steps, each producing evidence the next one builds on. Nothing is inferred that
              the material doesn&rsquo;t actually support.
            </p>
            <ol className="step-chips">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="field-row">
              <Link className="btn btn-coral" href="/signup">
                Create your workspace
              </Link>
              <Link className="btn btn-secondary" href="/signin">
                Explore the demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="band band--ink" aria-labelledby="status-heading">
        <div className="container status-grid">
          <div>
            <p className="kicker">Honest status</p>
            <h2 className="landing-heading" id="status-heading">
              Where the build stands
            </h2>
            <div className="alert">
              <p>
                Everything you use is <strong>real</strong>: accounts and sessions (Better Auth over
                PostgreSQL), private file storage, text extraction, AI course and assessment
                analysis, practice-based mastery, and targeted revision. Analysis runs only when you
                ask for it, and the model is called from the server alone. Seeded demo workspaces
                are clearly labelled and are replaced by your own materials.
              </p>
            </div>
            <div className="cta-row" style={{ marginTop: "var(--space-8)" }}>
              <Link className="btn btn-coral" href="/signin">
                Try the demo
              </Link>
              <Link className="btn btn-ghost" href="/signup">
                Create an account
              </Link>
            </div>
          </div>
          <div className="stamp" aria-hidden="true">
            Evidence
            <br />
            checked
            <br />· no gaps ·
          </div>
        </div>
      </section>
    </>
  );
}
