(() => {
  console.log("✅ Multi-surface personalization JS loaded");

  // ------------------------------------------------------------
  // ✅ CONFIG: Add all surfaces here (only place you'll edit later)
  // ------------------------------------------------------------
  const SURFACE_CONFIG = {
    "web://anmolraj-accenture.github.io/poc-decisioning2#ajo-offer":
      '[data-placement="ajo-offer"]',

    "web://anmolraj-accenture.github.io/poc-decisioning2#wireless-deals":
      '[data-placement="wireless-deals"]'
  };

  const SURFACE_URIS = Object.keys(SURFACE_CONFIG);

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

  function getPropositionsForSurfaces(result) {
    const propositions = result?.propositions || [];
    return propositions.filter((p) => SURFACE_URIS.includes(p.scope));
  }

  function renderToSelector(selector, html) {
    const el = document.querySelector(selector);

    if (!el) {
      console.warn(`⚠️ No element found for selector: ${selector}`);
      return;
    }

    el.innerHTML = `
      <div style="border:1px solid #ccc;padding:12px;border-radius:10px;background:#fff">
        ${html}
      </div>
    `;
  }

  function extractContent(proposition) {
    const item =
      proposition?.items?.find((i) => i.schema === CONTENT_SCHEMA) ||
      proposition?.items?.[0];

    return item?.data?.content;
  }

  function formatContent(content) {
    if (!content) {
      return "<p>No personalized offer available.</p>";
    }

    if (typeof content === "string") {
      return decodeHtmlEntities(content);
    }

    return `<pre>${JSON.stringify(content, null, 2)}</pre>`;
  }

  // ------------------------------------------------------------
  // Personalization Execution
  // ------------------------------------------------------------
  function runPersonalization() {
    console.log("🚀 runPersonalization triggered");

    const inputs = getDecisionInputs();
    console.log("🧾 Decision inputs:", inputs);

    alloy("sendEvent", {
      renderDecisions: true,
      personalization: {
        surfaces: SURFACE_URIS, // ✅ dynamically supports many surfaces
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

        const propositions = getPropositionsForSurfaces(result);

        if (!propositions.length) {
          console.warn("⚠️ No propositions returned for surfaces");

          // Populate all containers with fallback
          SURFACE_URIS.forEach((surface) => {
            renderToSelector(
              SURFACE_CONFIG[surface],
              "<p>No personalized offer available.</p>"
            );
          });

          return;
        }

        // ✅ Render each surface dynamically
        propositions.forEach((proposition) => {
          const surface = proposition.scope;
          const selector = SURFACE_CONFIG[surface];

          const content = extractContent(proposition);
          const html = formatContent(content);

          renderToSelector(selector, html);
        });
      })
      .catch((err) => {
        console.error("❌ sendEvent failed:", err);

        // Fallback: show failure on all placements
        SURFACE_URIS.forEach((surface) => {
          renderToSelector(
            SURFACE_CONFIG[surface],
            "<p>Failed to load personalized offer.</p>"
          );
        });
      });
  }

  // ------------------------------------------------------------
  // Wait for Alloy
  // ------------------------------------------------------------
  function waitForAlloy(cb, retries = 40) {
    if (typeof alloy === "function") {
      console.log("✅ Alloy detected");
      cb();
    } else if (retries > 0) {
      setTimeout(() => waitForAlloy(cb, retries - 1), 250);
    } else {
      console.error("❌ Alloy never loaded");
    }
  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOM ready");
    waitForAlloy(runPersonalization);
  });
})();
