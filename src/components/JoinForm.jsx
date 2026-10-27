import { useState } from "react";
import { gsap } from "gsap";
import { submitClubApplication } from "../lib/supabaseRest";

const initialValues = { name: "", email: "", year: "", field: "", department: "", motivation: "", website: "" };

function confetti() {
  const colors = ["#4285f4", "#ea4335", "#fbbc05", "#34a853"];
  Array.from({ length: 70 }, (_, i) => {
    const piece = document.createElement("i");
    Object.assign(piece.style, { position: "fixed", zIndex: 200, left: "50%", top: "50%", width: `${gsap.utils.random(5, 11)}px`, height: `${gsap.utils.random(8, 18)}px`, background: colors[i % 4], pointerEvents: "none" });
    document.body.appendChild(piece);
    gsap.to(piece, { x: gsap.utils.random(-innerWidth * .48, innerWidth * .48), y: gsap.utils.random(-innerHeight * .55, innerHeight * .45), rotation: gsap.utils.random(-600, 600), opacity: 0, duration: gsap.utils.random(1.2, 2.2), ease: "power2.out", onComplete: () => piece.remove() });
    return piece;
  });
}

export default function JoinForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const update = event => {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = "This field is required.";
    if (!values.email.trim()) next.email = "This field is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = "Enter a valid email address.";
    if (!values.year) next.year = "Choose your year.";
    if (!values.field.trim()) next.field = "This field is required.";
    if (!values.department) next.department = "Choose a department.";
    if (values.motivation.trim() && values.motivation.trim().length < 20) next.motivation = "Tell us a little more — at least 20 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async event => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validate()) {
      requestAnimationFrame(() => document.querySelector("#join-form [aria-invalid='true']")?.focus());
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await submitClubApplication(values);
      setSuccess(true);
      confetti();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not send your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (name, label, input) => <div className={`field${name === "motivation" ? " full" : ""}`}><label htmlFor={name}>{label}</label>{input}<span className="error" id={`${name}-error`}>{errors[name] || ""}</span></div>;

  return <section className="join-section" id="join" data-section="Join"><div className="shell join-layout"><div><span className="eyebrow">Applications open</span><h2 className="join-title">Your next<br />chapter<br />starts here.</h2><p className="join-copy">You do not need to be an expert. Bring your curiosity, your energy, and a willingness to build alongside others.</p><div className="join-note"><i /><span>Welcoming students from every year and field.</span></div></div><form className="join-form" id="join-form" noValidate onSubmit={submit}>{!success ? <div className="form-grid">
    <div className="form-trap" aria-hidden="true"><label htmlFor="website">Leave this field blank</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={update} /></div>
    {field("name", "Full name", <input id="name" name="name" autoComplete="name" maxLength={120} value={values.name} onChange={update} aria-invalid={Boolean(errors.name)} aria-describedby="name-error" />)}
    {field("email", "Email address", <input id="email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={320} value={values.email} onChange={update} aria-invalid={Boolean(errors.email)} aria-describedby="email-error" />)}
    {field("year", "Year of study", <select id="year" name="year" value={values.year} onChange={update} aria-invalid={Boolean(errors.year)} aria-describedby="year-error"><option value="">Choose your year</option><option>First year</option><option>Second year</option><option>Third year</option><option>Master&apos;s</option></select>)}
    {field("field", "Field of study", <input id="field" name="field" placeholder="e.g. Computer Science" maxLength={160} value={values.field} onChange={update} aria-invalid={Boolean(errors.field)} aria-describedby="field-error" />)}
    <fieldset className="department-field"><legend>Where do you want to contribute?</legend><div className="dept-options">{[["Technical", "Grow", "var(--blue)"], ["Marketing", "Create", "var(--red)"], ["Communication", "Inspire", "var(--yellow)"]].map(([name, act, color]) => <div className="dept-choice" key={name}><input type="radio" id={`choice-${name.toLowerCase()}`} name="department" value={name} checked={values.department === name} onChange={update} aria-invalid={Boolean(errors.department)} /><label htmlFor={`choice-${name.toLowerCase()}`} style={{ "--choice": color }}>{name} · {act}</label></div>)}</div><span className="error" id="department-error">{errors.department || ""}</span></fieldset>
    {field("motivation", "What do you want to learn or make? (Optional)", <textarea id="motivation" name="motivation" maxLength={5000} value={values.motivation} onChange={update} aria-invalid={Boolean(errors.motivation)} aria-describedby="motivation-error" placeholder="Tell us what sparks your curiosity..." />)}
    {submitError && <p className="form-submit-error" role="alert">{submitError}</p>}
    <div className="submit-row"><span className="form-status" aria-live="polite">{isSubmitting ? "Sending your application…" : "Your application is sent securely."}</span><button className="button magnetic" type="submit" data-cursor="Join" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send application"} <span className="button-arrow">↗</span></button></div>
  </div> : <div className="form-success show" aria-live="polite"><div><div className="success-check">✓</div><h3>Application received.</h3><p>Thank you for applying. The club team will review your application.</p><button className="button" type="button" onClick={() => { setSuccess(false); setValues(initialValues); setErrors({}); setSubmitError(""); }}>Submit another application</button></div></div>}</form></div></section>;
}
