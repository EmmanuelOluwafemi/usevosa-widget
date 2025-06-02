import ScreenCapture from "./screen-capture"
import ScreenRecorder from './screen-recorder'; // Import the new class

const FEEDBACK_TYPES = [
  {
    key: "feature",
    label: "Feature Requests",
    icon: `<svg width='24' height='24' fill='none'><circle cx='12' cy='12' r='10' fill='#4F8CFF'/><circle cx='12' cy='12' r='5' fill='#fff'/></svg>`
  },
  {
    key: "bug",
    label: "Bug report",
    icon: `<svg width='24' height='24' fill='none'><circle cx='12' cy='12' r='10' fill='#D72660'/><text x='12' y='17' text-anchor='middle' font-size='16' fill='#fff'>!</text></svg>`
  },
  {
    key: "custom",
    label: "Custom Name",
    icon: `<svg width='24' height='24' fill='none'><circle cx='12' cy='12' r='10' fill='#2AB885'/><circle cx='12' cy='12' r='5' fill='#fff'/></svg>`
  }
]

class FeedbackPanel {
  constructor(shadowRoot, config, onCloseCallback, logger) {
    this.shadowRoot = shadowRoot
    this.config = config
    this.onCloseCallback = onCloseCallback
    this.logger = logger;
    this.element = null
    this.screenCapture = new ScreenCapture()
    this.screenRecorder = new ScreenRecorder(); // Instantiate ScreenRecorder
    this.isVisible = false
    this.state = {
      step: "select-type", // or "form"
      selectedType: null,
      screenshot: null,
      isSubmitting: false,
      recording: null
    }
    this.formData = {
      title: "",
      details: "",
      screenshot: null,
      recording: null
    }
    this.render()
    this.attachEvents()
  }

  render() {
    if (this.element) this.element.remove()
    this.element = document.createElement("div")
    this.element.className = "ff-panel-overlay"
    this.element.innerHTML = this.getPanelHTML()
    this.addStyles()
    this.shadowRoot.appendChild(this.element)
    this.positionPanel()
  }

  getPanelHTML() {
    if (this.state.step === "select-type") {
      return `
        <div class="ff-panel">
          <button class="ff-close-btn" aria-label="Close">&times;</button>
          <div class="ff-panel-header">Share your feedback</div>
          <div class="ff-panel-types">
            ${FEEDBACK_TYPES.map(type => `
              <button class="ff-type-btn" data-type="${type.key}">
                <span class="ff-type-icon">${type.icon}</span>
                <span class="ff-type-label">${type.label}</span>
              </button>
            `).join("")}
          </div>
          <div class="ff-panel-brand">Powered by <span class="ff-brand-logo">Vosa</span></div>
        </div>
      `
    }
    // Form step
    const type = FEEDBACK_TYPES.find(t => t.key === this.state.selectedType)
    return `
      <div class="ff-panel">
        <button class="ff-close-btn" aria-label="Close">&times;</button>
        <div class="ff-panel-header">
          <button class="ff-back-btn" aria-label="Back" type="button">
            <svg width="20" height="20" fill="none"><path d="M13 16l-4-4 4-4" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <span class="ff-type-icon">${type.icon}</span>
          <span class="ff-type-label">${type.label}</span>
        </div>
        <form class="ff-feedback-form">
          <input class="ff-input" name="title" placeholder="Short title for your post" maxlength="80" required autocomplete="off" value="${this.formData.title.replace(/"/g, '&quot;')}">
          <textarea class="ff-textarea" name="details" placeholder="Please share more details" rows="4" required>${this.formData.details}</textarea>
          <div class="ff-form-actions">
            <button type="button" class="ff-screenshot-btn" title="Add screenshot">
              <svg width="20" height="20" fill="none"><rect width="20" height="20" rx="4" fill="#E5E7EB"/><path d="M5 15V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8" stroke="#6B7280" stroke-width="1.5"/><circle cx="10" cy="10" r="2" fill="#6B7280"/></svg>
            </button>
            <button type="button" class="ff-record-btn" title="Record Screen">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M12 1C5.92487 1 1 5.92487 1 12C1 18.0751 5.92487 23 12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1ZM12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3ZM10 8C9.44772 8 9 8.44772 9 9V15C9 15.5523 9.44772 16 10 16H14C14.5523 16 15 15.5523 15 15V9C15 8.44772 14.5523 8 14 8H10ZM11 10H13V14H11V10Z"></path></svg>
            </button>
            ${this.state.screenshot ? `<div class="ff-screenshot-preview"><img src="${this.state.screenshot}" alt="Screenshot"><button type="button" class="ff-remove-screenshot">&times;</button></div>` : ""}
            ${this.state.recording ? `<div class="ff-recording-preview"><video src="${this.state.recording}" alt="Recording" controls></video><button type="button" class="ff-remove-recording">&times;</button></div>` : ""}
            <button type="submit" class="ff-submit-btn" ${this.isFormValid() ? "" : "disabled"}>
              ${this.state.isSubmitting ? "<span class='ff-btn-loading'>Sending...</span>" : "Report Your Feedback"}
            </button>
          </div>
        </form>
        <div class="ff-panel-brand">Powered by <span class="ff-brand-logo">Vosa</span></div>
      </div>
    `
  }

