import ScreenCapture from "./screen-capture";
import { submitFeedback } from "../utils/api";

class FeedbackModal {
  constructor(shadowRoot, config, onCloseCallback) {
    this.shadowRoot = shadowRoot;
    this.config = config;
    this.onCloseCallback = onCloseCallback;
    this.element = null;
    this.screenCapture = null;
    this.isVisible = false;
    this.formData = {
      type: "feedback",
      message: "",
      email: "",
      screenshot: null,
    };

    this.render();
    this.attachEvents();
  }

  render() {
    this.element = document.createElement("div");
    this.element.className = "ff-modal-overlay";
    this.element.innerHTML = `
      <div class="ff-modal">
        <div class="ff-modal-header">
          <h3>Send Feedback</h3>
          <button class="ff-close-btn" aria-label="Close feedback form">&times;</button>
        </div>
        
        <div class="ff-modal-body">
          <form class="ff-feedback-form">
            <div class="ff-form-group">
              <label for="ff-feedback-type">Feedback Type</label>
              <select id="ff-feedback-type" class="ff-form-control">
                <option value="feedback">General Feedback</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
              </select>
            </div>

            <div class="ff-form-group">
              <label for="ff-feedback-message">Message *</label>
              <textarea 
                id="ff-feedback-message" 
                class="ff-form-control" 
                placeholder="Tell us what's on your mind..."
                rows="4"
                required></textarea>
            </div>

            <div class="ff-form-group">
              <label for="ff-feedback-email">Email (optional)</label>
              <input 
                type="email" 
                id="ff-feedback-email" 
                class="ff-form-control" 
                placeholder="your@email.com">
            </div>

            <div class="ff-form-group">
              <div class="ff-screenshot-section">
                <button type="button" class="ff-screenshot-btn">
                  📷 Add Screenshot
                </button>
                <div class="ff-screenshot-preview" style="display: none;">
                  <img class="ff-screenshot-img" alt="Screenshot preview">
                  <button type="button" class="ff-remove-screenshot">Remove</button>
                </div>
              </div>
            </div>

            <div class="ff-form-actions">
              <button type="button" class="ff-btn ff-btn-secondary">Cancel</button>
              <button type="submit" class="ff-btn ff-btn-primary">
                <span class="ff-btn-text">Send Feedback</span>
                <span class="ff-btn-loading" style="display: none;">Sending...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.addStyles();
    this.shadowRoot.appendChild(this.element);

    // Initialize screen capture
    this.screenCapture = new ScreenCapture();
  }

  addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .ff-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000000;
        display: none;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      .ff-modal-overlay.ff-visible {
        display: flex;
      }

      .ff-modal {
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow: hidden;
        animation: ff-modal-enter 0.2s ease-out;
      }

      @keyframes ff-modal-enter {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .ff-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e5e5;
      }

      .ff-modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .ff-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        color: #666;
      }

      .ff-close-btn:hover {
        background: #f5f5f5;
      }

      .ff-modal-body {
        padding: 24px;
        max-height: calc(90vh - 80px);
        overflow-y: auto;
      }

      .ff-form-group {
        margin-bottom: 20px;
      }

      .ff-form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #333;
        font-size: 14px;
      }

      .ff-form-control {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }

      .ff-form-control:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
      }

      .ff-screenshot-section {
        border: 2px dashed #ddd;
        border-radius: 6px;
        padding: 20px;
        text-align: center;
        transition: border-color 0.2s;
      }

      .ff-screenshot-btn {
        background: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .ff-screenshot-btn:hover {
        background: #e9ecef;
        border-color: #007bff;
      }

      .ff-screenshot-preview {
        position: relative;
        margin-top: 12px;
      }

      .ff-screenshot-img {
        max-width: 100%;
        max-height: 200px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .ff-remove-screenshot {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        cursor: pointer;
        font-size: 12px;
      }

      .ff-form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #e5e5e5;
      }

      .ff-btn {
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s;
      }

      .ff-btn-secondary {
        background: #f8f9fa;
        color: #666;
        border-color: #ddd;
      }

      .ff-btn-secondary:hover {
        background: #e9ecef;
      }

      .ff-btn-primary {
        background: #007bff;
        color: white;
      }

      .ff-btn-primary:hover {
        background: #0056b3;
      }

      .ff-btn-primary:disabled {
        background: #6c757d;
        cursor: not-allowed;
      }

      .ff-btn-loading {
        display: none;
      }

      .ff-btn.loading .ff-btn-text {
        display: none;
      }

      .ff-btn.loading .ff-btn-loading {
        display: inline;
      }

      /* Mobile responsive */
      @media (max-width: 480px) {
        .ff-modal {
          width: 95%;
          margin: 20px;
        }
        
        .ff-modal-header,
        .ff-modal-body {
          padding: 16px;
        }
        
        .ff-form-actions {
          flex-direction: column;
        }
        
        .ff-btn {
          width: 100%;
        }
      }
    `;

    this.shadowRoot.appendChild(style);
  }

