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

module.exports = function construct(config, logger) {
  var m = {};
  config = config || {};
  config = _.defaults(config, {
    useGlobals: true
  });


  m.Storage = require('./src/blob/storage');
  m.EventLogger = require('./src/event/event-logger');
  //m.nosql = {};  // TODO: add a nosql provider.
  // m.notification = require('./src/notification/notification-svc')(config);  // TODO: implement email service.
  m.Queue = require('./src/queue/queue');
  m.TaskQueue = require('./src/task/task-queue');
  m.TaskRunner = require('./src/task/task-runner');

  m.eventLogger = m.EventLogger(config.eventLog, m.Queue(config.eventQueueName), logger);


  if (config.useGlobals) {
    global.wincloud = _.extend({}, m);
  }

  return m;
};
