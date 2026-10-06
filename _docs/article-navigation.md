# Article navigation

Article H2/H3 headings receive section links that copy their absolute URL. Existing
Kramdown IDs are preserved, including Chinese and explicitly assigned IDs.
Clipboard failures leave normal anchor navigation available and announce a fallback.

Articles with at least two headings get a directory: sticky on screens at least
900 CSS pixels wide, collapsible above the article in narrower windows. The sidebar
is compact from 900 to 1199 pixels and wider from 1200 pixels. Browser zoom changes
the available CSS viewport width. Keep the 900-pixel breakpoint in the stylesheet
and `matchMedia` query in sync. The directory follows the current section and
supports keyboard navigation. Without JavaScript, articles remain readable with
their original heading anchors.

Styles and scripts are loaded only by the post layout. Translations live in
`_data/article_navigation.yml`.
