(() => {
  // ------------------------------------------------------------
  // AJO Decisioning / Web SDK config
  // ------------------------------------------------------------
  const SURFACE_URI = "web://anmolraj-accenture.github.io/poc-decisioning2#ajo-offer";
  const CONTENT_SCHEMA = "https://ns.adobe.com/personalization/json-content-item";

  // ------------------------------------------------------------
  // Demo offers (fallback/default)
  // ------------------------------------------------------------
  const OFFERS = [
    {
      id: "D-AJO-001",
      placement: "ajo-offer",
      title: "Galaxy Ultra for $0/mo (demo)",
      desc: "Eligible trade-in required. Terms apply (demo copy).",
      badges: ["Trade-in", "36 mo"],
      ctaText: "Shop now",
      ctaUrl: "#",
      priority: 90
    },
    {
      id: "D-AJO-002",
      placement: "ajo-offer",
      title: "Fiber: save monthly (demo)",
      desc: "Bundle savings + reward card messaging (demo copy).",
      badges: ["Bundle", "New customers"],
      ctaText: "Explore",
      ctaUrl: "#",
      priority: 80
    },
    {
      id: "D-AJO-003",
      placement: "ajo-offer",
      title: "$200 off per line (demo)",
      desc: "Online order + new line. Limited time (demo copy).",
      badges: ["New line", "Credits"],
      ctaText: "Get offer",
      ctaUrl: "#",
      priority: 70
    },
    {
      id: "D-WD-101",
      placement: "wireless-deals",
      title: "Phone deal A (demo)",
      desc: "Great value with eligible plan (demo copy).",
      badges: ["Wireless", "Featured"],
      ctaText: "View",
      ctaUrl: "#",
      priority: 85
    },
    {
      id: "D-WD-102",
      placement: "wireless-deals",
      title: "Phone deal B (demo)",
      desc: "No trade-in required (demo copy).",
      badges: ["No trade-in"],
      ctaText: "Shop",
      ctaUrl: "#",
      priority: 75
    },
    {
      id: "D-WD-103",
      placement: "wireless-deals",
      title: "Phone deal C (demo)",
      desc: "Bill credits over time (demo copy).",
      badges: ["Bill credits"],
      ctaText: "Details",
      ctaUrl: "#",
      priority: 65
    }
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

  // Keep (optional) simple preference getter for debugging
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

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
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
