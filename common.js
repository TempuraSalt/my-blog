/* common.js
 - header.html と footer.html を読み込み、body内の #site-header / #site-footer に挿入します
 - GitHub Pagesのサブパスに合わせて絶対パス(/my-blog/...) を使用
*/
async function include(path, selector){
  try{
    const r = await fetch(path);
    if(!r.ok) return;
    const text = await r.text();
    const el = document.querySelector(selector);
    if(el) el.innerHTML = text;
  }catch(e){console.error('include error', e)}
}

document.addEventListener('DOMContentLoaded', ()=>{
  include('/my-blog/header.html', '#site-header');
  include('/my-blog/footer.html', '#site-footer');
});

// 小さなヘルパー：posts.json を読み込んでコールバックを呼ぶ
async function loadPosts(){
  const r = await fetch('/my-blog/posts.json');
  if(!r.ok) return [];
  return await r.json();
}