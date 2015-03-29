/**
 * @module email-svc
 * @summary: Sends emails
 *
 * @description:
 *
 * Author: justin
 * Created On: 2015-03-27.
 * @license Apache-2.0
 */

"use strict";

var emailjs = require('emailjs');

module.exports = function construct(config) {
  var m = {};
  config = config || {};
  config = _.defaults(config, {});

  var mailer = emailjs.server.connect({
    user: config.emailConfig.user,
    password: config.emailConfig.password,
    host: config.emailConfig.host,
    ssl: true
  });

  var sendEmail = p.promisify(mailer.send, mailer);

  /**
   *
   * @param recipients
   * @param payloadReportObject
   * @param attachments optional
   * @returns {*}
   */
  m.email = function (recipients, payloadReportObject,attachments) {
    var mailOptions = {
      to: recipients,
      from: 'Emmit Labs<no-reply@emmit.ca>',
      subject: 'Report Mismatch',
      text: [
        payloadReportObject
      ].join(''),
      attachment:attachments
    };
    return sendEmail(mailOptions)
  };

  return m;
};