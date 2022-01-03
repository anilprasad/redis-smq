import {
  getMessageManagerFrontend,
  getProducer,
  getQueueManagerFrontend,
} from '../common';
import { Message } from '../../src/message';
import { promisifyAll } from 'bluebird';

test('Purging scheduled messages queue', async () => {
  const producer = promisifyAll(getProducer());

  const msg = new Message()
    .setScheduledDelay(10000)
    .setBody({ hello: 'world' });
  await producer.produceAsync(msg);

  const messageManager = promisifyAll(await getMessageManagerFrontend());
  const m = await messageManager.getScheduledMessagesAsync(0, 99);

  expect(m.total).toBe(1);
  expect(m.items[0].getId()).toBe(msg.getId());

  const queueManager = promisifyAll(await getQueueManagerFrontend());
  await queueManager.purgeScheduledMessagesQueueAsync();

  const m2 = await messageManager.getScheduledMessagesAsync(0, 99);
  expect(m2.total).toBe(0);
  expect(m2.items.length).toBe(0);
});
