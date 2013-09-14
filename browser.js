var terminal = require('browser-terminal');
var bashful = require('bashful');
var fs = require('bashful-fs');

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
        read: fs.createReadStream,
        write: fs.createWriteStream,
        spawn: require('./spawn.js'),
        exists: fs.exists
    });
    
    var term = terminal().appendTo('#terminals');
    term.pipe(sh.createStream()).pipe(term);
    return term;
}

var active = null;
window.addEventListener('keydown', function (ev) {
    if (active) active.keydown(ev);
});

var layout = require('vec2-layout/grid');
var elements = [];
function setActive (sh) {
    elements.forEach(function (e) {
        e.classList.remove('active');
    });
    sh.element.classList.add('active');
    active = sh;
}

for (var i = 0; i < 4; i++) (function (sh) {
    sh.element.classList.add('terminal');
    sh.element.addEventListener('mouseover', function (ev) {
        setActive(sh);
    });
    
    elements.push(sh.element);
    sh.element.set = function (x, y) {
        sh.element.style.position = 'absolute';
        sh.element.style.left = x;
        sh.element.style.top = y;
        return { size: { set: set } };
        
        function set (w, h) {
            sh.element.style.width = w - 1;
            sh.element.style.height = h - 1;
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
