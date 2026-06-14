/** @type {import('next').NextConfig} */
const isStatic = process.env.BUILD_STATIC === "1";
const base = process.env.PAGES_BASE_PATH || "";
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  ...(isStatic
    ? { output: "export", distDir: "out", basePath: base, assetPrefix: base || undefined, trailingSlash: true }
    : {}),
};
export default nextConfig;
