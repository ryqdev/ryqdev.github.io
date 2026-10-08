---
title: "DeepSeek Harness: Why Tool Calls Are Rejected Before Execution"
date: 2026-10-07 00:00:00 +0800
description: "How strict defaults can make optional permission arguments mandatory, causing older DeepSeek Harness versions to reject tool calls, and how to fix the adapter configuration."
tags: ["LLMs", "API", "Agent", "Tool Calling", "deepseek harness"]
section: "Debugging"
lang: en
translation_key: deepseek-harness-strict-tool-calling
---

> **TL;DR**
>
> - **Problem:** Older DeepSeek Harness versions can reject a `bash` tool call during permission checks, before the terminal command runs.
> - **Cause:** pi-ai omits `strict` from `/v1/responses` requests, which may make optional permission arguments mandatory. If the model supplies the current permission mode, it triggers the older escalation check.
> - **Solution:** When the API accepts `strict` and the tool does not request strict mode, set pi-ai's `supportsStrictMode` to `true` so the request explicitly sends `strict: false`.

> **Version scope:** This article examines DeepSeek Harness `0.1.5-rc.1` and pi-ai `0.85.1`. [Newer Harness source](https://github.com/deepseek-ai/deepseek-harness/blob/5badb15009ae1756c3afe0ae0cef1faafc290ccc/packages/sandbox/sandbox/src/escalation.ts#L171) accepts requests for `workspace-write` when it is already the current mode; the pi-ai `0.87.1` [adapter](https://github.com/earendil-works/pi/blob/f07218c4d4bbc12bef056a7058c3dd49dfe41abe/packages/ai/src/api/openai-responses.ts#L74) and [converter](https://github.com/earendil-works/pi/blob/f07218c4d4bbc12bef056a7058c3dd49dfe41abe/packages/ai/src/api/openai-responses-shared.ts#L359-L396) can still omit `strict`.

## 1. Background

DeepSeek Harness uses the `bash` tool to run terminal commands. It passes the tool definition to pi-ai, which builds a `/v1/chat/completions` or `/v1/responses` request. Harness then validates the arguments returned by the model and executes the call.

Here is an excerpt of that version's [parameter definitions](https://github.com/deepseek-ai/deepseek-harness/blob/183f08e9c6dde7e36cd2318eaee70b0da08fb35e/packages/shell/tool-bash/src/index.ts#L244-L269), with type annotations, descriptions, and other parameters omitted:

```javascript
parameters: {
  command: { type: "string", required: true },
  description: { type: "string", required: true },
  // ...
  ...escalationModes.length > 0 ? {
    sandbox_permissions: {
      type: "string",
      enum: [...escalationModes]
    },
    justification: { type: "string" }
  } : {}
}
```

`command` and `description` are required. When sandbox escalation is available, `sandbox_permissions` (the target permission mode) and `justification` (the reason) are optional; omitting both retains current permissions.

The model API also accepts a tool-level `strict` setting to control whether generated arguments must conform to the parameter schema.

## 2. Problem

When the current mode is `workspace-write` and the model calls `bash` with `sandbox_permissions: "workspace-write"`, this version of Harness treats it as an escalation request. It requires a strictly wider target mode, so it rejects the call. The [permission checks](https://github.com/deepseek-ai/deepseek-harness/blob/183f08e9c6dde7e36cd2318eaee70b0da08fb35e/packages/sandbox/sandbox/src/escalation.ts#L157-L164) are shown below, excerpted with type annotations omitted and formatting adjusted:

```javascript
const WIDER_MODES = {
  "read-only": ["workspace-write", "danger-full-access"],
  "workspace-write": ["danger-full-access"]
};

async function approveEscalation(request, approval) {
  const { requestedMode: mode, effectiveMode, justification, subject } = request;
  if (!(WIDER_MODES[effectiveMode] ?? []).includes(mode))
    throw new Error(
      `sandbox escalation to "${mode}" is not strictly wider than this call's current "${effectiveMode}" mode`
    );
  // ...
}
```

`effectiveMode` is the current mode, and `mode` is the requested mode. Since `WIDER_MODES["workspace-write"]` contains only `danger-full-access`, requesting the same mode throws an error before the terminal command runs.

## 3. Cause

According to the [official OpenAI documentation](https://developers.openai.com/api/docs/guides/function-calling#strict-mode), the two APIs handle omitted `strict` differently. Other compatible services may implement different defaults.

<div class="table-scroll" role="region" aria-label="Default strict behavior across APIs; scroll horizontally" tabindex="0" markdown="1">

| OpenAI API | `/v1/chat/completions` | `/v1/responses` |
|---|---|---|
| Omit `strict` | Non-strict by default | Attempts strict normalization, falling back when incompatible |
| Explicit `strict: false` | Non-strict | Non-strict |

</div>

Strict mode requires all properties to appear in `required`. If the server normalizes this tool definition to strict mode, the optional permission arguments may become mandatory.

The pi-ai `0.85.1` adapter for `/v1/responses` defaults `supportsStrictMode` to `false`:

```javascript
supportsStrictMode: model.compat?.supportsStrictMode ?? false
```

The [adapter](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/ai/src/api/openai-responses.ts#L73) passes this setting to the [tool converter](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/ai/src/api/openai-responses-shared.ts#L359-L396), which separately computes the value of `strict` and decides whether to send it (excerpt):

```javascript
const defaultStrict = options?.strict === undefined ? false : options.strict;
// ...
const constrainedStrict = resolveJsonSchemaStrictSampling(tool, supportsStrictMode);
const strict = constrainedStrict ?? defaultStrict;
// ...
if (supportsStrictMode) {
  functionTool.strict = strict;
}
```

When the tool does not request strict mode, `strict` evaluates to `false`. But `supportsStrictMode` defaults to `false`, so the adapter omits the field and leaves the server's default in effect.

If this makes permission arguments mandatory, the model can no longer express “retain current permissions” by omitting them. Here, `sandbox_permissions` permits only `workspace-write` and `danger-full-access`, with no `null` value. Choosing the former triggers the permission error described above. Strict mode requires the field to appear, but does not determine which permission mode the model chooses.

## 4. Solution

For the versions and tool configuration described here, **the only setting to change is `compat.supportsStrictMode: true` on the model actually used**, provided the backend accepts `strict`:

```yaml
compat:
  supportsStrictMode: true
```

**No separate `strict: false` setting is needed**: the [tool definitions Harness passes to pi-ai](https://github.com/deepseek-ai/deepseek-harness/blob/183f08e9c6dde7e36cd2318eaee70b0da08fb35e/packages/llm/llm-pi-ai/src/context.ts#L121-L128) in this version do not request strict mode, and the converter already defaults to `false`. This switch lets the adapter include that value in the request.

If `compat` is configured at the provider level, check that a model-level setting does not override it. The [configuration merge](https://github.com/deepseek-ai/deepseek-harness/blob/183f08e9c6dde7e36cd2318eaee70b0da08fb35e/packages/llm/llm-pi-ai/src/catalog.ts#L767-L797) gives model-level fields precedence.

Verify that `tools[i].strict` is `false` for the relevant tool in the final `/v1/responses` request, then confirm an ordinary call without permission arguments can execute and return its result.

This change restores the ability to omit permission arguments. If the model still requests the current permission mode, the older Harness escalation check will still reject the call.
