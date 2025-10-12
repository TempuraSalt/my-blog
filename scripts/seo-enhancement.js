/**
 * HTMLファイルにcanonical URLと構造化データを追加
 */
function addSeoEnhancements(filepath, html) {
  const filename = path.basename(filepath);

  // canonical URLを追加（既に存在する場合はスキップ）
  if (!html.includes('rel="canonical"')) {
    const canonicalUrl = generateArticleUrl(filename);
    const canonicalTag = `  <link rel="canonical" href="${canonicalUrl}">`;

    // </head>タグの前にcanonical URLを挿入
    html = html.replace(
      '  </head>',
      canonicalTag + '\n  </head>'
    );
  }

  // 構造化データを追加（既に存在する場合はスキップ）
  if (!html.includes('application/ld+json')) {
    const schema = generateBlogPostingSchema(filename, html);
    const structuredDataScript = `  <!-- 構造化データ -->\n  <script type="application/ld+json">\n${schema}\n  </script>`;

    // </head>タグの前に構造化データを挿入
    html = html.replace(
      '  </head>',
      structuredDataScript + '\n  </head>'
    );
  }

  return html;
}
