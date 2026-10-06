// Optional integration suite: see _docs/analytics.md for Playwright setup.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://ryqdev.github.io';
const ID = 'G-TEST000001';
const ARTICLE = '/posts/llm-api-protocols-quick-reference/';
const ARTICLE_ID = 'llm-api-protocols-quick-reference';
let temp, sites, browser;

before(async () => {
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-browser-'));
  const source = path.join(temp, 'source');
  fs.mkdirSync(source);
  for (const name of ['_includes', '_layouts', '_data', '_posts', 'assets', 'zh',
    'feed', 'index.html', 'topics.html', 'about.md', 'search.json', '_config.yml']) {
    fs.cpSync(path.join(ROOT, name), path.join(source, name), { recursive: true });
  }
  // Ensure search and recommendations have multiple articles in each language.
  for (const [lang, prefix, directory] of [['en', '', ''], ['zh-CN', '/zh', 'zh']]) {
    const post = {
      title: 'Protocol analytics fixture', date: '2020-01-01', lang,
      translation_key: 'analytics-fixture', tags: ['Fixture'], comments: false,
      permalink: prefix + '/posts/analytics-fixture/'
    };
    fs.writeFileSync(path.join(source, '_posts', directory, '2020-01-01-analytics-fixture.md'),
      '---\n' + JSON.stringify(post) + '\n---\n## Protocol example\n\n```js\nconsole.log(1);\n```\n\n## More\n\nFixture text.');
  }
  function build(name, environment, enabled, measurement_id) {
    const config = path.join(temp, name + '.yml');
    const destination = path.join(temp, name);
    fs.writeFileSync(config, JSON.stringify({ url: ORIGIN, analytics: { enabled, measurement_id } }));
    execFileSync('bundle', ['exec', 'jekyll', 'build', '--quiet', '--source', source,
      '--destination', destination, '--config', path.join(source, '_config.yml') + ',' + config],
    { cwd: ROOT, env: { ...process.env, JEKYLL_ENV: environment, BUNDLE_FROZEN: 'true' }, timeout: 60000 });
    return destination;
  }
  sites = {
    enabled: build('enabled', 'production', true, ID),
    disabled: build('disabled', 'production', false, ID),
    development: build('development', 'development', true, ID),
    missing: build('missing', 'production', true, '')
  };
  browser = await chromium.launch({ headless: true, channel: process.env.GA4_BROWSER_CHANNEL || 'chrome' });
});

after(async () => {
  if (browser) await browser.close();
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
});

async function withPage(options, check) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 750 }, reducedMotion: 'reduce' });
  const records = [], errors = [], googleRequests = [];
  const site = sites[options.build || 'enabled'];
  await context.exposeBinding('recordAnalytics', (_, record) => records.push(record));
  await context.addInitScript(({ disabled, debug, clipboardFails }) => {
    if (disabled) localStorage.setItem('analytics-disabled', 'true');
    if (debug) sessionStorage.setItem('analytics-debug', 'true');
    window.dataLayer = [];
    window.dataLayer.push = function (...entries) {
      for (const entry of entries) {
        window.recordAnalytics({ url: location.href, command: Array.from(entry) });
      }
      return Array.prototype.push.apply(this, entries);
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText(text) {
        if (clipboardFails) return Promise.reject(new Error('Clipboard denied'));
        window.copiedText = text;
        return Promise.resolve();
      }
    } });
  }, options);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.googletagmanager.com') {
      googleRequests.push(url.href);
      return route.abort(); // Never contact Google, even if the local config changes.
    }
    if (![new URL(options.origin || ORIGIN).hostname, 'ryqdev.github.io'].includes(url.hostname)) return route.abort();
    if (options.blockTracker && url.pathname === '/assets/js/analytics.js') return route.abort();
    let file = path.join(site, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!file.startsWith(site + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return route.fulfill({ status: 404, body: 'Not found' });
    }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.xml': 'application/xml' };
    let body = fs.readFileSync(file);
    if (path.extname(file) === '.html' && options.invalidId) body = Buffer.from(body.toString().replace(ID, 'invalid'));
    await route.fulfill({ status: 200, contentType: types[path.extname(file)] || 'application/octet-stream', body });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const events = name => records.filter(r => r.command[0] === 'event' && (!name || r.command[1] === name));
  const configs = () => records.filter(r => r.command[0] === 'config');
  const goto = async (pathname = '/') => {
    await page.goto((options.origin || ORIGIN) + pathname);
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  };
  try {
    await check({ page, goto, events, configs, records, googleRequests });
    await page.waitForTimeout(50);
    assert.deepEqual(errors, [], 'No uncaught errors from tracking or existing interactions');
  } finally {
    await context.close();
  }
}

