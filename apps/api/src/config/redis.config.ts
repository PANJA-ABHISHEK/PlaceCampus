import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const url = new URL(redisUrl);

  return {
    url: redisUrl,
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '6379', 10),
  };
});
