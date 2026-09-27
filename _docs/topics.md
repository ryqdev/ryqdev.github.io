# Article filtering

Home pages provide tag buttons that filter the article list in place. Each button
shows a count, the selected button is marked with `aria-pressed`, and a live status
announces the result count. All posts resets the filter. There is no separate
"Topics ↗" navigation item.

Article badges link to `/?tag=Tools` or `/zh/?tag=工具`. Clicking a badge on the home
page filters immediately; modifier-clicks preserve normal link behavior. The URL
stores the filter, so reloads, sharing, and browser back/forward retain it. Unknown
tags display all articles. Filtering preserves the original publication order.

Tags belong to the current language. Add or translate a post's `tags` field and
the filters update on the next build. Legacy `/topics/` and `/zh/topics/` indexes
remain available for bookmarks and as a no-JavaScript fallback. Without JavaScript,
the home page shows all articles and a link to the static grouped index. Encoded
tags preserve Chinese, spaces, and distinctions between `C++` and `C#`.

Post cards use separate topic and article anchors; the article link covers the
card background without nesting anchors or intercepting tag clicks.
