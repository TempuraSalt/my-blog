/**
 * seo-enhancement.js
 * HTMLファイルにcanonical URLと構造化データを追加
 */

const fs = require('fs');
const path = require('path');
const { extractMeta, extractTitle } = require('../lib/html-parser');

/**
 * 記事ファイル名からURLを生成
 * @param {string} filename - ファイル名
 * @returns {string} 完全なURL
 */
function generateArticleUrl(filename) {
  return `https://tempurasalt.github.io/my-blog/posts/${filename}`;
}

/**
 * 記事ページ用のBlogPosting構造化データを生成
 * @param {string} filename - ファイル名
 * @param {string} html - HTMLコンテンツ
 * @returns {string} JSON-LD文字列
 */
function generateBlogPostingSchema(filename, html) {
  const title = extractTitle(html) || '記事タイトル';
  const description = extractMeta(html, 'description') || '';
  const date = extractMeta(html, 'date') || new Date().toISOString().split('T')[0];
  const tags = extractMeta(html, 'tags') || '';
  const coverImage = extractMeta(html, 'cover') || '';

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "datePublished": date,
    "dateModified": date,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": generateArticleUrl(filename)
    },
    "author": {
      "@type": "Person",
      "name": "ブログ管理者"
    },
    "publisher": {
      "@type": "Organization",
      "name": "ブログ・ザ・ブログ-built by AI",
      "url": "https://tempurasalt.github.io/my-blog/"
    }
  };

  if (coverImage) {
    schema.image = coverImage;
  }

  if (tags) {
    schema.keywords = tags.split(',').map(tag => tag.trim()).filter(Boolean);
  }

  return JSON.stringify(schema, null, 2);
}

/**
 * HTMLファイルにcanonical URLと構造化データを追加
 * @param {string} filepath - ファイルパス
 * @param {string} html - HTMLコンテンツ
 * @returns {string} 更新されたHTML
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

module.exports = { addSeoEnhancements, generateArticleUrl, generateBlogPostingSchema };
