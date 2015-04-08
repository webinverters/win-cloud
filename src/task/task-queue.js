module.exports = function(config, Queue, logger, idGenerator) {
  var m = {_taskQueues: {}};

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

  m.pullNextTask = function(taskName) {
    if(!m._taskQueues[taskName]) {
      m._taskQueues[taskName] = Queue(taskName+'-queue-'+config.env);
    }

    return m._taskQueues[taskName].receiveMsg().then(function(msgs) {
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
    if(!m._taskQueues[taskName]) {
      m._taskQueues[taskName] = Queue(taskName+'-queue-'+config.env);
    }
    return m._taskQueues[taskName].deleteMsg(taskDef.receiptHandle)
      .then(function() {
        m._logger.log('TASK_COMPLETED', taskDef);
        return true;
      });
  };

  return m;
};