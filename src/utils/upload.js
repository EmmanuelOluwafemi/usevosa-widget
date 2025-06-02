class FeedbackUploader {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async uploadFile(file, category = "screenshots") {
    try {
      // Step 1: Get presigned URL
      const presignedResponse = await fetch(
        `${this.apiBaseUrl}/api/upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name || `${category}-${Date.now()}.png`,
            fileType: file.type,
            category,
          }),
        }
      );

      if (!presignedResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, fileUrl, key } = await presignedResponse.json();

      // Step 2: Upload file directly to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      return {
        success: true,
        fileUrl,
        key,
        size: file.size,
        type: file.type,
      };
    } catch (error) {
      console.error("Upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async uploadScreenshot(input) {
    try {
      let file;
      
      if (input instanceof HTMLCanvasElement) {
        // Convert canvas to blob
        const blob = await new Promise((resolve) => {
          input.toBlob(resolve, "image/png", 0.8);
        });
        file = new File([blob], `screenshot-${Date.now()}.png`, {
          type: "image/png",
        });
      } else if (input instanceof Blob) {
        file = new File([input], `screenshot-${Date.now()}.png`, {
          type: "image/png",
        });
      } else {
        throw new Error("Invalid screenshot input");
      }

      return await this.uploadFile(file, "screenshots");
    } catch (error) {
      console.error("Screenshot upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async uploadScreenRecording(blob) {
    try {
      if (!(blob instanceof Blob)) {
        throw new Error("Invalid recording input");
      }

      const file = new File([blob], `recording-${Date.now()}.webm`, {
        type: "video/webm",
      });

      return await this.uploadFile(file, "recordings");
    } catch (error) {
      console.error("Recording upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const uploader = new FeedbackUploader(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
);