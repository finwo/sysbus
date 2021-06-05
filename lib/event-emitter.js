module.exports = function EventEmitter() {
  let listeners = {};
  this.emit = (event, data) => {
    (listeners[event]||[]).forEach(listener => listener(data));
  };
  this.on = (event, handler) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(handler);
  };
};