test('disabled, development, and missing-ID builds omit tracking; production carries bilingual metadata', async () => {
  for (const variant of ['disabled', 'development', 'missing']) {
    for (const file of ['index.html', 'zh/index.html', ARTICLE.slice(1) + 'index.html']) {
      const html = fs.readFileSync(path.join(sites[variant], file), 'utf8');
      assert.doesNotMatch(html, /id="analytics-config"|src="[^"]*analytics\.js"/);
    }
  }
  for (const [pathname, lang, type, article] of [
    ['/', 'en', 'home', ''], ['/zh/', 'zh-CN', 'home', ''],
    [ARTICLE, 'en', 'post', ARTICLE_ID], ['/zh' + ARTICLE, 'zh-CN', 'post', ARTICLE_ID]
  ]) {
    await withPage({}, async ({ goto, configs, events, googleRequests }) => {
      await goto(pathname);
      assert.equal(configs().length, 1);
      assert.equal(configs()[0].command[1], ID);
      const config = configs()[0].command[2];
      assert.equal(config.send_page_view, true);
      assert.equal(config.site_lang, lang);
      assert.equal(config.page_type, type);
      assert.equal(config.article_id || '', article);
      assert.equal(events('page_view').length, 0, 'No duplicate manually sent pageview');
      assert.equal(googleRequests.length, 1);
    });
  }
});

test('other origins, HTTP, opted-out visits, and invalid IDs never load Google or queue events', async () => {
  for (const options of [
    { origin: 'https://preview.example' }, { origin: 'https://ryqdev.github.io.attacker.example' },
    { origin: 'http://ryqdev.github.io' }, { disabled: true }, { invalidId: true }
  ]) {
    await withPage(options, async ({ page, goto, records, googleRequests }) => {
      await goto();
      await page.locator('#search-toggle').click();
      assert.equal(await page.locator('#search-dialog').evaluate(el => el.open), true);
      assert.equal(await page.evaluate(() => typeof window.siteAnalytics), 'undefined');
      assert.equal(records.length, 0);
      assert.equal(googleRequests.length, 0);
    });
  }
});

test('filter changes emit one event, repeat selections and history restoration emit none', async () => {
  await withPage({}, async ({ page, goto, events, configs }) => {
    await goto();
    const button = page.locator('[data-filter-tag="Fixture"]');
    await button.click();
    await button.click();
    assert.equal(events('topic_filter').length, 1);
    assert.equal(events('topic_filter')[0].command[2].topic, 'Fixture');
    assert.equal(await page.locator('.post-card:visible').count(), 1);
    await page.locator('[data-filter-tag=""]').click();
    assert.equal(events('topic_filter').length, 2);
    assert.equal(events('topic_filter')[1].command[2].topic, '(all)');
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('[data-filter-tag="Fixture"]').getAttribute('aria-pressed') === 'true');
    assert.equal(events('topic_filter').length, 2);
    assert.equal(configs().length, 1);
    assert.equal(events('page_view').length, 0);
  });
});

