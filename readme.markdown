# browser-unix

[unix in the browser](http://unix.substack.net/)

# example

```
var unix = require('browser-unix')();
unix.appendTo('#terminals');
unix.listenTo(window);
```

# methods

``` js
var createUnix = require('browser-unix')
```

## var unix = createUnix()

Create a new unix.

## unix.appendTo(target)

Append the terminals to the element or string query selector `target`.

## unix.listenTo(elem)

Listen for keydown and keypress events from `elem`. `window` is a good value to
use for `elem`.

## var term = unix.createTerminal()

Create a terminal.

## term.remove()

Remove a terminal.

# install

With [npm](https://npmjs.org) do:

```
npm install browser-unix
```

Then compile your `browser.js` code with [browserify](http://browserify.org):

```
browserify browser.js > static/bundle.js
```

# license

MIT
