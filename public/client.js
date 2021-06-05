(() => {
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // node_modules/cws/src/browser.js
  var require_browser = __commonJS({
    "node_modules/cws/src/browser.js"(exports, module) {
      (() => {
        if (typeof window !== "object")
          return;
        const WebSocket = window.WebSocket || false;
        if (!WebSocket)
          throw new Error("This browser does not support websockets");
        const EventEmitter = window.EventEmitter || function EventEmitter2() {
          let listeners = {};
          this.emit = (event, data) => {
            (listeners[event] || []).forEach((listener) => listener(data));
          };
          this.on = (event, handler) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(handler);
          };
        };
        function CWS(address, protocols, options) {
          if (typeof protocols === "object" && !Array.isArray(protocols)) {
            options = protocols;
            protocols = void 0;
          }
          options = Object.assign({ queue: true }, options);
          let ws = new WebSocket(address, protocols);
          let out = new EventEmitter();
          Object.defineProperty(out, "readyState", {
            configurable: false,
            enumerable: true,
            get: () => ws.readyState
          });
          ws.onopen = function(e) {
            out.emit("open", e);
          };
          ws.onclose = function(e) {
            out.emit("close", e);
          };
          ws.onerror = function(e) {
            out.emit("error", e);
          };
          ws.onmessage = async function(event) {
            let message = event.data;
            if (typeof Blob === "function" && message instanceof Blob) {
              message = Buffer.from(await new Response(message).arrayBuffer());
            }
            out.emit("message", message);
          };
          out.queue = [];
          out.send = function(chunk) {
            if (!options.queue) {
              ws.send(current);
              return out;
            }
            out.queue.push(chunk);
            if (ws.readyState !== 1)
              return;
            let current = false;
            try {
              while (out.queue.length) {
                current = out.queue.shift();
                ws.send(current);
              }
            } catch (e) {
              if (current)
                out.queue.unshift(current);
            }
          };
          out.close = function() {
            if (ws.readyState > 1)
              return;
            ws.close();
            return this;
          };
          return out;
        }
        window.CWS = window.CWS || CWS;
        if (typeof module === "object") {
          module.exports = CWS;
        }
      })();
    }
  });

  // lib/event-emitter.js
  var require_event_emitter = __commonJS({
    "lib/event-emitter.js"(exports, module) {
      module.exports = function EventEmitter() {
        let listeners = {};
        this.emit = (event, data) => {
          (listeners[event] || []).forEach((listener) => listener(data));
        };
        this.on = (event, handler) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(handler);
        };
      };
    }
  });

  // lib/core.js
  var require_core = __commonJS({
    "lib/core.js"(exports, module) {
      var WS = require_browser();
      var EventEmitter = require_event_emitter();
      var adapters = [
        {
          protocol: "ws",
          connect(bus2, uri) {
            const ws = new WS(uri);
            bus2.addConnection(ws);
          }
        }
      ];
      var Sysbus2 = class extends EventEmitter {
        prefix = "";
        connections = [];
        subscribers = [];
        listeners = [];
        constructor(options) {
          super();
          const opts = Object.assign({}, options);
          this.id = Math.random().toString(36).substr(2);
        }
        connect(uri, options) {
          const proto = uri.split(":").shift();
          const adapter = adapters.find((adapter2) => adapter2.protocol == proto);
          adapter.connect(this, uri, options);
        }
        addConnection(socket, options) {
          const opts = Object.assign({ mode: "client" }, options);
          const conn = { mode: opts.mode, socket };
          this.connections.push(conn);
          let announceInterval = setInterval(() => {
            socket.send(JSON.stringify({
              op: "hb",
              mode: this.server ? "server" : "client"
            }));
          }, 1e4);
          socket.on("close", () => {
            clearInterval(announceInterval);
            this.connections.splice(this.connections.indexOf(conn), 1);
            this.subscribers = this.subscribers.filter((sub) => sub.conn !== conn);
          });
          socket.on("message", (message) => {
            try {
              message = JSON.parse(message);
            } catch (e) {
              return;
            }
            if (!message.op)
              return;
            switch (message.op) {
              case "hb":
                conn.mode = message.mode;
                break;
              case "pub":
                this.publish(message.topic, message.data, conn, message.nonce);
                break;
              case "sub":
                this.subscribers.push({
                  conn,
                  topic: message.topic
                });
                break;
            }
          });
        }
        publish(topic, data, conn, nonce) {
          nonce = nonce || Math.random().toString(36).substr(2);
          this.connections.filter((c) => c !== conn).filter((conn2) => conn2.mode == "server").concat(this.listeners.filter((listener) => listener.topic == topic)).concat(this.subscribers.filter((subscriber) => subscriber.topic == topic)).filter((party) => party.nonce !== nonce).forEach((party) => {
            const socket = party.conn && party.conn.socket || party.socket;
            party.nonce = nonce;
            if (socket) {
              socket.send(JSON.stringify({
                op: "pub",
                topic,
                data,
                nonce
              }));
            }
            if (party.handler) {
              party.handler(data);
            }
          });
        }
        subscribe(topic, handler) {
          this.listeners.push({ topic, handler });
          this.connections.filter((conn) => conn.mode == "server").forEach((conn) => {
            conn.socket.send(JSON.stringify({
              op: "sub",
              topic
            }));
          });
        }
      };
      Sysbus2.register = function(plugin) {
        if (plugin.adapter)
          adapters.push(plugin.adapter);
      };
      module.exports = Sysbus2;
    }
  });

  // src/client.js
  var Sysbus = require_core();
  var bus = new Sysbus();
  bus.on("connection", async (socket) => {
    console.log("CON");
    await new Promise((r) => setTimeout(r, 100));
    socket.send("pizza");
    socket.on("message", (msg) => {
      console.log({ msg });
    });
  });
  bus.connect("ws://localhost:5000");
  console.log({ bus });
})();
