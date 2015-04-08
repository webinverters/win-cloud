/**
 * @module task-runner
 * @summary: runs a list of tasks as per a task schedule.
 *
 * @description:
 *
 * Author: justin
 * Created On: 2015-03-31.
 * @license Apache-2.0
 */

"use strict";

var TaskQueue = require('./task-queue');

/**
 *
 * @param config.taskList A list of tasks that will be ran.
 * @param config.taskSchedule A schedule for tasks to run. Default: round-robin scheduling.
 * @param {Number} config.peekIntervalMS=20000
 * @param {Number} config.concurrency=1 How many tasks can be run at one time.
 * @returns {{}}
 */
module.exports = function construct(config, logger) {
  var m = {};
  config = config || {};
  config = _.defaults(config, {
    loop: true,
    taskList: [],
    taskSchedule: {},
    peekIntervalMS: 5*1000,
    delayBetweenTasksMS: 0,
    concurrency: 1,
    componentName: 'defaultComponentName'
  });

  m._runningTaskLoops = [];

  /**
   * Runs according to the configuration.
   */
  m.run = function() {
    var currIdx = 0,
      resolver = p.defer();

    var interval = setInterval(runner, config.peekIntervalMS);
    m._runningTaskLoops.push(interval);

    function runner() {
      try {
        if (!config.loop && currIdx >= config.taskList.length) {
          clearInterval(interval);
          return resolver.resolve('DONE');
        }

        var task = config.taskList[currIdx % config.taskList.length];

        if (!task.isRunning()) {
          task.run().then(function() {
            currIdx++;
          }, function(err) {
            currIdx++;
            logger.logError('TASK_RUN_ERROR', {componentName: config.componentName, err: err})
          });
        }
      } catch (ex) {
        logger.logError('TASK_RUNNER_ERROR', {componentName:config.componentName, err:ex});
      }
    }

    return resolver.promise;
  };

  /**
   * Stops all running tasks loops.
   */
  m.stopAll = function() {
    _.each(m._running, function(interval) {
      clearInterval(interval);
    });
  };

  m.addTask = function(task) {
    config.taskList.push(task);
  };

  m.removeTask = function(task) {
    config.taskList = _.without(taskList, task);
  };

  m.taskify = function(taskName, action, queued) {
    if (!queued)
      return require('./task')(
        {
          taskName: taskName,
          action: action
        }, logger);
    if (queued)
      return require('./queued-task')({
        taskName: taskName,
        action: action
      }, logger, TaskQueue({}, null, logger, global.random))
  };

  return m;
};