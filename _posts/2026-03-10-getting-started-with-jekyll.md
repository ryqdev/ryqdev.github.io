---
title: "Getting Started with Jekyll"
lang: en
translation_key: getting-started-with-jekyll
date: 2026-03-10
last_modified_at: 2026-09-27
tested_with: ["Jekyll 4.4.1", "Ruby 3.3.12"]
description: "A beginner's guide to building a personal blog with Jekyll and GitHub Pages."
tags: ["Jekyll", "GitHub Pages"]
section: "Guides"
slug: getting-started-with-jekyll
---
![placeholder.png]({{ '/assets/images/posts/placeholder.png' | relative_url }})
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
jekyll new my-blog
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

### Side-floated images

If you want text to wrap around an image, add `{:.float-right}` (or
`{:.float-left}`) after the Markdown image to attach a CSS class:

```markdown
![Alt text](/assets/images/posts/your-file.png){:.float-right}
```

![Side image example]({{ "/assets/images/posts/side-placeholder.svg" | relative_url }}){:.float-right}

Notice how this paragraph is wrapping around the image to the right.
Float-aligned images are great for portraits, diagrams, and screenshots
that are narrower than the column — they let you keep more text visible
on screen at once. The image caps at 50% of the column width on desktop
and falls back to full-width on narrow phones so the layout never breaks.
Headings and horizontal rules automatically clear the float so the next
section always starts on a fresh line. Try `{:.float-left}` to flip it
the other way.

## What's Next?

Once you have the basics down, explore features like collections, custom
plugins, and deploy your site to GitHub Pages with a single `git push`.
