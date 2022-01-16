'use strict';

const config = require('./config');
const { Producer, Message } = require('../..'); // require('redis-smq');

const producer = new Producer('test_queue', config);

const msg = new Message()
  .setScheduledCron('*/20 * * * * *')
  .setBody({ hello: 'World!' });

producer.produce(msg, (err) => {
  if (err) throw err;
  else console.log(`Successfully published`);
});
