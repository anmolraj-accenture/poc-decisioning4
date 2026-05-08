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
  // Helpers
  // ------------------------------------------------------------
  function getDecisionInputs() {
    try {
      return JSON.parse(localStorage.getItem("AJO_DecisionInputs") || "{}");
    } catch {
      return {};
    }
  }

  function decodeHtmlEntities(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  function pickPropositionForSurface(result) {
    const propositions = result?.propositions || [];
    return (
      propositions.find((p) => p.scope === SURFACE_URI) ||
      propositions[0] ||
      null
    );
  }

  function render(html) {
    const el = document.querySelector('[data-placement="ajo-offer"]');
    if (!el) {
      console.error("❌ data-placement='ajo-offer' not found");
      return;
    }

    el.innerHTML = `
      <div style="border:1px solid #ccc;padding:12px;border-radius:10px;background:#fff">
        ${html}
      </div>
    `;
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
        schemas: [CONTENT_SCHEMA],
        defaultPersonalizationEnabled: false
      },
      xdm: {
        eventType: "decisioning.propositionFetch",
        timestamp: new Date().toISOString(),
        _accenture_partner: inputs
      }
    })
      .then((result) => {
        console.log("✅ Decision response:", result);

        const proposition = pickPropositionForSurface(result);
        console.log("🎯 Selected proposition:", proposition);

        const item =
          proposition?.items?.find(
            (i) => i.schema === CONTENT_SCHEMA
          ) || proposition?.items?.[0];

        const content = item?.data?.content;

        if (!content) {
          render("<p>No personalized offer available.</p>");
          return;
        }

        let html;

        if (typeof content === "string") {
          // ✅ FIX: Decode HTML before rendering
          html = decodeHtmlEntities(content);
        } else {
          html = `<pre>${JSON.stringify(content, null, 2)}</pre>`;
        }

        render(html);
      })
      .catch((err) => {
        console.error("❌ sendEvent failed:", err);
        render("<p>Failed to load personalized offer.</p>");
      });
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
