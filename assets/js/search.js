(function () {
  "use strict";

  function termsFor(query) {
    return Array.from(new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean)));
  }

  function searchPosts(posts, query, language) {
    var terms = termsFor(query);
    var phrase = terms.join(" ");
    return posts.filter(function (post) {
      return post.lang === language;
    }).map(function (post) {
      var title = post.title.toLowerCase();
      var description = (post.description || "").toLowerCase();
      var content = (post.content || "").toLowerCase();
      var score = 0;
      var matched = terms.every(function (term) {
        if (title.includes(term)) score += 100;
        else if (description.includes(term)) score += 20;
        else if (content.includes(term)) score += 5;
        else return false;
        return true;
      });
      if (phrase && title.includes(phrase)) score += 200;
      if (phrase && title === phrase) score += 1000;
      return { post: post, score: score, matched: matched };
    }).filter(function (result) {
      return result.matched;
    }).sort(function (a, b) {
      return b.score - a.score || b.post.date.localeCompare(a.post.date);
    }).map(function (result) {
      return result.post;
    });
  }

  function excerptFor(post, terms) {
    var content = post.content || "";
    var lower = content.toLowerCase();
    var hits = terms.map(function (term) { return lower.indexOf(term); })
      .filter(function (index) { return index >= 0; });
    if (!hits.length) {
      var description = post.description || content;
      return description.slice(0, 180) + (description.length > 180 ? "…" : "");
    }
    var start = Math.max(0, Math.min.apply(null, hits) - 45);
    var end = Math.min(content.length, start + 180);
    return (start ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
  }

  function matchRanges(text, terms) {
    var lower = text.toLowerCase();
    var ranges = [];
    terms.filter(Boolean).forEach(function (term) {
      var index = lower.indexOf(term);
      while (index !== -1) {
        ranges.push([index, index + term.length]);
        index = lower.indexOf(term, index + term.length);
      }
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    return ranges.reduce(function (merged, range) {
      var previous = merged[merged.length - 1];
      if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
      else merged.push(range);
      return merged;
    }, []);
  }

  // Keep the matching logic testable without a browser or extra dependencies.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { searchPosts: searchPosts, termsFor: termsFor, excerptFor: excerptFor, matchRanges: matchRanges };
    return;
  }

  var dialog = document.getElementById("search-dialog");
  var trigger = document.getElementById("search-toggle");
  if (!dialog || !trigger) return;
  var input = document.getElementById("search-input");
  var list = document.getElementById("search-results");
  var status = document.getElementById("search-status");
  var empty = document.getElementById("search-empty");
  var retry = document.getElementById("search-retry");
  var strings = JSON.parse(document.getElementById("ui-strings").textContent).search;
  var language = document.documentElement.lang;
  var posts = null;
  var pending = null;
  var matches = [];
  var previousFocus = null;
  var formatter = new Intl.DateTimeFormat(language, { year: "numeric", month: "long", day: "numeric" });
  var isApple = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  var shortcut = isApple ? "⌘ K" : "Ctrl K";
  document.querySelectorAll("[data-search-shortcut]").forEach(function (element) {
    element.textContent = shortcut;
  });
  trigger.title = trigger.getAttribute("aria-label") + " (" + shortcut + ")";

  function highlighted(text, terms) {
    var fragment = document.createDocumentFragment();
    var cursor = 0;
    matchRanges(text, terms).forEach(function (range) {
      fragment.appendChild(document.createTextNode(text.slice(cursor, range[0])));
      var mark = document.createElement("mark");
      mark.textContent = text.slice(range[0], range[1]);
      fragment.appendChild(mark);
      cursor = range[1];
    });
    fragment.appendChild(document.createTextNode(text.slice(cursor)));
    return fragment;
  }

  function render() {
    if (!posts) return;
    var query = input.value.trim();
    var terms = termsFor(query);
    matches = searchPosts(posts, query, language);
    list.replaceChildren();
    retry.hidden = true;
    empty.hidden = matches.length > 0;
    status.textContent = !query ? strings.recent : !matches.length ? strings.empty :
      matches.length === 1 ? strings.one : strings.count.replace("{count}", matches.length);
    matches.forEach(function (post) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.className = "search-result";
      link.href = post.url;
      var title = document.createElement("h3");
      title.className = "search-result__title";
      title.appendChild(highlighted(post.title, terms));
      var description = document.createElement("p");
      description.className = "search-result__excerpt";
      description.appendChild(highlighted(excerptFor(post, terms), terms));
      var date = document.createElement("time");
      date.className = "search-result__date";
      date.dateTime = post.date;
      date.textContent = formatter.format(new Date(post.date));
      link.append(title, description, date);
      item.appendChild(link);
      list.appendChild(item);
    });
    list.parentElement.scrollTop = 0;
  }

  function loadPosts() {
    if (posts) { render(); return; }
    if (pending) return;
    status.textContent = strings.loading;
    empty.hidden = true;
    retry.hidden = true;
    pending = fetch(dialog.dataset.indexUrl).then(function (response) {
      if (!response.ok) throw new Error("Search index unavailable");
      return response.json();
    }).then(function (data) {
      if (!Array.isArray(data)) throw new Error("Invalid search index");
      var decoder = document.createElement("textarea");
      posts = data.map(function (post) {
        // Jekyll strips tags from rendered Markdown, leaving escaped code entities.
        decoder.innerHTML = post.content;
        return Object.assign({}, post, { content: decoder.value.replace(/\s+/g, " ").trim() });
      });
      render();
    }).catch(function () {
      status.textContent = strings.error;
      retry.hidden = false;
    }).finally(function () {
      pending = null;
    });
  }

  function openSearch() {
    if (dialog.open) return;
    previousFocus = document.activeElement;
    dialog.showModal();
    document.documentElement.classList.add("search-open");
    input.focus();
    input.select();
    loadPosts();
  }

  trigger.addEventListener("click", openSearch);
  document.getElementById("search-close").addEventListener("click", function () { dialog.close(); });
  retry.addEventListener("click", loadPosts);
  dialog.addEventListener("close", function () {
    document.documentElement.classList.remove("search-open");
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  });
  dialog.addEventListener("click", function (event) {
    if (event.target !== dialog) return;
    var rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  document.addEventListener("keydown", function (event) {
    if (event.isComposing || event.repeat) return;
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (dialog.open) dialog.close();
      else openSearch();
    }
  });
  input.addEventListener("input", function (event) {
    if (!event.isComposing) render();
  });
  input.addEventListener("compositionend", render);
  dialog.addEventListener("keydown", function (event) {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
      return;
    }
    var links = Array.from(list.querySelectorAll("a"));
    var index = links.indexOf(document.activeElement);
    if (event.target === input && event.key === "Enter" && matches.length) {
      event.preventDefault();
      window.location.assign(matches[0].url);
    } else if (event.key === "ArrowDown" && links.length && (event.target === input || index !== -1)) {
      event.preventDefault();
      links[Math.min(index + 1, links.length - 1)].focus();
    } else if (event.key === "ArrowUp" && (event.target === input || index !== -1)) {
      event.preventDefault();
      if (index > 0) links[index - 1].focus();
      else input.focus();
    }
  });
})();
