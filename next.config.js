/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages用の設定
  output: 'standalone',
  // 静的エクスポートは不要（Cloudflare Pagesが自動的に処理）
}

module.exports = nextConfig

