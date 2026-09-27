"""Verify built topic links, language isolation, and card HTML with no extra dependencies."""
from html.parser import HTMLParser
import os
from pathlib import Path
import unittest
from urllib.parse import unquote, urlparse

SITE = Path(os.environ.get('SITE_DIR', '_site'))
BASE = os.environ.get('SITE_BASEURL', '')


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.ids, self.anchors = set(), []
        self.nested_anchor = False
        self.in_anchor = False
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
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
                target = SITE / url.path.removeprefix(BASE).strip('/') / 'index.html'
                self.assertTrue(target.exists(), link['href'])
                self.assertIn(unquote(url.fragment), Page(target.read_text()).ids)
                checked += 1
        self.assertGreater(checked, 20)

    def test_topic_indexes_do_not_mix_translations(self):
        for prefix in ('', 'zh/'):
            page = Page((SITE / prefix / 'topics/index.html').read_text())
            articles = [a['href'] for a in page.anchors if '/posts/' in a.get('href', '')]
            self.assertTrue(articles)
            self.assertTrue(all(url.startswith(BASE + '/' + prefix + 'posts/') for url in articles))


if __name__ == '__main__':
    unittest.main()
