(function () {
  'use strict';
  var stringsNode = document.getElementById('article-navigation-strings');
  if (!stringsNode) return;
  var strings = JSON.parse(stringsNode.textContent);
  var headings = Array.from(document.querySelectorAll('.post-reading-layout .prose h2, .post-reading-layout .prose h3'));
  var toc = document.querySelector('.post-toc');
  var list = toc.querySelector('ol');
  var status = document.getElementById('section-link-status');
  var links = [];

  headings.forEach(function (heading, index) {
    if (!heading.id) {
      var id = 'section-' + (index + 1);
      while (document.getElementById(id)) id += '-section';
      heading.id = id;
    }
    var title = heading.textContent.trim();
    var href = '#' + encodeURIComponent(heading.id);
    var item = document.createElement('li');
    if (heading.tagName === 'H3') item.className = 'is-subsection';
    var link = document.createElement('a');
    link.href = href;
    link.textContent = title;
    item.appendChild(link);
    list.appendChild(item);
    links.push(link);

    var permalink = document.createElement('a');
    permalink.href = href;
    permalink.className = 'heading-permalink';
    permalink.textContent = '#';
    permalink.title = strings.copy;
    permalink.setAttribute('aria-label', strings.copy + ': ' + title);
    permalink.addEventListener('click', function () {
      status.textContent = '';
      var url = new URL(window.location.href);
      url.hash = href;
      if (!navigator.clipboard) {
        status.textContent = strings.failed;
        return;
      }
      navigator.clipboard.writeText(url.href).then(function () {
        status.textContent = strings.copied;
      }, function () { status.textContent = strings.failed; });
    });
    heading.appendChild(permalink);
  });

  if (headings.length < 2) return;
  toc.hidden = false;
  var panel = toc.querySelector('details');
  var wide = window.matchMedia('(min-width: 900px)');
  function syncPanel() {
    panel.open = wide.matches;
    var summary = panel.querySelector('summary');
    if (wide.matches) summary.setAttribute('tabindex', '-1');
    else summary.removeAttribute('tabindex');
  }
  syncPanel();
  wide.addEventListener('change', syncPanel);
  panel.addEventListener('toggle', function () {
    if (wide.matches && !panel.open) panel.open = true;
  });
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      if (!wide.matches) panel.open = false;
      // Wait for the collapsed mobile panel to settle before anchor scrolling.
      requestAnimationFrame(function () {
        var target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
        target.scrollIntoView({ block: 'start' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  });
  var pending = false;
  function updateCurrent() {
    var offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) * parseFloat(getComputedStyle(document.documentElement).fontSize) + 32;
    var current = 0;
    headings.forEach(function (heading, index) {
      if (heading.getBoundingClientRect().top <= offset) current = index;
    });
    links.forEach(function (link, index) {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    pending = false;
  }
  window.addEventListener('scroll', function () {
    if (!pending) { pending = true; requestAnimationFrame(updateCurrent); }
  }, { passive: true });
  window.addEventListener('resize', updateCurrent);
  updateCurrent();
})();
