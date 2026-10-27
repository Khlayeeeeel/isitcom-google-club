import { useEffect, useRef, useState } from "react";

const scriptId = "cloudflare-turnstile-script";
const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.turnstile), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error("Turnstile failed to load."));
    document.head.appendChild(script);
  });
}

export default function Turnstile({ siteKey, onToken, resetKey }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const onTokenRef = useRef(onToken);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    onTokenRef.current("");

    if (!siteKey) {
      setLoadError("The security check is not configured.");
      return undefined;
    }

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: token => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => {
            onTokenRef.current("");
            setLoadError("The security check could not load. Please refresh and try again.");
          },
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError("The security check could not load. Please refresh and try again.");
      });

    return () => {
      cancelled = true;
      if (widgetRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, [siteKey, resetKey]);

  return (
    <div className="turnstile-field">
      <div ref={containerRef} />
      {loadError && <p className="turnstile-error" role="alert">{loadError}</p>}
    </div>
  );
}
