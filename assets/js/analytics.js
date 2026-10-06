(function () {
  'use strict';
  var configNode = document.getElementById('analytics-config');
  if (!configNode || window.siteAnalytics) return;

  var config;
  try {
    config = JSON.parse(configNode.textContent);
    var origin = new URL(config.site_url).origin;
    if (window.location.protocol !== 'https:' || window.location.origin !== origin ||
        !/^G-[A-Z0-9]+$/.test(config.measurement_id)) return;
  } catch (error) { return; }

  var debug = false;
  try {
    if (localStorage.getItem('analytics-disabled') === 'true') return;
    debug = sessionStorage.getItem('analytics-debug') === 'true';
  } catch (error) { /* Storage can be unavailable; analytics remains optional. */ }

  var context = { page_type: config.page_type, site_lang: config.site_lang };
  if (config.article_id) context.article_id = config.article_id;
  var fields = {
    search_open: [],
    search_results: ['result_count'],
    search_result_click: ['target_article_id', 'result_position'],
    code_copy: ['code_block'],
    topic_filter: ['topic'],
    related_post_click: ['target_article_id'],
    rss_click: ['feed_lang'],
    language_switch: ['target_lang'],
    article_progress: ['depth_percent']
  };

  // Queue commands while the async Google script loads. No UI depends on it.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  function track(name, parameters) {
    try {
      if (!Object.prototype.hasOwnProperty.call(fields, name)) return;
      var payload = Object.assign({ send_to: config.measurement_id }, context);
      fields[name].forEach(function (key) {
        var value = (parameters || {})[key];
        if (typeof value === 'string') payload[key] = value.slice(0, 100);
        else if (typeof value === 'number' && Number.isFinite(value)) payload[key] = value;
      });
      window.gtag('event', name, payload);
    } catch (error) { /* A tracking failure must never interrupt an interaction. */ }
  }

  try {
    window.gtag('js', new Date());
    var options = Object.assign({
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    }, context);
    if (debug) options.debug_mode = true;
    // Disable history-based pageviews in the GA4 data stream (see the docs).
    // send_page_view alone does not control Enhanced Measurement's history events.
    window.gtag('config', config.measurement_id, options);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.measurement_id);
    document.head.appendChild(script);
  } catch (error) { return; }
  window.siteAnalytics = { track: track };

  function trackLink(event) {
    if (event.type === 'auxclick' && event.button !== 1) return;
    var link = event.target.closest('a[data-analytics-event]');
    if (!link) return;
    track(link.dataset.analyticsEvent, {
      target_article_id: link.dataset.articleId,
      feed_lang: link.dataset.feedLang,
      target_lang: link.hreflang
    });
  }
  document.addEventListener('click', trackLink);
  document.addEventListener('auxclick', trackLink);

  var prose = config.page_type === 'post' && document.querySelector('.post-reading-layout .prose');
  if (!prose) return;
  var milestones = [25, 50, 75, 90];
  var seen = new Set();
  var pending = false;
  function updateProgress() {
    pending = false;
    if (document.visibilityState === 'hidden') return;
    var rect = prose.getBoundingClientRect();
    if (rect.height <= 0) return;
    // Measure how far the viewport has reached through the article body only.
    var percent = Math.max(0, Math.min(100, (window.innerHeight - rect.top) / rect.height * 100));
    milestones.forEach(function (depth) {
      if (percent >= depth && !seen.has(depth)) {
        seen.add(depth);
        track('article_progress', { depth_percent: depth });
      }
    });
  }
  function scheduleProgress() {
    if (!pending) { pending = true; window.requestAnimationFrame(updateProgress); }
  }
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress);
  window.addEventListener('load', scheduleProgress);
  window.addEventListener('pageshow', scheduleProgress);
  document.addEventListener('visibilitychange', scheduleProgress);
  scheduleProgress();
})();
