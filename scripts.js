(() => {
  console.log("✅ Page 2 JS loaded");

  // ------------------------------------------------------------
  // AJO Decisioning / Web SDK config
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
      id: "D-AJO-001",
      placement: "ajo-offer",
      title: "Galaxy Ultra for $0/mo (demo)",
      desc: "Eligible trade-in required.",
      ctaText: "Shop now",
      ctaUrl: "#",
      priority: 90
    }
  ];

  let RUNTIME_OFFERS = [...OFFERS];

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  function getDecisionInputs() {
    try {
      return JSON.parse(localStorage.getItem("AJO_DecisionInputs") || "{}");
    } catch {
      return {};
    }
  }

  function render(text) {
    const el = document.querySelector('[data-placement="ajo-offer"]');
    if (!el) {
      console.error("❌ data-placement='ajo-offer' not found");
      return;
    }
    el.innerHTML = `<div style="border:1px solid #ccc;padding:12px">${text}</div>`;
  }

  // ------------------------------------------------------------
  // Personalization
  // ------------------------------------------------------------
  function runPersonalization() {
    console.log("🚀 runPersonalization called");

    const inputs = getDecisionInputs();
    console.log("🧾 Decision inputs:", inputs);

    alloy("sendEvent", {
      renderDecisions: true,
      personalization: {
        surfaces: [SURFACE_URI],
        schemas: [CONTENT_SCHEMA]
      },
      xdm: {
        eventType: "web.webPageDetails.pageViews",
        web: {
          webPageDetails: {
            name: document.title,
            URL: window.location.href
          }
        },
        _accenture_partner: inputs
      }
    })
      .then(result => {
        console.log("✅ Decision response:", result);

        const item =
          result?.decisions?.[0]?.items?.[0] ||
          result?.propositions?.[0]?.items?.[0];

        console.log("🎯 Picked decision item:", item);

        const content = item?.data?.content;

        if (!content) {
          render("No content returned from AJO");
          return;
        }

        render(
          typeof content === "string"
            ? content
            : `<pre>${JSON.stringify(content, null, 2)}</pre>`
        );
      })
      .catch(err => console.error("❌ sendEvent failed:", err));
  }

  function waitForAlloy(cb, retries = 40) {
    if (typeof alloy === "function") {
      console.log("✅ Alloy found");
      cb();
    } else if (retries > 0) {
      setTimeout(() => waitForAlloy(cb, retries - 1), 250);
    } else {
      console.error("❌ Alloy never loaded");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOMContentLoaded");
    waitForAlloy(runPersonalization);
  });
})();
