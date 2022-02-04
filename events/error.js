module.exports = function(args, err) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      f.handle_error(err, "API");
    }
  }

  new Event(args).execute();
};
