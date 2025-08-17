module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    mocha: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script'
  },
  rules: {
    // コード品質ルール
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'off', // ログ出力を許可
    'prefer-const': 'error',
    'no-var': 'error',
    
    // スタイルルール
    'indent': ['error', 2],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    
    // ベストプラクティス
    'eqeqeq': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Node.js固有
    'no-process-exit': 'off' // スクリプトでのprocess.exit()を許可
  },
  globals: {
    // ブラウザ環境のグローバル変数
    'loadPosts': 'readonly',
    'include': 'readonly'
  }
};
