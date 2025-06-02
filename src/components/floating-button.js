class FloatingButton {
  constructor(shadowRoot, config, onClickCallback) {
    this.shadowRoot = shadowRoot;
    this.config = config;
    this.onClickCallback = onClickCallback;
    this.element = null;

    this.render();
    this.attachEvents();
  }

  render() {
    this.element = document.createElement("div");
    this.element.className = "ff-floating-button";
    this.element.innerHTML = `
        <button class="ff-button ff-button-${this.config.position}" 
                title="Send Feedback"
                aria-label="Open feedback form">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <span class="ff-button-text">${this.config.buttonText}</span>
        </button>
      `;

    // Apply position-specific styles
    this.applyPositionStyles();

    // Add styles to shadow DOM
    this.addStyles();

    this.shadowRoot.appendChild(this.element);
  }

  applyPositionStyles() {
    const positions = {
      "bottom-right": { bottom: "20px", right: "20px" },
      "bottom-left": { bottom: "20px", left: "20px" },
      "top-right": { top: "20px", right: "20px" },
      "top-left": { top: "20px", left: "20px" },
    };

    const pos = positions[this.config.position] || positions["bottom-right"];
    Object.assign(this.element.style, pos);
  }

  addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      :root {
        --ff-primary: #4F8CFF;
        --ff-background: #fff;
        --ff-text: #222;
        --ff-border: #e5e7eb;
        --ff-shadow: 0 8px 32px rgba(0,0,0,0.18);
        --ff-radius: 20px;
        --ff-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      [data-theme="dark"] {
        --ff-primary: #60a5fa;
        --ff-background: #1f2937;
        --ff-text: #f3f4f6;
        --ff-border: #374151;
        --ff-shadow: 0 8px 32px rgba(0,0,0,0.3);
      }

      .ff-floating-button {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      .ff-button {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--ff-primary);
        border: none;
        border-radius: 50px;
        padding: 14px 20px;
        color: white;
        cursor: pointer;
        font-size: 15px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(79, 140, 255, 0.2);
        transition: var(--ff-transition);
        outline: none;
      }

      .ff-button:hover {
        background: #3b7ae0;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(79, 140, 255, 0.25);
      }

      .ff-button:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(79, 140, 255, 0.2);
      }

      .ff-button:focus {
        box-shadow: 0 0 0 4px rgba(79, 140, 255, 0.2);
      }

      .ff-button svg {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        transition: var(--ff-transition);
      }

      .ff-button:hover svg {
        transform: scale(1.1);
      }

      .ff-button-text {
        white-space: nowrap;
        font-weight: 500;
      }

      /* Theme variations */
      .ff-floating-button[data-theme="dark"] .ff-button {
        background: var(--ff-primary);
        color: white;
      }

      .ff-floating-button[data-theme="dark"] .ff-button:hover {
        background: #3b7ae0;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .ff-button-text {
          display: none;
        }
        
        .ff-button {
          padding: 14px;
          border-radius: 50%;
          width: 52px;
          height: 52px;
          justify-content: center;
        }

        .ff-button svg {
          margin: 0;
        }
      }
    `;

    this.shadowRoot.appendChild(style);
  }

  attachEvents() {
    const button = this.element.querySelector(".ff-button");

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onClickCallback();
    });

    // Add keyboard navigation
    button.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.onClickCallback();
      }
    });
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    // Update button text
    const textElement = this.element.querySelector(".ff-button-text");
    if (textElement) {
      textElement.textContent = this.config.buttonText;
    }

    // Update position
    this.applyPositionStyles();
  }

  hide() {
    if (this.element) {
      this.element.style.display = "none";
    }
  }

  show() {
    if (this.element) {
      this.element.style.display = "block";
    }
  }
}

export default FloatingButton;
