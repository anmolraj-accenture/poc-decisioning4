// --- Dummy "offers" you can replace with AJO Decisioning response payload ---
// Each item includes attributes you'll typically map from AJO: id, placement, priority, image, CTA, etc.
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

// --- Rendering ---
function renderPlacement(placementName, offers){
  const host = document.querySelector(`[data-placement="${placementName}"]`);
  if(!host) return;

  host.innerHTML = offers
    .sort((a,b) => (b.priority||0) - (a.priority||0))
    .map(o => `
      <article class="card" data-offer-id="${o.id}">
        <div class="card__media">Placement: ${placementName}</div>
        <div class="card__body">
          <h3 class="card__title">${escapeHtml(o.title)}</h3>
          <p class="card__desc">${escapeHtml(o.desc || "")}</p>
          <div class="card__meta">
            <span class="badge">ID: ${escapeHtml(o.id)}</span>
            ${(o.badges||[]).slice(0,3).map(b => `<span class="badge">${escapeHtml(b)}</span>`).join("")}
          </div>
          <div class="card__actions">
            <a class="btn" href="${o.ctaUrl || "#"}">${escapeHtml(o.ctaText || "Shop")}</a>
            <button class="btn btn--ghost" type="button" onclick="window.__demoClick('${o.id}')">
              Track click
            </button>
          </div>
        </div>
      </article>
    `).join("");
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// --- Demo tracking hook (swap with Alloy/WebSDK / AJO tracking as needed) ---
window.__demoClick = function(offerId){
  console.log("[DEMO] Offer clicked:", offerId);
  // Example for your AJO-D demo: send offerId + placement + timestamp
  // window.alloy && alloy("sendEvent", { xdm: {...} });
};

// --- Boot ---
document.addEventListener("DOMContentLoaded", () => {
  renderPlacement("top-deals", OFFERS.filter(o => o.placement === "top-deals"));
  renderPlacement("wireless-deals", OFFERS.filter(o => o.placement === "wireless-deals"));
});
