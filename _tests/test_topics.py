"""Verify built topic links, language isolation, and card HTML with no extra dependencies."""
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import unittest
from urllib.parse import parse_qs, unquote, urlparse

SITE = Path(os.environ.get('SITE_DIR', '_site'))
BASE = os.environ.get('SITE_BASEURL', '')


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.ids, self.anchors = set(), []
        self.filters, self.cards = [], []
        self.nested_anchor = False
        self.in_anchor = False
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        if tag == 'button' and 'data-filter-tag' in attrs:
            self.filters.append(attrs)
        if 'data-post-tags' in attrs:
            self.cards.append(json.loads(attrs['data-post-tags']))
        if tag == 'a':
            self.nested_anchor |= self.in_anchor
            self.in_anchor = True
            self.anchors.append(attrs)

    def handle_endtag(self, tag):
        if tag == 'a':
            self.in_anchor = False


class TopicsTest(unittest.TestCase):
    def test_all_tag_fragments_resolve_including_chinese_and_spaces(self):
        checked = 0
        for file in SITE.rglob('*.html'):
            page = Page(file.read_text())
            self.assertFalse(page.nested_anchor, str(file))
            for link in page.anchors:
                if 'topic-link' not in link.get('class', '').split():
                    continue
                url = urlparse(link['href'])
                if not url.fragment:
                    continue
                target = SITE / url.path.removeprefix(BASE).strip('/') / 'index.html' if url.path else file
                self.assertTrue(target.exists(), link['href'])
                self.assertIn(unquote(url.fragment), Page(target.read_text()).ids)
                checked += 1
        expected = 0
        for prefix in ('', 'zh/'):
            home = Page((SITE / prefix / 'index.html').read_text())
            expected += len({tag for tags in home.cards for tag in tags})
        self.assertEqual(checked, expected)

    def test_home_filters_and_article_tag_links_match_current_language(self):
        for prefix in ('', 'zh/'):
            home_path = BASE + '/' + prefix
            home = Page((SITE / prefix / 'index.html').read_text())
            tags = {tag for post_tags in home.cards for tag in post_tags}
            self.assertEqual({button['data-filter-tag'] for button in home.filters}, tags | {''})
            self.assertEqual(sum(button['aria-pressed'] == 'true' for button in home.filters), 1)
            posts = json.loads((SITE / 'search.json').read_text())
            lang = 'zh-CN' if prefix else 'en'
            self.assertEqual(len(home.cards), sum(post['lang'] == lang for post in posts))
            files = [SITE / prefix / 'index.html', *(SITE / prefix / 'posts').rglob('index.html')]
            for file in files:
                page = Page(file.read_text())
                for link in page.anchors:
                    if 'data-topic-tag' not in link:
                        continue
                    url = urlparse(link['href'])
                    self.assertEqual(url.path, home_path)
                    self.assertEqual(parse_qs(url.query)['tag'], [link['data-topic-tag']])
                    self.assertIn(link['data-topic-tag'], tags)
            self.assertNotIn('topic-filter__index', (SITE / prefix / 'index.html').read_text())

    def test_topic_indexes_do_not_mix_translations(self):
        for prefix in ('', 'zh/'):
            page = Page((SITE / prefix / 'topics/index.html').read_text())
            articles = [a['href'] for a in page.anchors if '/posts/' in a.get('href', '')]
            home = Page((SITE / prefix / 'index.html').read_text())
            card_links = [a['href'] for a in home.anchors
                          if 'post-card__article-link' in a.get('class', '').split()]
            expected = {url for url, tags in zip(card_links, home.cards) if tags}
            self.assertEqual(set(articles), expected)
            self.assertTrue(all(url.startswith(BASE + '/' + prefix + 'posts/') for url in articles))


if __name__ == '__main__':
    unittest.main()
