/**
 * generate_posts_json.js
 * - posts/ をスキャンして posts.json を生成
 * - 既存 posts.json があれば読み込み、既に cover を持つ記事の cover は保持する
 *
 * 実行:
 *   node generate_posts_json.js
 *
 * 注意:
 *   - Node.js 14+ 推奨（fs/promises を使用）
 *   - リポジトリルートで実行する想定
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = process.cwd();
const POSTS_DIR = path.join(REPO_ROOT, 'posts');
const IMAGES_DIR = path.join(REPO_ROOT, 'images');
const GENERATED_DIR = path.join(IMAGES_DIR, 'generated');
const POSTS_JSON = path.join(REPO_ROOT, 'posts.json');

function safeReadFileSync(p){
  try { return fs.readFileSync(p, 'utf8'); }
  catch(e){ return null; }
}

function extractBetween(html, startRegex, endRegex){
  const s = html.match(startRegex);
  if(!s) return null;
  // if startRegex captures group, return that
  if(s[1]) return s[1];
  // otherwise find endRegex from index
  const idx = html.indexOf(s[0]);
  if(idx === -1) return null;
  const sub = html.slice(idx + s[0].length);
  const m = sub.match(endRegex);
  return m ? m[1] || m[0] : null;
}

function extractMeta(html, name){
  // <meta name="name" content="..."> or <meta property="og:title" content="...">
  const re = new RegExp(`<meta[^>]*(?:name|property)=(["'])${name}\\1[^>]*content=(["'])([\\s\\S]*?)\\2[^>]*>`, 'i');
  const m = html.match(re);
  if(m) return m[3].trim();
  // fallback: search meta with name (loose)
  const re2 = new RegExp(`<meta[^>]*content=(["'])([\\s\\S]*?)\\1[^>]*name=(["'])${name}\\3[^>]*>`, 'i');
  const m2 = html.match(re2);
  if(m2) return m2[2].trim();
  return null;
}

function extractTitle(html){
  // try og:title, then <title>, then <h1>
  const og = extractMeta(html, 'og:title') || extractMeta(html, 'og:title'.toLowerCase());
  if(og) return og;
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if(m) return m[1].trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if(h1) return h1[1].replace(/<[^>]+>/g,'').trim();
  return null;
}

function extractDate(html, filename){
  const metaDate = extractMeta(html, 'date') || extractMeta(html, 'publish_date') || extractMeta(html, 'published');
  if(metaDate) return metaDate;
  // fallback to filename like 2025-08-13-slug.html
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
  return m ? m[1] : null;
}

function extractExcerpt(html){
  const m = extractMeta(html, 'description') || extractMeta(html, 'Description') || extractMeta(html, 'excerpt');
  if(m) return m;
  // first paragraph
  const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if(p) return p[1].replace(/<[^>]+>/g,'').trim();
  return '';
}

function extractTags(html){
  const tagsRaw = extractMeta(html, 'tags') || extractMeta(html, 'Tags');
  if(!tagsRaw) return [];
  // allow comma, space, Japanese comma
  return tagsRaw.split(/[,、\s]+/).map(t=>t.trim()).filter(Boolean);
}

function slugFromFilename(filename){
  // 2025-08-13-my-post.html => my-post
  const name = filename.replace(/\.html?$/i,'');
  const m = name.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  return m ? m[1] : name;
}

function possibleCoverCandidates(date, slug){
  // return candidate relative paths (from repo root), in order of preference
  const candidates = [];
  // check generated folder variants
  if(slug){
    candidates.push(`images/generated/${slug}-800.webp`);
    candidates.push(`images/generated/${slug}-800.jpg`);
    candidates.push(`images/generated/${slug}.webp`);
    candidates.push(`images/generated/${slug}.jpg`);
  }
  if(date && slug){
    candidates.push(`images/generated/${date}-${slug}-800.webp`);
    candidates.push(`images/generated/${date}-${slug}-800.jpg`);
  }
  // check images/ direct
  if(slug){
    candidates.push(`images/${slug}-800.webp`);
    candidates.push(`images/${slug}-800.jpg`);
    candidates.push(`images/${slug}.webp`);
    candidates.push(`images/${slug}.jpg`);
    candidates.push(`images/${slug}.png`);
  }
  if(date){
    candidates.push(`images/${date}-cover.jpg`);
    candidates.push(`images/${date}-cover.webp`);
    candidates.push(`images/${date}-cover-800.jpg`);
    candidates.push(`images/${date}-cover-800.webp`);
  }
  // fallback: any file in images/ or images/generated that includes slug or date
  return candidates;
}

function listFiles(dir){
  try{
    return fs.readdirSync(dir || '.', { withFileTypes: true }).filter(d=>d.isFile()).map(d=>d.name);
  }catch(e){
    return [];
  }
}

function findFallbackByScanning(dir, includeTokens){
  // includeTokens: array of tokens that should appear in filename
  if(!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  for(const f of files){
    const lower = f.toLowerCase();
    let ok = false;
    for(const t of includeTokens){
      if(!t) continue;
      if(lower.includes(t.toLowerCase())) ok = true;
      else { ok = false; break; }
    }
    if(ok) return path.posix.join(path.basename(dir), f);
  }
  return null;
}

function fileExistsPosix(relPath){
  // relPath like images/xxx.jpg relative to repo root
  const abs = path.join(REPO_ROOT, relPath);
  return fs.existsSync(abs);
}

function normalizeCoverPath(rel){
  if(!rel) return null;
  // ensure it starts with /my-blog/
  if(rel.startsWith('/')) return rel;
  return `/my-blog/${rel.replace(/^\/+/,'')}`;
}

function buildPostObject(filename, html, existingByUrl){
  const title = extractTitle(html) || filename.replace(/\.html$/,'');
  const date = extractDate(html, filename) || '';
  const excerpt = extractExcerpt(html) || '';
  const tags = extractTags(html);
  const slug = slugFromFilename(filename);
  const url = `/my-blog/posts/${filename}`;
  const baseObj = { title, url, date, excerpt, tags };
  // try to find cover candidate
  // 1) if existingByUrl has cover (non-empty), preserve it
  const existing = existingByUrl[url];
  if(existing && existing.cover){
    baseObj.cover = existing.cover;
    return baseObj;
  }
  // 2) try candidates
  const candidates = possibleCoverCandidates(date, slug);
  for(const c of candidates){
    if(fileExistsPosix(c)){
      baseObj.cover = normalizeCoverPath(c);
      return baseObj;
    }
  }
  // 3) attempt scanning fallback (generated then images)
  const tokens = [slug, date].filter(Boolean);
  let found = findFallbackByScanning(GENERATED_DIR, tokens);
  if(found){
    baseObj.cover = normalizeCoverPath(found);
    return baseObj;
  }
  found = findFallbackByScanning(IMAGES_DIR, tokens);
  if(found){
    baseObj.cover = normalizeCoverPath(found);
    return baseObj;
  }
  // else no cover
  baseObj.cover = null;
  return baseObj;
}

(async function main(){
  try{
    if(!fs.existsSync(POSTS_DIR)){
      console.error('posts directory not found:', POSTS_DIR);
      process.exit(1);
    }

    // load existing posts.json if exists
    let existingPosts = [];
    try{
      if(fs.existsSync(POSTS_JSON)){
        const raw = fs.readFileSync(POSTS_JSON, 'utf8');
        existingPosts = JSON.parse(raw);
      }
    }catch(e){
      console.warn('Warning: could not parse existing posts.json, continuing with empty existing list.', e.message);
      existingPosts = [];
    }
    const existingByUrl = Object.fromEntries((existingPosts||[]).map(p=>[p.url, p]));

    // scan posts dir
    const files = fs.readdirSync(POSTS_DIR).filter(f => /\.html?$/.test(f)).sort();
    const newPosts = [];
    for(const f of files){
      const p = path.join(POSTS_DIR, f);
      const html = safeReadFileSync(p) || '';
      const obj = buildPostObject(f, html, existingByUrl);
      newPosts.push(obj);
    }

    // sort by date desc (if date missing, keep filename order)
    newPosts.sort((a,b)=>{
      if(a.date && b.date) return b.date.localeCompare(a.date);
      if(a.date) return -1;
      if(b.date) return 1;
      return 0;
    });

    // compare with existing posts.json content
    const newJson = JSON.stringify(newPosts, null, 2) + '\n';
    const existingRaw = fs.existsSync(POSTS_JSON) ? fs.readFileSync(POSTS_JSON, 'utf8') : null;
    if(existingRaw === newJson){
      console.log('No changes to posts.json');
    } else {
      fs.writeFileSync(POSTS_JSON, newJson, 'utf8');
      console.log('posts.json updated: wrote', POSTS_JSON);
    }
  }catch(err){
    console.error('generate_posts_json.js error:', err);
    process.exit(2);
  }
})();
