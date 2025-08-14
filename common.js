/* common.js
 - header.html と footer.html を読み込み、body内の #site-header / #site-footer に挿入します
 - GitHub Pagesのサブパスに合わせて絶対パス(/my-blog/...) を使用
*/

// include関数（ページの一部を読み込む）
async function include(path, selector){
  try{
    const r = await fetch(path);
    if(!r.ok) return;
    const text = await r.text();
    const el = document.querySelector(selector);
    if(el) el.innerHTML = text;
  }catch(e){ console.error('include error', e) }
}

// DOMContentLoaded 時にヘッダーとフッターを挿入する
document.addEventListener('DOMContentLoaded', ()=>{
  include('/my-blog/header.html', '#site-header');
  include('/my-blog/footer.html', '#site-footer');
});

// loadPosts をグローバル関数として確実に公開する
window.loadPosts = async function(){
  try{
    const r = await fetch('/my-blog/posts.json', { cache: "no-store" });
    if(!r.ok){
      console.warn('loadPosts: fetch failed', r.status, r.statusText);
      return [];
    }
    return await r.json();
  }catch(e){
    console.error('loadPosts fetch error', e);
    return [];
  }
};
