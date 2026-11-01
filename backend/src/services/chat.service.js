import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateProviderReply } from "./provider.service.js";
import { inspectUserMessage, guardGeneratedReply } from "./safety.service.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(currentDir, "../data/chatbot");

function readIntents(filename) {
  const filePath = path.join(dataDir, filename);

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed.intents) ? parsed.intents : [];
  } catch (error) {
    console.warn(`Could not load ${filename}: ${error.message}`);
    return [];
  }
}

const intents = [
  ...readIntents("intents.json"),
  ...readIntents("KB.json")
];

// Only expose suitable, general-purpose topics as autocomplete suggestions.
const SUGGESTION_ALLOWED_TAGS = new Set([
  // Main intents
  "greeting",
  "stress",
  "motivation",
  "self_care",
  "gratitude",

  // Knowledge-base intents
  "morning",
  "afternoon",
  "evening",
  "night",
  "goodbye",
  "thanks",
  "neutral-response",
  "about",
  "help",
  "casual",
  "meditation",
  "user-meditation",
  "learn-mental-health",
  "mental-health-fact",
  "fact-1",
  "fact-2",
  "fact-3",
  "fact-5",
  "fact-6",
  "fact-7",
  "fact-8",
  "fact-9",
  "fact-10",
  "fact-11",
  "fact-12",
  "fact-13",
  "fact-14",
  "fact-15",
  "fact-16",
  "fact-17",
  "fact-18",
  "fact-19",
  "fact-20",
  "fact-21",
  "fact-22",
  "fact-23",
  "fact-24",
  "fact-25",
  "fact-26",
  "fact-27",
  "fact-28",
  "fact-29",
  "fact-30",
  "fact-31",
  "fact-32"
]);

export function getChatSuggestions(query) {
  if (typeof query !== "string") return [];

  const normalizedQuery = normalize(query);

  // Avoid showing suggestions for empty or very short input.
  if (normalizedQuery.length < 2) return [];

  const suggestions = [];
  const seen = new Set();

  for (const intent of intents) {
    if (!SUGGESTION_ALLOWED_TAGS.has(intent.tag)) continue;
    if (!Array.isArray(intent.patterns)) continue;

    for (const pattern of intent.patterns) {
      if (typeof pattern !== "string") continue;

      const normalizedPattern = normalize(pattern);

      if (
        !normalizedPattern ||
        !normalizedPattern.includes(normalizedQuery)
      ) {
        continue;
      }

      if (seen.has(normalizedPattern)) continue;

      seen.add(normalizedPattern);
      suggestions.push(pattern);

      if (suggestions.length >= 5) {
        return suggestions;
      }
    }
  }

  return suggestions;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/i['’]m/g, "i am")
    .replace(/can['’]t/g, "cannot")
    .replace(/won['’]t/g, "will not")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPredefinedReply(message) {
  const normalizedMessage = normalize(message);

  for (const intent of intents) {
    if (!Array.isArray(intent.patterns) || !Array.isArray(intent.responses)) {
      continue;
    }

    for (const pattern of intent.patterns) {
      const normalizedPattern = normalize(pattern);
      if (!normalizedPattern) continue;

      // Exact matches are safest, especially for short greetings.
      // Longer saved patterns can also match when they form a full phrase.
      const matches =
        normalizedMessage === normalizedPattern ||
        (normalizedPattern.length >= 5 &&
          normalizedMessage.includes(normalizedPattern));

      if (matches && intent.responses.length > 0) {
        const reply =
          intent.responses[Math.floor(Math.random() * intent.responses.length)];

        return {
          reply,
          source: "predefined",
          intent: intent.tag || "predefined"
        };
      }
    }
  }

  return null;
}

const CREATOR_RESPONSE =
  "Unwind was envisioned by Harshita Arava, Co-Founder & CEO, and brought to life through the collaborative efforts of Atharva Padwal, Co-Founder & Co-CEO, and Parth Nikam, Co-Founder & CTO. Combining visionary leadership, strategic execution, and technological expertise, the founding team transformed a shared vision into an innovative wellness platform designed to redefine the way individuals approach mental well-being.";

function isCreatorQuestion(message) {
  const text = normalize(message);

  return (
    /\b(who (created|made|built|developed|founded) (this )?(website|site|unwind))\b/.test(text) ||
    /\b(who is behind (this )?(website|site|unwind))\b/.test(text) ||
    /\b(who (are|is) the (creator|creators|founder|founders) of (unwind|this website))\b/.test(text)
  );
}

async function getPythonResponse(message, history = []) {
  const baseUrl = (
    process.env.PYTHON_CHATBOT_URL || "http://127.0.0.1:8000"
  ).replace(/\/$/, "");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message, history }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Python chatbot returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("Python chatbot returned an invalid reply");
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleChatMessage({ message, history = [] }) {
  if (typeof message !== "string" || !message.trim()) {
    const error = new Error("Please enter a message.");
    error.status = 400;
    throw error;
  }

  const normalizedMessage = message.trim();

  if (normalizedMessage.length > 4000) {
    const error = new Error("Please keep your message under 4,000 characters.");
    error.status = 400;
    throw error;
  }

  // Safety checks always run before creator intent or saved responses.
  const safety = inspectUserMessage(normalizedMessage);

  if (safety.blocked) {
    return {
      reply: safety.reply,
      source: "safety",
      intent: safety.kind
    };
  }

  // Exact user-specified creator response; no API call.
  if (isCreatorQuestion(normalizedMessage)) {
    return {
      reply: CREATOR_RESPONSE,
      source: "predefined",
      intent: "about_unwind"
    };
  }

  if (process.env.ENABLE_PREDEFINED_RESPONSES !== "false") {
    const predefined = getPredefinedReply(normalizedMessage);

    if (predefined) {
      return predefined;
    }
  }

    // Route Unwind-specific questions to the Python chatbot.
  const asksAboutUnwind =
    /\b(unwind)\b/i.test(normalizedMessage) &&
    /\b(what|tell|describe|explain|about|platform|website|app|is|something)\b/i.test(
      normalizedMessage
    );

  if (asksAboutUnwind) {
    try {
      const pythonResult = await getPythonResponse(
        normalizedMessage,
        history
      );

      return {
        reply: guardGeneratedReply(pythonResult.reply),
        source: "python",
        provider: pythonResult.provider || "python",
        intent: "about_unwind"
      };
    } catch (error) {
      console.error("Python chatbot request failed:", error.message);

      // Continue to the existing JavaScript AI provider below.
    }
  }

  if (process.env.ENABLE_AI_RESPONSES === "false") {
    return {
      reply: "I don't have a saved response for that yet. You can ask me about stress, mindfulness, or emotional well-being.",
      source: "fallback",
      intent: "unknown"
    };
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (item) =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string"
        )
        .slice(-12)
        .map((item) => ({
          role: item.role,
          content: item.content.slice(0, 4000)
        }))
    : [];

  // The current user message is appended exactly once.
  safeHistory.push({ role: "user", content: normalizedMessage });

  try {
    const result = await generateProviderReply(safeHistory);

    return {
      reply: guardGeneratedReply(result.reply),
      source: "ai",
      provider: result.provider,
      model: result.model,
      intent: "unknown"
    };
  } catch (error) {
    console.error("All chatbot providers failed.", error.providerErrors || error.message);

    return {
      reply: "I'm having trouble responding right now. Please try again shortly. If you'd like, you can ask me about a saved wellness topic.",
      source: "fallback",
      intent: "provider_unavailable"
    };
  }
}