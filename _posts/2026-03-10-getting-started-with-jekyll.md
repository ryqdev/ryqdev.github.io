---
title: "Getting Started with Jekyll"
date: 2026-03-10
description: "A beginner's guide to building a personal blog with Jekyll and GitHub Pages."
tags: ["Jekyll", "GitHub Pages"]
section: "Guides"
slug: getting-started-with-jekyll
---

## What is Jekyll?

Jekyll is a static site generator written in Ruby. It takes Markdown files,
HTML templates, and a sprinkle of configuration, and turns them into a
fully static website you can host anywhere — including GitHub Pages, for free.

## Why a static site?

Static sites are:

- **Fast** — every page is a pre-rendered HTML file
- **Simple to host** — no database, no runtime, no servers to babysit
- **Easy to version** — content lives next to the code in git
- **Portable** — the output is just files

## Quick Start

Install Jekyll and create a new site:

```bash
gem install bundler jekyll
bundle exec jekyll new my-blog
cd my-blog
bundle exec jekyll serve
```

Open [http://localhost:4000](http://localhost:4000) to see it running.

## Project Structure

A typical Jekyll project looks like this:

```
my-blog/
├── _config.yml      # site configuration
├── _layouts/        # HTML templates
├── _includes/       # reusable partials
├── _posts/          # blog posts in Markdown
├── _sass/           # Sass partials
├── assets/          # CSS, JS, images
└── index.html       # home page
```

> The `_posts` folder is where the magic happens. Drop a Markdown file named
> `YYYY-MM-DD-title.md` in there, add a bit of front matter, and Jekyll will
> turn it into a blog post.

## Adding Images

Drop image files into `assets/images/posts/` and reference them from any
post with standard Markdown:

```markdown
![Alt text]({% raw %}{{ "/assets/images/posts/your-file.png" | relative_url }}{% endraw %})
```

The result renders inline with rounded corners and a max-width that fits
the column:

![Placeholder showing where blog post images live]({{ "/assets/images/posts/placeholder.svg" | relative_url }})

## What's Next?

Once you have the basics down, explore features like collections, custom
plugins, and deploy your site to GitHub Pages with a single `git push`.
