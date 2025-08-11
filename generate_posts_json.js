// generate_posts_json.js
// ルート (my-blog/) に置いてください
const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');
const outFile = path.join(__dirname, 'posts.json');

function slugToTitle(slug){
  return slug.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f=>f.endsWith('.html')) : [];
const posts = files.map(filename=>{
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.html$/);
  let date='1970-01-01', slug='', titleFromFilename='';
  if(m){
    date = m[1];
    slug = m[2];
    titleFromFilename = slugToTitle(slug);
  } else {
    titleFromFilename = filename.replace('.html','');
  }
  const full = fs.readFileSync(path.join(postsDir, filename), 'utf8');
  const title = (full.match(/<title>([^<]+)<\/title>/i)||[])[1] || (full.match(/<h1>([^<]+)<\/h1>/i)||[])[1] || titleFromFilename;
  const excerpt = (full.match(/<p>([^<]+)<\/p>/i)||[])[1] || '';
  return { title: title.trim(), url: `/my-blog/posts/${filename}`, date, excerpt: excerpt.trim() };
});
posts.sort((a,b)=> b.date.localeCompare(a.date));
fs.writeFileSync(outFile, JSON.stringify(posts, null, 2), 'utf8');
console.log('Generated', outFile, 'with', posts.length, 'posts');
