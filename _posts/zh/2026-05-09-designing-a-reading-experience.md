---
title: "让设计退后一步，把空间留给阅读"
lang: zh-CN
translation_key: designing-a-reading-experience
permalink: /zh/posts/designing-a-reading-experience/
date: 2026-05-09
description: "从第一个标题到最后一段文字，聊聊字体、间距，以及那些让长页面读起来更舒服的小决定。"
tags: ["设计", "排版", "CSS"]
section: "设计"
sample: true
comments: false
---

*这是一篇用于预览的样例文章。*

一个阅读页面，首先要兑现一个简单的承诺：让文字容易读下去。
字体、留白和对比度，都在帮助它实现这个承诺。

## 给文字一个舒服的行宽

适度控制行宽，能为文字周围留出呼吸的空间。文章容器可以从这样的设置开始：

```css
.reading-column {
  max-width: 65ch;
  margin-inline: auto;
  padding-inline: 1.5rem;
  line-height: 1.75;
}
```

## 让层次自己说话

标题负责引出一个新的想法，说明文字和日期则可以轻一些。
如果所有元素都在争夺注意力，读者就得先判断什么重要，才能开始阅读。

分别用一篇短笔记和一篇长文章试试这个页面。两种情况下，排版都应该让人感觉舒服。
