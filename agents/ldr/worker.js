import { createWorker } from '@birthub/queue';
import { QueueName } from '@birthub/shared-types';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.LDR_AGENT_API_URL || 'http://localhost:8001';
console.log(`Starting LDR Worker for queue: ${QueueName.LEAD_ENRICHMENT}`);
const worker = createWorker(QueueName.LEAD_ENRICHMENT, async (job) => {
    console.log(`Processing job ${job.id} - Lead: ${job.data.leadId}`);
    try {
        const payload = {
            lead_id: job.data.leadId,
            context: {
                job_id: job.id,
                ...job.data
            }
        };
        const response = await axios.post(`${API_URL}/run`, payload);
        console.log(`Job ${job.id} completed. Result:`, response.data);
        return response.data;
    }
    catch (error) {
        console.error(`Job ${job.id} failed:`, error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
});
worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
});
worker.on('failed', (job, err) => {
    console.log(`Job ${job?.id} has failed with ${err.message}`);
});
