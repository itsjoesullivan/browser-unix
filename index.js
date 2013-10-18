var exterminate = require('exterminate');
var bashful = require('bashful');
var through = require('through');
var decodeKey = require('ansi-keycode');
var audioStream = require('./lib/audio_stream.js');
var layout = require('vec2-layout/grid');

var fs = require('./lib/fs.js')();
var createSh = require('./lib/sh.js');

if (!process.umask) process.umask = function () { return 2 };

fs.mkdir('/dev', function () {});
fs.mkdir('/home', function () {
    fs.mkdir('/home/guest', function () {});
});
fs._addCharDev('/dev/audio', {
    write: function () { return audioStream() },
    read: function () { return through() } // todo
});

module.exports = function (opts) {
    return new Unix(fs, opts);
};

function Unix (fs, opts) {
    if (!opts) opts = {};
    
    var sh = createSh(fs);
    var term = exterminate(80, 25);
    
    this.fs = fs;
    this.terminal = term;
    this.layout = opts.layout || layout;
    
    term.pipe(sh.createStream()).pipe(through(function (s) {
        this.queue(s.replace(/(?!\r)\n/g, '\r\n'));
    })).pipe(term);
    
    var elem = term.terminal.element;
    elem.focus();
    elem.classList.add('terminal');
    
    this.elements = [];
    this.elements.push(elem);
    elem.set = function (x, y) {
        elem.style.position = 'absolute';
        elem.style.left = x;
        elem.style.top = y;
        return { size: { set: set } };
        
        function set (w, h) {
            elem.style.width = w - 1;
            elem.style.height = h - 1;
        }
    };
}

Unix.prototype.appendTo = function (target) {
    this.terminal.appendTo(target);
    return this;
};

Unix.prototype.listenTo = function (elem) {
    var self = this;
    elem.addEventListener('keydown', handleKey(function (ev) {
        var c = decodeKey(ev, {
            arrows: false,
            'delete': false,
            backspace: false
        });
        if (c) self.terminal.write(c);
        self.terminal.terminal.keyDown(ev);
    }));
    elem.addEventListener('keypress', handleKey(function (ev) {
        self.terminal.terminal.keyPress(ev);
    }));
    
    function resize () {
        self.layout(self.elements, { size: {
            x: (elem.innerWidth || elem.clientWidth) - 2,
            y: (elem.innerHeight || elem.clientWidth) - 2
        } });
    }
    resize();
    elem.addEventListener('resize', resize);
};

function handleKey (cb) {
    return function (ev) {
        var c = String.fromCharCode(ev.keyCode);
        if (ev.ctrlKey && c === 'R') return;
        if (ev.ctrlKey && c === 'L') return;
        if (ev.ctrlKey && ev.shiftKey && c === 'J') return;
        cb(ev);
    };
}
