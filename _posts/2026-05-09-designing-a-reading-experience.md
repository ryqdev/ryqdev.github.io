---
title: "Designing a reading experience that gets out of the way"
lang: en
translation_key: designing-a-reading-experience
date: 2026-05-09
description: "Notes on type, spacing, and the small decisions that make a long page feel welcoming — from the first headline to the final paragraph."
tags: ["Design", "Typography", "CSS"]
section: "Design"
sample: true
comments: false
---

*A sample article.*

A reading page begins with a simple promise: the words will be easy to follow.
Type, space, and contrast each have a part to play in keeping that promise.

## Give the text a comfortable measure

A restrained line length leaves room around the writing. One starting point for
an article container might look like this:

```css
.reading-column {
  max-width: 65ch;
  margin-inline: auto;
  padding-inline: 1.5rem;
  line-height: 1.75;
}
```

## Let the hierarchy do the work

Headings should introduce a new thought. Captions and dates can speak more
quietly. When everything competes for attention, the reader has to decide what
matters before they can start reading.

Try the page with a short note and a long essay. A layout should feel considered
in both cases.
