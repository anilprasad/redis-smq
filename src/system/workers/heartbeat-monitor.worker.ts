import * as async from 'async';
import { ICallback, TConsumerWorkerParameters } from '../../../types';
import { Ticker } from '../common/ticker/ticker';
import { Heartbeat } from '../common/heartbeat';
import { RedisClient } from '../redis-client/redis-client';
import { redisKeys } from '../common/redis-keys/redis-keys';
import { EmptyCallbackReplyError } from '../common/errors/empty-callback-reply.error';

class HeartbeatMonitorWorker {
  protected redisClient: RedisClient;
  protected ticker: Ticker;

  constructor(redisClient: RedisClient) {
    this.redisClient = redisClient;
    this.ticker = new Ticker(this.onTick, 1000);
  }

  protected onTick = () => {
    const handleExpiredHeartbeats = (
      heartbeats: string[],
      cb: ICallback<number>,
    ): void => {
      Heartbeat.handleExpiredHeartbeats(this.redisClient, heartbeats, cb);
    };
    const getExpiredHeartbeats = (cb: ICallback<string[]>): void => {
      Heartbeat.getHeartbeatsByStatus(this.redisClient, (err, result) => {
        if (err) cb(err);
        else {
          const { expired = [] } = result ?? {};
          cb(null, expired);
        }
      });
    };
    async.waterfall(
      [getExpiredHeartbeats, handleExpiredHeartbeats],
      (err?: Error | null) => {
        if (err) throw err;
        this.ticker.nextTick();
      },
    );
  };
}

process.on('message', (payload: string) => {
  const { config }: TConsumerWorkerParameters = JSON.parse(payload);
  if (config.namespace) {
    redisKeys.setNamespace(config.namespace);
  }
  RedisClient.getNewInstance(config, (err, client) => {
    if (err) throw err;
    else if (!client) throw new EmptyCallbackReplyError();
    else new HeartbeatMonitorWorker(client);
  });
});
