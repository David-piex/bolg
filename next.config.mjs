const apiProxyTarget = process.env.RINANA_API_PROXY_TARGET || "http://127.0.0.1:8080";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  ...(process.env.RINANA_STANDALONE_OUTPUT === "1" ? { output: "standalone" } : {}),
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
