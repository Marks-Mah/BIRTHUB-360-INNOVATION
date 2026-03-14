import { Queue, Worker, QueueOptions, WorkerOptions, ConnectionOptions } from 'bullmq';
import { QueueName } from '@birthub/shared-types';
import { QUEUE_CONFIG } from './src/definitions';

export * from './src/definitions';
export * from './src/job-context';

const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const createQueue = (name: QueueName, options?: QueueOptions) => {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: QUEUE_CONFIG[name]?.attempts || 3,
      backoff: QUEUE_CONFIG[name]?.backoff,
      priority: QUEUE_CONFIG[name]?.priority,
    },
    ...options,
  });
};

export const createWorker = (name: QueueName, processor: any, options?: WorkerOptions) => {
  return new Worker(name, processor, {
    connection,
    concurrency: 5,
    ...options,
  });
};
