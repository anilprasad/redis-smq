import {
  ISuperTestResponse,
  produceAndDeadLetterMessage,
  startMonitorServer,
} from '../common';
import * as supertest from 'supertest';
import { GetMessagesResponseBodyDataDTO } from '../../src/monitor-server/controllers/common/dto/queues/get-messages-response-body.DTO';

test('Fetching dead-lettered messages', async () => {
  await startMonitorServer();
  const { producer, message } = await produceAndDeadLetterMessage();
  const request = supertest('http://127.0.0.1:3000');
  const queue = producer.getQueue();
  const response1: ISuperTestResponse<GetMessagesResponseBodyDataDTO> =
    await request.get(
      `/api/queues/${queue.name}/ns/${queue.ns}/dead-lettered-messages?skip=0&take=99`,
    );
  expect(response1.statusCode).toBe(200);
  expect(response1.body.data).toBeDefined();
  expect(response1.body.data?.total).toBe(1);
  expect(response1.body.data?.items.length).toBe(1);
  expect(response1.body.data?.items[0].sequenceId).toBe(0);
  expect(response1.body.data?.items[0].message.uuid).toBe(message.getId());
});
