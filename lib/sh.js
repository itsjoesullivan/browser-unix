var bashful = require('bashful');
var spawn = require('./spawn.js');

module.exports = function (fs) {
    return bashful({
        env: {
            USER: 'guest',
            PS1: '\\[\\033[01;32m\\]\\u\\[\\033[00m\\] : '
                + '\\[\\033[01;34m\\]\\W\\[\\033[00m\\] $ ',
            HOME: '/home/guest',
            PWD: '/home/guest',
            UID: 1000
        },
        read: fs.createReadStream,
        write: fs.createWriteStream,
        spawn: spawn(fs),
        exists: fs.exists
    });
};
