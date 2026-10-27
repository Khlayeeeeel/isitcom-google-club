const cooldownKey = "igc-application-cooldown";
const browserCooldownMs = 60_000;

function getFriendlyError(status, payload) {
  if (status === 429) return "Too many applications were sent. Please wait before trying again.";
  if (status === 400) return payload?.error || "Please check your answers and try again.";
  if (status === 401 || status === 403) return payload?.error || "Please complete the security check and try again.";
  if (status === 409) return "An application with these details has already been submitted.";
  return "The application service is temporarily unavailable. Please try again later.";
}

export async function submitClubApplication(values, turnstileToken) {
  try {
    const lastSubmission = Number(window.localStorage.getItem(cooldownKey));
    if (Number.isFinite(lastSubmission) && Date.now() - lastSubmission < browserCooldownMs) {
      throw new Error("Please wait one minute before sending another application.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Please wait")) throw error;
  }

  let response;
  try {
    response = await fetch("/api/submit-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        year: values.year,
        field: values.field.trim(),
        department: values.department,
        motivation: values.motivation.trim(),
        website: values.website,
        turnstileToken,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Could not reach the application service. Check your connection and try again.");
  }

  const responsePayload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getFriendlyError(response.status, responsePayload));
  }

  try {
    window.localStorage.setItem(cooldownKey, String(Date.now()));
  } catch {
    // Storage can be unavailable in private browsing; server limits still apply.
  }
}
