import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import { IConfig, ICallback, TUnaryFunction, TFunction } from '../../types';
import * as async from 'async';
import { PowerManager } from './common/power-manager/power-manager';
import { Logger } from './common/logger';
import * as BunyanLogger from 'bunyan';
import { MessageRate } from './message-rate';
import { events } from './common/events';
import { Broker } from './broker';
import { redisKeys } from './common/redis-keys/redis-keys';
import { RedisClient } from './redis-client/redis-client';
import { QueueManager } from './queue-manager/queue-manager';
import { MessageManager } from './message-manager/message-manager';
import { Message } from './message';
import { EmptyCallbackReplyError } from './common/errors/empty-callback-reply.error';
import { PanicError } from './common/errors/panic.error';
import { Heartbeat } from './common/heartbeat';

export abstract class Base<
  TMessageRate extends MessageRate,
  TRedisKeys extends { keyHeartbeat: string },
> extends EventEmitter {
  protected readonly id: string;
  protected readonly queueName: string;
  protected readonly config: IConfig;
  protected readonly logger: BunyanLogger;
  protected readonly powerManager: PowerManager;
  protected redisKeys: TRedisKeys | null = null;
  protected broker: Broker | null = null;
  protected sharedRedisClient: RedisClient | null = null;
  protected messageRate: TMessageRate | null = null;
  protected heartbeat: Heartbeat | null = null;

  constructor(queueName: string, config: IConfig) {
    super();
    if (config.namespace) {
      redisKeys.setNamespace(config.namespace);
    }
    this.id = uuid();
    this.config = config;
    this.queueName = redisKeys.validateRedisKey(queueName);
    this.powerManager = new PowerManager();
    this.logger = Logger(this.constructor.name, {
      ...this.config.log,
      options: {
        ...this.config.log?.options,
        consumerId: this.getId(),
        queueName: this.getQueueName(),
        ns: redisKeys.getNamespace(),
      },
    });
    this.registerEventsHandlers();
    Message.setDefaultOptions(config.message);
  }

  private setUpSharedRedisClient = (cb: ICallback<RedisClient>): void => {
    this.logger.debug(`Set up shared RedisClient instance...`);
    RedisClient.getNewInstance(this.config, (err, client) => {
      if (err) cb(err);
      else if (!client) cb(new EmptyCallbackReplyError());
      else {
        this.sharedRedisClient = client;
        cb(null, client);
      }
    });
  };

  private setUpMessageQueue = (
    messageManager: MessageManager,
    cb: ICallback<void>,
  ): void => {
    this.logger.debug(`Set up message queue (${this.queueName})...`);
    if (!this.sharedRedisClient)
      cb(new PanicError(`Expected an instance of RedisClient`));
    else
      QueueManager.setUpMessageQueue(
        this.queueName,
        this.sharedRedisClient,
        cb,
      );
  };

  private setUpBroker = (cb: ICallback<Broker>): void => {
    this.logger.debug(`Set up Broker instance...`);
    if (!this.sharedRedisClient)
      cb(new PanicError(`Expected an instance of RedisClient`));
    else {
      const messageManager = new MessageManager(
        this.sharedRedisClient,
        this.logger,
      );
      this.broker = new Broker(this.config, messageManager, this.logger);
      cb();
    }
  };

  private setUpMessageRate = (cb: ICallback<void>): void => {
    this.logger.debug(`Set up MessageRate...`);
    const { monitor } = this.config;
    if (monitor && monitor.enabled) {
      if (!this.sharedRedisClient)
        cb(new PanicError(`Expected an instance of RedisClient`));
      else {
        this.messageRate = this.getMessageRate(this.sharedRedisClient);
      }
    } else {
      this.logger.debug(`Skipping MessageRate setup as monitor not enabled...`);
      cb();
    }
  };

  private setUpHeartbeat = (cb: ICallback<void>) => {
    this.logger.debug(`Set up consumer heartbeat...`);
    RedisClient.getNewInstance(this.config, (err, client) => {
      if (err) cb(err);
      else if (!client) cb(new EmptyCallbackReplyError());
      else {
        const { keyHeartbeat } = this.getRedisKeys();
        this.heartbeat = new Heartbeat(keyHeartbeat, client);
        cb();
      }
    });
  };

  protected registerEventsHandlers(): void {
    this.on(events.GOING_UP, () => this.logger.info(`Starting up...`));
    this.on(events.UP, () => this.logger.info(`Up and running...`));
    this.on(events.GOING_DOWN, () => this.logger.info(`Shutting down...`));
    this.on(events.DOWN, () => this.logger.info(`Shutdown.`));
    this.on(events.ERROR, (err: Error) => this.handleError(err));
  }

  protected goingUp(): TFunction[] {
    return [
      this.setUpSharedRedisClient,
      this.setUpMessageQueue,
      this.setUpHeartbeat,
      this.setUpBroker,
      this.setUpMessageRate,
    ];
  }

  protected goingDown(): TUnaryFunction<ICallback<void>>[] {
    const tearDownSharedRedisClient = (cb: ICallback<void>) => {
      this.logger.debug(`Tear down shared RedisClient instance...`);
      if (this.sharedRedisClient) {
        this.sharedRedisClient.halt(() => {
          this.logger.debug(`Shared RedisClient instance has been torn down.`);
          this.sharedRedisClient = null;
          cb();
        });
      } else {
        this.logger.warn(
          `This is not normal. [this.sharedRedisClient] has not been set up. Ignoring...`,
        );
        cb();
      }
    };
    const tearDownMessageRate = (cb: ICallback<void>) => {
      this.logger.debug(`Tear down MessageRate...`);
      if (this.messageRate) {
        this.messageRate.quit(() => {
          this.logger.debug(`MessageRate has been torn down.`);
          this.messageRate = null;
          cb();
        });
      } else cb();
    };
    const tearDownBroker = (cb: ICallback<void>): void => {
      this.logger.debug(`Tear down Broker instance...`);
      if (this.broker) {
        this.broker.quit(() => {
          this.logger.debug(`Broker instance has been torn down.`);
          this.broker = null;
          cb();
        });
      } else {
        this.logger.warn(
          `This is not normal. [this.broker] has not been set up. Ignoring...`,
        );
        cb();
      }
    };
    const tearDownHeartbeat = (cb: ICallback<void>) => {
      this.logger.debug(`Tear down consumer heartbeat...`);
      if (this.heartbeat) {
        this.heartbeat.quit(() => {
          this.logger.debug(`Consumer heartbeat has been torn down.`);
          this.heartbeat = null;
          cb();
        });
      } else {
        this.logger.warn(
          `This is not normal. [this.heartbeat] has not been set up. Ignoring...`,
        );
        cb();
      }
    };
    return [
      tearDownHeartbeat,
      tearDownBroker,
      tearDownMessageRate,
      tearDownSharedRedisClient,
    ];
  }

  protected getSharedRedisClient(cb: TUnaryFunction<RedisClient>): void {
    if (!this.sharedRedisClient)
      this.emit(
        events.ERROR,
        new PanicError('Expected an instance of RedisClient'),
      );
    else cb(this.sharedRedisClient);
  }

  handleError(err: Error): void {
    if (this.powerManager.isGoingUp() || this.powerManager.isRunning()) {
      throw err;
    }
  }

  run(cb?: ICallback<void>): void {
    this.powerManager.goingUp();
    this.emit(events.GOING_UP);
    const tasks = this.goingUp();
    async.waterfall(tasks, () => {
      this.powerManager.commit();
      this.emit(events.UP);
      cb && cb();
    });
  }

  shutdown(cb?: ICallback<void>): void {
    this.powerManager.goingDown();
    this.emit(events.GOING_DOWN);
    const tasks = this.goingDown();
    async.waterfall(tasks, () => {
      this.powerManager.commit();
      this.emit(events.DOWN);
      cb && cb();
    });
  }

  isRunning(): boolean {
    return this.powerManager.isRunning();
  }

  getBroker(cb: TUnaryFunction<Broker>): void {
    if (!this.broker)
      this.emit(events.ERROR, new PanicError('Expected an instance of Broker'));
    else cb(this.broker);
  }

  getId(): string {
    return this.id;
  }

  getConfig(): IConfig {
    return this.config;
  }

  getQueueName(): string {
    return this.queueName;
  }

  abstract getRedisKeys(): TRedisKeys;

  abstract getMessageRate(redisClient: RedisClient): TMessageRate;
}
