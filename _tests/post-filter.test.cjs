const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveTag, matchingIndexes } = require('../assets/js/post-filter.js');

test('filters by an exact tag and preserves publication order', () => {
  assert.deepEqual(matchingIndexes([['Notes'], ['Web', 'Notes'], ['Tools'], []], 'Notes'), [0, 1]);
  assert.deepEqual(matchingIndexes([['Notes'], ['Web', 'Notes'], ['Tools'], []], ''), [0, 1, 2, 3]);
});

test('links round-trip Chinese, spaces, and punctuation without tag collisions', () => {
  const available = ['随想', 'GitHub Pages', 'C++', 'C#'];
  for (const tag of available) {
    const search = '?' + new URLSearchParams({ tag });
    assert.equal(resolveTag(search, available), tag);
    assert.deepEqual(matchingIndexes(available.map(value => [value]), tag), [available.indexOf(tag)]);
  }
});

test('unknown and missing filters fall back to all articles', () => {
  for (const search of ['', '?tag=', '?tag=deleted', '?tag=%E0%A4%A']) {
    assert.equal(resolveTag(search, ['随想', 'Tools']), '');
  }
});

test('a tag does not match a substring or similarly named tag', () => {
  assert.deepEqual(matchingIndexes([['JavaScript'], ['Java'], ['java'], []], 'Java'), [1]);
  assert.deepEqual(matchingIndexes([], 'Java'), []);
});
