module.exports = function(config, Queue, logger, idGenerator, taskQName) {
  var m = {_taskQueues: {}};

  Queue = Queue || require('../queue/queue');

  idGenerator = idGenerator || global.random;
  m._logger = logger || global.logger;

  m.createTask = function(taskName, taskDef) {
    if(!m._taskQueues[taskName]) {
      m._taskQueues[taskName] = Queue(taskName+'-queue-'+config.env);
    }
    if (!taskDef.transactionId) {
      taskDef.transactionId = idGenerator.getGUID();
    }

    taskDef = _.cloneDeep(taskDef);

    delete taskDef.rawData;
    delete taskDef.receiptHandle;
    delete taskDef.err;

    taskDef.taskName = taskName;
    taskDef.taskId = idGenerator.getGUID();
    return m._taskQueues[taskName].sendMsg({body: taskDef})
        .then(function(msgId) {
          taskDef.msgId = msgId;
          m._logger.log('CREATE_TASK_SUCCESS', taskDef);
          return taskDef;
        }).then(null, function(err) {
          var newErr = new Error('Queue inaccessible error.');
          newErr.stack = err.stack;
          newErr.inner = err;
          throw newErr;
        }).then(null, function(err) {
          taskDef.err = err;
          m._logger.logError('CREATE_TASK_FAILED', taskDef);
          throw err;
        });
  };

  function getQueue(taskName) {
    var taskQ;
    if (taskQName) {
      if (!m._taskQueues[taskQName]) {
        log('Initializing poison queue:',taskQName+'-queue-'+config.env);
        m._taskQueues[taskQName] = Queue(taskQName+'-queue-'+config.env);
      }
      taskQ = m._taskQueues[taskQName];
    }
    else if(!m._taskQueues[taskName]) {
      log('Initializing task queue:',taskName+'-queue-'+config.env);
      m._taskQueues[taskName] = Queue(taskName+'-queue-'+config.env);
    }
    if (!taskQ) taskQ = m._taskQueues[taskName];
    return taskQ;
  }
  m.pullNextTask = function(taskName) {
    var taskQ = getQueue(taskName);
    debug('pulling from task queue:',taskName+'-queue-'+config.env);

    // TODO: add option and support for guaranteed FIFO, since SQS doesnt support FIFO.
    return taskQ.receiveMsg().then(function(msgs) {
      if (!msgs) {
        throw 'QUEUE_EMPTY';
      }
      m._logger.log('TASK_STARTED', msgs[0]);
      return msgs[0];
    },function(err) {
      m._logger.logError("GET_TASK_FAILED", err);
      throw err;
    });
  };

  m.completeTask = function(taskName, taskDef) {
    var taskQ = getQueue(taskName);
    return taskQ.deleteMsg(taskDef.receiptHandle)
      .then(function() {
        m._logger.log('TASK_COMPLETED', {transactionId: taskDef.transactionId, taskId: taskDef.taskId});
        return true;
      });
  };

  return m;
};