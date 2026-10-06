# Further reading

Article pages display up to three other published posts in the current language,
before comments. Selection is deterministic:

1. Optional editorial picks in `related_posts`, in order, using translation keys.
2. Posts with the most shared tags, newest first when scores tie.
3. Recent posts fill remaining slots when no shared tags exist.

```yaml
related_posts:
  - another-post-translation-key
  - one-more-post-translation-key
```

The same keys resolve to the current language's translations. Missing keys,
duplicate picks, and the current article are skipped. When no other articles
exist, the entire section is omitted. This is built with Liquid and works without
JavaScript or custom plugins. Series navigation can be added when a real series
exists.
