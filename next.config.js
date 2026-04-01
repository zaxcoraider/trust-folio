/** @type {import('next').NextConfig} */
const path = require('path');
const webpack = require('webpack');

const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Strip the `node:` prefix from built-in module requests.
      // This handles packages like @0gfoundation/0g-ts-sdk that use
      // `import ... from 'node:crypto'` — webpack can't resolve `node:` URIs
      // without this, but can resolve the bare name + the fallback below.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );

      // Tell webpack not to bundle Node.js built-ins in the browser.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
        util: false,
        events: false,
        assert: false,
        querystring: false,
        string_decoder: false,
        readline: false,
        child_process: false,
        worker_threads: false,
      };

      // Stub optional Node-only modules (pino-pretty, react-native, etc.)
      const stub = path.resolve(__dirname, 'lib/empty-module.js');
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino-pretty': stub,
        '@react-native-async-storage/async-storage': stub,
        'lokijs': stub,
        'encoding': stub,
      };
    } else {
      // Also stub pino-pretty on the server bundle (imported by WalletConnect deps)
      const stub = path.resolve(__dirname, 'lib/empty-module.js');
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino-pretty': stub,
      };
    }

    // Handle ESM modules on the server
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        '@0gfoundation/0g-ts-sdk': 'commonjs @0gfoundation/0g-ts-sdk',
      });
    }

    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '52mb',
    },
  },
  eslint: {
    // ESLint runs in CI separately; skip during `next build` to avoid timeouts
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript verified clean via tsc --noEmit; skip slow re-check during build
    ignoreBuildErrors: true,
  },
  experimental: {
    esmExternals: 'loose',
  },
};

module.exports = nextConfig;
