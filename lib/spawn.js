var through = require('through');
var resumer = require('resumer');
var split = require('split');
var duplexer = require('duplexer');
var minimist = require('minimist');
var parents = require('parents');
var path = require('path');
var nextTick = require('next-tick');
var inspect = require('object-inspect');

module.exports = function (fs) {
    return function (cmd, args, opts) {
        if ({}.hasOwnProperty.call(exports, cmd)) {
            return exports[cmd](fs, args, opts);
        }
        var tr = through();
        var paths = (opts.env.PATH || '').split(':').filter(Boolean);
        
        nextTick(function next () {
            if (paths.length === 0) {
                tr.queue('No command \'' + cmd + '\' found.\n');
                tr.emit('exit', 127);
                return tr.queue(null);
            }
            var p = paths.shift();
            fs.stat(p, function (err, stat) {
                // todo: check the exec bit once level-fs supports that
            });
        });
        
        return tr;
    };
};

exports.ls = function (fs, args, opts) {
    var tr = resumer();
    var argv = minimist(args);
    var dirs = argv._.length ? argv._ : ['.'];
    
    process.nextTick(function next () {
        if (dirs.length === 0) {
            tr.queue(null);
            tr.emit('exit', 0);
            return;
        }
        var file = path.resolve(opts.cwd, dirs.shift());
        fs.stat(file, function (err, s) {
            if (err) {
                tr.queue(err + '\n')
                tr.queue(null);
                tr.emit('exit', 1);
            }
            else if (!argv.d && s.isDirectory()) {
                fs.readdir(file, function (err, files) {
                    if (err) {
                        tr.queue(err + '\n')
                        tr.queue(null);
                        tr.emit('exit', 1);
                    }
                    else showDir(file, files, next);
                });
            }
            else {
                tr.queue(file + '\n');
                next();
            }
        });
    });
    
    function showDir (dir, files, next) {
        var pending = files.length;
        var stats = {};
        if (pending === 0) done();
        
        files.forEach(function (file) {
            fs.stat(path.join(dir, file), function (err, stat) {
                if (err) {
                    tr.queue(err + '\n');
                    tr.queue(null);
                    return tr.emit('exit', 1);
                }
                stats[file] = stat;
                if (--pending === 0) done();
            });
        });
        
        function done () {
            var colors = argv.color === undefined || argv.color === 'always';
            
            Object.keys(stats).sort().forEach(function (file) {
                var isDir = stats[file].isDirectory();
                var isCh = stats[file].isCharacterDevice();
                
                if (isDir && colors) {
                    file = '\x1b[0m\x1b[01;34m' + file + '\x1b[0m';
                }
                else if (isCh && colors) {
                    file = '\x1b[0m\x1b[40;33;01m' + file + '\x1b[0m';
                }
                if (isDir && argv.F) file += '/';
                tr.queue(file + '\n');
            });
            next();
        }
    }
    
    return tr;
};

exports.rm = function (fs, args, opts) {
    var tr = resumer();
    var argv = minimist(args, { boolean: [ 'r', 'f' ] });
    var dirs = argv._.length ? argv._ : ['.'];
    
    process.nextTick(function next () {
        if (dirs.length === 0) {
            tr.queue(null);
            tr.emit('exit', 0);
            return;
        }
        var file = path.resolve(opts.cwd, dirs.shift());
        fs.stat(file, function (err, s) {
            if (err && err.code === 'ENOENT') {
                if (argv.f) return next();
                tr.queue('rm: cannot remove `' + file + '\': '
                    + 'No such file or directory\n'
                );
                tr.queue(null);
                tr.emit('exit', 1);
            }
            else if (err) {
                if (argv.f) return next();
                tr.queue(err + '\n')
                tr.queue(null);
                tr.emit('exit', 1);
            }
            else if (!argv.r && s.isDirectory()) {
                tr.queue('rm: cannot remove `'
                    + file + '\': Is a directory\n');
                tr.queue(null);
                tr.emit('exit', 1);
            }
            else if (s.isDirectory()) {
                fs.readdir(file, function (err, files) {
                    if (err) {
                        if (argv.f) return next();
                        tr.queue(err + '\n')
                        tr.queue(null);
                        tr.emit('exit', 1);
                    }
                    else if (files.length) {
                        dirs.push.apply(dirs, files.map(function (d) {
                            return path.resolve(file, d);
                        }).concat(file));
                        next();
                    }
                    else fs.unlink(file, function (err) {
                        if (err && !argv.f) {
                            tr.queue(err + '\n')
                            tr.queue(null);
                            tr.emit('exit', 1);
                        }
                        else next()
                    })
                });
            }
            else fs.unlink(file, function (err) {
                if (err && !argv.f) {
                    tr.queue(err + '\n')
                    tr.queue(null);
                    tr.emit('exit', 1);
                }
                else next()
            });
        });
    });
    
    return tr;
};

