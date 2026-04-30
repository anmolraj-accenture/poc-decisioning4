(() => {
  // ------------------------------------------------------------
  // AJO config
  // ------------------------------------------------------------
  const SURFACE_URI =
    "web://anmolraj-accenture.github.io/poc-decisioning2#ajo-offer";
  const CONTENT_SCHEMA =
    "https://ns.adobe.com/personalization/json-content-item";

  // ------------------------------------------------------------
  // Demo offers (fallback)
  // ------------------------------------------------------------
  const OFFERS = [
    {
      id: "D1",
      placement: "ajo-offer",
      title: "Galaxy Ultra for $0/mo (demo)",
      desc: "Eligible trade‑in required.",
      ctaText: "Shop now",
      ctaUrl: "#",
      priority: 90
    },
    {
      id: "D2",
      placement: "ajo-offer",
      title: "Fiber monthly savings (demo)",
      desc: "Bundle offer.",
      ctaText: "Explore",
      ctaUrl: "#",
      priority: 80
    },
    {
      id: "W1",
      placement: "wireless-deals",
      title: "Wireless deal A (demo)",
      desc: "With eligible plan.",
      ctaText: "View",
      ctaUrl: "#",
      priority: 85
    }
  ];

  let RUNTIME_OFFERS = [...OFFERS];

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  const escapeHtml = str =>
    String(str).replace(/[&<>"']/g, m =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
    );

  function getDecisionInputs() {
    try {
      return JSON.parse(localStorage.getItem("AJO_DecisionInputs") || "{}");
    } catch {
      return {};
    }
  }

  // ------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------
  function renderPlacement(name, offers) {
    const host = document.querySelector(`[data-placement="${name}"]`);
    if (!host) return;

    host.innerHTML = offers
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .map(
        o => `
        <article class="card">
          <h3>${escapeHtml(o.title)}</h3>
          <p>${escapeHtml(o.desc)}</p>
          <a href="${escapeHtml(o.ctaUrl || "#")}"
             class="btn"
             data-placement="${escapeHtml(name)}">
            ${escapeHtml(o.ctaText || "Shop")}
          </a>
        </article>
      `
      )
      .join("");
  }

  function renderAllPlacements() {
    renderPlacement(
      "ajo-offer",
      RUNTIME_OFFERS.filter(o => o.placement === "ajo-offer")
    );
    renderPlacement(
      "wireless-deals",
      RUNTIME_OFFERS.filter(o => o.placement === "wireless-deals")
    );
  }

  // ------------------------------------------------------------
  // Decision parsing (✅ decisions + propositions)
  // ------------------------------------------------------------
  function getDecisionItem(result) {
    const fromDecisions =
      result?.decisions?.[0]?.items?.find(
        i => i.schema === CONTENT_SCHEMA
      );
    if (fromDecisions) return fromDecisions;

    const props = result?.propositions || [];
    for (const p of props) {
      const item = p.items?.find(i => i.schema === CONTENT_SCHEMA);
      if (item) return item;
    }
    return null;
  }

  function extractOffers(content) {
    if (!content) return null;

    if (typeof content === "string") {
      try {
        return extractOffers(JSON.parse(content));
      } catch {
        return null;
      }
    }

    if (Array.isArray(content)) return content;
    if (Array.isArray(content.offers)) return content.offers;

    return null;
  }

  function normalizeOffer(raw, fallbackPlacement) {
    return {
      id: raw.id || raw.offerId || Math.random().toString(16).slice(2),
      placement: raw.placement || fallbackPlacement,
      title: raw.title || "Personalized Offer",
      desc: raw.desc || "",
      ctaText: raw.ctaText || "Shop",
      ctaUrl: raw.ctaUrl || "#",
      priority: Number(raw.priority ?? raw.score ?? 50)
    };
  }

  // ------------------------------------------------------------
  // ✅ Personalization (deterministic)
  // ------------------------------------------------------------
  function runPersonalization() {
    const inputs = getDecisionInputs();

    console.log("AJO decision inputs used:", inputs);

    return alloy("sendEvent", {
      renderDecisions: true,
      personalization: {
        surfaces: [SURFACE_URI],
        schemas: [CONTENT_SCHEMA],
        defaultPersonalizationEnabled: false
      },
      xdm: {
        eventType: "web.webPageDetails.pageViews",
        web: {
          webPageDetails: {
            name: document.title || "deals",
            URL: window.location.href
          }
        },

        // ✅ Page‑1 inputs injected here
        _accenture_partner: {
          Interest: {
            PreferredInterest: inputs.PreferredInterest
          },
          Scoring1: inputs.Scoring1
        },

        timestamp: new Date().toISOString()
      }
    })
      .then(result => {
        console.log("✅ Decision response:", result);

        const item = getDecisionItem(result);
        const offers = extractOffers(item?.data?.content);

        if (offers?.length) {
          RUNTIME_OFFERS = offers.map(o =>
            normalizeOffer(o, o.placement)
          );
        }

        renderAllPlacements();
      })
      .catch(err => {
        console.error("❌ Personalization failed:", err);
        renderAllPlacements();
      });
  }

  function waitForAlloy(cb, retries = 40) {
    if (typeof alloy === "function") cb();
    else if (retries > 0)
      setTimeout(() => waitForAlloy(cb, retries - 1), 250);
    else console.error("Alloy not loaded");
  }

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    renderAllPlacements(); // instant fallback UI
    waitForAlloy(runPersonalization);
  });
})();
