import Link from "next/link";

const questions = [
  {
    index: "01",
    title: "What exactly am I expected to know?",
    text: "Every assessment is built around a defined set of course concepts. Edvance makes that list explicit up front.",
  },
  {
    index: "02",
    title: "Where was it taught?",
    text: "Each question links back to the exact lesson, slides, lecture segment, and reading where the answer was covered.",
  },
  {
    index: "03",
    title: "Do the course materials agree?",
    text: "Edvance flags slides, transcripts, and notes that contradict each other or the assessment — so conflicting sources can't mislead you.",
  },
  {
    index: "04",
    title: "What have I not mastered yet?",
    text: "Concepts are scored by evidence. Edvance turns raw assessment results into a mastery map and a targeted revision list.",
  },
];

const features = [
  {
    title: "Assessment-to-source mapping",
    text: "Every question is wired to the lesson material where its answer was taught, so 'what to study' is never guesswork.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="m9 9 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Course consistency intelligence",
    text: "Contradictions between slide decks, transcripts, and notes are surfaced as flagged inconsistencies — not silent traps.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  {
    title: "Instructor vocabulary preserved",
    text: "Analysis respects the words and phrasing your instructor actually used, no matter how informal the source.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    ),
  },
  {
    title: "Mastery mapping",
    text: "Results update per-concept mastery at the course and question level, showing exactly what to revise next.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
];

const journey = [
  {
    title: "Create a course workspace",
    text: "Add your course by ID and give it a name.",
    tone: "tile--green",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 20h16" />
        <path d="M6 20V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" />
        <path d="M12 8v6M9 11h6" />
      </svg>
    ),
  },
  {
    title: "Add your learning materials",
    text: "Slide decks, transcripts, notes, readings — uploaded and stored in one place.",
    tone: "tile--oak",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m17 8-5-5-5 5" />
        <path d="M12 3v12" />
      </svg>
    ),
  },
  {
    title: "Extract the course concepts",
    text: "Edvance identifies the concepts each assessment covers.",
    tone: "tile--cream",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
        <path d="M8 11h6M11 8v6" />
      </svg>
    ),
  },
  {
    title: "Add a question that stuck",
    text: "Paste a real assessment question in plain text.",
    tone: "tile--coral",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    ),
  },
  {
    title: "Check consistency and evidence",
    text: "See where the answer was taught and whether sources contradict it.",
    tone: "tile--oak",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 3v18h18" />
        <path d="m7 14 3-3 3 2 5-6" />
      </svg>
    ),
  },
  {
    title: "Get a targeted revision list",
    text: "Focus on the concepts with weak evidence — nothing else.",
    tone: "tile--green",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="9" cy="20" r="1.6" />
        <circle cx="17" cy="20" r="1.6" />
        <path d="M2 3h2.5l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.5 8H6" />
      </svg>
    ),
  },
];

const pipeline = ["Question", "Concept", "Evidence", "Consistency", "Mastery", "Revision"];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <p className="kicker">Evidence-first assessment intelligence</p>
            <h1 className="hero-title">
              Know <em className="em-coral">what is tested</em>, where it was
              taught, and what to study next.
            </h1>
            <p className="hero-lede">
              Edvance connects each assessment question to the exact lecture,
              slide, transcript, and note where the answer was taught — flags
              inconsistencies in your course materials — and shows you precisely
              what you have and have not mastered.
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
              Free while in development · runs locally on mock data for now
            </p>
          </div>

          <div className="evidence-glass" aria-label="Example of Edvance evidence view">
            <div className="eg-head">
              <span className="badge badge-error">Possible inconsistency</span>
              <span className="eg-ref">Lesson 2 · slide 7 · @04:12</span>
            </div>
            <h2>
              &ldquo;What are the <em className="em-coral">five</em> components
              of the PROMPT framework?&rdquo;
            </h2>
            <p className="eg-note">
              The question says five — but the lesson evidence names six:
              Purpose, Role, Objective, Method, Parameters, Target Output.
            </p>
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
                <em>62% mastered</em>
              </div>
              <Link className="btn btn-sm btn-primary" href="/signup">
                Open a workspace
              </Link>
            </div>
            <span className="eg-float">Evidence checked · 6 sources</span>
          </div>
        </div>
      </section>

      <section className="band band--paper" id="questions" aria-labelledby="q-heading">
        <div className="container">
          <p className="kicker">Why it exists</p>
          <h2 className="landing-heading" id="q-heading">
            The four questions Edvance answers
          </h2>
          <p className="landing-leading">
            Assessment intelligence only matters if it resolves real exam
            uncertainty — so Edvance is built around four questions every
            learner actually asks.
          </p>
          <div className="question-grid">
            {questions.map((q) => (
              <article className="q-card" key={q.index}>
                <p className="q-index">{q.index}</p>
                <h3>{q.title}</h3>
                <p>{q.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--forest" id="features" aria-labelledby="f-heading">
        <div className="container">
          <p className="kicker">What Edvance does</p>
          <h2 className="landing-heading" id="f-heading">
            A study partner that never hides a contradiction
          </h2>
          <p className="landing-leading">
            Four capabilities working together to turn your course materials
            into evidence you can act on.
          </p>
          <div className="feature-grid">
            {features.map((f) => (
              <article className="f-card" key={f.title}>
                <span className="icon-chip" aria-hidden="true">
                  {f.icon}
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--oak" id="how-it-works" aria-labelledby="h-heading">
        <div className="container">
          <p className="kicker">How it works</p>
          <h2 className="landing-heading" id="h-heading">
            From course setup to a concrete revision list
          </h2>
          <p className="landing-leading">
            A six-step flow — each step produces evidence the next one builds on.
          </p>
          <div className="tile-grid">
            {journey.map((step, i) => (
              <article className={`tile ${step.tone}`} key={step.title}>
                <span className="tile-icon" aria-hidden="true">
                  {step.icon}
                </span>
                <span className="step-no">Step {String(i + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--paper" aria-labelledby="demo-heading">
        <div className="container demo-band-grid">
          <div>
            <p className="kicker">Honest status</p>
            <h2 className="landing-heading" id="demo-heading">
              Where the demo stands
            </h2>
            <div className="alert alert-neutral">
              <p>
                This current prototype runs purely in your browser on{" "}
                <strong>mock data</strong>. Sign-in and sign-up create a{" "}
                <strong>local demo session</strong>, not a real account. Accounts
                and persistence (Better Auth + a database) and live AI processing
                arrive in later phases.
              </p>
            </div>
            <div className="cta-row" style={{ marginTop: "var(--space-8)" }}>
              <Link className="btn btn-coral" href="/signin">
                Try the demo
              </Link>
              <Link className="btn btn-secondary" href="/signup">
                Create an account
              </Link>
            </div>
          </div>
          <div className="stamp" aria-hidden="true">
            Evidence
            <br />
            checked
            <br />
            · no gaps ·
          </div>
        </div>
      </section>
    </>
  );
}
