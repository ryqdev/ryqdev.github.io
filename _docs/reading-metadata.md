# Reading metadata

Every article shows an estimated reading time computed at build time, with a
minimum of one minute. English uses 220 words/minute; Chinese uses 350 characters
or non-CJK words/minute. Jekyll's `number_of_words: auto` handles text without
spaces. Estimates include code and are intentionally approximate.

Optional post front matter:

```yaml
last_modified_at: 2026-09-27
tested_with: ["Jekyll 4.4.1", "Ruby 3.3.12"]
reading_minutes: 8 # optional editorial override for code-heavy articles
```

The update date appears only when it is later than publication. Keep `date` as
the original publication date, so updating an article does not reorder the home
page. `last_modified_at` is also recognized by jekyll-seo-tag and jekyll-feed.
Only set tested versions after verifying them; no badge is generated when absent.
Maintain these fields independently in each translation so a translation never
claims an update that has not been made. The Jekyll guide records the local build
environment verified on 2026-09-27.
