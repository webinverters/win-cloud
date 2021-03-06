/**
 * @module task
 * @summary: creates a task which has a "name", run method, standard task state logging.
 *
 * @description:  A Task is required by task-runner.  This type of task is the standard task
 * type which has nothing special.  It just runs a synchronous or asynchronous method provided
 * and logs the status of each.
 *
 * Author: justin
 * Created On: 2015-03-31.
 * @license Apache-2.0
 */

"use strict";

module.exports = function construct(config, logger) {
  var m = {};
  config = config || {};
  config = _.defaults(config, {
    taskName: 'defaultTaskName',
    loopUntilDone: false,
    action: function() {
      return p.resolve();
    }
  });

  logger = logger || global.logger;
  m.logger = logger;
  m.name = config.taskName;

  function runNext(state) {
    return p.resolve(config.action(state))
      .then(function(result) {
        if (config.loopUntilDone) {
          if (result == 'DONE') {
            return result;
          }
          return runNext(result);
        }
        return result;
      });
  }

  m.run = function() {
    m._isRunning = true;
    return runNext(m.state).then(function(state) {
      m.state = state;
      m._isRunning = false;
    })
    .then(null, function(err) {
      logger.log('TaskName:',{taskName: config.taskName})
      logger.error('TASK_ERROR_UNEXPECTED', err);
      m._isRunning = false;
      throw err;
    });
  };

  m.isRunning = function() {
    return m._isRunning;
  };

  return m;
};
