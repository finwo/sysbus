const http   = require('http');
const static = require('node-static');
const conf   = require('rc')('sysbus', {port:5000});
const Sysbus = require('./lib');

const file = new static.Server(`${__dirname}/public`);

const server = http.createServer((req, res) => {
  req.addListener('end', () => file.serve(req, res)).resume();
});

const sserver = new Sysbus.Server({server});
sserver.on('connection', socket => {
  socket.on('message', msg => {
    console.log({msg});
    socket.send('PIZZAAAA');
  });
});

server.listen(conf.port, err => {
  if (err) throw err;
  console.log(`Listening on :${conf.port}`);
});

// console.log({Sysbus, server});

// const bus = new Sysbus();
// bus.connect('ws://localhost:5000');

// const conf   = require('rc')('sysbus', {port: 5000});
// const http   = require('http');
// const WS     = require('cws');

// const EventEmitter = require('events').EventEmitter;


// const ws = new WS.Server({ server });
// ws.on('connection', socket => {
//   socket.on('message', message => {
//     console.log(`RECEIVED: ${message}`);
//   });
//   socket.send('pizza');
// });

// server.listen(conf.port, err => {
//   if (err) throw err;
//   console.log(`Listening on :${conf.port}`);
// });



// // const bus = {
// //   prefix: '',
// //   subscribers: {},

// //   publish(topic, data) {
// //     (bus.subscribers[prefix+topic]||[]).forEach(subscriber => {
// //       subscriber.emit('message', data);
// //     });
// //   },

// //   subscribe(topic) {
// //     const subscriber = new EventEmitter();
// //     bus.subscribers[prefix+topic] = bus.subscribers[prefix+topic] || [];
// //     bus.subscribers[prefix+topic].push(subscriber);
// //     subscriber.unsubscribe = subscriber.close = () => {
// //       bus.subscribers[prefix+topic].splice(bus.subscribers[prefix+topic].indexOf(subscriber), 1);
// //     };
// //     return subscriber;
// //   },

// // };

// // // Testing
// // const n = bus.subscribe('pizza');
// // n.on('message', console.log);
// // bus.publish('pizza', 'calzone');