test('search debounces, deduplicates, handles empty/no-match searches, and does not upload query text', async () => {
  await withPage({}, async ({ page, goto, events, records }) => {
    await goto();
    await page.locator('#search-toggle').click();
    await page.waitForSelector('.search-result');
    assert.equal(events('search_open').length, 1);
    assert.equal(events('search_results').length, 0);
    const input = page.locator('#search-input');
    await input.fill('pro');
    await input.fill('protocol');
    await page.waitForTimeout(600);
    assert.equal(events('search_results').length, 1);
    assert.ok(events('search_results')[0].command[2].result_count >= 2);
    await input.fill(' PROTOCOL  ');
    await page.waitForTimeout(600);
    assert.equal(events('search_results').length, 1);
    await input.fill('private-query-49371@example.test');
    await page.waitForTimeout(600);
    assert.equal(events('search_results').at(-1).command[2].result_count, 0);
    assert.ok(!JSON.stringify(records).includes('private-query-49371'));
    assert.ok(!JSON.stringify(records).includes('search_term'));
    await input.fill('');
    await page.waitForTimeout(600);
    assert.equal(events('search_results').length, 2);
    await input.fill('cancel-before-debounce');
    await page.locator('#search-close').click();
    await page.waitForTimeout(600);
    assert.equal(events('search_results').length, 2);
  });
});

test('IME composition cancels the prior timer and reports only completed Chinese input', async () => {
  await withPage({}, async ({ page, goto, events }) => {
    await goto('/zh/');
    await page.keyboard.press('Control+k');
    await page.waitForSelector('.search-result');
    const input = page.locator('#search-input');
    await input.fill('proto');
    await input.dispatchEvent('compositionstart');
    await input.evaluate(el => { el.value = '协议'; });
    await input.dispatchEvent('input', { isComposing: true });
    await page.waitForTimeout(600);
    assert.equal(events('search_results').length, 0);
    await input.dispatchEvent('compositionend');
    await page.waitForTimeout(600);
    assert.equal(events('search_results').length, 1);
    assert.equal(events('search_results')[0].command[2].site_lang, 'zh-CN');
  });
});

test('mouse, input Enter, and focused-result Enter record the same search selection once', async () => {
  for (const method of ['click', 'input-enter', 'result-enter']) {
    await withPage({}, async ({ page, goto, events }) => {
      await goto();
      await page.locator('#search-toggle').click();
      await page.waitForSelector('.search-result');
      await page.locator('#search-input').fill('protocol');
      const href = await page.locator('.search-result').first().getAttribute('href');
      if (method === 'click') await page.locator('.search-result').first().click();
      else {
        if (method === 'result-enter') await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }
      await page.waitForURL(ORIGIN + href);
      assert.equal(events('search_results').length, 1, 'A fast selection flushes the pending search');
      assert.equal(events('search_result_click').length, 1);
      const payload = events('search_result_click')[0].command[2];
      assert.equal(payload.result_position, 1);
      assert.ok([ARTICLE_ID, 'analytics-fixture'].includes(payload.target_article_id));
    });
  }
});

test('copy success is counted after writing, rejection sends no event, and code is never uploaded', async () => {
  for (const clipboardFails of [false, true]) {
    await withPage({ clipboardFails }, async ({ page, goto, events, records }) => {
      await goto('/posts/analytics-fixture/');
      await page.locator('.copy-btn').first().click();
      await page.waitForTimeout(50);
      assert.equal(events('code_copy').length, clipboardFails ? 0 : 1);
      if (!clipboardFails) {
        assert.equal(events('code_copy')[0].command[2].code_block, 1);
        assert.match(await page.evaluate(() => window.copiedText), /console\.log/);
      }
      assert.ok(!JSON.stringify(records).includes('console.log'));
    });
  }
});

