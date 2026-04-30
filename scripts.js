(() => {
  // ------------------------------------------------------------
  // AJO Decisioning / Web SDK config
  // ------------------------------------------------------------
  const SURFACE_URI = "web://anmolraj-accenture.github.io/poc-decisioning2#ajo-offer";
  const CONTENT_SCHEMA = "https://ns.adobe.com/personalization/json-content-item";

  // ------------------------------------------------------------
  // Demo offers (fallback)
  // ------------------------------------------------------------
  const OFFERS = [
    { id:"ajo-offer", placement:"ajo-offer", title:"Galaxy Ultra for $0/mo (demo)",
      desc:"Eligible trade-in required. Terms apply (demo).",
      badges:["Trade-in","36 mo"], ctaText:"Shop now", ctaUrl:"#", priority:90 },

    { id:"ajo-offer", placement:"ajo-offer", title:"Fiber: save monthly (demo)",
      desc:"Bundle savings messaging (demo).",
      badges:["Bundle"], ctaText:"Explore", ctaUrl:"#", priority:80 },

    { id:"TD-003", placement:"ajo-offer", title:"$200 off per line (demo)",
      desc:"Online order required (demo).",
      badges:["Credits"], ctaText:"Get offer", ctaUrl:"#", priority:70 },

    { id:"WD-101", placement:"wireless-deals", title:"Phone deal A (demo)",
      desc:"With eligible plan (demo).",
      badges:["Featured"], ctaText:"View", ctaUrl:"#", priority:85 },

    { id:"WD-102", placement:"wireless-deals", title:"Phone deal B (demo)",
      desc:"No trade-in required (demo).",
      badges:["No trade-in"], ctaText:"Shop", ctaUrl:"#", priority:75 }
  ];

  let RUNTIME_OFFERS = [...OFFERS];

  // ------------------------------------------------------------
  // UI helpers
  // ------------------------------------------------------------
  const setError = msg => {
    const el = document.getElementById("error-message");
    if (el) el.textContent = msg || "";
  };

  const setMessage = msg => {
    const el = document.getElementById("message");
    if (el) el.textContent = msg || "";
  };

  // ------------------------------------------------------------
  // ✅ Read persisted decision inputs from Page 1
  // ------------------------------------------------------------
  function getDecisionInputs() {
    try {
      return JSON.parse(localStorage.getItem("AJO_DecisionInputs") || "{}");
    } catch {
      return {};
    }
  }

  // ------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------
  const escapeHtml = str =>
    String(str).replace(/[&<>"']/g, s =>
      ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[s])
    );

function renderPlacement(name, offers) {
  const host = document.querySelector(`[data-placement="${name}"]`);
  if (!host) return;

  host.innerHTML = offers
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .map(o => `
      <article class="card">
        <h3>${escapeHtml(o.title)}</h3>
        <p>${escapeHtml(o.desc)}</p>
        <a
          href="${escapeHtml(o.ctaUrl || "#")}"
          data-placement="${escapeHtml(name)}"
          class="btn">
          ${escapeHtml(o.ctaText || "Shop")}
        </a>
      </article>
    `)
    .join("");
}

  function renderAllPlacements() {
    renderPlacement("ajo-offer", RUNTIME_OFFERS.filter(o => o.placement === "ajo-offer"));
    renderPlacement("wireless-deals", RUNTIME_OFFERS.filter(o => o.placement === "wireless-deals"));
  }

  // ------------------------------------------------------------
  // AJO response parsing
  // ------------------------------------------------------------
  function pickPropositionForSurface(result) {
    const props = result?.propositions || [];
    return props.find(p => p.scope === SURFACE_URI) || props[0];
  }

  function extractOffersFromAjoContent(content) {
    if (!content) return null;

    if (typeof content === "string") {
      try { return extractOffersFromAjoContent(JSON.parse(content)); }
      catch { return null; }
    }
    if (Array.isArray(content)) return { offers: content };
    if (content.offers) return { offers: content.offers };
    return null;
  }

  function normalizeOffer(raw, fallbackPlacement) {
    return {
      id: raw.id || Math.random().toString(16).slice(2),
      placement: raw.placement || fallbackPlacement,
      title: raw.title || "Personalized Offer",
      desc: raw.desc || "",
      ctaText: raw.ctaText || "Shop",
      ctaUrl: raw.ctaUrl || "#",
      priority: Number(raw.priority ?? raw.score ?? 50)
    };
  }

  // ------------------------------------------------------------
  // ✅ PERSONALIZATION CALL (FIXED & DETERMINISTIC)
  // ------------------------------------------------------------
  function runPersonalization() {
    const inputs = getDecisionInputs();

    console.log("🚀 AJO decision inputs used:", inputs);

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

        // ✅ Inject Page‑1 scoring + preference
        _accenture_partner: {
          Interest: {
            PreferredInterest: inputs?.PreferredInterest
          },
          Scoring1: inputs?.Scoring1
        },

        timestamp: new Date().toISOString()
      }
    })
    .then(result => {
      console.log("✅ Decision response:", result);

      const prop = pickPropositionForSurface(result);
      const item =
        prop?.items?.find(i => i.schema === CONTENT_SCHEMA) ||
        prop?.items?.[0];

      const extracted = extractOffersFromAjoContent(item?.data?.content);

      if (extracted?.offers?.length) {
        RUNTIME_OFFERS = extracted.offers.map(o =>
          normalizeOffer(o, o.placement)
        );
        renderAllPlacements();
        setMessage("✅ Personalized offers loaded.");
      } else {
        console.warn("⚠️ Using demo offers.");
      }
    })
    .catch(err => {
      console.error("❌ Personalization failed:", err);
      setError("Personalization failed.");
    });
  }

  function waitForAlloy(cb, retries = 40) {
    if (typeof alloy === "function") cb();
    else if (retries > 0) setTimeout(() => waitForAlloy(cb, retries - 1), 250);
    else setError("Adobe Alloy failed to load.");
  }

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    renderAllPlacements();     // instant UI
    waitForAlloy(runPersonalization);
  });
})();
