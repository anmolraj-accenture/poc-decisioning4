// ------------------------------------------------------------
// Demo offers (replace with AJO Decisioning response payload)
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

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

// Ensure adobeDataLayer exists (ACDL-style container)
function ensureDataLayer(){
  window.adobeDataLayer = window.adobeDataLayer || [];
  return window.adobeDataLayer;
}

// Centralized tracking: pushes an event to adobeDataLayer
function trackOfferClick({ offerId, placement, title, destinationUrl, clickType }){
  const dl = ensureDataLayer();

  const payload = {
    event: "offer-click",
    eventInfo: {
      clickType: clickType || "unknown",  // e.g., "cta" or "track-button"
      timestamp: new Date().toISOString()
    },
    offer: {
      id: offerId,
      placement: placement,
      title: title,
      destinationUrl: destinationUrl || ""
    },
    page: {
      url: window.location.href,
      hash: window.location.hash || ""
    }
  };

  dl.push(payload);

  // handy for quick debugging in console
  window.__lastClick = payload;

  console.log("[DEMO] offer-click pushed to adobeDataLayer:", payload);

  // If you already have Alloy/Web SDK available, you can optionally send immediately:
  // window.alloy && alloy("sendEvent", { xdm: { ... } });
}

// Find offer object by id (for older onclick calls)
function getOfferById(offerId){
  return OFFERS.find(o => o.id === offerId);
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
function renderPlacement(placementName, offers){
  const host = document.querySelector(`[data-placement="${placementName}"]`);
  if(!host) return;

  host.innerHTML = offers
    .sort((a,b) => (b.priority||0) - (a.priority||0))
    .map(o => `
      <article class="card" data-offer-id="${escapeHtml(o.id)}" data-placement="${escapeHtml(placementName)}">
        <div class="card__media">Placement: ${escapeHtml(placementName)}</div>
        <div class="card__body">
          <h3 class="card__title">${escapeHtml(o.title)}</h3>
          <p class="card__desc">${escapeHtml(o.desc || "")}</p>

          <div class="card__meta">
            <span class="badge">ID: ${escapeHtml(o.id)}</span>
            ${(o.badges||[]).slice(0,3).map(b => `<span class="badge">${escapeHtml(b)}</span>`).join("")}
          </div>

          <div class="card__actions">
            <!-- CTA: we intercept click to track + then navigate -->
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

// ------------------------------------------------------------
// Click wiring (event delegation)
// ------------------------------------------------------------
function attachClickHandlers(){
  // One listener for the whole document: catches CTA + Track click
  document.addEventListener("click", (e) => {
    const cta = e.target.closest('a[data-cta="true"]');
    const trackBtn = e.target.closest('button[data-track="true"]');

    if(!cta && !trackBtn) return;

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

    // If CTA is a real navigation, allow a short tick for DL push then navigate
    if(cta && destinationUrl && destinationUrl !== "#"){
      e.preventDefault();
      setTimeout(() => { window.location.href = destinationUrl; }, 60);
    }
  });
}

// Backward compatible function if anything else calls window.__demoClick(id)
window.__demoClick = function(offerId){
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
// Boot
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderPlacement("top-deals", OFFERS.filter(o => o.placement === "top-deals"));
  renderPlacement("wireless-deals", OFFERS.filter(o => o.placement === "wireless-deals"));

  attachClickHandlers();

  // Optional: initialize a baseline data layer object for page context
  // (helps you create Data Elements like adobeDataLayer.0.page.name, etc.)
  ensureDataLayer().unshift({
    page: {
      name: "deals",
      section: "marketing",
      url: window.location.href
    }
  });
});
