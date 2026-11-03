import type { NextConfig } from "next";
import { resolve } from "node:path";

const productActionContext = resolve(process.cwd(), "../web/app/learn/session");
const inertAction = resolve(process.cwd(), "inert-actions.ts");

const nextConfig: NextConfig = {
  distDir: ".next-attempt-002",
  output: "standalone",
  poweredByHeader: false,
  webpack(config, { webpack }) {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^\.\/actions$/u,
        (resource: { context: string; request: string }) => {
          if (resolve(resource.context) === productActionContext) resource.request = inertAction;
        },
      ),
    );
    return config;
  },
};

export default nextConfig;
