/**
 * @module taskify
 * @summary: Takes any function and converts it into a task that can be queued and ran
 * in the distributed task runner.
 *
 * @description:
 *
 * Author: justin
 * Created On: 2015-03-29.
 * @license Apache-2.0
 */

"use strict";

module.exports = function construct(config) {
  var m = {};
  config = config || {};
  config = _.defaults(config, {});

  m.taskify = function(taskFunc) {
    return {}; // TODO: this should create a task-base and set the task func to runNextTask
  };

  return m;
};