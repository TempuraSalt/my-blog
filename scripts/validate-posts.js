/**
 * validate-posts.js
 * 記事ファイルの構造と内容を検証するスクリプト
 * 簡単性・可読性・安全性・確実性を重視した改良版
 */

const fs = require('fs');
const path = require('path');
const { extractMeta, extractTitle, isValidDateFormat } = require('../lib/html-parser');

const REPO_ROOT = process.cwd();
const POSTS_DIR = path.join(REPO_ROOT, 'posts');

/**
 * 単一記事ファイルを検証
 * @param {string} filename - ファイル名
 * @param {string} html - HTMLコンテンツ
 * @returns {Object} 検証結果 { errors: [], warnings: [] }
 */
function validatePostFile(filename, html) {
  const errors = [];
  const warnings = [];

  // 入力検証
  if (!html || typeof html !== 'string') {
    errors.push('HTMLコンテンツが無効です');
    return { errors, warnings };
  }

  // 必須要素チェック
  if (!html.includes('<!doctype html>') && !html.includes('<!DOCTYPE html>')) {
    errors.push('DOCTYPE宣言が見つかりません');
  }

  if (!html.includes('<html lang="ja">')) {
    warnings.push('HTML要素にlang="ja"属性がありません');
  }

  // title要素チェック
  const title = extractTitle(html);
  if (!title) {
    errors.push('titleタグが見つからないか、内容が空です');
  } else if (title.length > 60) {
    warnings.push(`titleが長すぎます (${title.length}文字): ${title.substring(0, 50)}...`);
  }

  // 必須メタタグチェック
  const description = extractMeta(html, 'description');
  if (!description) {
    errors.push('meta name="description"が見つかりません');
  } else if (description.length > 160) {
    warnings.push(`descriptionが長すぎます (${description.length}文字)`);
  }

  const date = extractMeta(html, 'date');
  if (!date) {
    warnings.push('meta name="date"が見つかりません');
  } else if (!isValidDateFormat(date)) {
    errors.push(`dateの形式が正しくありません: ${date} (YYYY-MM-DD形式で入力してください)`);
  }

  // SEO/OGPメタタグチェック
  if (!html.includes('rel="canonical"')) {
    warnings.push('canonical URL (<link rel="canonical" ...>) が見つかりません');
  }

  const ogTitle = extractMeta(html, 'og:title', 'property');
  if (!ogTitle) {
    warnings.push('OGPタイトル (<meta property="og:title" ...>) が見つかりません');
  }

  const ogImage = extractMeta(html, 'og:image', 'property');
  if (!ogImage) {
    warnings.push('OGP画像 (<meta property="og:image" ...>) が見つかりません');
  } else if (ogImage.startsWith('http')) {
    warnings.push(`og:imageのパスは絶対パス (/my-blog/images/...) を推奨します: ${ogImage}`);
  }

  // CSSとJSの読み込みチェック
  if (!html.includes('href="/my-blog/style.css"')) {
    errors.push('style.cssの読み込みが見つかりません');
  }

  if (!html.includes('src="/my-blog/common.js"')) {
    errors.push('common.jsの読み込みが見つかりません');
  }

  // 構造チェック
  if (!html.includes('id="site-header"')) {
    errors.push('#site-header要素が見つかりません');
  }

  if (!html.includes('id="site-footer"')) {
    errors.push('#site-footer要素が見つかりません');
  }

  // 画像パスチェック（簡素化）
  const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["']/g);
  if (imgMatches) {
    imgMatches.forEach(match => {
      const srcMatch = match.match(/src=["']([^"']+)["']/);
      if (!srcMatch) return;
      
      const src = srcMatch[1];
      if (src.startsWith('/my-blog/images/')) {
        const imagePath = src.substring(9); // '/my-blog/'を除去
        const fullPath = path.join(REPO_ROOT, imagePath);
        if (!fs.existsSync(fullPath)) {
          warnings.push(`画像が見つかりません: ${src}`);
        }
      } else if (!src.startsWith('http')) {
        warnings.push(`画像パスが推奨形式ではありません: ${src}`);
      }
    });
  }

  return { errors, warnings };
}

/**
 * メイン処理関数
 */
function main() {
  console.log('📝 記事ファイルの検証を開始します...\n');

  try {
    if (!fs.existsSync(POSTS_DIR)) {
      console.error('❌ postsディレクトリが見つかりません:', POSTS_DIR);
      process.exit(1);
    }

    const files = fs.readdirSync(POSTS_DIR)
      .filter(f => f.endsWith('.html') && !f.startsWith('post-template'))
      .sort();
    
    if (files.length === 0) {
      console.log('📄 記事ファイルが見つかりませんでした');
      return;
    }

    let totalErrors = 0;
    let totalWarnings = 0;

    files.forEach(filename => {
      console.log(`🔍 検証中: ${filename}`);
      
      try {
        const filepath = path.join(POSTS_DIR, filename);
        const html = fs.readFileSync(filepath, 'utf8');
        const { errors, warnings } = validatePostFile(filename, html);

        if (errors.length > 0) {
          console.log(`  ❌ エラー (${errors.length}件):`);
          errors.forEach(error => console.log(`    - ${error}`));
          totalErrors += errors.length;
        }

        if (warnings.length > 0) {
          console.log(`  ⚠️  警告 (${warnings.length}件):`);
          warnings.forEach(warning => console.log(`    - ${warning}`));
          totalWarnings += warnings.length;
        }

        if (errors.length === 0 && warnings.length === 0) {
          console.log('  ✅ 問題なし');
        }

      } catch (error) {
        console.error(`  💥 ファイル読み込みエラー: ${error.message}`);
        totalErrors++;
      }

      console.log('');
    });

    // 結果サマリー
    console.log('📊 検証結果:');
    console.log(`  - 検証ファイル数: ${files.length}`);
    console.log(`  - エラー総数: ${totalErrors}`);
    console.log(`  - 警告総数: ${totalWarnings}`);

    if (totalErrors > 0) {
      console.log('\n❌ エラーが見つかりました。修正してください。');
      process.exit(1);
    } else if (totalWarnings > 0) {
      console.log('\n⚠️  警告がありますが、動作に問題はありません。');
    } else {
      console.log('\n✅ すべてのファイルが正常です！');
    }

  } catch (error) {
    console.error('💥 予期しないエラー:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validatePostFile };
