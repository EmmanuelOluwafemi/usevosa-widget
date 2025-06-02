import html2canvas from "html2canvas";

class ScreenCapture {
  constructor() {
    this.isSupported = this.checkSupport();
    this.overlay = null;
    this.selectionCanvas = null;
    this.selectionCtx = null;
    this.isDrawing = false; // For selection drawing
    this.startX = 0;
    this.startY = 0;
    this.selectionRect = {};

    this.annotationCanvas = null;
    this.annotationCtx = null;
    this.annotationToolbar = null;
    this.isAnnotating = false;
    this.currentSelectionForAnnotation = null;

    // Annotation tool state
    this.currentTool = null; // e.g., 'pen'
    this.isDrawingOnAnnotationCanvas = false;
    this.penColor = 'red';
    this.penLineWidth = 3;
    this.lastAnnotationX = 0;
    this.lastAnnotationY = 0;

    this._promiseResolve = null;
    this._promiseReject = null;

    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleAnnotationConfirm = this._handleAnnotationConfirm.bind(this);
    this._handleAnnotationCancel = this._handleAnnotationCancel.bind(this);

    // Pen tool drawing handlers
    this._handleAnnotationCanvasMouseDown = this._handleAnnotationCanvasMouseDown.bind(this);
    this._handleAnnotationCanvasMouseMove = this._handleAnnotationCanvasMouseMove.bind(this);
    this._handleAnnotationCanvasMouseUp = this._handleAnnotationCanvasMouseUp.bind(this);
    this._handleAnnotationCanvasMouseLeave = this._handleAnnotationCanvasMouseLeave.bind(this);
    this._activatePenTool = this._activatePenTool.bind(this);
  }

  checkSupport() {
    return typeof html2canvas !== "undefined";
  }

  capture() {
    if (!this.isSupported) {
      return Promise.reject(new Error("Screenshot capture is not supported in this browser"));
    }
    if (this.isAnnotating) this._cleanupAnnotationUI();
    this.isAnnotating = false;
    this.currentTool = null; // Reset tool on new capture

    return new Promise((resolve, reject) => {
      this._promiseResolve = resolve;
      this._promiseReject = reject;

      this.overlay = document.createElement('div');
      Object.assign(this.overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.3)', cursor: 'crosshair', zIndex: '2147483645'
      });
      document.body.appendChild(this.overlay);

      this.selectionCanvas = document.createElement('canvas');
      this.selectionCanvas.width = window.innerWidth;
      this.selectionCanvas.height = window.innerHeight;
      Object.assign(this.selectionCanvas.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '2147483646', pointerEvents: 'none'
      });
      this.selectionCtx = this.selectionCanvas.getContext('2d');
      document.body.appendChild(this.selectionCanvas);

