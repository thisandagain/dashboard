/**
 * Dashboard service.
 *
 * @package dashboard
 * @author Andrew Sliwinski <andrew@diy.org>
 */

/**
 * Dependencies
 */
var _       = require('underscore'),
    async   = require('async'),
    argv    = require('optimist')
                .usage('Usage: $0 -u [string] -p [string] -t [string]')
                .demand(['u','p', 't'])
                .default('i', 1)
                .argv;

/**
 * Storage object
 */
var status  = false;

/**
 * Phidget
 */
var phidget = require('phidget');
var servo   = new phidget.servo();

function servoToPosition(deg, callback) {
    servo.attach(function (err) {
        servo.setEngaged(0, true, function (err) {
            servo.setPosition(0, deg, function (err) {
                servo.close(callback);
            });
        });
    });
}

/**
 * Create IMAP connection.
 */
var ImapConnection = require('imap').ImapConnection;
var imap = new ImapConnection({
    username: argv.u,
    password: argv.p,
    host: 'imap.gmail.com',
    port: 993,
    secure: true
});

/**
 * Checks inbox & returns the number of messages matching the specified search params.
 *
 * @return {Number}
 */
function checkInbox (callback) {
    async.auto({
        connect:    function (callback) {
            imap.connect(callback);
        },
        open:       ['connect', function (callback, obj) {
            imap.openBox('INBOX', false, callback);
        }],
        search:     ['open', function (callback, obj) {
            imap.search([ ['UNSEEN'], ['FROM', argv.t], ['SINCE', 'May 1, 2011'] ], callback);
        }]
    }, function (err, obj) {
        if (err) {
            callback(err);
        } else {
            imap.logout(function () {
                callback(null, obj.search.length);
            });
        }
    });
}

// ----------------------------
// ----------------------------

setInterval(function () {
    checkInbox(function (err, count) {
        if (err) {
            console.log('Dashboard: ' + err);
        } else {
            if (count > 0) {
                servoToPosition(180, function (err) {
                    status = true;
                });
            } else if (count === 0 && status === true) {
                servoToPosition(40, function (err) {
                    status = false;
                });
            }
            console.log('Inbox: ' + count + ' | Stamp: ' + new Date().toJSON());
        }
    });
}, argv.i * 60000);