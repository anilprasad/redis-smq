import {
  defaultQueue,
  getConsumer,
  untilConsumerIdle,
  validateTimeSeriesFrom,
} from '../common';
import { promisifyAll } from 'bluebird';

test('Consumer dead-lettered time series', async () => {
  const consumer = promisifyAll(getConsumer());
  await consumer.runAsync();
  await untilConsumerIdle(consumer);
  await validateTimeSeriesFrom(
    `/api/queues/${defaultQueue.name}/ns/${
      defaultQueue.ns
    }/consumers/${consumer.getId()}/time-series/dead-lettered`,
  );
});
