/**
 * common.js - 共通JavaScript機能
 * 簡単性・可読性・安全性・確実性を重視した改良版
 */

/**
 * ページの一部を安全に読み込む
 * @param {string} path - 読み込むファイルのパス
 * @param {string} selector - 挿入先のセレクター
 */
async function include(path, selector) {
  if (!path || !selector) {
    console.error('include: パスとセレクターが必要です');
    return;
  }

  try {
    const response = await fetch(path);
    if (!response.ok) {
      console.warn(`include: ${path} の読み込みに失敗しました (${response.status})`);
      return;
    }
    
    const text = await response.text();
    const element = document.querySelector(selector);
    
    if (!element) {
      console.warn(`include: セレクター "${selector}" の要素が見つかりません`);
      return;
    }
    
    element.innerHTML = text;
    
  } catch (error) {
    console.error(`include: ${path} の読み込み中にエラーが発生しました:`, error);
  }
}

/**
 * 記事データを安全に取得
 * @returns {Promise<Array>} 記事データの配列
 */
window.loadPosts = async function() {
  try {
    const response = await fetch('/my-blog/posts.json');
    
    if (!response.ok) {
      console.warn(`loadPosts: posts.json の読み込みに失敗しました (${response.status})`);
      return [];
    }
    
    const data = await response.json();
    
    // データの基本検証
    if (!Array.isArray(data)) {
      console.error('loadPosts: posts.json が配列ではありません');
      return [];
    }
    
    // 各記事の基本検証
    return data.filter(post => {
      if (!post || typeof post !== 'object') {
        console.warn('loadPosts: 無効な記事オブジェクトをスキップしました:', post);
        return false;
      }
      
      if (!post.title || !post.url || !post.date) {
        console.warn('loadPosts: 必須フィールドが不足している記事をスキップしました:', post);
        return false;
      }
      
      return true;
    });
    
  } catch (error) {
    console.error('loadPosts: 記事データの取得中にエラーが発生しました:', error);
    return [];
  }
};

// DOMContentLoaded時にヘッダーとフッターを挿入
document.addEventListener('DOMContentLoaded', () => {
  include('/my-blog/header.html', '#site-header');
  include('/my-blog/footer.html', '#site-footer');
});
