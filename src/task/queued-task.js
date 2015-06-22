/**
 * @module queued-task
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

var Task = require('./task');

/**
 * @note If you throw an error message that contains "please try again" it will
 * avoid putting the failed task on the poison Q and it will try it again...
 * @param config Config.action must accept as its only param the task definition.
 * @param logger
 * @param taskQ
 * @param isPoison {bool} If we are processing the poison Q.
 * @returns {*|m|exports}
 */
module.exports = function construct(config, logger, taskQ, isPoison) {
  config = config || {};
  config.doTask = config.action;
  config.action = undefined;

  var runNextTask = function() {
    var taskDef = null;
    return taskQ.pullNextTask(config.taskName)
      .then(function(tdef) {
        debug('pulled task from queue:', tdef.taskId, tdef.transactionId);
        taskDef = tdef;
        return config.doTask(tdef, taskQ);
      })
      .then(function(tresult) {
        return taskQ.completeTask(config.taskName, taskDef);
      })
      .catch(function(err){
        if ((_.isObject(err) && err.message=='QUEUE_EMPTY') ||
          err=='QUEUE_EMPTY') {
          log('Task Queue Empty');
          return 'DONE';
        }

        logError(err);

        taskDef = taskDef || {};
        taskDef.err = _.isObject(err) ? JSON.stringify(err) : err;

        logger.logError("@TASK_FAILED", taskDef);

        if (err.message && err.message.toLowerCase().indexOf('please try again') >= 0) {
          // intentionally do nothing so the task goes back on the queue and gets retried.
        }
        else if (isPoison) {
          // intentionally do nothing so the task goes back on the poison queue.
        }
        else {
          return taskQ.createTask('poison',taskDef).then(function() {
            // once it is added to the poison task queue, it should be deleted from
            // its regular task queue so it doesnt clog the system.
            return taskQ.completeTask(config.taskName, taskDef);
          });
        }
      });
  };

  config = _.defaults(config, {
    taskName: 'defaultQueuedTaskName',
    loopUntilDone: true, // to exit a queued task it must resolve 'DONE'
    action: runNextTask  // override the action to be its own that polls the task queue
  });

  var m = Task(config, logger);

  return m;
};