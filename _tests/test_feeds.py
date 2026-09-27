"""Validate built Atom feeds: jekyll build, then python3 -m unittest discover -s _tests -p test_feeds.py."""
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import unittest
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

SITE = Path(os.environ.get('SITE_DIR', '_site'))
ATOM = {'a': 'http://www.w3.org/2005/Atom'}
LANG = '{http://www.w3.org/XML/1998/namespace}lang'


class Links(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.feeds, self.anchors = [], []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('type') == 'application/atom+xml':
            self.feeds.append(attrs)
        if tag == 'a':
            self.anchors.append(attrs)


class FeedsTest(unittest.TestCase):
    def test_language_isolation_and_complete_entries(self):
        posts = json.loads((SITE / 'search.json').read_text())
        seen_ids = set()
        for lang, file in [('en', 'en.xml'), ('zh-CN', 'zh.xml')]:
            feed = ET.parse(SITE / 'feed' / file).getroot()
            self.assertEqual(feed.get(LANG), lang)
            entries = feed.findall('a:entry', ATOM)
            expected = {p['url'] for p in posts if p['lang'] == lang}
            self.assertEqual(len(entries), min(20, len(expected)))
            dates = []
            for entry in entries:
                self.assertEqual(entry.get(LANG), lang)
                identity = entry.findtext('a:id', namespaces=ATOM)
                self.assertNotIn(identity, seen_ids)
                seen_ids.add(identity)
                self.assertEqual(urlparse(identity).scheme, 'https')
                self.assertIn(urlparse(identity).path, expected)
                self.assertEqual(entry.find('a:link', ATOM).get('href'), identity)
                self.assertTrue(entry.findtext('a:title', namespaces=ATOM))
                self.assertTrue(entry.findtext('a:updated', namespaces=ATOM))
                self.assertIn('<h2', entry.findtext('a:content', namespaces=ATOM))
                dates.append(entry.findtext('a:published', namespaces=ATOM))
            self.assertEqual(dates, sorted(dates, reverse=True))

    def test_discovery_prefers_current_language_and_footer_links_exist(self):
        for lang, file in [('en', 'index.html'), ('zh-CN', 'zh/index.html')]:
            links = Links((SITE / file).read_text())
            self.assertEqual(links.feeds[0]['hreflang'], lang)
            self.assertEqual({link['hreflang'] for link in links.feeds}, {'en', 'zh-CN'})
            footer = [a for a in links.anchors if a.get('type') == 'application/atom+xml']
            self.assertEqual({a['hreflang'] for a in footer}, {'en', 'zh-CN'})

    def test_existing_combined_feed_remains_available(self):
        root = ET.parse(SITE / 'feed.xml').getroot()
        self.assertTrue(root.findall('a:entry', ATOM))


if __name__ == '__main__':
    unittest.main()
