var unix = require('../')();
window.fs = unix.fs;

unix.appendTo('#terminals');
unix.listenTo(window);
