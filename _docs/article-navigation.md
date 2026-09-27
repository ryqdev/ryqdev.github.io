# Article navigation

Article H2/H3 headings receive section links that copy their absolute URL. Existing
Kramdown IDs are preserved, including Chinese and explicitly assigned IDs.
Clipboard failures leave normal anchor navigation available and announce a fallback.

Articles with at least two headings get a directory: sticky on screens at least
1200 px wide, collapsible above the article on smaller screens. It follows the
current section and supports keyboard navigation. Without JavaScript, articles
remain readable with their original heading anchors.

Styles and scripts are loaded only by the post layout. Translations live in
`_data/article_navigation.yml`.
