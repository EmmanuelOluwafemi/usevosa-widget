class ScreenRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream = null;
    this._promiseResolve = null;
    this._promiseReject = null;

    this._handleDataAvailable = this._handleDataAvailable.bind(this);
    this._handleStop = this._handleStop.bind(this);
    this._handleError = this._handleError.bind(this);
  }

  isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && window.MediaRecorder);
  }

  async startRecording() {
    if (!this.isSupported()) {
      console.error("ScreenRecorder.startRecording: Screen recording is not supported in this browser.");
      return Promise.reject(new Error("Screen recording not supported."));
    }

    this.recordedChunks = []; // Reset for new recording

    return new Promise(async (resolve, reject) => {
      this._promiseResolve = resolve;
      this._promiseReject = reject;

      try {
        this.stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "window",
            cursor: "always"
          },
          audio: true,
        });

        if (!this.stream) {
          console.error("ScreenRecorder.startRecording: getDisplayMedia returned a null stream.");
          this._promiseReject(new Error("Failed to get display media stream."));
          this._cleanup();
          return;
        }

        // Listen for when the user stops sharing via the browser's native UI
        this.stream.getVideoTracks()[0].onended = () => {
          this.stopRecording(false); // Don't try to stop an already stopped track
        };

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' });
        this.mediaRecorder.ondataavailable = this._handleDataAvailable;
        this.mediaRecorder.onstop = this._handleStop;
        this.mediaRecorder.onerror = this._handleError;
        this.mediaRecorder.start();

      } catch (err) {
        console.error("ScreenRecorder.startRecording: Error during setup or start:", err.name, err.message, err);
        if (this._promiseReject) {
            this._promiseReject(err);
        }
        this._cleanup();
      }
    });
  }

  _handleDataAvailable(event) {
    if (event.data.size > 0) {
      this.recordedChunks.push(event.data);
    }
  }

  stopRecording(stopTracks = true) {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    } else {
    }
    if (this.stream && stopTracks) {
      this.stream.getTracks().forEach(track => track.stop());
    } else if (!this.stream) {
        console.log("ScreenRecorder.stopRecording: No stream to stop tracks on.");
    }
    this.stream = null;
  }

  _handleStop() {
    const blob = new Blob(this.recordedChunks, {
      type: "video/webm"
    });
    this.recordedChunks = [];

    if (this._promiseResolve) {
      this._promiseResolve(blob);
    } else {
      console.warn("ScreenRecorder._handleStop: No promiseResolve function found.");
    }
    this._cleanup(); // Cleanup after resolving
  }

  _handleError(event) {
    console.error("ScreenRecorder._handleError: MediaRecorder onerror event:", event.error ? event.error : 'Unknown MediaRecorder Error', event);
    if (this._promiseReject) {
      this._promiseReject(event.error || new Error('Unknown MediaRecorder Error'));
    } else {
        console.warn("ScreenRecorder._handleError: No promiseReject function found.");
    }
    this._cleanup(); // Cleanup on error
  }

  _cleanup() {
    this.mediaRecorder = null;
    this.stream = null;
    this.recordedChunks = [];
    this._promiseResolve = null;
    this._promiseReject = null;
  }

  // Utility to create a UI to stop recording
  // This is a placeholder and should be integrated into your main UI
  createStopUI(onStopCallback) {
    const stopButton = document.createElement('button');
    stopButton.textContent = 'Stop Recording';
    Object.assign(stopButton.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        zIndex: '2147483649', // High z-index
        background: 'red',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
    });
    stopButton.onclick = () => {
        if (onStopCallback) onStopCallback();
        this.stopRecording();
        document.body.removeChild(stopButton);
    };
    document.body.appendChild(stopButton);
    return stopButton; // Return for potential external management
  }
}

export default ScreenRecorder;
