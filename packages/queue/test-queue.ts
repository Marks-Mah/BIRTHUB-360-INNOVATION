import { createQueue, createWorker } from './src/index';

console.log('Testing Queue module exports...');
if (typeof createQueue === 'function' && typeof createWorker === 'function') {
  console.log('Queue module exports verified.');
} else {
  console.error('Queue module exports missing or incorrect.');
  process.exit(1);
}