      this.overlay.addEventListener('mousedown', this._handleMouseDown);
      document.addEventListener('keydown', this._handleKeyDown); // Global key listener
    });
  }

  _handleMouseDown(e) {
    e.preventDefault();
    this.isDrawing = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.selectionRect = { x: 0, y: 0, width: 0, height: 0 };
    document.addEventListener('mousemove', this._handleMouseMove);
    document.addEventListener('mouseup', this._handleMouseUp);
  }

  _handleMouseMove(e) {
    if (!this.isDrawing) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    this.selectionRect.x = Math.min(this.startX, currentX);
    this.selectionRect.y = Math.min(this.startY, currentY);
    this.selectionRect.width = Math.abs(this.startX - currentX);
    this.selectionRect.height = Math.abs(this.startY - currentY);
    this.selectionCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
    this.selectionCtx.strokeStyle = 'rgba(220, 53, 69, 0.9)';
    this.selectionCtx.lineWidth = 2;
    this.selectionCtx.strokeRect(this.selectionRect.x, this.selectionRect.y, this.selectionRect.width, this.selectionRect.height);
    this.selectionCtx.fillStyle = 'rgba(220, 53, 69, 0.1)';
    this.selectionCtx.fillRect(this.selectionRect.x, this.selectionRect.y, this.selectionRect.width, this.selectionRect.height);
  }

  _handleMouseUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    const currentSelection = { ...this.selectionRect };
    this._cleanupSelectionUI();
    if (!currentSelection.width || !currentSelection.height) {
      if (this._promiseReject) this._promiseReject(new Error("No region selected."));
      return;
    }
    this._enterAnnotationMode(currentSelection);
  }

  _enterAnnotationMode(selectionRect) {
    this.isAnnotating = true;
    this.currentSelectionForAnnotation = selectionRect;
    this.hideWidget();

    this.annotationCanvas = document.createElement('canvas');
    this.annotationCanvas.width = selectionRect.width;
    this.annotationCanvas.height = selectionRect.height;
    Object.assign(this.annotationCanvas.style, {
      position: 'fixed',
      left: `${selectionRect.x}px`,
      top: `${selectionRect.y}px`,
      zIndex: '2147483647',
      border: '2px dashed red', // Make annotation area visible
      cursor: 'default' // Default cursor, changes if tool is active
    });
    this.annotationCtx = this.annotationCanvas.getContext('2d');
    document.body.appendChild(this.annotationCanvas);

    this.annotationToolbar = document.createElement('div');
    Object.assign(this.annotationToolbar.style, {
      position: 'fixed',
      left: `${selectionRect.x}px`,
      top: `${selectionRect.y + selectionRect.height + 10}px`,
      zIndex: '2147483648',
      background: 'rgba(240, 240, 240, 0.95)',
      padding: '8px',
      borderRadius: '5px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center', // Align items vertically
      gap: '8px'
    });

    const penBtn = document.createElement('button');
    penBtn.textContent = 'Pen';
    penBtn.onclick = this._activatePenTool;

    // Color Picker
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = this.penColor; // Set initial color
    colorPicker.title = 'Pen Color';
    Object.assign(colorPicker.style, { width: '30px', height: '30px', padding: '0', border: 'none', cursor: 'pointer'});
    colorPicker.addEventListener('input', (e) => {
      this.penColor = e.target.value;
    });

    // Line Width Input
    const lineWidthLabel = document.createElement('label');
    lineWidthLabel.textContent = 'Size:';
    lineWidthLabel.title = 'Pen Size';
    Object.assign(lineWidthLabel.style, { marginRight: '4px', fontSize: '12px' });

    const lineWidthInput = document.createElement('input');
    lineWidthInput.type = 'number';
    lineWidthInput.min = '1';
    lineWidthInput.max = '50';
    lineWidthInput.value = this.penLineWidth; // Set initial line width
    lineWidthInput.title = 'Pen Size';
    Object.assign(lineWidthInput.style, { width: '40px', height: '24px', textAlign: 'center' });
    lineWidthInput.addEventListener('change', (e) => {
      const newWidth = parseInt(e.target.value, 10);
      if (!isNaN(newWidth) && newWidth > 0) {
        this.penLineWidth = newWidth;
      }
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.onclick = this._handleAnnotationConfirm;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = this._handleAnnotationCancel;

    this.annotationToolbar.appendChild(penBtn);
    this.annotationToolbar.appendChild(colorPicker);
    this.annotationToolbar.appendChild(lineWidthLabel);
    this.annotationToolbar.appendChild(lineWidthInput);
    // Add a small spacer or adjust gap if needed for confirm/cancel buttons
    const spacer = document.createElement('div');
    spacer.style.width = '10px'; // Adjust as needed
    this.annotationToolbar.appendChild(spacer);

    this.annotationToolbar.appendChild(confirmBtn);
    this.annotationToolbar.appendChild(cancelBtn);
    document.body.appendChild(this.annotationToolbar);
  }

  _activatePenTool() {
    this.currentTool = 'pen';
    this.annotationCanvas.style.cursor = 'crosshair';
    // Remove other tool listeners if any, then add pen listeners
    this.annotationCanvas.removeEventListener('mousedown', this._handleAnnotationCanvasMouseDown);
    this.annotationCanvas.addEventListener('mousedown', this._handleAnnotationCanvasMouseDown);
  }

  _handleAnnotationCanvasMouseDown(e) {
    if (this.currentTool !== 'pen') return;
    this.isDrawingOnAnnotationCanvas = true;
    const rect = this.annotationCanvas.getBoundingClientRect();
    this.lastAnnotationX = e.clientX - rect.left;
    this.lastAnnotationY = e.clientY - rect.top;

    this.annotationCtx.beginPath();
    this.annotationCtx.moveTo(this.lastAnnotationX, this.lastAnnotationY);
    this.annotationCtx.strokeStyle = this.penColor;
    this.annotationCtx.lineWidth = this.penLineWidth;
    this.annotationCtx.lineCap = 'round';
    this.annotationCtx.lineJoin = 'round';

    this.annotationCanvas.addEventListener('mousemove', this._handleAnnotationCanvasMouseMove);
    this.annotationCanvas.addEventListener('mouseup', this._handleAnnotationCanvasMouseUp);
    this.annotationCanvas.addEventListener('mouseleave', this._handleAnnotationCanvasMouseLeave);
  }

  _handleAnnotationCanvasMouseMove(e) {
    if (!this.isDrawingOnAnnotationCanvas || this.currentTool !== 'pen') return;
    const rect = this.annotationCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    this.annotationCtx.lineTo(currentX, currentY);
    this.annotationCtx.stroke();
    this.lastAnnotationX = currentX;
    this.lastAnnotationY = currentY;
  }

  _handleAnnotationCanvasMouseUp() {
    if (this.currentTool !== 'pen') return;
    this.isDrawingOnAnnotationCanvas = false;
    this.annotationCanvas.removeEventListener('mousemove', this._handleAnnotationCanvasMouseMove);
    this.annotationCanvas.removeEventListener('mouseup', this._handleAnnotationCanvasMouseUp);
    this.annotationCanvas.removeEventListener('mouseleave', this._handleAnnotationCanvasMouseLeave);
  }

  _handleAnnotationCanvasMouseLeave() {
    // Same as mouseup to stop drawing if mouse leaves canvas while button is pressed
    if (this.isDrawingOnAnnotationCanvas && this.currentTool === 'pen') {
      this._handleAnnotationCanvasMouseUp();
    }
  }

  async _handleAnnotationConfirm() {
    const selectionRect = this.currentSelectionForAnnotation;
    if (!selectionRect) {
      if (this._promiseReject) this._promiseReject(new Error("Internal error: selection for annotation not found."));
      this._cleanupAnnotationUI();
      this.showWidget();
      return;
    }
    try {
      if (this.annotationCanvas) this.annotationCanvas.style.display = 'none';
      if (this.annotationToolbar) this.annotationToolbar.style.display = 'none';

      const html2canvasOptions = {
        allowTaint: true, useCORS: true, scale: 0.5, logging: false,
        scrollX: window.scrollX, scrollY: window.scrollY,
        width: window.innerWidth, height: window.innerHeight,
        ignoreElements: (element) => {
          const widgetContainerId = "feedbackflow-widget-container";
          return (
            element.id === widgetContainerId ||
            element.closest(`#${widgetContainerId}`) ||
            element === this.annotationCanvas ||
            element === this.annotationToolbar
          );
        },
        x: window.scrollX, y: window.scrollY,
      };

      const fullCanvas = await html2canvas(document.body, html2canvasOptions);
      const cropCanvas = document.createElement('canvas');
      const scaleFactor = html2canvasOptions.scale;
      cropCanvas.width = selectionRect.width;
      cropCanvas.height = selectionRect.height;
      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.drawImage(
        fullCanvas,
        selectionRect.x * scaleFactor, selectionRect.y * scaleFactor,
        selectionRect.width * scaleFactor, selectionRect.height * scaleFactor,
        0, 0, selectionRect.width, selectionRect.height
      );

      // Draw annotations on top
      if (this.annotationCanvas) {
        cropCtx.drawImage(this.annotationCanvas, 0, 0, selectionRect.width, selectionRect.height);
      }

      const dataUrl = cropCanvas.toDataURL("image/jpeg", 0.8);
      this._cleanupAnnotationUI();
      this.showWidget();
      if (this._promiseResolve) this._promiseResolve(dataUrl);

    } catch (error) {
      this._cleanupAnnotationUI();
      this.showWidget();
      if (this._promiseReject) this._promiseReject(new Error(`Screenshot processing failed: ${error.message}`));
    }
  }

  _handleAnnotationCancel() {
    this._cleanupAnnotationUI();
    this.showWidget();
    if (this._promiseReject) this._promiseReject(new Error('Screenshot annotation cancelled by user.'));
  }

  _cleanupSelectionUI() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.selectionCanvas && this.selectionCanvas.parentNode) {
      this.selectionCanvas.parentNode.removeChild(this.selectionCanvas);
    }
    this.overlay = null;
    this.selectionCanvas = null;
    this.selectionCtx = null;
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
  }

  _cleanupAnnotationUI() {
    if (this.annotationCanvas) {
      this.annotationCanvas.removeEventListener('mousedown', this._handleAnnotationCanvasMouseDown);
      this.annotationCanvas.removeEventListener('mousemove', this._handleAnnotationCanvasMouseMove);
      this.annotationCanvas.removeEventListener('mouseup', this._handleAnnotationCanvasMouseUp);
      this.annotationCanvas.removeEventListener('mouseleave', this._handleAnnotationCanvasMouseLeave);
      this.annotationCanvas.style.cursor = 'default'; // Reset cursor before removing
      if (this.annotationCanvas.parentNode) {
        this.annotationCanvas.parentNode.removeChild(this.annotationCanvas);
      }
    }
    if (this.annotationToolbar && this.annotationToolbar.parentNode) {
      this.annotationToolbar.parentNode.removeChild(this.annotationToolbar);
    }
    this.annotationCanvas = null; // Restore this line for proper cleanup
    this.annotationCtx = null;
    this.annotationToolbar = null;
    this.isAnnotating = false;
    this.currentTool = null;
    this.isDrawingOnAnnotationCanvas = false;
    this.currentSelectionForAnnotation = null;
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (this.isAnnotating) {
        this._handleAnnotationCancel();
      } else if (this.isDrawing || this.overlay) {
        this._cleanupSelectionUI();
        document.removeEventListener('mousemove', this._handleMouseMove); // Ensure removal
        document.removeEventListener('mouseup', this._handleMouseUp);   // Ensure removal
        if (this._promiseReject) this._promiseReject(new Error('Screenshot selection cancelled by user.'));
      }
      // Remove the global keydown listener once it's handled an escape or capture completes
      document.removeEventListener('keydown', this._handleKeyDown);
    }
  }

  hideWidget() {
    const container = document.getElementById("feedbackflow-widget-container");
    if (container) container.style.display = "none";
  }

  showWidget() {
    const container = document.getElementById("feedbackflow-widget-container");
    if (container) container.style.display = "";
  }
}

export default ScreenCapture;
