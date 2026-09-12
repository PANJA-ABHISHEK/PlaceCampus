/**
 * Application configuration factory.
 * Loads and structures all environment variables into a typed config object.
 * Used with NestJS ConfigModule.forRoot().
 */
export interface AppConfig {
  app: {
    nodeEnv: string;
    port: number;
  };
  database: {
    uri: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiration: string;
    refreshExpiration: string;
  };
  ai: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
}

export default (): AppConfig => ({
  app: {
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    port: parseInt(process.env['PORT'] ?? '4000', 10),
  },
  database: {
    uri: process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/skillbridge',
  },
  redis: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'] ?? '',
  },
  jwt: {
    secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret-change-in-production',
    accessExpiration: process.env['JWT_ACCESS_EXPIRATION'] ?? '15m',
    refreshExpiration: process.env['JWT_REFRESH_EXPIRATION'] ?? '7d',
  },
  ai: {
    apiKey: process.env['AI_API_KEY'] ?? '',
    model: process.env['AI_MODEL'] ?? 'gpt-4o',
    baseUrl: process.env['AI_BASE_URL'] ?? 'https://api.openai.com/v1',
  },
  cloudinary: {
    cloudName: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
    apiKey: process.env['CLOUDINARY_API_KEY'] ?? '',
    apiSecret: process.env['CLOUDINARY_API_SECRET'] ?? '',
  },
});
