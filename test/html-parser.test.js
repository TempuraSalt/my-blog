const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { extractMeta, extractTitle, escapeHtml, isValidDateFormat, extractDateFromFilename } = require('../lib/html-parser');

describe('HTML Parser Functions', () => {
  describe('extractTitle', () => {
    it('should extract title from title tag', () => {
      const html = '<title>テスト記事 - ブログ</title>';
      expect(extractTitle(html)).to.equal('テスト記事 - ブログ');
    });

    it('should extract title from h1 tag when title tag is missing', () => {
      const html = '<h1>記事タイトル</h1>';
      expect(extractTitle(html)).to.equal('記事タイトル');
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<title>未閉じタイトル';
      expect(extractTitle(html)).to.be.null;
    });

    it('should strip HTML tags from h1 content', () => {
      const html = '<h1><span>記事</span>タイトル</h1>';
      expect(extractTitle(html)).to.equal('記事タイトル');
    });

    it('should handle null and undefined input safely', () => {
      expect(extractTitle(null)).to.be.null;
      expect(extractTitle(undefined)).to.be.null;
      expect(extractTitle('')).to.be.null;
    });
  });

  describe('extractMeta', () => {
    it('should extract meta content by name', () => {
      const html = '<meta name="description" content="テスト説明">';
      expect(extractMeta(html, 'description')).to.equal('テスト説明');
    });

    it('should handle reversed attribute order', () => {
      const html = '<meta content="テスト説明" name="description">';
      expect(extractMeta(html, 'description')).to.equal('テスト説明');
    });

    it('should return null for non-existent meta', () => {
      const html = '<meta name="other" content="value">';
      expect(extractMeta(html, 'description')).to.be.null;
    });

    it('should handle special characters in content', () => {
      const html = '<meta name="description" content="テスト&quot;説明&quot;">';
      expect(extractMeta(html, 'description')).to.equal('テスト&quot;説明&quot;');
    });

    it('should handle null and invalid input safely', () => {
      expect(extractMeta(null, 'description')).to.be.null;
      expect(extractMeta('', 'description')).to.be.null;
      expect(extractMeta('<meta name="test" content="value">', null)).to.be.null;
      expect(extractMeta('<meta name="test" content="value">', '')).to.be.null;
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).to.equal('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).to.equal('');
    });

    it('should handle null and undefined', () => {
      expect(escapeHtml(null)).to.equal('');
      expect(escapeHtml(undefined)).to.equal('');
    });

    it('should handle ampersands correctly', () => {
      expect(escapeHtml('Tom & Jerry')).to.equal('Tom &amp; Jerry');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's a test")).to.equal('It&#x27;s a test');
    });
  });

  describe('isValidDateFormat', () => {
    it('should validate correct date format', () => {
      expect(isValidDateFormat('2025-01-15')).to.be.true;
      expect(isValidDateFormat('2024-12-31')).to.be.true;
    });

    it('should reject invalid date format', () => {
      expect(isValidDateFormat('25-01-15')).to.be.false;
      expect(isValidDateFormat('2025/01/15')).to.be.false;
      expect(isValidDateFormat('2025-1-15')).to.be.false;
      expect(isValidDateFormat('2025-01-1')).to.be.false;
    });

    it('should reject invalid dates', () => {
      expect(isValidDateFormat('2025-02-30')).to.be.false;
      expect(isValidDateFormat('2025-13-01')).to.be.false;
      expect(isValidDateFormat('2025-00-01')).to.be.false;
    });

    it('should handle null and invalid input', () => {
      expect(isValidDateFormat(null)).to.be.false;
      expect(isValidDateFormat(undefined)).to.be.false;
      expect(isValidDateFormat('')).to.be.false;
      expect(isValidDateFormat(123)).to.be.false;
    });
  });

  describe('extractDateFromFilename', () => {
    it('should extract date from filename', () => {
      expect(extractDateFromFilename('2025-01-15-test-post.html')).to.equal('2025-01-15');
      expect(extractDateFromFilename('2024-12-31-year-end.html')).to.equal('2024-12-31');
    });

    it('should return null for invalid filename', () => {
      expect(extractDateFromFilename('test-post.html')).to.be.null;
      expect(extractDateFromFilename('25-01-15-post.html')).to.be.null;
    });

    it('should handle null and invalid input', () => {
      expect(extractDateFromFilename(null)).to.be.null;
      expect(extractDateFromFilename(undefined)).to.be.null;
      expect(extractDateFromFilename('')).to.be.null;
      expect(extractDateFromFilename(123)).to.be.null;
    });
  });
});

describe('Post File Validation', () => {
  it('should validate existing post files have required meta tags', () => {
    const postsDir = path.join(__dirname, '..', 'posts');
    if (!fs.existsSync(postsDir)) {
      console.warn('Posts directory not found, skipping validation tests');
      return;
    }

    const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.html') && !f.startsWith('post-template'));
    
    files.forEach(filename => {
      const filepath = path.join(postsDir, filename);
      const html = fs.readFileSync(filepath, 'utf8');
      
      // 基本的な構造チェック
      expect(html).to.include('<title>');
      expect(html).to.include('</title>');
      
      // メタタグの存在チェック
      const title = extractTitle(html);
      expect(title).to.not.be.null;
      expect(title).to.not.be.empty;
    });
  });
});
