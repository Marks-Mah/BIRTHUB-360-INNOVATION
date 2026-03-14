import { Request, Response, NextFunction } from 'express';
import { logger } from '@birthub/utils/src/logger';
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => logger.error('Redis Client Error', err));
redis.connect();

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const idempotencyKey = req.headers['x-idempotency-key'];

  if (!idempotencyKey) {
    return next();
  }

  const key = `idempotency:${idempotencyKey}`;
  const cachedResponse = await redis.get(key);

  if (cachedResponse) {
    const { status, body } = JSON.parse(cachedResponse);
    return res.status(status).json(body);
  }

  const originalSend = res.send;
  res.send = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      redis.set(key, JSON.stringify({ status: res.statusCode, body: JSON.parse(body) }), {
        EX: 60 * 60 * 24 // 24 hours
      });
    }
    return originalSend.call(this, body);
  };

  next();
};
