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
    taskSchedule: null,
    peekIntervalMS: 5*1000,
    delayBetweenTasksMS: 0,
    concurrency: 1,
    componentName: 'defaultComponentName'
  });

  m._runningTaskLoops = [];

  var scheduleDefaults = {
      intervalMS: null,
      concurrency: 1,
      period: null
      // HERE IS AN EXAMPLE OF OTHER TYPES OF SCHEDULES WHICH HAVE NO DEFAULTS:
      //period: '',  // day, week, month, year
      //specificTimes: [{time: '', datetime: '', timezone: ''}],
    };

  function applyScheduleDefaults(schedule) {
    _.each(schedule, function(taskSchedule, key) {
      schedule[key] = _.defaults(taskSchedule, scheduleDefaults);
    });
    log('Using Task Schedule:', schedule);
  }

  /**
   * Runs according to the configuration.
   */
  m.run = function(schedule) {
    var currIdx = 0,
      resolver = p.defer();

    schedule = schedule || config.taskSchedule;
    if (schedule) applyScheduleDefaults(schedule);

    var interval = setInterval(runner, config.peekIntervalMS);
    m._runningTaskLoops.push(interval);

    function runner() {
      try {
        // if the task runner is not configured to infinitely loop over tasks,
        // then bail out when done tasklist.
        if (!config.loop && currIdx >= config.taskList.length) {
          clearInterval(interval);
          log('Finished tasks and exiting...');
          return resolver.resolve('DONE');
        }

        //if task has a schedule, set task to run side by side?
        if (schedule) {
          m.runTasksOnSchedule(schedule, config.taskList);
        }

        var task = config.taskList[currIdx % config.taskList.length];

        // ensure it is not already running and it is not a scheduled task.
        if (schedule && schedule[task.name]) {
          currIdx += 1;
        }
        else if (!task.isRunning()) {
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
      var sched;
      if (sched = schedule[task.name]) {
        if (sched.intervalMS) {
          if (task.lastRanOn) {
            var tot = new Date().getTime() - task.lastRanOn;
            if (tot >= sched.intervalMS) {
              if (!task.isRunning() &&
                (!task.runningCount || task.runningCount < sched.concurrency)) {
                m.runTask(task);
              }
            }
          }
          task.lastRanOn = new Date().getTime();
        }
        if (sched.specificTimes) {
          m.runNextScheduleTask(sched,task)
        }
      }
    });
  };

  /**
   * looks at schedule runs the task depending on the time.
   * @param schedule
   * @param task
   * @returns {*} a promise.
   */
  m.runNextScheduleTask=function(schedule,task){
    var currentTime=moment().tz("UTC").unix();

    _.forEach(schedule.specificTimes,function(scheduleTask){
      scheduleTask.timezone = scheduleTask.timezone || 'UTC';
      var scheduleTaskTime;

      if(scheduleTask.time){
        console.log("here")
        scheduleTaskTime= m.getDate(scheduleTask.time,scheduleTask.timezone)
      }else{
        scheduleTaskTime=moment.tz(scheduleTask.dateTime,scheduleTask.timezone).unix();
      }

      if(!task[scheduleTaskTime] && currentTime >= scheduleTaskTime &&
          // ensure we aren't too far past the scheduled task time.
        ((currentTime - scheduleTaskTime) < (config.peekIntervalMS * 2)) // multiply peek by 2 incase of solar flares :)
      ) {
        task[scheduleTaskTime] = true;
        m.runTask(task);
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

  m.getDate=function (time,timezone){
    var temp=time.split(":");
    var hour=parseInt(temp[0]);
    var minute=parseInt(temp[1]);
    var second=parseInt(temp[2]);

    return moment().tz(timezone).startOf("day").hour(hour).minute(minute).second(second).unix();
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