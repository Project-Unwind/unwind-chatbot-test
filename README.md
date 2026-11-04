# Unwind AI Companion

An AI-powered emotional wellness companion developed as part of **Project Unwind**, designed to provide supportive conversations, emotional check-ins, and accessible digital wellness experiences.

The Unwind AI Companion combines predefined conversational intelligence, multiple AI providers, custom model integration, and backend-enforced safety mechanisms to deliver a reliable and empathetic conversational experience.

---

## Overview

The Unwind AI Companion is designed to make emotional support more accessible through natural, supportive, and context-aware conversations.

It is a core component of Project Unwind, a digital wellness platform focused on improving emotional well-being through technology.

### Key Features

- **AI-Powered Conversations:** Interactive conversations designed around emotional well-being and supportive communication.
- **Predefined Intent Recognition:** Backend-powered intent detection for common messages and frequently asked questions.
- **Multi-Provider AI Integration:** Supports multiple AI providers with configurable fallback mechanisms.
- **Custom LLM Integration:** Architecture designed to support independently developed and specialized language models.
- **Conversation History:** Persistent conversation storage and restoration.
- **Conversation Management:** Create, rename, pin, archive, restore, and delete conversations.
- **Suggested Prompts:** Predefined message recommendations that users can select to automatically initiate conversations.
- **Authentication:** Protected API endpoints with JWT-based authentication.
- **Safety Mechanisms:** Backend-enforced safeguards for sensitive conversations and potentially harmful requests.
- **Streaming and Responsive Chat Experience:** Designed for an interactive and user-friendly conversational interface.

---

## System Architecture

The application follows a modular architecture that separates the frontend, backend, conversational intelligence, database, and model providers.

```text
                 USER
                  |
                  v
          UNWIND FRONTEND
                  |
                  v
        NODE.JS / EXPRESS API
                  |
          AUTHENTICATION
                  |
                  v
        CONVERSATION ENGINE
                  |
          SAFETY EVALUATION
                  |
                  v
          INTENT DETECTION
                  |
           +------+------+
           |             |
           v             v
     PREDEFINED       AI PROVIDER
      RESPONSES           |
                          v
                 PROVIDER FALLBACK
                          |
             +------------+------------+
             |            |            |
             v            v            v
           GROQ        GEMINI       CLOUDFLARE
             |
             v
        CUSTOM LLM
       (When enabled)
             |
             v
       RESPONSE VALIDATION
             |
             v
       CONVERSATION STORAGE
             |
             v
             USER