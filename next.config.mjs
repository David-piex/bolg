const apiProxyTarget = process.env.RINANA_API_PROXY_TARGET || "http://127.0.0.1:8080";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  ...(process.env.RINANA_STANDALONE_OUTPUT === "1" ? { output: "standalone" } : {}),

  // 图片优化配置
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // 性能优化 - 适配4G内存服务器
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // 启用Gzip压缩
  compress: true,

  // 减少构建内存占用
  experimental: {
    optimizeCss: true,
  },

  // SWC优化
  swcMinify: true,

  async rewrites() {
    return [
      {
        destination: `${apiProxyTarget}/api/:path*`,
        source: "/api/:path*"
      }
    ];
  }
};

export default nextConfig;
