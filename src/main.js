import "./styles/widget.css";
import FloatingButton from "./components/floating-button";
import FeedbackPanel from "./components/feedback-panel";

(function (window, document) {
  "use strict";

  // Prevent multiple initialization
  if (window.UsevosaWidget) {
    console.warn("UsevosaWidget is already initialized");
    return;
  }

  class UsevosaWidget {
    constructor() {
      this.isInitialized = false;
      this.config = this.getConfig();
      this.shadowRoot = null;
      this.floatingButton = null;
      this.feedbackPanel = null;

      this.init();
    }

    getConfig() {
      const script =
        document.currentScript ||
        document.querySelector('script[src*="widget.js"]');

      if (!script) {
        console.error("Usevosa: Could not find widget script tag");
        return {};
      }

      return {
        apiKey: script.getAttribute("data-api-key") || "",
        position: script.getAttribute("data-position") || "bottom-right",
        theme: script.getAttribute("data-theme") || "light",
        buttonText: script.getAttribute("data-button-text") || "Feedback",
        apiUrl:
          script.getAttribute("data-api-url") || "https://api.feedbackflow.com",
      };
    }

    init() {
      if (this.isInitialized) return;

      // Waiting for DOM to be ready
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () =>
          this.createWidget()
        );
      } else {
        this.createWidget();
      }
    }

    createWidget() {
      try {
        this.createShadowDOM();
        this.floatingButton = new FloatingButton(
          this.shadowRoot,
          this.config,
          this.togglePanel.bind(this)
        );
        this.feedbackPanel = new FeedbackPanel(
          this.shadowRoot,
          this.config,
          this.closePanel.bind(this),
          console
        );
        this.feedbackPanel.hide();
        this.isInitialized = true;
        console.log("Usevosa widget initialized successfully");
      } catch (error) {
        console.error("Usevosa: Error creating widget", error);
      }
    }

    createShadowDOM() {
      // create container element
      const container = document.createElement("div");
      container.id = "usevosa-widget-container";

      // Create Shadow DOM for style isolation
      this.shadowRoot = container.attachShadow({ mode: "closed" });

      // Add container to page
      document.body.appendChild(container);
    }

    togglePanel() {
      if (!this.feedbackPanel) return;
      if (this.feedbackPanel.isVisible) {
        this.feedbackPanel.hide();
      } else {
        this.feedbackPanel.show();
      }
    }

    closePanel() {
      if (this.feedbackPanel) {
        this.feedbackPanel.hide();
      }
    }

    // Public API methods
    destroy() {
      const container = document.getElementById("usevosa-widget-container");
      if (container) {
        container.remove();
      }
      this.isInitialized = false;
    }

    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
      if (this.floatingButton) {
        this.floatingButton.updateConfig(this.config);
      }
    }

    positionPanel() {
      const offset = 12; // px gap between button and panel
      const btnRect = this.floatingButton.button.getBoundingClientRect();
      const panelHeight = this.feedbackPanel.panel.offsetHeight;
      const spaceBelow = window.innerHeight - btnRect.bottom;
      const spaceAbove = btnRect.top;
      let top, left;

      if (spaceBelow > panelHeight || spaceBelow > spaceAbove) {
        // Open below
        top = btnRect.bottom + offset;
      } else {
        // Open above
        top = btnRect.top - panelHeight - offset;
      }
      // Align left edge of panel with left edge of button
      left = btnRect.left;
      // Clamp to viewport if needed
      if (left + 360 > window.innerWidth) left = window.innerWidth - 368;
      if (left < 8) left = 8;

      this.feedbackPanel.panel.style.top = `${top}px`;
      this.feedbackPanel.panel.style.left = `${left}px`;
    }
  }

  // Initialize widget
  const widgetInstance = new UsevosaWidget();
  window.UsevosaWidget = widgetInstance;

  // Expose public methods
  window.UsevosaWidget = {
    destroy: () => widgetInstance.destroy(),
    updateConfig: (config) => widgetInstance.updateConfig(config),
    openFeedback: () => widgetInstance.togglePanel()
  };
})(window, document);
