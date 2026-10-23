import { Worker } from 'bullmq';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

const scanQueue = new Queue('scan', { connection });

const worker = new Worker(
  'scan',
  async (job) => {
    console.log('Processing job:', job.id, job.data);
    // TODO: Implement scan logic
    return { success: true };
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

console.log('Worker started, waiting for jobs...');

process.on('SIGTERM', async () => {
  await worker.close();
  await scanQueue.close();
  await connection.quit();
  process.exit(0);
});