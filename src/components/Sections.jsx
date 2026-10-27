import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { counters, departments, events, gallery, mission } from "../data";
import { HERO_BG_V2 } from "../heroBackground";

export function Hero() {
  const logo = useRef(null);
  const playEgg = () => gsap.timeline().to(logo.current, { y: -50, rotation: -18, duration: .35, ease: "power2.out" }).to(logo.current, { y: 0, rotation: 360, duration: .8, ease: "bounce.out" });
  return <section className={HERO_BG_V2 ? "hero hero-bg-v2" : "hero"} id="home" data-section="Start">
    {HERO_BG_V2 && <canvas className="hero-halftone" aria-hidden="true" />}
    <span className="shape shape-a" data-depth=".12" /><span className="shape shape-b" data-depth="-.09" /><span className="shape shape-c" data-depth=".18" /><span className="shape shape-d" data-depth="-.2" />
    <div className="shell hero-grid">
      <div className="hero-kicker"><p>A student-powered community where ideas meet skills, and curiosity becomes something real.</p><button className="hero-logo-button" type="button" onClick={playEgg} aria-label="Play the chechia animation"><img className="hero-logo" ref={logo} src="/assets/igc.png" alt="ISITCOM Google Club logo" /></button></div>
      <h1 className="hero-title" aria-label="Inspire. Grow. Create."><span className="hero-line"><span className="hero-word" data-color="yellow">Inspire.</span></span><span className="hero-line"><span className="hero-word" data-color="blue">Grow.</span></span><span className="hero-line"><span className="hero-word" data-color="red">Create.</span></span></h1>
      <div className="hero-meta"><span className="location">ISITCom · Hammam Sousse</span><div className="scroll-cue"><div className="scroll-cue-bar" /><span>Scroll to explore</span></div></div>
    </div>
  </section>;
}

export function MarqueeBand() {
  const items = ["Code together", "Design boldly", "Speak clearly", "Build what matters"];
  return <div className="marquee-band" aria-hidden="true"><div className="marquee-text">{[...items, ...items].map((item, i) => <span key={`${item}-${i}`}>{item}</span>)}</div></div>;
}

export function About() {
  const beats = [
    { number: "01", title: "Curiosity", copy: "One honest question is enough to begin.", color: "var(--yellow)" },
    { number: "02", title: "Community", copy: "Different minds meet, exchange and grow.", color: "var(--blue)" },
    { number: "03", title: "Creation", copy: "Shared energy becomes something real.", color: "var(--red)" },
  ];
  return <section className="about" id="about" data-section="Story">
    <div className="shell">
      <div className="about-stage">
        <div className="story-index">
          <span className="eyebrow">Why we exist</span>
          <div className="story-orbit" aria-hidden="true"><span className="story-orbit-core">WHY</span><i /></div>
          <span className="story-scroll-note">Scroll to connect the story</span>
        </div>
        <div className="story-main">
          <div className="story-kicker"><span>Built on campus</span><span>Driven by students</span><span>Made for what comes next</span></div>
          <p className="about-statement" id="mission-text">{mission.split(/\s+/).map((word, i) => <span className="about-word" key={`${word}-${i}`}>{word}{" "}</span>)}</p>
          <div className="story-beats">
            <div className="story-path" aria-hidden="true"><span className="story-path-fill" /></div>
            {beats.map(beat => <article className="story-beat" style={{ "--beat-color": beat.color }} key={beat.title}><div className="story-beat-top"><span>{beat.number}</span><i /></div><h3>{beat.title}</h3><p>{beat.copy}</p></article>)}
          </div>
        </div>
      </div>
      <div className="story-impact">
        <div className="story-impact-head"><span className="eyebrow">Proof in motion</span><p>Not just a club on paper. A growing record of people learning, building and showing up for one another.</p></div>
        <div className="counters" id="counters" aria-label="Club highlights">{counters.map(item => <div className="counter" key={item.label}><span className="counter-value" data-value={item.value} data-suffix={item.suffix}>0{item.suffix}</span><span className="counter-label">{item.label}</span></div>)}</div>
      </div>
    </div>
  </section>;
}

function DepartmentVisual({ type }) {
  if (type === "technical") return <div className="terminal"><div className="terminal-head"><i /><i /><i /></div><span className="code-line"><b style={{ color: "#8ab4f8" }}>const</b> idea = &quot;curiosity&quot;;</span><span className="code-line"><b style={{ color: "#f28b82" }}>while</b> (learning) &#123;</span><span className="code-line">&nbsp;&nbsp;idea.build();</span><span className="code-line">&#125;</span></div>;
  if (type === "marketing") return <div className="art-board"><div className="morph" /><i className="draw-cursor" /></div>;
  return <div className="bubble-stage"><div className="bubble">Listen first.</div><div className="bubble">Speak clearly.</div><div className="bubble">Connect.</div></div>;
}

