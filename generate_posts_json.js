/**
 * generate_posts_json.js - 記事JSON生成スクリプト
 * 簡単性・可読性・安全性・確実性を重視した改良版
 */

const fs = require('fs');
const path = require('path');
const { extractMeta, extractTitle, isValidDateFormat, extractDateFromFilename } = require('./lib/html-parser');

const REPO_ROOT = process.cwd();
const POSTS_DIR = path.join(REPO_ROOT, 'posts');
const OUTPUT_FILE = path.join(REPO_ROOT, 'posts.json');

/**
 * エラークラス - 明確なエラー情報を提供
 */
class PostProcessingError extends Error {
  constructor(message, filename, cause) {
    super(message);
    this.name = 'PostProcessingError';
    this.filename = filename;
    this.cause = cause;
  }
}

/**
 * 単一記事ファイルを処理
 * @param {string} filename - ファイル名
 * @param {string} html - HTMLコンテンツ
 * @returns {Object} 記事データオブジェクト
 */
function processPostFile(filename, html) {
  try {
    const title = extractTitle(html);
    if (!title) {
      throw new PostProcessingError('タイトルが見つかりません', filename);
    }

    // 日付の取得と検証
    let date = extractMeta(html, 'date');
    if (!date) {
      // ファイル名から日付を抽出
      date = extractDateFromFilename(filename);
    }
    
    if (!date || !isValidDateFormat(date)) {
      throw new PostProcessingError(`有効な日付が見つかりません: ${date}`, filename);
    }

    // 基本データ
    const post = {
      title: title.trim(),
      url: `/my-blog/posts/${filename}`,
      date: date,
      excerpt: extractMeta(html, 'description') || '',
      tags: [],
      cover: null
    };

    // タグの処理
    const tagsStr = extractMeta(html, 'tags');
    if (tagsStr) {
      post.tags = tagsStr.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }

    // カバー画像の処理
    const cover = extractMeta(html, 'cover');
    if (cover) {
      // 相対パスを絶対パスに変換
      if (cover.startsWith('/my-blog/')) {
        post.cover = cover;
      } else if (cover.startsWith('images/')) {
        post.cover = `/my-blog/${cover}`;
      } else if (!cover.startsWith('http')) {
        post.cover = `/my-blog/images/${cover}`;
      } else {
        post.cover = cover;
      }
    }

    return post;

  } catch (error) {
    if (error instanceof PostProcessingError) {
      throw error;
    }
    throw new PostProcessingError('記事処理中にエラーが発生しました', filename, error);
  }
}

/**
 * メイン処理関数
 */
async function main() {
  console.log('📝 記事JSON生成を開始します...');

  try {
    // postsディレクトリの存在確認
    if (!fs.existsSync(POSTS_DIR)) {
      throw new Error(`postsディレクトリが見つかりません: ${POSTS_DIR}`);
    }

    // HTMLファイルの取得
    const files = fs.readdirSync(POSTS_DIR)
      .filter(file => file.endsWith('.html') && !file.startsWith('post-template'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  処理対象の記事ファイルが見つかりませんでした');
      await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify([], null, 2), 'utf8');
      return;
    }

    console.log(`📄 ${files.length}個のファイルを処理します`);

    const posts = [];
    const errors = [];

    // 各ファイルを処理
    for (const filename of files) {
      try {
        console.log(`  処理中: ${filename}`);
        const filepath = path.join(POSTS_DIR, filename);
        const html = await fs.promises.readFile(filepath, 'utf8');
        const post = processPostFile(filename, html);
        posts.push(post);
        console.log(`  ✅ 完了: ${post.title}`);
      } catch (error) {
        console.error(`  ❌ エラー: ${filename} - ${error.message}`);
        errors.push({ filename, error: error.message });
      }
    }

    // 日付順にソート（新しい順）
    posts.sort((a, b) => b.date.localeCompare(a.date));

    // JSON出力
    await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify(posts, null, 2), 'utf8');

    // 結果レポート
    console.log('\n📊 処理結果:');
    console.log(`  - 成功: ${posts.length}件`);
    console.log(`  - エラー: ${errors.length}件`);
    
    if (errors.length > 0) {
      console.log('\n❌ エラーファイル:');
      errors.forEach(({ filename, error }) => {
        console.log(`  - ${filename}: ${error}`);
      });
      process.exit(1);
    }

    console.log(`\n✅ posts.json を生成しました (${posts.length}件の記事)`);

  } catch (error) {
    console.error('\n💥 致命的エラー:', error.message);
    if (error.cause) {
      console.error('原因:', error.cause.message);
    }
    process.exit(1);
  }
}

// スクリプトとして実行された場合のみmainを呼び出し
if (require.main === module) {
  main().catch(error => {
    console.error('予期しないエラー:', error);
    process.exit(1);
  });
}

module.exports = { processPostFile, PostProcessingError };