  addStyles() {
    if (this.element.querySelector("style")) return
    const style = document.createElement("style")
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

      .ff-panel-overlay {
        position: fixed;
        z-index: 1000000;
        top: 0; left: 0; width: 100vw; height: 100vh;
        pointer-events: none;
      }

      .ff-panel {
        position: absolute;
        min-width: 320px;
        max-width: 400px;
        background: var(--ff-background);
        border-radius: var(--ff-radius);
        box-shadow: var(--ff-shadow);
        padding: 28px 24px 20px 24px;
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        animation: ff-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--ff-text);
      }

      @keyframes ff-slide-in {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      .ff-panel-header {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ff-back-btn {
        background: none;
        border: none;
        margin-right: 4px;
        cursor: pointer;
        padding: 0 4px 0 0;
        display: flex;
        align-items: center;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        transition: var(--ff-transition);
      }

      .ff-back-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        transform: translateX(-2px);
      }

      .ff-close-btn {
        position: absolute;
        top: 16px; right: 16px;
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--ff-text);
        opacity: 0.6;
        cursor: pointer;
        border-radius: 50%;
        width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center;
        transition: var(--ff-transition);
      }

      .ff-close-btn:hover { 
        background: rgba(0, 0, 0, 0.05);
        opacity: 1;
        transform: rotate(90deg);
      }

      .ff-panel-types {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 8px;
      }

      .ff-type-btn {
        display: flex;
        align-items: center;
        gap: 16px;
        background: rgba(0, 0, 0, 0.03);
        border: none;
        border-radius: 16px;
        padding: 18px 20px;
        font-size: 1rem;
        font-weight: 500;
        color: var(--ff-text);
        cursor: pointer;
        transition: var(--ff-transition);
        transform-origin: center;
      }

      .ff-type-btn:hover {
        background: rgba(79, 140, 255, 0.1);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      }

      .ff-type-btn:active {
        transform: translateY(0);
      }

