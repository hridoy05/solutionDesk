import boss from '../lib/boss';
import { classifyTicket } from '../services/classify';

export const CLASSIFY_QUEUE = 'classify-ticket';

export type ClassifyJobData = {
  ticketId: string;
  subject: string;
  body: string;
};

export async function registerClassifyWorker() {
  await boss.createQueue(CLASSIFY_QUEUE);
  await boss.work<ClassifyJobData>(CLASSIFY_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await classifyTicket(job.data.ticketId, job.data.subject, job.data.body);
    }
  });
  console.log('[queue] classify-ticket worker registered');
}
