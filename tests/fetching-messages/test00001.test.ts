import { promisifyAll } from 'bluebird';
import {
  getMessageManagerFrontend,
  getProducer,
  produceAndAcknowledgeMessage,
  produceAndDeadLetterMessage,
} from '../common';
import { Message } from '../../src/message';
import { config } from '../config';

describe('MessageManager', () => {
  test('Case 1', async () => {
    const producer = getProducer();
    const queue = producer.getQueue();

    const msg = new Message();
    msg.setBody({ hello: 'world' });
    await producer.produceMessageAsync(msg);

    const messageManager = promisifyAll(await getMessageManagerFrontend());
    const res = await messageManager.getPendingMessagesAsync(queue, 0, 100);

    expect(res.total).toBe(1);
    expect(res.items[0].sequenceId).toBe(0);
    expect(res.items[0].message.getId()).toBe(msg.getId());
  });

  test('Case 2', async () => {
    const { producer, message } = await produceAndAcknowledgeMessage();
    const queue = producer.getQueue();

    const messageManager = promisifyAll(await getMessageManagerFrontend());
    const res = await messageManager.getAcknowledgedMessagesAsync(
      queue,
      0,
      100,
    );

    expect(res.total).toBe(1);
    expect(res.items[0].sequenceId).toBe(0);
    expect(res.items[0].message.getId()).toBe(message.getId());
  });

  test('Case 3', async () => {
    const { producer, message } = await produceAndDeadLetterMessage();
    const queue = producer.getQueue();

    const messageManager = promisifyAll(await getMessageManagerFrontend());
    const res = await messageManager.getDeadLetterMessagesAsync(queue, 0, 100);
    expect(res.total).toBe(1);
    expect(res.items[0].sequenceId).toBe(0);
    expect(res.items[0].message.getId()).toBe(message.getId());
  });

  test('Case 4', async () => {
    const cfg = {
      ...config,
      priorityQueue: true,
    };
    const producer = promisifyAll(getProducer(undefined, cfg));
    const queue = producer.getQueue();

    const msg = new Message();
    msg.setPriority(Message.MessagePriority.LOW);
    await producer.produceMessageAsync(msg);

    const messageManager = promisifyAll(await getMessageManagerFrontend());
    const res = await messageManager.getPendingMessagesWithPriorityAsync(
      queue,
      0,
      100,
    );

    expect(res.total).toBe(1);
    expect(res.items[0].getId()).toBe(msg.getId());
  });

  test('Case 5', async () => {
    const producer = getProducer();

    const msg = new Message();
    msg.setScheduledDelay(10000);
    await producer.produceMessageAsync(msg);

    const messageManager = promisifyAll(await getMessageManagerFrontend());
    const res = await messageManager.getScheduledMessagesAsync(0, 100);

    expect(res.total).toBe(1);
    expect(res.items[0].getId()).toBe(msg.getId());
  });
});