test('article progress measures the body and each milestone is recorded once', async () => {
  await withPage({}, async ({ page, goto, events }) => {
    await goto(ARTICLE);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(50);
    for (const depth of [30, 55, 80, 95, 30, 95]) {
      await page.evaluate(percent => {
        const rect = document.querySelector('.post-reading-layout .prose').getBoundingClientRect();
        window.scrollTo(0, scrollY + rect.top + rect.height * percent / 100 - innerHeight);
      }, depth);
      await page.waitForTimeout(80);
    }
    assert.deepEqual(events('article_progress').map(r => r.command[2].depth_percent), [25, 50, 75, 90]);
    assert.ok(events('article_progress').every(r => r.command[2].article_id === ARTICLE_ID));
  });
});

test('hidden documents do not report progress until visible again', async () => {
  await withPage({}, async ({ page, goto, events }) => {
    await goto(ARTICLE);
    const before = events('article_progress').length;
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(100);
    assert.equal(events('article_progress').length, before);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(100);
    assert.deepEqual(events('article_progress').map(r => r.command[2].depth_percent), [25, 50, 75, 90]);
  });
});

test('related articles, RSS, and language switches report their destination without stopping navigation', async () => {
  await withPage({}, async ({ page, goto, events }) => {
    await goto(ARTICLE);
    const related = page.locator('.related-posts a').first();
    const target = await related.getAttribute('href');
    const targetId = await related.getAttribute('data-article-id');
    await related.click();
    await page.waitForURL(ORIGIN + target);
    assert.equal(events('related_post_click').length, 1);
    assert.equal(events('related_post_click')[0].command[2].target_article_id, targetId);
    await page.locator('.language-switch').click();
    await page.waitForURL(ORIGIN + '/zh' + target);
    assert.equal(events('language_switch').length, 1);
    assert.equal(events('language_switch')[0].command[2].target_lang, 'zh-CN');
    await page.locator('.rss-menu summary').click();
    await page.locator('.rss-menu a[hreflang="zh-CN"]').click();
    await page.waitForURL(ORIGIN + '/feed/zh.xml');
    assert.equal(events('rss_click').length, 1);
    assert.equal(events('rss_click')[0].command[2].feed_lang, 'zh-CN');
  });
});

test('blocking the tracker leaves search, filtering, copy, and language navigation working', async () => {
  await withPage({ blockTracker: true }, async ({ page, goto, records, googleRequests }) => {
    await goto();
    await page.locator('[data-filter-tag="Fixture"]').click();
    assert.equal(await page.locator('.post-card:visible').count(), 1);
    await page.locator('#search-toggle').click();
    await page.waitForSelector('.search-result');
    await page.locator('#search-input').fill('analytics fixture');
    await page.keyboard.press('Enter');
    await page.waitForURL(ORIGIN + '/posts/analytics-fixture/');
    await page.locator('.copy-btn').click();
    assert.match(await page.evaluate(() => window.copiedText), /console\.log/);
    await page.locator('.language-switch').click();
    await page.waitForURL(ORIGIN + '/zh/posts/analytics-fixture/');
    assert.equal(records.length, 0);
    assert.equal(googleRequests.length, 0);
  });
});

test('tracking rejects unknown payload fields and contains failures in gtag', async () => {
  await withPage({ debug: true }, async ({ page, goto, events, configs }) => {
    await goto();
    assert.equal(configs()[0].command[2].debug_mode, true);
    await page.evaluate(() => {
      siteAnalytics.track('search_results', { result_count: 3, search_term: 'secret', email: 'secret@example.test' });
      siteAnalytics.track('arbitrary_event', { text: 'secret' });
    });
    assert.equal(events('search_results').length, 1);
    assert.equal(events('arbitrary_event').length, 0);
    assert.equal(events('search_results')[0].command[2].search_term, undefined);
    assert.equal(events('search_results')[0].command[2].email, undefined);
    await page.evaluate(() => { window.gtag = () => { throw new Error('Tracker failed'); }; });
    await page.locator('#search-toggle').click();
    assert.equal(await page.locator('#search-dialog').evaluate(el => el.open), true);
  });
});