  attachEvents() {
    // Close button
    const closeBtn = this.element.querySelector(".ff-close-btn");
    closeBtn.addEventListener("click", () => this.hide());

    // Cancel button
    const cancelBtn = this.element.querySelector(".ff-btn-secondary");
    cancelBtn.addEventListener("click", () => this.hide());

    // Overlay click to close
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.hide();
      }
    });

    // Escape key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isVisible) {
        this.hide();
      }
    });

    // Form submission
    const form = this.element.querySelector(".ff-feedback-form");
    form.addEventListener("submit", (e) => this.handleSubmit(e));

    // Screenshot functionality
    const screenshotBtn = this.element.querySelector(".ff-screenshot-btn");
    screenshotBtn.addEventListener("click", () => this.captureScreenshot());

    const removeScreenshotBtn = this.element.querySelector(
      ".ff-remove-screenshot"
    );
    removeScreenshotBtn.addEventListener("click", () =>
      this.removeScreenshot()
    );

    // Form field changes
    this.element
      .querySelector("#ff-feedback-type")
      .addEventListener("change", (e) => {
        this.formData.type = e.target.value;
      });

    this.element
      .querySelector("#ff-feedback-message")
      .addEventListener("input", (e) => {
        this.formData.message = e.target.value;
      });

    this.element
      .querySelector("#ff-feedback-email")
      .addEventListener("input", (e) => {
        this.formData.email = e.target.value;
      });
  }

  async captureScreenshot() {
    try {
      const screenshot = await this.screenCapture.capture();
      this.formData.screenshot = screenshot;

      const preview = this.element.querySelector(".ff-screenshot-preview");
      const img = this.element.querySelector(".ff-screenshot-img");

      img.src = screenshot;
      preview.style.display = "block";
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      alert("Failed to capture screenshot. Please try again.");
    }
  }

  removeScreenshot() {
    this.formData.screenshot = null;
    const preview = this.element.querySelector(".ff-screenshot-preview");
    preview.style.display = "none";
  }

  async handleSubmit(e) {
    e.preventDefault();

    const submitBtn = this.element.querySelector(".ff-btn-primary");
    const messageField = this.element.querySelector("#ff-feedback-message");

    if (!this.formData.message.trim()) {
      messageField.focus();
      return;
    }

    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    try {
      await submitFeedback(
        {
          ...this.formData,
          apiKey: this.config.apiKey,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
        this.config.apiUrl
      );

      this.showSuccess();
      setTimeout(() => this.hide(), 2000);
    } catch (error) {
      console.error("Feedback submission failed:", error);
      alert("Failed to send feedback. Please try again.");
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  }

  showSuccess() {
    const modalBody = this.element.querySelector(".ff-modal-body");
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <h3 style="margin: 0 0 8px 0; font-size: 18px;">Thank you!</h3>
        <p style="margin: 0; color: #666;">Your feedback has been sent successfully.</p>
      </div>
    `;
  }

  show() {
    this.isVisible = true;
    this.element.classList.add("ff-visible");
    document.body.style.overflow = "hidden"; // Prevent background scrolling

    // Focus on first input
    setTimeout(() => {
      const firstInput = this.element.querySelector("#ff-feedback-message");
      if (firstInput) firstInput.focus();
    }, 100);
  }

  hide() {
    this.isVisible = false;
    this.element.classList.remove("ff-visible");
    document.body.style.overflow = ""; // Restore scrolling
    this.resetForm();
    this.onCloseCallback();
  }

  resetForm() {
    this.formData = {
      type: "feedback",
      message: "",
      email: "",
      screenshot: null,
    };

    const form = this.element.querySelector(".ff-feedback-form");
    if (form) {
      form.reset();
    }

    this.removeScreenshot();
  }
}

export default FeedbackModal;