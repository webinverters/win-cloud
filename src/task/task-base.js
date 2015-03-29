var construct = function(config, taskQ, poisonQ, logger) {
  var m = {_isRunning: false, _config: config, _poisonQ: poisonQ, _taskQ: taskQ, _logger: logger};

  var myTaskType = config.taskName;

  function runNext(state) {
    return m.runNextTask().then(function() {
      return runNext(state);
    })
    .then(null, function(err) {
      if ('QUEUE_EMPTY'==err) {
        return null;
      }
      else {
        m._logger.logError('MANAGER_ERROR', {component: config.taskName, err: err});
      }
    });
  }

  m.run = function() {
    m._isRunning = true;
    return m.setup().then(function(state) {
      return runNext(state);
    }).then(function() {
      m._isRunning = false;
    })
    .then(null, function(err) {
      console.error(err);
      m._isRunning = false;
    });
  };

  m.runNextTask = function() {
    var taskDef = null;
    console.log('pulling from ', myTaskType)
    return taskQ.pullNextTask(myTaskType)
        .then(function(tdef) {
          taskDef = tdef;
          return m.doTask(tdef);
        }, function(err) {
          console.error(err);
          if (_.isObject(err)) {
            if (err.message=='QUEUE_EMPTY') throw err.message;
          } else {
            if (err=='QUEUE_EMPTY') throw err;
          }
          err.queueError = true;
          throw err;
        })
        .then(function(tdef) {
          return taskQ.completeTask(myTaskType, tdef);
        })
        .then(null, function(err){
          if (_.isObject(err)) {
            if (err.message=='QUEUE_EMPTY') throw err.message;
          } else {
            if (err=='QUEUE_EMPTY') throw err;
          }

          if (err.queueError) {
            m._logger.logError("GET_TASK_FAILED", err);
            throw err;
          }

          taskDef = taskDef || {};
          if (err.stack) {
            taskDef.err = JSON.stringify({message: err.message, stack: err.stack});
          }
          taskDef.err = err;
          m._logger.logError("TASK_FAILED", taskDef);

          if (err.message && err.message.indexOf('Please try again') >= 0) {

          }
          else {
            return m._poisonQ.createTask(taskDef).then(function() {
              return m._taskQ.completeTask(myTaskType, taskDef);
            });
          }
          // it will automatically retry as per the cron schedule
        });
  };

  /**
   *
   */
  m.setup = function() {
    return p.resolve(m);
  };

  return m;
};

module.exports = construct;