# Consumer Class API

```javascript
// filename: ./examples/javascript/ns1-test-queue-consumer.js
'use strict';

const { Consumer } = require('redis-smq');

class TestQueueConsumer extends Consumer {
    consume(message, cb) {
        console.log('Got a message to consume:', message);
        cb();
    }
}

const consumer = new TestQueueConsumer('test_queue');
consumer.run();
```

## Public Methods

### Consumer.prototype.constructor()

**Syntax**

```javascript
const testQueueConsumer = new TestQueueConsumer(queueName , config, usePriorityQueuing)
```

**Parameters**

- `queueName` *(string): Required.* The name of the queue where produced messages are queued. It can be composed
  only of letters (a-z), numbers (0-9) and (-_) characters.

- `config` *(object): Optional.* Configuration parameters. See [configuration](https://github.com/weyoss/redis-smq#configuration).

- `usePriorityQueuing` *(boolean): Optional.*  When `true`, the consumer will dequeue messages using priority queuing.

### Consumer.prototype.run()

Run the consumer and start consuming messages. No connection to the Redis server is opened until this method is called.

**Syntax**

```javascript
testQueueConsumer.run(cb);
```

**Parameters**
- `cb` *(function): Optional.* A callback function which get called once the consumer instance is up and running.

```javascript
const testQueueConsumer = new TestQueueConsumer('test_queue')
testQueueConsumer.run();

// or 
testQueueConsumer.run(() => {
    console.log('Consumer is now running...')
})

//
consumer.once('up', () => {
    console.log(`Consumer ID ${consumer.getId()} is running.`);
})
```

### Consumer.prototype.consume()

**Syntax**
```javascript
consumer.consume(message, cb);
```

**Parameters**

- `message` *(mixed): Required.* A message instance which was previously published.

- `cb(err)` *(function): Required.* Callback function. When called with the error argument the message is
    unacknowledged. Otherwise, when called without arguments, the message is acknowledged.

```javascript
class TestQueueConsumer extends Consumer {

    /**
     *
     * @param message
     * @param cb
     */
    consume(message, cb) {
        //  console.log(`Got a message to consume: `, message);
        //  
        //  throw new Error('TEST!');
        //  
        //  cb(new Error('TEST!'));
        //  
        //  const timeout = parseInt(Math.random() * 100);
        //  setTimeout(() => {
        //      cb();
        //  }, timeout);
        cb();
    }
}
```

### Consumer.prototype.shutdown()

Disconnect from Redis server and stop consuming messages. This method is used to gracefully shutdown the consumer and
go offline.

**Syntax**

```javascript
testQueueConsumer.shutdown(cb);
```

**Parameters**
- `cb` *(function): Optional.* A callback function which get called once the consumer instance is totally down .

```javascript
const testQueueConsumer = new TestQueueConsumer('test_queue')

testQueueConsumer.run(() => {
    console.log('Consumer is now running...');
    testQueueConsumer.shutdown();
})

consumer.once('down', () => {
    console.log(`Consumer ID ${consumer.getId()} has gone down.`);
})
```

### Other Methods

- Consumer.prototype.isGoingUp()
- Consumer.prototype.isGoingDown()
- Consumer.prototype.isUp()
- Consumer.prototype.isDown()
- Consumer.prototype.isRunning()
- Consumer.prototype.getId()
- Consumer.prototype.getQueue()