      .ff-type-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px; height: 40px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        transition: var(--ff-transition);
      }

      .ff-type-btn:hover .ff-type-icon {
        transform: scale(1.1);
      }

      .ff-type-label {
        font-size: 1rem;
        font-weight: 500;
      }

      .ff-panel-brand {
        margin-top: 12px;
        text-align: right;
        font-size: 0.875rem;
        color: rgba(0, 0, 0, 0.4);
      }

      .ff-brand-logo {
        font-weight: 700;
        color: var(--ff-primary);
      }

      .ff-feedback-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .ff-input, .ff-textarea {
        width: 100%;
        box-sizing: border-box;
        border: 2px solid var(--ff-border);
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 1rem;
        font-family: inherit;
        background: rgba(0, 0, 0, 0.02);
        transition: var(--ff-transition);
        color: var(--ff-text);
      }

      .ff-input:focus, .ff-textarea:focus {
        border-color: var(--ff-primary);
        outline: none;
        background: var(--ff-background);
        box-shadow: 0 0 0 4px rgba(79, 140, 255, 0.1);
      }

      .ff-input.error, .ff-textarea.error {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.05);
      }

      .ff-error-message {
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 4px;
      }

      .ff-form-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 8px;
      }

      .ff-screenshot-btn, .ff-record-btn {
        background: none;
        border: none;
        padding: 8px;
        border-radius: 8px;
        cursor: pointer;
        transition: var(--ff-transition);
        color: var(--ff-text);
        opacity: 0.7;
      }

      .ff-screenshot-btn:hover, .ff-record-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        opacity: 1;
      }

      .ff-submit-btn {
        flex: 1;
        background: var(--ff-primary);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 20px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: var(--ff-transition);
      }

      .ff-submit-btn:hover:not(:disabled) {
        background: #3b7ae0;
        transform: translateY(-1px);
      }

      .ff-submit-btn:active:not(:disabled) {
        transform: translateY(0);
      }

      .ff-submit-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .ff-btn-loading {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .ff-btn-loading::after {
        content: "";
        width: 16px;
        height: 16px;
        border: 2px solid #fff;
        border-top-color: transparent;
        border-radius: 50%;
        animation: ff-spin 0.8s linear infinite;
      }

      @keyframes ff-spin {
        to { transform: rotate(360deg); }
      }

      .ff-screenshot-preview, .ff-recording-preview {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        margin-top: 8px;
      }

      .ff-screenshot-preview img, .ff-recording-preview video {
        width: 100%;
        border-radius: 12px;
        border: 2px solid var(--ff-border);
      }

      .ff-remove-screenshot, .ff-remove-recording {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--ff-transition);
      }

      .ff-remove-screenshot:hover, .ff-remove-recording:hover {
        background: rgba(0, 0, 0, 0.7);
      }

      @media (max-width: 480px) {
        .ff-panel {
          width: 100%;
          height: 100%;
          max-width: none;
          border-radius: 0;
          position: fixed;
          top: 0;
          left: 0;
        }

        .ff-type-btn {
          padding: 16px 18px;
        }

        .ff-input, .ff-textarea {
          padding: 10px 14px;
        }
      }
    `
    this.shadowRoot.appendChild(style)
  }

  attachEvents() {
    this.shadowRoot.addEventListener("click", e => {
      if (e.target.closest(".ff-close-btn")) {
        this.hide()
        if (this.onCloseCallback) this.onCloseCallback()
      }
      if (e.target.closest(".ff-type-btn")) {
        const typeButton = e.target.closest(".ff-type-btn");
        const type = typeButton.getAttribute("data-type")
        this.state.step = "form"
        this.state.selectedType = type
        this.render()
      }
      if (e.target.closest(".ff-screenshot-btn")) {
        this.handleScreenshot()
      }
      if (e.target.closest(".ff-record-btn")) {
        this.handleScreenRecord()
      }
      if (e.target.closest(".ff-remove-screenshot")) {
        this.state.screenshot = null
        this.formData.screenshot = null
        this.render()
      }
      if (e.target.closest(".ff-remove-recording")) {
        this.state.recording = null
        this.formData.recording = null
        this.render()
      }
      if (e.target.closest(".ff-back-btn")) {
        this.state.step = "select-type"
        this.state.selectedType = null
        this.render()
      }
    })
    this.shadowRoot.addEventListener("submit", e => {
      if (e.target.classList.contains("ff-feedback-form")) {
        e.preventDefault()
        this.handleSubmit()
      }
    })
    this.shadowRoot.addEventListener("input", e => {
      const { name, value } = e.target;
      if (name === "title" || name === "details") {
        this.formData[name] = value;

        // Manually update the submit button's disabled state
        // without a full re-render to preserve input focus.
        const submitBtn = this.shadowRoot.querySelector('.ff-submit-btn');
        if (submitBtn) {
          if (this.isFormValid()) {
            submitBtn.removeAttribute('disabled');
          } else {
            submitBtn.setAttribute('disabled', 'true');
          }
        }
      }
    })
  }

  async handleScreenshot() {
    // Temporarily hide the panel itself to allow full screen selection
    if (this.element) {
      this.element.style.display = 'none';
    }

    try {
      const dataUrl = await this.screenCapture.capture();
      this.state.screenshot = dataUrl;
      this.formData.screenshot = dataUrl;
      // Ensure panel is visible before re-rendering with screenshot
      if (this.element) {
        this.element.style.display = 'block'; 
      }
      this.render(); // Re-render to show the preview and update button states
    } catch (err) {
      const knownCancellationMessages = [
        "Screenshot selection cancelled by user.",
        "No region selected."
      ];
      // Ensure panel is visible again, even if there was an error or cancellation
      if (this.element) {
        this.element.style.display = 'block';
      }
      if (err && err.message && knownCancellationMessages.includes(err.message)) {
        console.log("Screenshot process ended:", err.message); // Log cancellation, don't alert
      } else {
        // For other errors, show an alert
        alert("Screenshot failed: " + (err && err.message ? err.message : "Unknown error"));
      }
    }
  }

  async handleScreenRecord() {
    this.logger.log('handleScreenRecord: Entered');
    if (!this.screenRecorder.isSupported()) {
      this.logger.warn('handleScreenRecord: Screen recording not supported by browser.');
      alert('Screen recording is not supported in your browser.');
      return;
    }
    this.logger.log('handleScreenRecord: Screen recording is supported.');

    this.logger.log('handleScreenRecord: Hiding panel.');
    this.hide(); // Hide panel before starting recording selection
    let stopUIRemover = null;

    try {
      this.logger.log('handleScreenRecord: Creating stop UI.');
      const stopButton = this.screenRecorder.createStopUI(() => {
        this.logger.log('handleScreenRecord: Recording stopped via custom UI button.');
        this.show(); // Show panel again when recording is stopped by user
      });
      stopUIRemover = () => {
        if (stopButton && stopButton.parentNode) {
          this.logger.log('handleScreenRecord: Removing stop UI button.');
          stopButton.parentNode.removeChild(stopButton);
        }
      };

      this.logger.log('handleScreenRecord: Calling screenRecorder.startRecording().');
      const videoBlob = await this.screenRecorder.startRecording();
      this.logger.log('handleScreenRecord: screenRecorder.startRecording() promise resolved.');
      
      if (videoBlob) {
        this.state.recording = URL.createObjectURL(videoBlob);
        this.formData.recording = videoBlob;
        this.logger.log('handleScreenRecord: Screen recording successful, blob received, preview created.');
        this.render(); // Re-render to show preview
      } else {
        this.logger.log('handleScreenRecord: No video blob received after recording.');
      }
    } catch (error) {
      this.logger.error('handleScreenRecord: Error during screen recording process:', error.message, error);
      // alert(`Screen recording error: ${error.message}`); // Optional: inform user
    } finally {
      this.logger.log('handleScreenRecord: Entering finally block.');
      if (stopUIRemover) {
        stopUIRemover();
      }
      // Ensure panel is shown if recording was cancelled/errored before it really started or if it stopped abruptly
      if (!this.screenRecorder.mediaRecorder || this.screenRecorder.mediaRecorder.state === "inactive") {
        this.logger.log('handleScreenRecord: Ensuring panel is shown in finally block.');
        this.show(); 
      }
      this.logger.log('handleScreenRecord: Exiting finally block.');
    }
  }

  isFormValid() {
    return this.formData.title.trim() && this.formData.details.trim() && !this.state.isSubmitting
  }

  async handleSubmit() {
    if (!this.isFormValid()) return
    this.state.isSubmitting = true
    this.render()

    try {
      // Convert data URLs to Blobs if needed
      let screenshot = this.formData.screenshot;
      let recording = this.formData.recording;

      if (screenshot && screenshot.startsWith('data:')) {
        const response = await fetch(screenshot);
        screenshot = await response.blob();
      }

      if (recording && recording.startsWith('data:')) {
        const response = await fetch(recording);
        recording = await response.blob();
      }

      const response = await submitFeedback({
        type: this.state.selectedType,
        title: this.formData.title,
        details: this.formData.details,
        screenshot,
        recording,
        projectId: this.config.projectId
      }, this.config.apiUrl)

      if (response.success) {
        this.hide()
        if (this.onCloseCallback) this.onCloseCallback()
        // Reset form data
        this.formData = {
          title: "",
          details: "",
          screenshot: null,
          recording: null
        }
        this.state = {
          step: "select-type",
          selectedType: null,
          screenshot: null,
          isSubmitting: false,
          recording: null
        }
      } else {
        throw new Error(response.error || "Failed to submit feedback")
      }
    } catch (error) {
      console.error("Feedback submission error:", error)
      alert(error.message || "Failed to submit feedback. Please try again.")
    } finally {
      this.state.isSubmitting = false
      this.render()
    }
  }

  show() {
    this.isVisible = true
    this.element.style.display = "block"
    this.positionPanel()
  }

  hide() {
    this.isVisible = false
    this.element.style.display = "none"
  }

  positionPanel() {
    // Find the floating button and position the panel smartly
    const btn = this.shadowRoot.querySelector(".ff-floating-button")
    if (!btn) return
    const btnRect = btn.getBoundingClientRect()
    const panel = this.element.querySelector(".ff-panel")
    if (!panel) return
    // Default: open above if not enough space below
    const spaceBelow = window.innerHeight - btnRect.bottom
    const spaceAbove = btnRect.top
    const panelHeight = 340 // estimate
    let top, left
    if (spaceBelow > panelHeight || spaceBelow > spaceAbove) {
      // Open below
      top = btnRect.bottom + 8
    } else {
      // Open above
      top = btnRect.top - panelHeight - 8
    }
    left = btnRect.left + btnRect.width / 2 - 180 // center panel horizontally
    if (left < 8) left = 8
    if (left + 360 > window.innerWidth) left = window.innerWidth - 368
    panel.style.top = `${top}px`
    panel.style.left = `${left}px`
    panel.style.position = "fixed"
    panel.style.zIndex = 1000001
  }
}

export default FeedbackPanel