(() => {
  // ------------------------------------------------------------
  // AJO Decisioning / Web SDK config
  // ------------------------------------------------------------
  const SURFACE_URI = "web://anmolraj-accenture.github.io/poc-decisioning4/#top-deals";
  const CONTENT_SCHEMA = "https://ns.adobe.com/personalization/json-content-item";

  // ------------------------------------------------------------
  // Demo offers (fallback/default)
  // ------------------------------------------------------------
  const OFFERS = [
    { id:"TD-001", placement:"top-deals", title:"Galaxy Ultra for $0/mo (demo)",
      desc:"Eligible trade-in required. Terms apply (demo copy).",
      badges:["Trade-in","36 mo"], ctaText:"Shop now", ctaUrl:"#", priority:90 },

    { id:"TD-002", placement:"top-deals", title:"Fiber: save monthly (demo)",
      desc:"Bundle savings + reward card messaging (demo copy).",
      badges:["Bundle","New customers"], ctaText:"Explore", ctaUrl:"#", priority:80 },

    { id:"TD-003", placement:"top-deals", title:"$200 off per line (demo)",
      desc:"Online order + new line. Limited time (demo copy).",
      badges:["New line","Credits"], ctaText:"Get offer", ctaUrl:"#", priority:70 },

    { id:"WD-101", placement:"wireless-deals", title:"Phone deal A (demo)",
      desc:"Great value with eligible plan (demo copy).",
      badges:["Wireless","Featured"], ctaText:"View", ctaUrl:"#", priority:85 },

    { id:"WD-102", placement:"wireless-deals", title:"Phone deal B (demo)",
      desc:"No trade-in required (demo copy).",
      badges:["No trade-in"], ctaText:"Shop", ctaUrl:"#", priority:75 },

    { id:"WD-103", placement:"wireless-deals", title:"Phone deal C (demo)",
      desc:"Bill credits over time (demo copy).",
      badges:["Bill credits"], ctaText:"Details", ctaUrl:"#", priority:65 },
  ];

  // Runtime offers (start with demo; replaced if AJO returns offers)
  let RUNTIME_OFFERS = [...OFFERS];

  // ------------------------------------------------------------
  // UI helpers
  // ------------------------------------------------------------
  function setError(msg) {
    const box = document.getElementById("error-message");
    if (box) box.textContent = msg || "";
  }

  function setMessage(msg) {
    const box = document.getElementById("message");
    if (box) box.textContent = msg || "";
  }

  // If you still want to read localStorage for debugging/segmentation,
  // you can keep it. It will NOT be sent to XDM now (per your schema).
  function getPreferredInterest() {
    const v = localStorage.getItem("PreferredInterest");
    return (v && v.trim()) ? v.trim() : null;
  }

  // ------------------------------------------------------------
  // HTML helpers
  // ------------------------------------------------------------
  function decodeHtmlEntities(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  // ------------------------------------------------------------
  // Data Layer tracking (your logic)
  // ------------------------------------------------------------
  function ensureDataLayer() {
    window.adobeDataLayer = window.adobeDataLayer || [];
    return window.adobeDataLayer;
  }

  function trackOfferClick({ offerId, placement, title, destinationUrl, clickType }) {
    const dl = ensureDataLayer();

    const payload = {
      event: "offer-click",
      eventInfo: {
        clickType: clickType || "unknown",
        timestamp: new Date().toISOString()
      },
      offer: {
        id: offerId,
        placement,
        title,
        destinationUrl: destinationUrl || ""
      },
      page: {
        url: window.location.href,
        hash: window.location.hash || ""
      }
    };

    dl.push(payload);
    window.__lastClick = payload;

    console.log("[DEMO] offer-click pushed to adobeDataLayer:", payload);
  }

  // ------------------------------------------------------------
  // Offer lookup
  // ------------------------------------------------------------
  function getOfferById(offerId) {
    return (RUNTIME_OFFERS || []).find(o => o.id === offerId);
  }

  // Backward compatible function if anything else calls window.__demoClick(id)
  window.__demoClick = function(offerId) {
    const offer = getOfferById(offerId);
    trackOfferClick({
      offerId,
      placement: offer?.placement || "",
      title: offer?.title || "",
      destinationUrl: offer?.ctaUrl || "",
      clickType: "legacy-track-button"
    });
  };

  // ------------------------------------------------------------
  // Rendering (your placement renderer)
  // ------------------------------------------------------------
  function renderPlacement(placementName, offers) {
    const host = document.querySelector(`[data-placement="${placementName}"]`);
    if (!host) return;

    host.innerHTML = offers
      .slice()
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .map(o => `
        <article class="card" data-offer-id="${escapeHtml(o.id)}" data-placement="${escapeHtml(placementName)}">
          <div class="card__media">Placement: ${escapeHtml(placementName)}</div>
          <div class="card__body">
            <h3 class="card__title">${escapeHtml(o.title || "")}</h3>
            <p class="card__desc">${escapeHtml(o.desc || "")}</p>

            <div class="card__meta">
              <span class="badge">ID: ${escapeHtml(o.id)}</span>
              ${(o.badges || []).slice(0, 3).map(b => `<span class="badge">${escapeHtml(b)}</span>`).join("")}
            </div>

            <div class="card__actions">
              <!-- CTA: intercept click to track + then navigate -->
              <a class="btn"
                 href="${escapeHtml(o.ctaUrl || "#")}"
                 data-cta="true"
                 data-offer-id="${escapeHtml(o.id)}"
                 data-placement="${escapeHtml(placementName)}">
                ${escapeHtml(o.ctaText || "Shop")}
              </a>

              <!-- Explicit tracking button -->
              <button class="btn btn--ghost"
                      type="button"
                      data-track="true"
                      data-offer-id="${escapeHtml(o.id)}"
                      data-placement="${escapeHtml(placementName)}">
                Track click
              </button>
            </div>
          </div>
        </article>
      `).join("");
  }

  function renderAllPlacements() {
    renderPlacement("top-deals", (RUNTIME_OFFERS || []).filter(o => o.placement === "top-deals"));
    renderPlacement("wireless-deals", (RUNTIME_OFFERS || []).filter(o => o.placement === "wireless-deals"));
  }

  // ------------------------------------------------------------
  // Click wiring (event delegation)
  // ------------------------------------------------------------
  function attachClickHandlers() {
    document.addEventListener("click", (e) => {
      const cta = e.target.closest('a[data-cta="true"]');
      const trackBtn = e.target.closest('button[data-track="true"]');

      if (!cta && !trackBtn) return;

      const el = cta || trackBtn;
      const offerId = el.getAttribute("data-offer-id");
      const placement = el.getAttribute("data-placement");
      const offer = getOfferById(offerId);

      const destinationUrl = cta ? (cta.getAttribute("href") || "") : (offer?.ctaUrl || "");
      const clickType = cta ? "cta" : "track-button";

      // Always track
      trackOfferClick({
        offerId,
        placement,
        title: offer?.title || "",
        destinationUrl,
        clickType
      });

      // If CTA is real navigation, allow DL push then navigate
      if (cta && destinationUrl && destinationUrl !== "#") {
        e.preventDefault();
        setTimeout(() => { window.location.href = destinationUrl; }, 60);
      }
    });
  }

  // ------------------------------------------------------------
  // AJO response helpers
  // ------------------------------------------------------------
  function pickPropositionForSurface(result) {
    const propositions = result?.propositions || [];
    return propositions.find(p => p.scope === SURFACE_URI) || propositions[0] || null;
  }

  // Try to extract "offers" from whatever content format your decision item returns
  function extractOffersFromAjoContent(content) {
    if (!content) return null;

    // If string: may be HTML entities or JSON string
    if (typeof content === "string") {
      const decoded = decodeHtmlEntities(content);

      // Try JSON
      try {
        const parsed = JSON.parse(decoded);
        return extractOffersFromAjoContent(parsed);
      } catch {
        // Not JSON -> treat as HTML snippet
        return { htmlSnippet: decoded };
      }
    }

    // If array -> assume offers list
    if (Array.isArray(content)) {
      return { offers: content };
    }

    // If object -> check known shapes
    if (typeof content === "object") {
      if (Array.isArray(content.offers)) return { offers: content.offers };

      // placements: { "top-deals": [...], "wireless-deals": [...] }
      if (content.placements && typeof content.placements === "object") {
        const flattened = [];
        Object.keys(content.placements).forEach((pl) => {
          const arr = content.placements[pl];
          if (Array.isArray(arr)) {
            arr.forEach(o => flattened.push({ placement: pl, ...o }));
          }
        });
        return flattened.length ? { offers: flattened } : null;
      }

      // Unknown object -> show JSON
      return {
        htmlSnippet: `<pre style="white-space: pre-wrap;">${escapeHtml(JSON.stringify(content, null, 2))}</pre>`
      };
    }

    return null;
  }

  function normalizeOfferShape(raw, fallbackPlacement) {
    const id =
      raw.id ||
      raw.offerId ||
      raw.code ||
      raw.name ||
      `offer_${Math.random().toString(16).slice(2)}`;

    return {
      id: String(id),
      placement: raw.placement || raw.slot || fallbackPlacement || "top-deals",
      title: raw.title || raw.headline || raw.name || "Personalized offer",
      desc: raw.desc || raw.description || raw.body || raw.copy || "",
      badges: raw.badges || raw.tags || raw.labels || [],
      ctaText: raw.ctaText || raw.ctaLabel || (raw.cta && raw.cta.text) || "Shop",
      ctaUrl: raw.ctaUrl || raw.url || (raw.cta && raw.cta.url) || "#",
      priority: Number(raw.priority ?? raw.rank ?? raw.score ?? 50)
    };
  }

  function renderAjoFallbackHtml(html) {
    const container = document.getElementById("ajo-offer");
    if (!container) return;
    container.innerHTML = `<div class="offer-card"><h3>Personalized Offer</h3>${html}</div>`;
  }

  // ------------------------------------------------------------
  // ✅ UPDATED Personalization: eventType = web.webPageDetails.pageViews
  // (No _accenture_partner, no custom schema fields)
  // ------------------------------------------------------------
  function runPersonalization() {
    const preferredInterest = getPreferredInterest(); // not sent, just logged if you want
    console.log("🚀 Fetching personalization for surface:", SURFACE_URI, "PreferredInterest(local only):", preferredInterest);

    return alloy("sendEvent", {
      renderDecisions: true,
      personalization: {
        surfaces: [SURFACE_URI],
        schemas: [CONTENT_SCHEMA],
        defaultPersonalizationEnabled: false
      },
      xdm: {
        // Standard page view eventType [1](https://petetoast.com/posts/adobe-experience-platform-web-sdk-via-launch-part-2)[2](https://experienceleague.adobe.com/en/docs/experience-platform/collection/js/commands/sendevent/eventtype)
        eventType: "web.webPageDetails.pageViews",

        web: {
          webPageDetails: {
            name: document.title || "deals",
            URL: window.location.href
          },
          webReferrer: {
            URL: document.referrer || ""
          }
        },

        timestamp: new Date().toISOString()
      }
    })
    .then((result) => {
      console.log("🔍 Web SDK decision response:", result);

      const proposition = pickPropositionForSurface(result);
      const item =
        proposition?.items?.find(i => i.schema === CONTENT_SCHEMA) ||
        proposition?.items?.[0];

      const content = item?.data?.content;
      const extracted = extractOffersFromAjoContent(content);

      // If offers returned -> replace runtime offers and render placements
      if (extracted?.offers && Array.isArray(extracted.offers) && extracted.offers.length) {
        RUNTIME_OFFERS = extracted.offers.map(o => normalizeOfferShape(o, o.placement));
        renderAllPlacements();
        setError("");
        setMessage("✅ Personalized offers loaded.");
        return;
      }

      // If non-offer payload returned -> show it in #ajo-offer (optional), keep demo placements
      if (extracted?.htmlSnippet) {
        renderAjoFallbackHtml(extracted.htmlSnippet);
        setError("");
        setMessage("✅ Personalized content loaded (non-placement format).");
        return;
      }

      // If nothing usable -> keep demo offers
      console.warn("⚠️ No usable personalization content returned. Using demo offers.");
      setMessage("");
    })
    .catch((error) => {
      console.error("❌ sendEvent failed:", error);
      setError("Failed to load personalization (sendEvent failed). Check console/network.");

      // Keep demo offers rendered
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

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    // Render demo immediately (no blank UI while AJO loads)
    RUNTIME_OFFERS = [...OFFERS];
    renderAllPlacements();
    attachClickHandlers();

    // Baseline data layer context
    ensureDataLayer().unshift({
      page: {
        name: "deals",
        section: "marketing",
        url: window.location.href
      }
    });

    // Fetch decisions on page view event
    waitForAlloy(runPersonalization);
  });
})();
