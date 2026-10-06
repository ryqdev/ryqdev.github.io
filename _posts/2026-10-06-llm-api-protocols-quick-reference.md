---
title: "LLM APIs and Protocols: A Quick Reference"
date: 2026-10-06 00:00:00 +0800
description: "A quick reference to common LLM APIs and their paths, including the design differences and capability limits of OpenAI's two generation APIs."
tags: ["LLMs", "API", "Guides"]
section: "Guides"
lang: en
translation_key: llm-api-protocols-quick-reference
---

In API integration discussions, an “LLM protocol” often means an **API format**: how requests are organized, responses are returned, and tool calls are represented. The **path** is the part of a URL used to locate an endpoint.

Start with OpenAI's `/v1/chat/completions` and `/v1/responses`, and Anthropic's `/v1/messages`, along with their API formats.

## Common APIs: start with the first three

<div class="table-scroll" role="region" aria-label="Common API formats; scroll horizontally" tabindex="0" markdown="1">

| API format | Typical path | How to understand it |
|---|---|---|
| [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create) | `/v1/chat/completions` | Generation from a message list; widely used by OpenAI-compatible services |
| [OpenAI Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses) | `/v1/responses` | A newer unified generation API with built-in tools and conversation continuity |
| [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create) | `/v1/messages` | Claude's native format, with a top-level `system` field and typed content blocks |
| [Gemini GenerateContent](https://ai.google.dev/api/generate-content) | `/v1beta/models/{model}:generateContent` | Gemini's native format, using `contents` and `parts` for multimodal content |
| [Cohere Chat](https://docs.cohere.com/v2/reference/chat) | `/v2/chat` | Cohere's native chat format |
| [Ollama Chat](https://docs.ollama.com/api/chat) | `/api/chat` | Ollama's native chat endpoint, available locally and through [Ollama Cloud](https://docs.ollama.com/cloud) |
| [OpenAI Completions](https://developers.openai.com/api/reference/resources/completions/methods/create) | `/v1/completions` | A legacy text completion API using `prompt` rather than a conversation message list |

</div>

The first three formats provide conversation and tool-calling mechanisms, subject to model and service support. They are useful starting points, but other chat APIs exist too.

OpenAI's `/v1/chat/completions` is the earlier API design and remains supported. `/v1/responses` is the newer design, and **OpenAI recommends it for new projects**. Both paths contain `v1`, but that does not imply identical designs or capabilities.

`/v1/responses` supports text generation, conversation state management, and built-in tools, but does not include every feature of `/v1/chat/completions`. For example, it omits the `n` parameter for generating multiple candidate answers in one request. [Migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses)

As reviewed on 2026-10-06, OpenAI's examples for adding audio input and output to chat requests use `/v1/chat/completions` with a model that supports the required audio capabilities. Check the capabilities your application needs before choosing an endpoint. [Audio-chat guide](https://developers.openai.com/api/docs/guides/audio-chat-completions)