exports.clear = function (fs, args, opts) {
    var tr = resumer();
    tr.queue('\x1b[H\x1b[2J');
    tr.queue(null);
    return tr;
};

exports.mkdir = function (fs, args, opts) {
    var tr = resumer();
    var argv = minimist(args, { boolean: [ 'p' ] });
    if (argv._.length === 0) {
        process.nextTick(function () {
            tr.queue('mkdir: missing operand\n');
            tr.queue('Try `mkdir --help\' for more information.\n');
            tr.queue(null);
            tr.emit('exit', 1);
        });
        return tr;
    }
    var dirs = argv._;
    
    process.nextTick(function next () {
        if (dirs.length === 0) {
            tr.queue(null);
            tr.emit('exit', 0);
            return;
        }
        var file = path.resolve(opts.cwd, dirs.shift());
        fs.mkdir(file, function (err) {
            if (err && err.code === 'ENOENT' && argv.p) {
                dirs.push.apply(dirs, parents(file).reverse());
                next();
            }
            else if (err && err.code === 'EEXIST' && argv.p) {
                next();
            }
            else if (err) {
                tr.queue(err + '\n');
                tr.queue(null);
                tr.emit('exit', 1);
            }
            else next()
        });
    });
    
    return tr;
};

exports.grep = function (fs, args, opts) {
    var argv = minimist(args);
    if (argv._.length === 0) {
        var tr = through();
        process.nextTick(function () {
            tr.queue('Usage: grep [OPTION]... PATTERN [FILE]...\n');
            tr.queue('Try `grep --help\' for more information.\n');
            tr.queue(null);
            tr.emit('exit', 1);
        });
        return tr;
    }
    var re = RegExp(argv._.shift());
    
    var sp = split();
    var dup = duplexer(sp, sp.pipe(through(function (line) {
        if (re.test(line)) this.queue(line + '\n');
    })));
    
    (function next (files) {
        if (files.length === 0) {
            dup.queue(null);
            dup.emit('exit', 0);
        }
        else {
            var stream = fs.createReadStream(files.shift());
            stream.pipe(dup, { end: false });
            stream.pipe(through(null, next));
        }
    })(argv._);
    
    return dup;
};

exports.cat = function (fs, args, opts) {
    var argv = minimist(args);
    var output = through();
    var input = through();
    
    var files = argv._;
    if (files.length === 0) files.push('-');
    
    (function next () {
        if (files.length === 0) return output.queue(null);
        var file = files.shift();
        var rfile = path.resolve(opts.cwd, file);
        var s = file === '-' ? input : fs.createReadStream(rfile);
        s.pipe(output, { end: false });
        s.on('data', function () {});
        s.on('end', next);
    })();
    
    return duplexer(input, output);
};

exports.node = function (fs, args, opts) {
    var tr = through();
    var file = path.resolve(opts.cwd, args[0]);
    fs.readFile(file, function (err, src) {
        if (err) {
            tr.queue(err + '\n');
            tr.emit('exit', 1);
            return;
        }
        var pr = {
            stdout: {
                write: function (s) { tr.queue(s) },
                end: function () {}
            },
            stderr: {
                write: function (s) { tr.queue(s) },
                end: function () {}
            },
            exit: function (code) {
                tr.emit('exit', code);
                tr.queue(null);
            }
        };
        var con = {
            log: function () {
                var nonStr = false;
                var s = [].slice.call(arguments).map(function (arg) {
                    if (!nonStr && typeof arg === 'string') return arg;
                    nonStr = true;
                    return inspect(arg);
                }).join(' ');
                pr.stdout.write(s + '\n');
            },
            dir: function (x) {
                pr.stdout.write(inspect(x) + '\n');
            }
        };
        var require_ = function (p) {
            if (p === 'fs') return fs;
            // TODO: analyze the require graph beforehand
        };
        Function([ 'console', 'require', 'process' ], src)(con, pr, require_);
        pr.exit(); // TODO: track pending async calls
    });
    return tr;
};

var Vim = require('js-vim');

exports.vim = exports.vi = function (fs, args, opts) {
    var input = through(), output = resumer();
    output.queue('\x1b[H\x1b[2J');
    
    var vim = new Vim;
    vim.view.cols = 80;
    vim.view.rows = 24;
    
    input.on('data', function (buf) {
        vim.exec(buf);
    });
    
    var rows = [];
    vim.view.on('change', function () {
        var vis = vim.view.visibleLines();
        var lines = vim.curDoc._lines.slice(vis[0], vis[1] + 1);
        
        for (var i = 0; i < vis[1]; i++) {
            output.queue('\x1b[' + (i + 1) + ';0f');
            output.queue('\x1b[2K');
            if (!lines[i]) {
                output.queue('~\n');
            }
            else if (rows[i] !== lines[i]) {
                output.queue(lines[i]);
            }
        }
        rows = lines;
    });
    
    if (args[0]) vim.exec(':e ' + args[0] + '\n');
    return duplexer(input, output);
};
