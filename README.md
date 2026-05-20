# ryqdev.github.io

Personal blog built with [Jekyll](https://jekyllrb.com), deployed to GitHub
Pages. The theme is ported from the Next.js `public-blogs` project: a warm
cream palette with full dark-mode support, grouped sidebar navigation,
prose typography, syntax-highlighted code blocks with a copy button, and
a mobile-friendly menu.

## Local development

```bash
bundle install
bundle exec jekyll serve --livereload
```

The site is then available at <http://localhost:4000>.

## Writing posts

Drop a Markdown file in `_posts/` named `YYYY-MM-DD-title.md`. Front matter
fields:

```yaml
---
title: "My Post Title"
date: 2026-05-20
description: "Short summary that appears on the home page."
tags: ["Jekyll", "Web"]
section: "Guides"  # determines the sidebar group
---
```

Posts are reachable at `/posts/<slug>/` (where `<slug>` is the
filename's title portion).

## Pages

Top-level pages (like `about.md`) sit at the repo root and use
`layout: page` plus an explicit `permalink:`.

## Project structure

```
ryqdev.github.io/
├── _config.yml          # site config (title, permalinks, plugins)
├── _layouts/            # default / post / page templates
├── _includes/           # top nav, sidebar, mobile menu, theme toggle, post-card, callout
├── _posts/              # blog posts in Markdown
├── assets/
│   ├── css/main.scss    # all styles (cream theme, dark mode, prose, syntax highlighting)
│   └── js/site.js       # theme toggle, mobile menu, copy-code button
├── about.md             # /about page
└── index.html           # post listing
```

## Theme features

- **Cream-on-charcoal palette** with a one-click theme toggle (persisted in `localStorage`, respects `prefers-color-scheme` on first visit).
- **Sidebar grouped by `section`** — set the `section:` front-matter on each post to assign it to a sidebar heading.
- **Mobile menu** that slides out under 1024px width.
- **Rouge syntax highlighting** with a custom Latte / Mocha-inspired palette.
- **Copy-to-clipboard buttons** on every code block, injected at runtime.
- **Callouts** (`note` / `tip` / `warning`) via `{% include callout.html %}`.

## Deploying

Pushing to `main` triggers GitHub Pages' built-in Jekyll build. No extra
workflow needed.
