(function () {
  'use strict';

  function resolveTag(search, availableTags) {
    var tag = new URLSearchParams(search).get('tag') || '';
    return availableTags.includes(tag) ? tag : '';
  }

  function matchingIndexes(postTags, tag) {
    return postTags.reduce(function (indexes, tags, index) {
      if (!tag || tags.includes(tag)) indexes.push(index);
      return indexes;
    }, []);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { resolveTag: resolveTag, matchingIndexes: matchingIndexes };
  }
  if (typeof document === 'undefined') return;
  var filter = document.querySelector('[data-post-filter]');
  if (!filter) return;
  var list = document.getElementById('post-list');
  var cards = Array.from(list.querySelectorAll('[data-post-tags]'));
  var tags = cards.map(function (card) { return JSON.parse(card.dataset.postTags) || []; });
  var buttons = Array.from(filter.querySelectorAll('[data-filter-tag]'));
  var availableTags = buttons.map(function (button) { return button.dataset.filterTag; });
  var status = filter.querySelector('[role="status"]');

  function apply(tag) {
    var matches = matchingIndexes(tags, tag);
    cards.forEach(function (card, index) { card.hidden = !matches.includes(index); });
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.filterTag === tag));
    });
    var countLabel = matches.length === 1 ? status.dataset.oneLabel : status.dataset.countLabel;
    status.textContent = countLabel.replace('{count}', String(matches.length));
  }

  function select(tag) {
    var url = new URL(window.location.href);
    if (tag) url.searchParams.set('tag', tag);
    else url.searchParams.delete('tag');
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
    apply(tag);
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () { select(button.dataset.filterTag); });
  });
  list.addEventListener('click', function (event) {
    var link = event.target.closest('[data-topic-tag]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    var tag = link.dataset.topicTag;
    select(tag);
    buttons.find(function (button) { return button.dataset.filterTag === tag; }).focus({ preventScroll: true });
    filter.scrollIntoView({ block: 'start' });
  });
  function restore() { apply(resolveTag(window.location.search, availableTags)); }
  window.addEventListener('popstate', restore);
  window.addEventListener('pageshow', restore);
  restore();
  filter.hidden = false;
})();
