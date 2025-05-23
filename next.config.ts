import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { // Add pattern for vehicle image host
        protocol: 'http',
        hostname: 'storage.rastreo2.com', // Specific IP address from example
        port: '',
        pathname: '/uploads/**', // Allow any path under /uploads/
      },
    ],
  },
   webpack: (config, { isServer }) => {
    // Add rule to handle bcrypt binary files
    // This prevents errors like "Module parse failed: Unexpected character '�'"
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Exclude bcrypt from being processed by Next.js's default loaders on the client-side
    // if (!isServer) {
    //   config.externals = {
    //     ...config.externals,
    //     'bcrypt': 'commonjs bcrypt',
    //   };
    // }
     // Fixes npm packages that depend on `fs` module
     // Relevant for bcrypt or similar packages if they rely on fs indirectly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

export default nextConfig;
