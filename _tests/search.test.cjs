const test = require('node:test');
const assert = require('node:assert/strict');
const { searchPosts, termsFor, excerptFor, matchRanges } = require('../assets/js/search.js');

const posts = [
  { title: 'A quiet workspace', content: 'One notebook and a terminal. Keep the desk clear.', description: 'Room to think.', date: '2026-05-22', lang: 'en', url: '/workspace/' },
  { title: 'Terminal notes', content: 'A small collection of commands.', date: '2026-03-10', lang: 'en', url: '/terminal/' },
  { title: '安静的工作空间', content: '留一本笔记、一个终端，让桌面少一点干扰。', date: '2026-05-22', lang: 'zh-CN', url: '/zh/workspace/' },
];

test('finds an article by a word appearing only in its full body', () => {
  assert.deepEqual(searchPosts(posts, 'notebook', 'en').map(p => p.url), ['/workspace/']);
});

test('Chinese body queries search only the selected language', () => {
  assert.deepEqual(searchPosts(posts, '终端', 'zh-CN').map(p => p.url), ['/zh/workspace/']);
  assert.deepEqual(searchPosts(posts, '终端', 'en'), []);
});

test('title matches outrank newer articles with body matches', () => {
  assert.deepEqual(searchPosts(posts, 'TERMINAL', 'en').map(p => p.url), ['/terminal/', '/workspace/']);
});

test('matches multiple words across title and body and requires every word', () => {
  assert.equal(searchPosts(posts, '  quiet   NOTEBOOK  ', 'en')[0].url, '/workspace/');
  assert.deepEqual(searchPosts(posts, 'quiet commands', 'en'), []);
  assert.deepEqual(termsFor(' Quiet quiet\nNOTEBOOK '), ['quiet', 'notebook']);
});

test('blank search lists recent articles without mixing translations', () => {
  assert.deepEqual(searchPosts(posts, '   ', 'en').map(p => p.url), ['/workspace/', '/terminal/']);
});

test('excerpt includes a match deep in the article rather than only its opening', () => {
  const post = { content: 'Opening paragraph. '.repeat(40) + 'The hidden NEEDLE is here. ' + 'More notes. '.repeat(40) };
  const excerpt = excerptFor(post, ['needle']);
  assert.match(excerpt, /NEEDLE/);
  assert.ok(excerpt.startsWith('…') && excerpt.endsWith('…'));
  assert.ok(excerpt.length <= 182);
});

test('highlighting treats punctuation literally and merges overlapping matches', () => {
  assert.deepEqual(matchRanges('C++ and [a-z]', ['c++', '[a-z]']), [[0, 3], [8, 13]]);
  assert.deepEqual(matchRanges('Jekyll JEKYLL', ['jek', 'jekyll']), [[0, 6], [7, 13]]);
  assert.deepEqual(matchRanges('笔记和终端', ['终端']), [[3, 5]]);
});
