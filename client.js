var amqp   = require('amqp'),
    curses = require('ncurses'),
    
    meid   = Math.round(Math.random()*1000000000),
    me     = 'app-console-' + String(meid),

    conn   = amqp.createConnection();

var root = new curses.Window();
curses.colorPair(1, 2, 0);

var rightbar = new curses.Window(root.height, 21, 0, root.width - 21);
rightbar.hline(rightbar.width);
rightbar.attron(curses.attrs.BOLD);
rightbar.print(' ');
rightbar.attron(curses.colorPair(1));
rightbar.print('Installed Apps');
rightbar.attrset(0);
rightbar.print(' +');
rightbar.refresh();

var sep = new curses.Window(root.height, 1, 0, root.width - 22);
sep.attrset(0);
sep.vline(sep.height);
sep.cursor(0, 0);
sep.print('+');
sep.refresh();

var scrollback = new curses.Window(root.height, root.width - 22, 0, 0);
scrollback.attrset(0);
scrollback.attron(curses.attrs.BOLD);
scrollback.hline(scrollback.width);
scrollback.label('+ Command History +');
scrollback.attron(curses.colorPair(1));
scrollback.label('Command History');
scrollback.cursor(scrollback.height - 2, 0);
scrollback.attrset(0);
scrollback.hline(scrollback.width);
scrollback.cursor(scrollback.height - 1, 0);
scrollback.attron(curses.colorPair(3, 2, 0));
scrollback.print('>>>');
scrollback.cursor(scrollback.height - 1, 4);
scrollback.attrset(0);
scrollback.refresh();

scrollback.scrollok(true);
scrollback.setscrreg(1, scrollback.height - 3);

function addLine (head, message) {
  var curx = scrollback.curx, cury = scrollback.cury;
  
  scrollback.scroll();
  scrollback.cursor(scrollback.height - 3, 0);
  scrollback.attron(curses.colorPair(3, 2, 0));
  scrollback.print(head);
  scrollback.attrset(0);
  scrollback.print(' ' + message);
  scrollback.cursor(cury, curx);
  scrollback.refresh();
}
addLine('<->', 'Welcome to the Protonet App Manager command-line interface');
addLine('', '');

exports.handleLine = function (line) {
  addLine('<<<', 'Not connected');
}

var buffer = '';
scrollback.on('inputChar', function (c, i) {
  if ((i === curses.keys.BACKSPACE || i === 127) && scrollback.curx > 0) {
    var prev_x = scrollback.curx-1;
    scrollback.delch(scrollback.height-1, prev_x);
    buffer = buffer.substring(0, prev_x-4) + buffer.substring(prev_x-4+1);
    scrollback.cursor(scrollback.height-1, prev_x);
    scrollback.refresh();
  } else if (i === curses.keys.DEL) {
    var prev_x = scrollback.curx;
    scrollback.delch(scrollback.height-1, scrollback.curx);
    buffer = buffer.substring(0, scrollback.curx-4-1) + buffer.substring(scrollback.curx-4);
    scrollback.cursor(scrollback.height-1, prev_x);
    scrollback.refresh();
  } else if (i === curses.keys.LEFT && scrollback.curx > 4) {
      scrollback.cursor(scrollback.height-1, scrollback.curx-1);
    scrollback.refresh();
  } else if (i === curses.keys.RIGHT && scrollback.curx < buffer.length+4) {
    scrollback.cursor(scrollback.height-1, scrollback.curx+1);
    scrollback.refresh();
  } else if (i === curses.keys.END) {
    scrollback.cursor(scrollback.height-1, buffer.length+4);
    scrollback.refresh();
  } else if (i === curses.keys.HOME) {
    scrollback.cursor(scrollback.height-1, 4);
    scrollback.refresh();
  } else if (i === curses.keys.NEWLINE || i === 343) {
    if (buffer.length == 0) {
      addLine('', '');
    } else {
      addLine('', '');
      addLine('>>>', buffer);
      exports.handleLine(buffer);
      buffer = '';
    }
    
    scrollback.cursor(scrollback.height-1, 4);
    scrollback.clrtoeol();
    scrollback.refresh();
  } else if (i >= 32 && i <= 126 && scrollback.curx < scrollback.width-4) {
    scrollback.echochar(i);
    buffer += c;
  } else {
    addLine('key', i.toString());
  }
});

addLine('<->', 'Connecting to RabbitMQ');

conn.on('ready', function () {
  conn.queue('rpc.' + me, function (queue) {
    queue.bind('#');
    
    queue.subscribe(function (message) {
      var data = JSON.parse(message.data.toString('utf8'));
      addLine('<<<', data['result'].toString());
    });
  });
  
  exports.handleLine = function (line) {
    try {
      var match = line.match(/^([a-z]+)(?: (.*))?;?$/i);
      var data = {
        queue: me,
        method: match[1],
        params: JSON.parse('{' + (match[2] || '') + '}')
      };
      conn.publish('rpc.app-manager', JSON.stringify(data));
    } catch (err) {
      addLine('!!!', 'Error');
    }
  }
  
  addLine('<->', 'Connected!');
});

function cleanup() {
  curses.cleanup();
  process.exit(0);
}
process.addListener('SIGINT',  cleanup);
process.addListener('SIGKILL', cleanup);
process.addListener('SIGTERM', cleanup);

