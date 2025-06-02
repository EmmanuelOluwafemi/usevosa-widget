// API utilities for feedback submission
import { uploader } from './upload';

const mapFeedbackType = (type) => {
  switch (type) {
    case "feature":
      return "feature-requests";
    case "bug":
      return "bug-reports";
    case "custom":
      return "custom-name";
    default:
      return "bug-reports";
  }
};

export async function submitFeedback(feedbackData, apiUrl) {
  const endpoint = `${apiUrl}/feedback`;

  try {
    // Upload files if they exist
    let screenshotUrl = null;
    let recordingUrl = null;

    if (feedbackData.screenshot instanceof Blob) {
      const screenshotResult = await uploader.uploadScreenshot(feedbackData.screenshot);
      if (!screenshotResult.success) {
        throw new Error('Failed to upload screenshot');
      }
      screenshotUrl = screenshotResult.fileUrl;
    }

    if (feedbackData.recording instanceof Blob) {
      const recordingResult = await uploader.uploadScreenRecording(feedbackData.recording);
      if (!recordingResult.success) {
        throw new Error('Failed to upload recording');
      }
      recordingUrl = recordingResult.fileUrl;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: mapFeedbackType(feedbackData.type),
        title: feedbackData.title,
        details: feedbackData.details,
        screenshot: screenshotUrl,
        recording: recordingUrl,
        projectId: feedbackData.projectId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to submit feedback");
    }

    return result;
  } catch (error) {
    console.error("Feedback submission error:", error);
    throw error;
  }
}

// Utility function to validate API key format
export function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }

  // Basic validation - you can make this more sophisticated
  return apiKey.length >= 10 && apiKey.match(/^[a-zA-Z0-9_-]+$/);
}

// Utility function to handle rate limiting
export class RateLimiter {
  constructor(maxRequests = 5, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  getResetTime() {
    if (this.requests.length === 0) return 0;

    const oldestRequest = Math.min(...this.requests);
    return oldestRequest + this.windowMs - Date.now();
  }
}

// Global rate limiter instance
export const feedbackRateLimiter = new RateLimiter(5, 60000); // 5 requests per minute
