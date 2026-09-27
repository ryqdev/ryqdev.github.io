# Topics

Home pages provide topic shortcuts; each article badge links to a matching section
of `/topics/` or `/zh/topics/`. These static pages group published posts by their
existing tags, newest first. No JavaScript or custom Jekyll plugin is required.

Tags belong to the current language. Add or translate a post's `tags` field and
the index updates on the next build. The language switch pairs both topic indexes.
Tag IDs are URL-encoded before being placed in a fragment, preserving distinctions
between tags such as `C++` and `C#`, and supporting Chinese and spaces.

Post cards use separate topic and article anchors; the article link covers the
card background without nesting anchors or intercepting topic clicks.
