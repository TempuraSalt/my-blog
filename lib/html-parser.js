/**
 * html-parser.js - 共通HTMLパーサーライブラリ
 * 簡単性・可読性・安全性・確実性を重視
 */

/**
 * HTMLからメタタグの内容を抽出
 * @param {string} html - HTMLコンテンツ
 * @param {string} name - メタタグのname属性
 * @returns {string|null} メタタグの内容、見つからない場合はnull
 */
function extractMeta(html, name) {
  if (!html || typeof html !== 'string' || !name) {
    return null;
  }

  // パターン1: <meta name="name" content="...">
  const pattern1 = new RegExp(`<meta[^>]*name=["']${escapeRegex(name)}["'][^>]*content=["']([^"']*)["']`, 'i');
  const match1 = html.match(pattern1);
  if (match1) return match1[1].trim();
  
  // パターン2: <meta content="..." name="name">
  const pattern2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${escapeRegex(name)}["']`, 'i');
  const match2 = html.match(pattern2);
  if (match2) return match2[1].trim();
  
  return null;
}

/**
 * HTMLからタイトルを抽出
 * @param {string} html - HTMLコンテンツ
 * @returns {string|null} タイトル、見つからない場合はnull
 */
function extractTitle(html) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  // <title>タグから抽出
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // フォールバック: <h1>タグから抽出
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].replace(/<[^>]+>/g, '').trim();
  }
  
  return null;
}

/**
 * HTMLエスケープ処理
 * @param {any} input - エスケープする値
 * @returns {string} エスケープされた文字列
 */
function escapeHtml(input) {
  if (input == null) return '';
  
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * 正規表現用文字列エスケープ
 * @param {string} string - エスケープする文字列
 * @returns {string} エスケープされた文字列
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 日付文字列の検証
 * @param {string} dateString - 検証する日付文字列
 * @returns {boolean} YYYY-MM-DD形式かどうか
 */
function isValidDateFormat(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    return false;
  }
  
  // 実際の日付として有効かチェック
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateString;
}

/**
 * ファイル名から日付を抽出
 * @param {string} filename - ファイル名
 * @returns {string|null} 抽出された日付、見つからない場合はnull
 */
function extractDateFromFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return null;
  }
  
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

module.exports = {
  extractMeta,
  extractTitle,
  escapeHtml,
  isValidDateFormat,
  extractDateFromFilename
};
