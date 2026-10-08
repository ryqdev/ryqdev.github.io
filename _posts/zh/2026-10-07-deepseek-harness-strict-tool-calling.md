---
title: "DeepSeek Harness：工具调用为何在执行前被拒绝？"
date: 2026-10-07 00:00:00 +0800
description: "分析 strict 默认行为如何让可选权限参数变成必填，导致旧版 DeepSeek Harness 拒绝工具调用，以及如何通过适配器配置修复。"
tags: ["大模型", "API", "Agent", "工具调用", "deepseek harness"]
section: "问题排查"
lang: zh-CN
translation_key: deepseek-harness-strict-tool-calling
permalink: /zh/posts/deepseek-harness-strict-tool-calling/
---

> **TL;DR**
>
> - **问题：** 旧版 DeepSeek Harness 的 `bash` 工具调用可能在权限检查阶段被拒绝，终端命令尚未执行。
> - **原因：** pi-ai 在 `/v1/responses` 请求中省略 `strict`，可选的权限参数可能因此变成必填。模型若填写当前权限，就会触发旧版的提权检查错误。
> - **解决方案：** 在 API 支持 `strict`、工具未要求严格模式时，将 pi-ai 的 `supportsStrictMode` 设为 `true`，让请求显式发送 `strict: false`。

> **版本说明：** 本文分析 DeepSeek Harness `0.1.5-rc.1` 和 pi-ai `0.85.1`。[较新的 Harness 源码](https://github.com/deepseek-ai/deepseek-harness/blob/5badb15009ae1756c3afe0ae0cef1faafc290ccc/packages/sandbox/sandbox/src/escalation.ts#L171)已允许 `workspace-write` 下的同级权限请求；pi-ai `0.87.1` 的[适配器](https://github.com/earendil-works/pi/blob/f07218c4d4bbc12bef056a7058c3dd49dfe41abe/packages/ai/src/api/openai-responses.ts#L74)和[转换函数](https://github.com/earendil-works/pi/blob/f07218c4d4bbc12bef056a7058c3dd49dfe41abe/packages/ai/src/api/openai-responses-shared.ts#L359-L396)仍可能省略 `strict`。

## 1. 背景

DeepSeek Harness 通过 `bash` 工具执行终端命令。它将工具定义交给 pi-ai，由后者构建 `/v1/chat/completions` 或 `/v1/responses` 请求；模型返回调用参数后，再由 Harness 校验并执行。

下面摘录该版本的[参数定义](https://github.com/deepseek-ai/deepseek-harness/blob/183f08e9c6dde7e36cd2318eaee70b0da08fb35e/packages/shell/tool-bash/src/index.ts#L244-L269)，省略类型标注、说明文案及其他参数：

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

`command` 和 `description` 标记为必填。提供沙箱提权能力时，`sandbox_permissions`（目标权限）和 `justification`（申请理由）是可选参数，省略两者表示沿用当前权限。

模型 API 还接受工具级的 `strict` 配置，用于控制模型是否严格遵循参数结构。

## 2. 问题

在当前权限为 `workspace-write` 时，如果模型调用 `bash` 并传入 `sandbox_permissions: "workspace-write"`，该版本 Harness 会将其作为提权申请处理。它要求目标权限严格高于当前权限，因此会拒绝这次调用。[权限检查代码](https://github.com/deepseek-ai/deepseek-harness/blob/183f08e9c6dde7e36cd2318eaee70b0da08fb35e/packages/sandbox/sandbox/src/escalation.ts#L157-L164)如下（节选，省略类型标注并调整格式）：

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

`effectiveMode` 是当前权限，`mode` 是申请的权限。`WIDER_MODES["workspace-write"]` 只包含 `danger-full-access`，所以同级权限申请会在终端命令执行前抛出错误。

## 3. 原因

根据 [OpenAI 官方文档](https://developers.openai.com/api/docs/guides/function-calling#strict-mode)，两种接口对省略 `strict` 的处理不同。其他兼容服务需以各自实现为准。

<div class="table-scroll" role="region" aria-label="不同 API 的 strict 默认行为，可横向滚动" tabindex="0" markdown="1">

| OpenAI API | `/v1/chat/completions` | `/v1/responses` |
|---|---|---|
| 省略 `strict` | 默认非严格 | 尝试规范化为严格模式，不兼容时回退 |
| 显式 `strict: false` | 非严格 | 非严格 |

</div>

严格模式要求所有属性列入 `required`。若服务端将上述工具定义规范化为严格模式，原本可选的权限参数就可能变成必填。

pi-ai `0.85.1` 的 `/v1/responses` 适配器将 `supportsStrictMode` 默认设为 `false`：

```javascript
supportsStrictMode: model.compat?.supportsStrictMode ?? false
```

[适配器](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/ai/src/api/openai-responses.ts#L73)把这个值传给[工具转换函数](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/ai/src/api/openai-responses-shared.ts#L359-L396)，后者分别计算 `strict` 的值、决定是否发送该字段（节选）：

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

工具未要求严格模式时，`strict` 的值是 `false`；但 `supportsStrictMode` 默认为 `false`，适配器不会发送该字段，服务端仍按默认规则处理。

如果权限参数因此变成必填，模型就无法再通过省略参数表达“沿用当前权限”。这里的 `sandbox_permissions` 只允许 `workspace-write` 和 `danger-full-access`，不接受 `null`；模型若选择前者，就会触发上一节的同级权限检查错误。严格模式要求字段出现，但不决定模型选择哪一级权限。

## 4. 解决方案

对于本文所述版本和工具配置，若后端支持 `strict` 字段，**只需将实际使用模型的 `compat.supportsStrictMode` 设为 `true`**：

```yaml
compat:
  supportsStrictMode: true
```

**无需再单独配置 `strict: false`**：该版本 Harness [传给 pi-ai 的工具定义](https://github.com/deepseek-ai/deepseek-harness/blob/183f08e9c6dde7e36cd2318eaee70b0da08fb35e/packages/llm/llm-pi-ai/src/context.ts#L121-L128)未要求严格模式，转换函数已有的默认值就是 `false`；这个开关让适配器将该值写入请求。

如果将 `compat` 配在提供方层级，需确认没有被模型级配置覆盖。[配置合并逻辑](https://github.com/deepseek-ai/deepseek-harness/blob/183f08e9c6dde7e36cd2318eaee70b0da08fb35e/packages/llm/llm-pi-ai/src/catalog.ts#L767-L797)以模型级字段为优先。

验证时，检查最终 `/v1/responses` 请求中对应工具的 `tools[i].strict` 是否为 `false`，再确认省略权限参数的普通调用能完成执行和结果回传。

这项改动恢复的是权限参数的可选性。模型若仍传入同级权限，旧版 Harness 的提权检查依然会拒绝调用。
