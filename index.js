/**
 * @module index.js
 * @summary: Wires up the cloud library.
 *
 * @description:
 *
 * Author: justin
 * Created On: 2015-03-21.
 * @license Apache-2.0
 */

require('win-common')();

module.exports = function construct(config) {
  var m = {};
  config = config || {};
  config = _.defaults(config, {});


  m.Storage = require('./src/blob/storage');
  m.EventLogger = require('./src/event/event-logger');
  //m.nosql = {};  // TODO: add a nosql provider.
  // m.notification = require('./src/notification/notification-svc')(config);  // TODO: implement email service.
  m.Queue = require('./src/queue/queue');
  m.TaskQueue = require('./src/task/task-queue');

  return m;
};
