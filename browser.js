var exterminate = require('exterminate');
var bashful = require('bashful');
var through = require('through');
var decodeKey = require('browser-keycode');

process.umask = function () { return 2 };
var fs = require('fs');
window.fs = fs;
window.Store = require('level-store');

var mkdirp = require('mkdirp');
mkdirp('/home/guest');

function makeSh () {
    var sh = bashful({
        env: {
            USER: 'guest',
            PS1: '\\[\\033[01;32m\\]\\u\\[\\033[00m\\] : '
                + '\\[\\033[01;34m\\]\\W\\[\\033[00m\\] $ ',
            HOME: '/home/guest',
            PWD: '/home/guest',
            UID: 1000
        },
        read: bind(fs, fs.createReadStream),
        write: bind(fs, fs.createWriteStream),
        spawn: require('./spawn.js'),
        exists: bind(fs, fs.exists)
    });
    
    var term = exterminate(80, 25);
    term.appendTo('#terminals');
    term.pipe(sh.createStream()).pipe(through(function (s) {
        this.queue(s.replace(/(?!\r)\n/g, '\r\n'));
    })).pipe(term);
    return term;
}

function bind (r, f) {
    return function () { return f.apply(r, arguments) };
}

var active = null;
window.addEventListener('keydown', handleActive(function (ev) {
    var c = decodeKey(ev);
    if (c === '\r') c = '\r\n';
    if (c) active.write(c);
    active.terminal.keyDown(ev);
}));
window.addEventListener('keypress', handleActive(function (ev) {
    active.terminal.keyPress(ev);
}));

function handleActive (cb) {
    return function (ev) {
        var c = String.fromCharCode(ev.keyCode);
        if (ev.ctrlKey && c === 'R') return;
        if (ev.ctrlKey && c === 'L') return;
        if (ev.ctrlKey && ev.shiftKey && c === 'J') return;
        if (active) cb(ev);
    };
}

var layout = require('vec2-layout/grid');
var elements = [];
function setActive (sh) {
    elements.forEach(function (e) {
        e.classList.remove('active');
    });
    sh.terminal.element.classList.add('active');
    active = sh;
}

for (var i = 0; i < 1; i++) (function (sh) {
    var elem = sh.terminal.element;
    elem.classList.add('terminal');
    elem.addEventListener('mouseover', function (ev) {
        setActive(sh);
    });
    
    elements.push(elem);
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
})(makeSh());

function resize () {
    layout(elements, { size: {
        x: window.innerWidth - 2,
        y: window.innerHeight - 2
    } });
}
resize();
window.addEventListener('resize', resize);
