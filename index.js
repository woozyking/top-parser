var exec = require('child_process').exec;
var moment = require('moment');

var _parser = {
  darwin: function(data) {
    if (data instanceof Buffer) {
      data = data.toString();
    }

    var r = {};

    data.trim().split(/\r?\n/).filter(function(line) {
      return line !== '';
    }).forEach(function(line) {
      line = line.trim().replace(/\.$/, '');

      var lastIndex = line.lastIndexOf(': ');
      var head;
      var body = line;

      if (lastIndex > -1) {
        head = line.slice(0, lastIndex).split(': ')[0];
        body = line.slice(lastIndex + 2);
      };

      switch(head) {
        case 'Load Avg':
          r[head] = body.split(', ').map(function(l) {
            return parseFloat(l);
          });
          break;
        case 'PhysMem':
          r[head] = {};
          var p = body.match(/(.*)\sused\s?(\((.*)\swired\))?,\s(.*)\sunused/i);
          r[head].used = p[1];
          r[head].wired = p[3];
          r[head].unused = p[4];
          break;
        case 'Processes':
        case 'CPU usage':
        case 'SharedLibs':
        case 'MemRegions':
        case 'VM':
        case 'Networks':
        case 'Disks':
          r[head] = {};

          body.split(', ').forEach(function(p) {
            var v = p.slice(0, p.indexOf(' '));
            var k = p.slice(p.indexOf(' ') + 1);

            if (head === 'Processes') {
              v = parseInt(v);
            }

            r[head][k] = v;
          });
          break;
        default:
          var t = moment(line, 'YYYY/MM/DD HH:mm:ss');
          r.timestamp = t.isValid() ? t.unix() : moment().unix();
          break;
      }
    });

    return r;
  },
  linux: function(data) {
    return data;
  }
};

module.exports = function _top(callback) {
  // linux top
  var cmd = "LINES=7 bash -c 'top -bn 1'";

  // osx top
  if (process.platform === 'darwin') {
    cmd = 'top -l 1 -n 0';
  }
  // TODO: other platform top

  var top = exec(cmd, function(err, stdout, stderr) {
    if (err !== null) {
      return callback(err);
    }

    if (stderr) {
      return callback(new Error(stderr));
    }

    return callback(null, _parser[process.platform](stdout));
  });
};

module.exports.parser = (function() {
  return _parser;
})();
