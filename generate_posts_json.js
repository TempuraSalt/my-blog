// generate_posts_json.js
const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');
const outFile = path.join(__dirname, 'posts.json');

function parseMeta(html, name){
  const re = new RegExp(`<meta\\s+(?:name|property)=["'](?:${name}|og:${name})["']\\s+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function getFirstMatch(html, re){
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function slugToTitle(slug){
  return slug.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f=>f.endsWith('.html')) : [];
const posts = files.map(filename=>{
  const full = fs.readFileSync(path.join(postsDir, filename), 'utf8');

  // title: prefer <meta name="title">, then <title>, then <h1>, then filename-based
  let title = parseMeta(full, 'title') || getFirstMatch(full, /<title[^>]*>([^<]+)<\/title>/i) || getFirstMatch(full, /<h1[^>]*>([^<]+)<\/h1>/i);
  if(!title){
    const m = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.html$/);
    title = m ? slugToTitle(m[2]) : filename.replace('.html','');
  }

  // date: prefer <meta name="date"> else filename date
  const date = parseMeta(full, 'date') || (filename.match(/^(\d{4}-\d{2}-\d{2})-/) || [])[1] || '1970-01-01';

  // excerpt: prefer meta description, else first <p>
  const excerpt = parseMeta(full, 'description') || getFirstMatch(full, /<p>([^<]+)<\/p>/i) || '';

  // tags: meta tags (comma separated)
  const tagsRaw = parseMeta(full, 'tags') || '';
  const tags = tagsRaw ? tagsRaw.split(/\s*,\s*/).filter(Boolean) : [];

  // cover: prefer meta cover or og:image
  const cover = parseMeta(full, 'cover') || parseMeta(full, 'image') || parseMeta(full, 'og:image') || null;

  const url = `/my-blog/posts/${filename}`;
  return { title, url, date, excerpt, cover, tags };
});

// sort by date desc
posts.sort((a,b)=> b.date.localeCompare(a.date));

// write json pretty
fs.writeFileSync(outFile, JSON.stringify(posts, null, 2), 'utf8');
console.log('Generated', outFile, 'with', posts.length, 'posts');
