/**
 * @module event-logger
 * @summary: Logs events to an event queue in the cloud.
 *
 * @description:
 * This logger is not meant to be general purpose, but rather to log specific events to the cloud
 * for later analysis.
 *
 * Author: justin
 * Created On: 2015-03-29.
 * @license Apache-2.0
 */

"use strict";

var os = require("os");


module.exports = function construct(config, queue, customLogger) {
  var m = {};
  config = config || {};
  config = _.defaults(config, {});

  var logger = customLogger || global.logger || {
      log: function() {},
      logError:function(){}
    };

  m.logError = function(eventLabel, info) {
    logger.logError({eventLabel: eventLabel, info: info}, eventLabel);
    return m.log(eventLabel, info, "ERROR");
  };

  m.log = function(eventLabel, info, type) {
    logger.log({eventLabel: eventLabel, info: info}, eventLabel);

    var msg = {
      eventLabel: eventLabel,
      type: type || 'EVENT',
      host: os.hostname(),
      details: info
    };
    return queue.sendMsg(msg);
  };

  m.getEvents = function(options) {
    return queue.receiveMsg(options).then(function(msgs) {
      return msgs;
    });
  };

  m.deleteEvent = function(event) {
    return queue.deleteMsg(event.receiptHandle);
  };

  // endow this logger with all the abilities of the customLogger.
  var m = _.extend({}, customLogger, m);

  return m;
};