
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const TOKEN_STORAGE_KEY = "unwind_chatbot_test_token";

// Development-only token management.
// This will be replaced by main Unwind authentication during integration.
export function setChatbotTestToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("A valid access token is required.");
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
}

export function getChatbotTestToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearChatbotTestToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function authenticatedRequest(endpoint, options = {}) {
  const token = getChatbotTestToken();

  if (!token) {
    throw new Error(
      "Chatbot test token is missing. Please generate and configure your development token."
    );
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Your test session has expired or is invalid. Generate a new access token."
      );
    }

    if (response.status === 403) {
      throw new Error(
        data.message || "Your test account is not authorized."
      );
    }

    throw new Error(
      data.error || data.message || "Unable to complete the request."
    );
  }

  return data;
}

export async function fetchChatSuggestions(query = "") {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set("q", query.trim());
  }

  const queryString = params.toString();

  const data = await authenticatedRequest(
    `/api/suggestions${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );

  return data.suggestions || [];
}

export async function sendChatMessage(message, conversationId = null) {
  const data = await authenticatedRequest("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      ...(conversationId ? { conversationId } : {}),
    }),
  });

  if (typeof data.reply !== "string") {
    throw new Error("The chatbot returned an invalid response.");
  }

  return data;
}
