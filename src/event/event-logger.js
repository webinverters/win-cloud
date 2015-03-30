/**
 * @module event-logger
 * @summary: Logs events to an event queue in the cloud.
 *
 * @description:
 *
 * Author: justin
 * Created On: 2015-03-29.
 * @license Apache-2.0
 */

"use strict";

module.exports = function construct(config, queue) {
  var m = {};
  config = config || {};
  config = _.defaults(config, {});

  m.logError = function(eventLabel, info) {
    console.error(new Date().toISOString()+'-ERROR: '+eventLabel, '\nSTACKTRACE: ', info.stack);
    return m.logEvent(eventLabel, info);
  };

  m.logEvent = function(eventLabel, info) {
    console.log(new Date().toISOString()+':'+eventLabel, info);

    delete info.rawData;

    var msg = {
      eventLabel: eventLabel,
      details: info
    };
    return queue.sendMsg(msg);
  };

  m.getEvents = function(options) {
    return queue.receiveMsg(options).then(function(msgs) {
      // todo: convert to events
      return msgs;
    });
  };

  m.deleteEvent = function(event) {
    return queue.deleteMsg(event.receiptHandle);
  };

  return m;
};