"""Exercise optional dates, versions, reading estimates, and overrides in Jekyll."""
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest


class ReadingMetadataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name)
        for directory in ('_includes', '_layouts', '_data'):
            shutil.copytree(directory, cls.root / directory)
        shutil.copy('_config.yml', cls.root / '_config.yml')
        (cls.root / '_posts').mkdir()
        fixtures = {
            'english': ('en', 'word ' * 221, {}),
            'chinese': ('zh-CN', '字' * 351, {}),
            'updated': ('en', 'Brief.', {'last_modified_at': '2026-09-27', 'tested_with': ['Tool <2 & >1']}),
            'older': ('en', 'Brief.', {'last_modified_at': '2026-02-01'}),
            'same': ('en', 'Brief.', {'last_modified_at': '2026-03-01'}),
            'override': ('en', 'Brief.', {'reading_minutes': 8}),
        }
        for key, (lang, body, extra) in fixtures.items():
            data = dict(title=key, lang=lang, date='2026-03-01', comments=False,
                        translation_key=key, permalink=f'/{key}/', **extra)
            (cls.root / '_posts' / f'2026-03-01-{key}.md').write_text(
                '---\n' + json.dumps(data) + '\n---\n' + body)
        subprocess.run(['bundle', 'exec', 'jekyll', 'build', '--source', str(cls.root),
                        '--destination', str(cls.root / '_site'), '--quiet'], check=True)

    def page(self, key):
        return (self.root / '_site' / key / 'index.html').read_text()

    def test_word_and_character_estimates_round_up(self):
        self.assertIn('About 2 min read', self.page('english'))
        self.assertIn('预计阅读 2 分钟', self.page('chinese'))

    def test_optional_metadata_is_hidden_when_absent_or_not_newer(self):
        for key in ('english', 'chinese', 'older', 'same'):
            self.assertNotIn('class="reading-metadata__updated"', self.page(key))
            self.assertNotIn('class="reading-metadata__versions"', self.page(key))

    def test_update_preserves_publication_date_and_escapes_versions(self):
        html = self.page('updated')
        dates = re.findall(r'<time[^>]*datetime="([^"]+)"', html)
        self.assertTrue(dates[0].startswith('2026-03-01'))
        self.assertTrue(dates[1].startswith('2026-09-27'))
        self.assertIn('Tool &lt;2 &amp; &gt;1', html)
        self.assertIn('About 1 min read', html)

    def test_editorial_override(self):
        self.assertIn('About 8 min read', self.page('override'))


if __name__ == '__main__':
    unittest.main()
