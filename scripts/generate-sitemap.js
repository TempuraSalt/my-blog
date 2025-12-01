/**
 * generate-sitemap.js
 * sitemap.xmlを自動生成するスクリプト
 * posts.jsonを情報源として利用します。
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = process.cwd();

/**
 * ファイルの最終更新日を取得（YYYY-MM-DD形式）
 */
function getFileLastModified(filepath) {
  try {
    const stats = fs.statSync(filepath);
    const date = stats.mtime;
    return date.toISOString().split('T')[0];
  } catch (error) {
    // ファイルが存在しない場合は現在の日付を返す
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * URLエントリを生成
 */
function generateUrlEntry(loc, lastmod, priority = '0.8', changefreq = 'monthly', imageUrl = null) {
  let imageEntry = '';
  if (imageUrl) {
    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `https://tempurasalt.github.io${imageUrl}`;
    imageEntry = `
    <image:image>
      <image:loc>${fullImageUrl}</image:loc>
    </image:image>`;
  }
  return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${imageEntry}
  </url>`;
}

/**
 * sitemap.xmlを生成
 */
function generateSitemap() {
  const currentDate = new Date().toISOString().split('T')[0];
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  // ホームページ（index.htmlは実際には存在しないので、ルートパスを使用）
  sitemap += generateUrlEntry(
    'https://tempurasalt.github.io/my-blog/',
    currentDate,
    '1.0',
    'daily'
  );

  // 固定ページ
  const staticPages = [
    { path: 'about.html', priority: '0.8', changefreq: 'monthly' },
    { path: 'contact.html', priority: '0.8', changefreq: 'monthly' }
  ];

  staticPages.forEach(page => {
    const filepath = path.join(REPO_ROOT, page.path);
    const lastmod = getFileLastModified(filepath);
    const url = `https://tempurasalt.github.io/my-blog/${page.path}`;

    sitemap += generateUrlEntry(url, lastmod, page.priority, page.changefreq);
  });

  // 記事ページ
  const postsJsonPath = path.join(REPO_ROOT, 'posts.json');
  if (fs.existsSync(postsJsonPath)) {
    const posts = JSON.parse(fs.readFileSync(postsJsonPath, 'utf8'));

    posts.forEach(post => {
      // post.url は /my-blog/posts/... の形式なので、ドメインを追加
      const url = `https://tempurasalt.github.io${post.url}`;
      // post.date を lastmod として使用
      const lastmod = post.date;
      // post.cover があれば画像URLとして使用
      const imageUrl = post.cover;

      sitemap += generateUrlEntry(url, lastmod, '0.9', 'weekly', imageUrl);
    });
  }

  sitemap += '</urlset>';
  return sitemap;
}

/**
 * メイン処理関数
 */
function main() {
  console.log('🚀 sitemap.xmlの自動生成を開始します...\n');

  try {
    const sitemap = generateSitemap();
    const sitemapPath = path.join(REPO_ROOT, 'sitemap.xml');

    fs.writeFileSync(sitemapPath, sitemap, 'utf8');

    console.log('✅ sitemap.xmlを生成しました');
    console.log(`📄 保存先: ${sitemapPath}`);

    // 生成されたsitemapの内容を表示
    const lines = sitemap.split('\n');
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    console.log(`📊 統計情報:`);
    console.log(`  - URL数: ${urlCount}件`);
    console.log(`  - サイズ: ${Math.round(sitemap.length / 1024)}KB`);

    console.log('\n📋 生成されたsitemapの内容プレビュー:');
    console.log(lines.slice(0, 15).join('\n'));
    if (lines.length > 15) {
      console.log(`... (全${lines.length}行)`);
    }

  } catch (error) {
    console.error('💥 エラー:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateSitemap, getFileLastModified };
