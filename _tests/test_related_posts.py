"""Build a small fixture site to exercise selection, fallback, and isolation.

Run with the same Bundler environment used for Jekyll:
    python3 -m unittest discover -s _tests -p test_related_posts.py
"""
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest


class RelatedPostsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name)
        for directory in ('_includes', '_layouts', '_data'):
            shutil.copytree(directory, cls.root / directory)
        shutil.copy('_config.yml', cls.root / '_config.yml')
        (cls.root / '_posts').mkdir()
        fixtures = [
            ('a', 'en', ['Web', 'Tools'], ['a', 'missing', 'zh-only', 'd', 'd']),
            ('b', 'en', ['Web', 'Tools'], []),
            ('c', 'en', ['Web'], []),
            ('d', 'en', [], []),
            ('e', 'en', [], []),
            ('zh-only', 'zh-CN', ['Web', 'Tools'], []),
        ]
        for day, (key, lang, tags, picks) in enumerate(fixtures, start=1):
            data = dict(title=key, date=f'2026-03-{day:02}', lang=lang,
                        translation_key=key, tags=tags, related_posts=picks,
                        permalink=f'/{lang}/{key}/', comments=False)
            post = cls.root / '_posts' / f'2026-03-{day:02}-{key}.md'
            post.write_text('---\n' + json.dumps(data) + '\n---\nFixture article.\n')
        subprocess.run(['bundle', 'exec', 'jekyll', 'build', '--source', str(cls.root),
                        '--destination', str(cls.root / '_site'), '--quiet'], check=True)

    def links(self, key, lang='en'):
        html = (self.root / '_site' / lang / key / 'index.html').read_text()
        section = re.search(r'<section class="related-posts".*?</section>', html, re.S)
        return re.findall(r'<a href="([^"]+)"', section.group()) if section else []

    def test_editorial_picks_skip_self_missing_other_language_and_duplicates(self):
        self.assertEqual(self.links('a'), ['/en/d/', '/en/b/', '/en/c/'])

    def test_shared_tags_win_and_ties_use_publication_date(self):
        self.assertEqual(self.links('c'), ['/en/b/', '/en/a/', '/en/e/'])

    def test_untagged_post_falls_back_to_recent_without_self(self):
        self.assertEqual(self.links('e'), ['/en/d/', '/en/c/', '/en/b/'])

    def test_only_article_in_language_has_no_empty_recommendation_section(self):
        self.assertEqual(self.links('zh-only', 'zh-CN'), [])


if __name__ == '__main__':
    unittest.main()
