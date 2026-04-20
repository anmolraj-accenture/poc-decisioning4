(() => {
  const SURFACE_URI = "web://anmolraj-accenture.github.io/poc-decisioning2#ajo-offer";
  const CONTENT_SCHEMA = "https://ns.adobe.com/personalization/json-content-item";

  function getPreferredInterest() {
    const v = localStorage.getItem("PreferredInterest");
    return (v && v.trim()) ? v.trim() : null;
  }

  function setError(msg) {
    const box = document.getElementById("error-message");
    if (box) box.textContent = msg || "";
  }

  function setMessage(msg) {
    const box = document.getElementById("message");
    if (box) box.textContent = msg || "";
  }

  function decodeHtmlEntities(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  function normalizeContentToHtml(content) {
    if (typeof content === "string") {
      return decodeHtmlEntities(content);
    }

    if (Array.isArray(content)) {
      return `
        <div class="offer-card">
          <h3>Personalized Offer</h3>
          <pre style="white-space: pre-wrap;">${escapeHtml(JSON.stringify(content, null, 2))}</pre>
        </div>
      `;
    }

    if (content && typeof content === "object") {
      return `
        <div class="offer-card">
          <h3>Personalized Offer</h3>
          <pre style="white-space: pre-wrap;">${escapeHtml(JSON.stringify(content, null, 2))}</pre>
        </div>
      `;
    }

    return null;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function pickPropositionForSurface(result) {
    const propositions = result?.propositions || [];
    return propositions.find(p => p.scope === SURFACE_URI) || propositions[0] || null;
  }

  function renderOffer(result) {
    console.log("🔍 Web SDK decision response:", result);

    const container = document.getElementById("ajo-offer");
    if (!container) {
      console.error("❌ Container with id 'ajo-offer' not found.");
      return;
    }

    const proposition = pickPropositionForSurface(result);
    const item = proposition?.items?.find(i => i.schema === CONTENT_SCHEMA) || proposition?.items?.[0];
    const content = item?.data?.content;

    const html = normalizeContentToHtml(content);

    if (html) {
      container.innerHTML = html;
      setError("");
      setMessage("✅ Personalized offer loaded.");
    } else {
      console.warn("⚠️ No personalized offer content returned (empty or unsupported format).");
      container.innerHTML = `<p>No personalized offers available at this time.</p>`;
      setMessage("");
    }
  }
  function sendDisplayEvent(proposition) {
    if (!proposition?.id || !proposition?.scope) return;

    alloy("sendEvent", {
      xdm: {
        eventType: "decisioning.propositionDisplay",
        _experience: {
          decisioning: {
            propositions: [{
              id: proposition.id,
              scope: proposition.scope,
              scopeDetails: proposition.scopeDetails || {}
            }]
          }
        }
      }
    }).catch(e => console.warn("Display event failed:", e));
  }

  function runPersonalization() {
    const preferredInterest = getPreferredInterest();

    console.log("🚀 Fetching personalization for surface:", SURFACE_URI, "interest:", preferredInterest);

    if (!preferredInterest) {
      setMessage("ℹ️ No stored preference found. Showing default/no-offer behavior.");
    }

    const uniqueEventId = `investment_preference_event_${Date.now()}`;

    return alloy("sendEvent", {
      renderDecisions: true, 
      personalization: {
        surfaces: [SURFACE_URI],
        schemas: [CONTENT_SCHEMA],
        defaultPersonalizationEnabled: false
      },
      xdm: {
        eventType: "decisioning.propositionFetch",
        eventID: uniqueEventId,
        timestamp: new Date().toISOString(),
        _accenture_partner: {
          Interest: {
            PreferredInterest: preferredInterest || "unknown"
          }
        }
      }
    })
      .then(renderOffer)
      .catch((error) => {
        console.error("❌ sendEvent failed:", error);
        setError("Failed to load personalization (sendEvent failed). Check console/network.");
        const container = document.getElementById("ajo-offer");
        if (container) container.innerHTML = `<p>Could not load personalized offer.</p>`;
      });
  }

  function waitForAlloy(callback, retries = 60) {
    if (typeof alloy === "function") {
      console.log("✅ Alloy loaded.");
      callback();
    } else if (retries > 0) {
      setTimeout(() => waitForAlloy(callback, retries - 1), 250);
    } else {
      console.error("❌ alloy not loaded after waiting.");
      setError("Adobe Alloy did not load. Check Launch script, environment, and console errors.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    waitForAlloy(runPersonalization);
  });
})();
