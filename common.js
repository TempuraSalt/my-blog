/**
 * common.js - 共通JavaScript機能
 * 簡単性・可読性・安全性・確実性を重視した改良版
 */

/**
 * common.js の初期化が完了したことを示すPromise。
 * 他のスクリプトは、このPromiseが解決されるのを待つことで、
 * 安全に関数やデータを利用できる。
 */
window.commonReady = new Promise(resolve => {
  // DOMContentLoadedイベントをリッスンし、すべての初期化処理が終わったらresolve()を呼ぶ
  document.addEventListener('DOMContentLoaded', async () => {
    await initializeCommon();
    resolve();
  });
});
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

/**
 * ヘッダーとフッターの読み込みなど、共通の初期化処理をまとめた関数
 */
async function initializeCommon() {
  // Promise.allを使って並行して読み込むことで高速化
  const includePromises = [
    include('/my-blog/header.html', '#site-header'),
    include('/my-blog/footer.html', '#site-footer')
  ];
  await Promise.all(includePromises);

  // 記事ページ共通の処理を実行
  renderPostPageElements();
}

/**
 * 記事ページの共通要素（パンくず、メタ情報、カバー画像など）を動的に描画する
 */
function renderPostPageElements() {
  // 記事ページ（<main data-page-type="post">）であるかを判定
  const mainElement = document.querySelector('main[data-page-type="post"]');
  if (!mainElement) {
    return; // 記事ページでなければ何もしない
  }

  // --- <head>からメタデータを取得 ---
  const h1Element = document.querySelector('h1');
  const postTitle = h1Element ? h1Element.textContent.trim() : (document.title.split(' - ')[0] || '').trim();
  const postDate = document.querySelector('meta[name="date"]')?.content;
  const postTags = document.querySelector('meta[name="tags"]')?.content;
  const coverImageSrc = document.querySelector('meta[name="cover"]')?.content;
  const coverImageAlt = `カバー画像: ${postTitle}`; // altはタイトルから自動生成
  const description = document.querySelector('meta[name="description"]')?.content;

  // --- <head>内の情報を動的に設定・補完 ---
  const siteTitle = 'ブログ・ザ・ブログ-built by AI';
  document.title = `${postTitle} - ${siteTitle}`;

  // OGPタイトルの設定
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', postTitle);

  // OGP説明の設定
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription && description) ogDescription.setAttribute('content', description);

  // OGP画像の設定
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage && coverImageSrc) ogImage.setAttribute('content', coverImageSrc);


  // --- パンくずリスト生成 ---
  const breadcrumbContainer = document.getElementById('breadcrumb-container');
  if (breadcrumbContainer) {
    breadcrumbContainer.innerHTML = `
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a href="/my-blog/">ホーム</a></li>
          <li class="breadcrumb-item active" aria-current="page">${escapeHtml(postTitle)}</li>
        </ol>
      </nav>
    `;
  }

  // --- 記事メタ情報（日付・タグ）生成 ---
  const metaContainer = document.querySelector('[data-post-element="meta"]');
  if (metaContainer && postDate) {
    let tagsHtml = '';
    if (postTags) {
      const tagsArray = postTags.split(',').map(tag => tag.trim()).filter(Boolean);
      if (tagsArray.length > 0) {
        tagsHtml = ` · タグ: <span class="tags">${escapeHtml(tagsArray.join(', '))}</span>`;
      }
    }
    metaContainer.innerHTML = `${escapeHtml(postDate)}${tagsHtml}`;
  }

  // --- カバー画像生成 ---
  const coverContainer = document.querySelector('[data-post-element="cover-container"]');
  if (coverContainer && coverImageSrc && coverImageSrc !== 'null') {
    coverContainer.innerHTML = `
      <figure style="margin:18px 0;">
        <img src="${escapeHtml(coverImageSrc)}" alt="${escapeHtml(coverImageAlt)}" style="width:100%;height:auto;border-radius:6px;" loading="lazy">
      </figure>
    `;
  }

  // --- 「記事一覧に戻る」リンク生成 ---
  const postFooterNav = document.getElementById('post-footer-nav');
  if (postFooterNav) {
    postFooterNav.innerHTML = '<p><a href="/my-blog/">← 記事一覧に戻る</a></p>';
  }
}

// 簡易的なHTMLエスケープ関数（XSS対策）
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[match]);
}
