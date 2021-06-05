const WS     = require('cws');
const http   = require('http');
const Sysbus = require('./core');

class Server extends Sysbus {
  ws     = null;
  server = null;

  constructor(options) {
    super(options);
    const opts = Object.assign({}, options);

    // Start listening if no server given
    if (!opts.server) {
      opts.server = http.createServer();
    }

    // Store params
    this.ws     = new WS.Server({ server: opts.server });
    this.server = opts.server;

    // Register connections
    this.ws.on('connection', socket => {
      this.addConnection(socket);
    });
  }

  listen(port, cb) {
    cb = cb || (()=>{});
    this.server.listen(port, cb);
  }

}

module.exports = Server;
