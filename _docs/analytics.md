# GA4 analytics

The blog uses one GA4 web stream and the Google tag (`gtag.js`). Analytics is
configured with measurement ID `G-6DEFVY1FJ8` and enabled for production builds
on `https://ryqdev.github.io`. No analytics backend is needed in this repository.
The live data-stream settings below still need to be checked in GA4 before
publishing; local configuration does not change those settings.

## Activate the website

1. In [Google Analytics](https://analytics.google.com/), create a property and a
   **Web** data stream for the final site URL. Use the Shanghai reporting time
   zone if reports should follow the author's local day. Copy the `G-…`
   measurement ID (not the numeric property ID or a `GTM-…` container ID).
2. In **Admin → Data streams → your web stream → Enhanced measurement**, set:
   - **Page views:** on; open its advanced settings and turn **Page changes
     based on browser history events** off. Tag filtering uses `pushState` but
     is not a new page view.
   - **Scrolls:** off. This project measures progress through the article body,
     instead of Google's default 90% of the whole document.
   - **Site search:** off. The search dialog sends `search_results` itself and
     does not upload search text.
   - **Outbound clicks** and **File downloads:** on if desired.
   - **Form interactions** and **Video engagement:** off for the current blog.
3. Set `_config.yml`:

   ```yaml
   url: "https://ryqdev.github.io"
   analytics:
     enabled: true
     measurement_id: "G-YOURREALID"
   ```

   Replace the example ID with the real ID. `url` must match the final HTTPS
   origin, including the hostname. If moving to a custom domain, update both
   this value and the web stream URL.
4. Build with `JEKYLL_ENV=production bundle exec jekyll build` and deploy the
   output through the site's publishing setup. A normal development build
   does not include the tracker. Production output opened on localhost or a
   different preview origin also does not load Google or queue analytics.

The `.github/workflows/pages.yml` workflow publishes pushes to `main` using
Ruby 3.4, `Gemfile.lock`, and `JEKYLL_ENV=production`. GitHub Pages must use
**GitHub Actions** as its publishing source. The integration needs no new
Jekyll plugin.

The Google script is loaded asynchronously. We use one `config` command per
document and its automatic page view; we do not also send a manual `page_view`.
**The history setting in step 2 is required:** `send_page_view` in code does not
control Enhanced Measurement's history-based page views. That setting cannot
be verified from the repository or a local mock of the Google script.

## Event contract

Every custom event includes `page_type` (`home`, `post`, `page`, or `topics`) and
`site_lang` (`en` or `zh-CN`). This is the content language, not the visitor's
browser language. Article pages also include `article_id`: the post's shared
`translation_key`, falling back to its slug. These values are also attached to
the initial GA4 configuration/page view.

| Event | Trigger | Extra parameters |
| --- | --- | --- |
| `page_view` | Google tag initializes on a page load | Standard GA4 page fields |
| `article_progress` | Viewport reaches 25, 50, 75, or 90% of the article body; each milestone once per document | `depth_percent` |
| `search_open` | Search dialog opens, by button or keyboard | None |
| `search_results` | A nonempty search has displayed results for 500 ms without more input; also flushed before choosing a result | `result_count` |
| `search_result_click` | A result is opened by click, middle click, or Enter | `target_article_id`, `result_position` (1-based) |
| `code_copy` | Clipboard write succeeds | `code_block` (1-based among copy buttons) |
| `topic_filter` | User selects a tag that changes the current filter URL | `topic` (`(all)` when cleared) |
| `related_post_click` | User follows a recommended article | `target_article_id` |
| `rss_click` | User follows an RSS link | `feed_lang` |
| `language_switch` | User follows the language switch | `target_lang` |

Search deduplication lasts for one opening of the dialog and ignores case and
extra whitespace. Empty searches only display recent articles and do not emit
`search_results`; opening a recent result still emits `search_result_click`.
Composition/IME input cancels pending timers, and closing the dialog cancels
unfinished searches. Search text stays in browser memory and is never part of
the event payload. Copied code is not uploaded either. `analytics.js` only
accepts the event names and parameter names listed above.

Progress describes content reached by the viewport, not proof of reading.
Following a section anchor can cross several milestones at once; a short
article already visible on screen can immediately reach all milestones. A
hidden tab does not emit new progress. Time-based reports use GA4's own
engagement time, which measures time the page is in focus. An RSS click is an
expression of interest, not a confirmed subscription. Giscus comments are not
included in the event contract.

## GA4 reports

Before collecting production traffic, create these **event-scoped custom
dimensions** under **Admin → Custom definitions** using matching parameter
names: `page_type`, `site_lang`, `article_id`, `depth_percent`,
`target_article_id`, `result_position`, `topic`, `feed_lang`, `target_lang`,
and `code_block`. Register `result_count` as a custom metric with unit
**Standard** if using it numerically in reports.

Prepare these reports/explorations:

| Report | Configuration |
| --- | --- |
| Traffic and popular posts | Traffic acquisition by source/medium; Pages and screens by page path, views, active users, and average engagement time |
| Article engagement | Free-form exploration with `article_id` / `site_lang`, event name, and event count; filter to `article_progress` and `code_copy`; break progress down by `depth_percent` |
| Search and recommendations | Event count / total users by `search_open`, `search_results`, `search_result_click`, `related_post_click`; use target article and result position for clicked results |
| Continued reading | Funnel: `page_view` with `page_type=post` → `related_post_click`, allowing intermediate events; optionally restrict the first step to one `article_id` |

For the funnel, count users who completed the ordered steps; don't divide raw
click events by page views and call that a user conversion rate. A single
visitor can click more than once. Optionally mark `rss_click` as a key event,
with the report label **RSS link click**, not subscription.

Custom dimensions/metrics may take 24–48 hours to become available in reports.
Realtime and DebugView are the tools for checking collection first. If longer
explorations are needed, set event-data retention to 14 months; this setting
does not limit standard aggregated reports in the same way.

## Development, debugging, and excluding your visits

The production-origin check cannot be bypassed by a URL query parameter.
For a local browser inspection, tests intercept requests to the configured
production URL and serve temporary build files. They block Google requests
and use a fake ID, so no test traffic reaches a real property.

To exclude your own browser, run this once in that site's developer console,
then reload:

```js
localStorage.setItem('analytics-disabled', 'true');
location.reload();
```

Remove the key and reload to resume. The preference is per browser and origin;
it is read before the Google script is requested.

For a deliberate live DebugView check, first remove that exclusion, then run:

```js
sessionStorage.setItem('analytics-debug', 'true');
location.reload();
```

Remove `analytics-debug` and reload when finished. Debug mode still sends data
to the configured stream; use a separate test property for sustained testing.
Advertising personalization and Google signals are disabled in the tag config.

## Verification

Run the existing dependency-free tests and production build:

```bash
node --test _tests/*.test.cjs
JEKYLL_ENV=production bundle exec jekyll build
python3 -m unittest discover -s _tests -p 'test_*.py'
```

The browser regression suite builds temporary enabled/disabled/development
fixtures, intercepts all network requests, and checks real interactions in
Chrome. Install Playwright outside the repository, then run:

```bash
ga4_test_dir=$(mktemp -d)
npm install --prefix "$ga4_test_dir" --no-save --package-lock=false playwright
NODE_PATH="$ga4_test_dir/node_modules" node --test _tests/analytics.browser.cjs
```

It uses an installed Google Chrome by default. Set `GA4_BROWSER_CHANNEL=chromium`
to use Playwright's separately installed Chromium instead. Browser tests verify
the site's commands and behavior, not processing inside Google's service.

After publishing, verify the following with the real stream:

- The English and Chinese home/article pages each send one `page_view` per load.
- Filtering tags or opening search does not add a `page_view`.
- Search result clicks work by mouse and keyboard and carry the right article ID.
- A successful copy sends one event; a rejected clipboard write sends none.
- Each article progress milestone occurs once even when scrolling back and forth.
- Local development, other origins, and an opted-out browser send no data.
- Blocking the Google script or the site's tracker leaves navigation, search,
  filtering, and copy buttons usable.
- Realtime/DebugView shows the expected events, then reports show their dimensions.

Set `analytics.enabled: false`, rebuild, and deploy to disable collection for
new page loads. Already-open pages keep their existing tracker until reloaded.

## References

- [Set up a web stream](https://support.google.com/analytics/answer/9304153)
- [Page views and history settings](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Enhanced measurement](https://support.google.com/analytics/answer/9216061)
- [Events and DebugView](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [Custom dimensions and metrics](https://support.google.com/analytics/answer/14240153)
- [Engagement time](https://support.google.com/analytics/answer/11109416)
- [Data retention](https://support.google.com/analytics/answer/7667196)
