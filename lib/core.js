const WS           = require('cws');
const EventEmitter = require('./event-emitter');

const adapters = [
  {
    protocol: 'ws',
    connect(bus, uri) {
      const ws = new WS(uri);
      bus.addConnection(ws);
    }
  }
];

class Sysbus extends EventEmitter {
  prefix      = '';
  connections = [];
  subscribers = []; // Remote listeners
  listeners   = []; // Local listeners

  constructor(options) {
    super();
    const opts = Object.assign({}, options);
    this.id = Math.random().toString(36).substr(2);
  }

  connect(uri, options) {
    const proto   = uri.split(':').shift();
    const adapter = adapters.find(adapter => adapter.protocol == proto);
    adapter.connect(this, uri, options);
  }

  addConnection(socket, options) {
    const opts = Object.assign({mode:'client'}, options);
    const conn = {mode:opts.mode,socket};
    this.connections.push(conn);

    // Announce our status
    // Acts as keepalive as well
    let announceInterval = setInterval(() => {
      socket.send(JSON.stringify({
        op  : 'hb', // heartbeat
        mode: this.server ? 'server' : 'client',
      }));
    }, 10000);

    // Clean up upon close
    socket.on('close', () => {
      clearInterval(announceInterval);
      this.connections.splice(this.connections.indexOf(conn), 1);
      this.subscribers = this.subscribers.filter(sub => sub.conn !== conn);
    });

    // Handle incoming messages
    socket.on('message', message => {
      try { message = JSON.parse(message);
      } catch(e) {return;}
      if (!message.op) return;
      switch(message.op) {
        case 'hb':
          conn.mode = message.mode;
          break;

        case 'pub':
          this.publish(message.topic,message.data,conn,message.nonce);
          break;

        case 'sub':
          this.subscribers.push({
            conn, topic: message.topic
          });
          break;
      }
    });
  }

  publish(topic, data, conn, nonce) {
    nonce = nonce || Math.random().toString(36).substr(2);
    this.connections
      .filter(c => c !== conn)
      .filter(conn => conn.mode == 'server')
      .concat(this.listeners.filter(listener => listener.topic == topic))
      .concat(this.subscribers.filter(subscriber => subscriber.topic == topic))
      .filter(party => party.nonce !== nonce)
      .forEach(party => {
        const socket = party.conn && party.conn.socket || party.socket;
        party.nonce = nonce;
        if (socket) {
          socket.send(JSON.stringify({
            op: 'pub',
            topic,
            data,
            nonce,
          }));
        }
        if (party.handler) {
          party.handler(data);
        }
      });
  }

  subscribe(topic, handler) {
    this.listeners.push({topic,handler});
    this.connections
      .filter(conn => conn.mode == 'server')
      .forEach(conn => {
        conn.socket.send(JSON.stringify({
          op: 'sub',
          topic,
        }));
      });
  }

}

Sysbus.register = function(plugin) {
  if (plugin.adapter) adapters.push(plugin.adapter);
};

module.exports = Sysbus;
