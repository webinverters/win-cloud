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

  var scheduleDefaults = {
      intervalMS: null,
      //period: '',  // day, week, month, year
      //specificTimes: [{time: '', datetime: '', timezone: ''}],
      concurrency: 1
    };

  function applyScheduleDefaults(schedule) {
    _.each(schedule, function(taskSchedule, key) {
      schedule[key] = _.defaults(taskSchedule, scheduleDefaults);
    });
  }

  /**
   * Runs according to the configuration.
   */
  m.run = function(schedule) {
    var currIdx = 0,
      resolver = p.defer();

    if (schedule) applyScheduleDefaults(schedule);

    var interval = setInterval(runner, config.peekIntervalMS);
    m._runningTaskLoops.push(interval);

    function runner() {
      try {
        // if the task runner is not configured to infinitely loop over tasks,
        // then bail out when done tasklist.
        if (!config.loop && currIdx >= config.taskList.length) {
          clearInterval(interval);
          return resolver.resolve('DONE');
        }

        if (schedule) {
          m.runTasksOnSchedule(schedule, config.taskList);
        }

        var task = config.taskList[currIdx % config.taskList.length];

        // ensure it is not already running and it is not a scheduled task.
        if (!task.isRunning() &&
          (!schedule || (schedule && !schedule[task.name]))) {
          return m.runTask(task)
            .then(function() {
              currIdx++;  // move on to the next task once this one is completed or errored.
            });
        }
      } catch (ex) {
        logger.logError('TASK_RUNNER_ERROR', {componentName:config.componentName, err:ex});
      }
    }

    return resolver.promise;
  };


  /**
   * Runs any tasks that are scheduled to be run.  Assumes the tasks are the same objects
   * if called in a loop since it installs housekeeping data on the task objects themselves.
   * So beware if the task object underneath changes, it will screw up the scheduling.
   *
   * @param schedule
   * @param tasks
   */
  m.runTasksOnSchedule = function(schedule, tasks) {
    _.each(tasks, function(task) {
      var sched = null;
      if (sched = schedule[task.name]) {
        if (sched.intervalMS) {
          if (task.lastRanOn) {
            var tot = time.getCurrentTime() - task.lastRanOn;
            if (tot >= sched.intervalMS) {
              if (!task.isRunning() || task.runningCount == 0 || task.runningCount < sched.concurrency) {
                m.runTask(task);
              }
            }
          }
          task.lastRanOn = time.getCurrentTime();
        }
      }
    });
  };

  m.runTask = function(task) {
    task.runningCount = task.runningCount ? task.runningCount+1 : 1;
    return task.run().then(function() {
      log(task.name, 'completed successfully.');
    })
    .catch(function(err) {
      logger.logError('TASK_RUN_ERROR', {componentName: config.componentName, err: err})
    })
    .finally(function() {
      task.runningCount -= 1;
    });
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
    //params = params || {};
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
      }, logger, TaskQueue(config, null, logger, global.random))
  };

  return m;
};