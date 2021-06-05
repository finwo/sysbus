const Sysbus = require('../lib/core');
// const WS = require('cws');
// const ws = new WS('ws://localhost:5000');

const bus = new Sysbus();

bus.on('connection', async socket => {
  console.log('CON');
  await new Promise(r => setTimeout(r,100));
  socket.send('pizza');
  socket.on('message', msg => {
    console.log({msg});
  });
});

bus.connect('ws://localhost:5000');

console.log({bus});


// ws.on('message', message => {
//   console.log(`RECEIVED: ${message}`);
// });

// ws.on('open', () => {
//   ws.send('calzone');
// });
