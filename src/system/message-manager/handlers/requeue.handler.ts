import { ICallback } from '../../../../types';
import { redisKeys } from '../../common/redis-keys';
import { getListMessageAtSequenceId } from '../common';
import { Message } from '../../message';
import { Handler } from './handler';

export class RequeueHandler extends Handler {
  protected requeueListMessage(
    queueName: string,
    ns: string | undefined,
    from: string,
    index: number,
    messageId: string,
    withPriority: boolean,
    priority: number | undefined,
    cb: ICallback<void>,
  ): void {
    const { keyQueuePriority, keyQueue } = redisKeys.getKeys(queueName, ns);
    getListMessageAtSequenceId(
      this.redisClient,
      from,
      index,
      messageId,
      (err, msg) => {
        if (err) cb(err);
        else if (!msg) cb(new Error('Expected an instance of Message'));
        else {
          const multi = this.redisClient.multi();
          multi.lrem(from, 1, JSON.stringify(msg));
          const message = Message.createFromMessage(msg, true, true);
          const msgPriority = withPriority
            ? message.getSetPriority(priority)
            : null;
          if (typeof msgPriority === 'number')
            multi.zadd(keyQueuePriority, msgPriority, JSON.stringify(message));
          else multi.lpush(keyQueue, JSON.stringify(message));
          this.redisClient.execMulti(multi, (err) => cb(err));
        }
      },
    );
  }

  requeueMessageFromDLQueue(
    queueName: string,
    ns: string | undefined,
    index: number,
    messageId: string,
    withPriority: boolean,
    priority: number | undefined,
    cb: ICallback<void>,
  ): void {
    const { keyQueueDL } = redisKeys.getKeys(queueName, ns);
    this.requeueListMessage(
      queueName,
      ns,
      keyQueueDL,
      index,
      messageId,
      withPriority,
      priority,
      cb,
    );
  }

  requeueMessageFromAcknowledgedQueue(
    queueName: string,
    ns: string | undefined,
    index: number,
    messageId: string,
    withPriority: boolean,
    priority: number | undefined,
    cb: ICallback<void>,
  ): void {
    const { keyQueueAcknowledgedMessages } = redisKeys.getKeys(queueName, ns);
    this.requeueListMessage(
      queueName,
      ns,
      keyQueueAcknowledgedMessages,
      index,
      messageId,
      withPriority,
      priority,
      cb,
    );
  }
}
