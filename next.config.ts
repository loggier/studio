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
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      { // Add pattern for vehicle image host
        protocol: 'https',
        hostname: '49.12.123.80', // Specific IP address from example
        port: '453', // Specific port from example
        pathname: '/uploads/**', // Allow any path under /uploads/
      },
    ],
  },
};

export default nextConfig;
