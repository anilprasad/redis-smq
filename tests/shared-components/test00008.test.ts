import { delay, promisifyAll } from 'bluebird';
import { getRedisInstance } from '../common';
import { HashTimeSeries } from '../../src/system/common/time-series/hash-time-series';
import { TimeSeries } from '../../src/system/common/time-series/time-series';

test('HashTimeSeries: Case 4', async () => {
  const redisClient = await getRedisInstance();
  const hashTimeSeries = promisifyAll(
    new HashTimeSeries(redisClient, {
      key: 'my-key',
      indexKey: 'my-key-index',
      expireAfterInSeconds: 5, // data will expire after 5s of inactivity
      retentionTimeInSeconds: 20,
    }),
  );
  const ts = TimeSeries.getCurrentTimestamp();
  for (let i = 0; i < 10; i += 1) {
    await hashTimeSeries.addAsync(ts + i, i);
  }

  // Retention time is 20 but as data will be expired after 5s
  // we just wait 10 seconds. After which, we expect time series data filled with 0 values.
  await delay(10000);
  await hashTimeSeries.cleanUpAsync();

  const range1 = await hashTimeSeries.getRangeAsync(ts, ts + 10);
  expect(range1.length).toEqual(10);
  expect(range1[0]).toEqual({ timestamp: ts, value: 0 });
  expect(range1[1]).toEqual({ timestamp: ts + 1, value: 0 });
  expect(range1[2]).toEqual({ timestamp: ts + 2, value: 0 });
  expect(range1[3]).toEqual({ timestamp: ts + 3, value: 0 });
  expect(range1[4]).toEqual({ timestamp: ts + 4, value: 0 });
  expect(range1[5]).toEqual({ timestamp: ts + 5, value: 0 });
  expect(range1[6]).toEqual({ timestamp: ts + 6, value: 0 });
  expect(range1[7]).toEqual({ timestamp: ts + 7, value: 0 });
  expect(range1[8]).toEqual({ timestamp: ts + 8, value: 0 });
  expect(range1[9]).toEqual({ timestamp: ts + 9, value: 0 });
});
