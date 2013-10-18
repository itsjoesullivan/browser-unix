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
    
    this.fs = fs;
    this.terminals = [];
    this.elements = [];
    this.layout = opts.layout || layout;
    
    this.createTerminal().setActive();
}

Unix.prototype.createTerminal = function () {
    var self = this;
    var sh = createSh(fs);
    var term = exterminate(80, 25);
    term.sh = sh;
    self.terminals.push(term);
    
    term.pipe(sh.createStream()).pipe(through(function (s) {
        this.queue(s.replace(/(?!\r)\n/g, '\r\n'));
    })).pipe(term);
    
    var elem = term.terminal.element;
    elem.classList.add('terminal');
    
    self.elements.push(elem);
    elem.set = function (x, y) {
        elem.style.position = 'absolute';
        elem.style.left = x;
        elem.style.top = y;
        return { size: { set: set } };
        
        function set (w, h) {
            elem.style.width = w - 1;
            elem.style.height = h - 1;
            term.resize(w, h);
        }
    };
    
    term.setActive = function () {
        self.active = term;
    };
    
    term.remove = function () {
        var i = self.terminals.indexOf(term);
        if (i >= 0) self.terminals.splice(i, 1);
        var j = self.elements.indexOf(elem);
        if (j >= 0) self.elements.splice(j, 1);
        self.resize();
    };
    
    elem.addEventListener('mouseover', function (ev) {
        term.setActive();
    });
    elem.addEventListener('click', function (ev) {
        term.setActive();
    });
    
    self.resize();
    
    if (self._target) term.appendTo(self._target);
    return term;
};

Unix.prototype.appendTo = function (target) {
    this.terminals.forEach(function (term) {
        term.appendTo(target);
    });
    this._target = typeof target === 'string'
        ? document.querySelector(target)
        : target
    ;
    return this;
};

Unix.prototype.listenTo = function (elem) {
    var self = this;
    elem.addEventListener('keydown', handleKey(function (ev) {
        if (!self.active) return;
        var c = decodeKey(ev, {
            arrows: false,
            'delete': false,
            backspace: false
        });
        if (c && !self.active.sh.current) {
            self.active.write(c);
        }
        self.active.terminal.keyDown(ev);
    }));
    elem.addEventListener('keypress', handleKey(function (ev) {
        if (!self.active) return;
        self.active.terminal.keyPress(ev);
    }));
    
    if (!self._listening) self._listening = elem;
    self.resize();
    elem.addEventListener('resize', function () { self.resize() });
};

Unix.prototype.resize = function () {
    var elem = this._listening;
    if (!elem) return;
    this.layout(this.elements, {
        size: {
            x: (elem.innerWidth || elem.clientWidth) - 2,
            y: (elem.innerHeight || elem.clientWidth) - 2
        }
    });
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
