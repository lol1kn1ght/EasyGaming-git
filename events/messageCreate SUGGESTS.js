module.exports = function (args, message) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      if (message.channel.id != '828541611474550804') return;

      const message_content = message.content;
      const starts_with = /#\d+/.exec(message_content);
      const num = starts_with ? starts_with[0] : undefined;
      if (!message.content.startsWith(num)) return;

      const reacts = ['✅', '❌'];

      for (let react of reacts) {
        await message.react(react);
      }
    }
  }

  new Event(args).execute();
};
