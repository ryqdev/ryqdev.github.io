---
title: "大模型接口与协议：精简速查版"
date: 2026-10-06 00:00:00 +0800
description: "快速查阅常见大模型 API 的名称与 Path，了解 OpenAI 两种生成接口的设计差异和能力边界。"
tags: ["大模型", "API", "开发指南"]
section: "开发指南"
lang: zh-CN
translation_key: llm-api-protocols-quick-reference
permalink: /zh/posts/llm-api-protocols-quick-reference/
---

在 API 接入语境中，所说的“大模型协议”通常指 **API 接口格式**：它规定请求怎么组织、响应怎么返回、工具调用怎么表示。**Path 是 URL 中用于定位接口的路径部分。**

API 接入时，优先认识 OpenAI 的 `/v1/chat/completions`、`/v1/responses` 和 Anthropic 的 `/v1/messages` 三种接口及其格式。

## 常见接口：先看前三种

<div class="table-scroll" role="region" aria-label="常见接口速查表，可横向滚动" tabindex="0" markdown="1">

| 接口格式 | 典型 Path | 怎么理解 |
|---|---|---|
| [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create) | `/v1/chat/completions` | 消息列表式生成接口；许多 OpenAI-compatible 服务采用这种格式 |
| [OpenAI Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses) | `/v1/responses` | 更新的统一生成接口，支持内置工具和上下文衔接 |
| [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create) | `/v1/messages` | Claude 原生格式，使用顶层 `system` 和带类型的内容块 |
| [Gemini GenerateContent](https://ai.google.dev/api/generate-content) | `/v1beta/models/{model}:generateContent` | Gemini 原生格式，用 `contents` 和 `parts` 组织多模态内容 |
| [Cohere Chat](https://docs.cohere.com/v2/reference/chat) | `/v2/chat` | Cohere 原生对话格式 |
| [Ollama Chat](https://docs.ollama.com/api/chat) | `/api/chat` | Ollama 原生对话接口，本地服务和 [Ollama Cloud](https://docs.ollama.com/cloud) 均提供 |
| [OpenAI Completions](https://developers.openai.com/api/reference/resources/completions/methods/create) | `/v1/completions` | 传统提示词续写接口（Legacy），使用 `prompt`，而非对话消息列表 |

</div>

前三种格式都提供对话和工具调用机制，具体支持范围取决于模型与服务。它们值得优先了解，但不代表对话接口只有这三种。

OpenAI 的 `/v1/chat/completions` 是较早的接口设计，目前仍受支持；`/v1/responses` 是更新的设计，**官方推荐新项目优先使用**。两条路径都包含 `v1`，并不代表它们的设计和能力相同。

`/v1/responses` 支持文本生成、会话状态管理和内置工具，但并未涵盖 `/v1/chat/completions` 的全部功能。例如，它没有一次生成多个候选答案的 `n` 参数。[官方迁移说明](https://developers.openai.com/api/docs/guides/migrate-to-responses)

截至 2026-10-06，OpenAI 官方在聊天请求中加入音频输入、输出的示例使用 `/v1/chat/completions`，并要求模型支持相应音频能力。因此，选接口时仍要核对所需能力。[音频聊天指引](https://developers.openai.com/api/docs/guides/audio-chat-completions)
