var unix = require('../')();
window.unix = unix;
window.fs = unix.fs;

unix.appendTo('#terminals');
unix.listenTo(window);
