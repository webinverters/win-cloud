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


  m.blob = require('./src/blob/storage')(config);
  m.eventLogger = require('./src/event/event-logger')(config);
  m.nosql = {};  // TODO: add a nosql provider.
  m.notification = require('./src/notification/notification-svc')(config);  // TODO: implement email service.
  m.queue = require('./src/queue/queue')(config);
  m.task = require('./src/task/task-queue')(config);

  return m;
};