export function Departments() {
  return <section className="departments" id="departments" data-section="Acts" aria-label="Our departments"><div className="department-track" id="department-track">{departments.map((dept, i) => <article className="department" data-bg={dept.color} style={{ "--accent": dept.accent }} key={dept.title}><span className="dept-number">0{i + 1}</span><div className="dept-label"><span className="eyebrow">{dept.act}</span></div><div className="dept-content"><h2 className={`dept-title dept-title-${dept.visual}`}>{dept.title}</h2><p className="dept-copy">{dept.copy}</p><div className="chips">{dept.chips.map(chip => <span className="chip" key={chip}>{chip}</span>)}</div></div><div className="dept-visual"><DepartmentVisual type={dept.visual} /></div></article>)}</div></section>;
}

export function Events() {
  const [filter, setFilter] = useState("upcoming");
  const list = useRef(null);
  const filtered = events.filter(event => event.type === filter);
  useEffect(() => {
    const animation = gsap.fromTo(list.current.children, { y: 35, opacity: 0 }, { y: 0, opacity: 1, duration: .55, stagger: .08, ease: "power3.out" });
    return () => animation.kill();
  }, [filter]);
  return <section className="events-section" id="events" data-section="Events"><div className="shell"><div className="section-head"><div><span className="eyebrow">Club calendar</span><h2 className="section-title">Learn it.<br />Then live it.</h2></div><div><p className="section-copy">Workshops, talks and build nights designed to turn your next “what if?” into “look what we made.”</p><div className="filters" role="group" aria-label="Filter events">{["upcoming", "past"].map(item => <button className={`filter${filter === item ? " active" : ""}`} aria-pressed={filter === item} onClick={() => setFilter(item)} type="button" key={item}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></div></div><div className="timeline"><div className="timeline-progress" aria-hidden="true" /><div id="events-list" ref={list}>{filtered.map(event => <article className="event-card" key={event.title}><div className="event-visual" style={{ "--event-bg": event.color }}><span>{event.art}</span></div><div className="event-body"><div className="event-meta"><span className="event-tag">{event.tag}</span></div><h3 className="event-title">{event.title}</h3><p className="event-desc">{event.desc}</p></div></article>)}</div></div></div></section>;
}

export function Gallery() {
  const [selected, setSelected] = useState(null);
  const touchStartY = useRef(0);
  useEffect(() => {
    document.body.classList.toggle("lightbox-open", Boolean(selected));
    const close = e => e.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("keydown", close); document.body.classList.remove("lightbox-open"); };
  }, [selected]);
  const doubled = [...gallery, ...gallery];
  return <><section className="gallery-section" id="gallery" data-section="Gallery"><div className="shell"><div className="section-head"><div><span className="eyebrow">Club energy</span><h2 className="section-title">Built together.<br />Remembered forever.</h2></div><p className="section-copy">A glimpse of the late-night problem solving, stage moments and friendships made between the slides.</p></div></div><div className="gallery-rows" id="gallery-rows">{[0, 1].map(row => <div className={`gallery-row${row ? " reverse" : ""}`} key={row}>{doubled.map((item, i) => <button className="gallery-item" type="button" data-cursor="View" onClick={() => setSelected(item)} key={`${row}-${item.label}-${i}`}><img src={item.image} alt={item.alt} loading="lazy" /><span>{item.label}</span><b>↗</b></button>)}</div>)}</div></section>{selected && <div className="lightbox open" role="dialog" aria-modal="true" aria-label={selected.label} onTouchStart={e => { touchStartY.current = e.touches[0].clientY; }} onTouchEnd={e => { if (Math.abs(e.changedTouches[0].clientY - touchStartY.current) > 60) setSelected(null); }} onMouseDown={e => e.target === e.currentTarget && setSelected(null)}><button className="lightbox-close" type="button" aria-label="Close gallery" onClick={() => setSelected(null)} autoFocus>×</button><figure className="lightbox-art"><img src={selected.image} alt={selected.alt} /><figcaption>{selected.label}</figcaption></figure></div>}</>;
}

export function Footer() {
  return <footer className="footer"><div className="shell"><div className="footer-top"><p className="footer-word">LET’S CREATE.</p></div><div className="footer-grid"><div className="footer-brand">ISITCOM<br />GOOGLE CLUB</div><div className="footer-col"><strong>Explore</strong><a href="#about">About</a><a href="#departments">Departments</a><a href="#team">Team</a></div><div className="footer-col"><strong>Connect</strong><a href="https://www.instagram.com/isitcomgoogleclub2/" onClick={e => e.preventDefault()}>Instagram</a><a href="#" onClick={e => e.preventDefault()}>LinkedIn</a><a href="mailto:hello@isitcomgoogleclub.tn">Email us</a></div><div className="footer-col"><strong>Find us</strong><span>ISITCom</span><span>Hammam Sousse</span><span>Tunisia</span></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ISITCOM Google Club</span><span className="developer-credit"><span>Developed by</span><strong>Mohamed Khalil Ayadhi</strong><i aria-label="MKA signature">MKA</i></span><button className="back-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top ↑</button></div></div></footer>;
}
