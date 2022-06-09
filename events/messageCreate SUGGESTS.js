module.exports = function (args, message) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      if (message.channel.id != "828541611474550804") return;

      const reacts = ["✅", "❌"];

      for (let react of reacts) {
        await message.react(react);
      }
    }
  }

  new Event(args).execute();
};
