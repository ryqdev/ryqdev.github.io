(function () {
  var strings = JSON.parse(document.getElementById("ui-strings").textContent);
  // ---------- RSS subscription menu ----------
  var rssMenu = document.querySelector(".rss-menu");
  if (rssMenu) {
    document.addEventListener("click", function (event) {
      if (!rssMenu.contains(event.target)) rssMenu.open = false;
    });
    rssMenu.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && rssMenu.open) {
        rssMenu.open = false;
        rssMenu.querySelector("summary").focus();
        event.preventDefault();
      }
    });
    rssMenu.addEventListener("focusout", function (event) {
      if (!rssMenu.contains(event.relatedTarget)) rssMenu.open = false;
    });
  }

  // ---------- Theme toggle ----------
  function syncThemeIcons() {
    var isDark = document.documentElement.classList.contains("dark");
    var sun = document.querySelector(".theme-icon--sun");
    var moon = document.querySelector(".theme-icon--moon");
    if (sun) sun.style.display = isDark ? "block" : "none";
    if (moon) moon.style.display = isDark ? "none" : "block";
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.title = isDark ? strings.light_mode : strings.dark_mode;
      btn.setAttribute("aria-label", btn.title);
    }
  }

  function syncGiscusTheme() {
    var isDark = document.documentElement.classList.contains("dark");
    var frame = document.querySelector("iframe.giscus-frame");
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage(
      { giscus: { setConfig: { theme: isDark ? "dark" : "light" } } },
      "https://giscus.app"
    );
  }

  var toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var next = !document.documentElement.classList.contains("dark");
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch (e) {}
      syncThemeIcons();
      syncGiscusTheme();
    });
  }
  syncThemeIcons();

  // When giscus sends any message (load, resize, etc), re-assert our theme.
  window.addEventListener("message", function (event) {
    if (event.origin !== "https://giscus.app") return;
    if (event.data && event.data.giscus) syncGiscusTheme();
  });

  // ---------- Mount giscus with the correct theme from the start ----------
  function mountGiscus() {
    var mount = document.getElementById("giscus-mount");
    if (!mount || mount.dataset.mounted === "1") return;
    mount.dataset.mounted = "1";

    var isDark = document.documentElement.classList.contains("dark");
    var script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-loading", "lazy");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-theme", isDark ? "dark" : "light");

    var copy = [
      "repo", "repoId", "category", "categoryId", "mapping",
      "reactionsEnabled", "emitMetadata", "inputPosition", "lang"
    ];
    copy.forEach(function (key) {
      var v = mount.dataset[key];
      if (v == null) return;
      var attr = "data-" + key.replace(/[A-Z]/g, function (c) {
        return "-" + c.toLowerCase();
      });
      script.setAttribute(attr, v);
    });

    mount.appendChild(script);
  }
  mountGiscus();

  // ---------- Copy-code buttons ----------
  var COPY_SVG =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  var CHECK_SVG =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  var blocks = document.querySelectorAll(
    ".prose pre, .prose div.highlight, .prose figure.highlight"
  );
  var codeBlock = 0;
  blocks.forEach(function (block) {
    // Rouge wraps code in <div class="highlight"><pre>…</pre></div>; the
    // selector matches both layers, so skip the inner <pre> when an outer
    // wrapper exists — that wrapper will get the button.
    if (
      block.tagName === "PRE" &&
      block.parentElement &&
      block.parentElement.matches("div.highlight, figure.highlight")
    ) {
      return;
    }
    if (block.querySelector(":scope > .copy-btn")) return;
    var codeIndex = ++codeBlock;
    var btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.innerHTML = COPY_SVG;
    btn.title = strings.copy;
    btn.setAttribute("aria-label", strings.copy);
    btn.addEventListener("click", function () {
      var code = block.querySelector("code") || block;
      var text = code.innerText || code.textContent || "";
      navigator.clipboard.writeText(text).then(function () {
        window.siteAnalytics?.track('code_copy', { code_block: codeIndex });
        btn.innerHTML = CHECK_SVG;
        btn.title = strings.copied;
        btn.setAttribute("aria-label", strings.copied);
        setTimeout(function () {
          btn.innerHTML = COPY_SVG;
          btn.title = strings.copy;
          btn.setAttribute("aria-label", strings.copy);
        }, 2000);
      }).catch(function () { /* Keep the copy button unchanged when copying fails. */ });
    });
    block.appendChild(btn);
  });
})();
