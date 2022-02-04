module.exports = function (args, message) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      if (message.author.bot || message.channel.id === "897358478866251826")
        return;

      if (message.channel.topic === "lester_minigame") return;

      let user = f.flood[message.author.id] || {};

      if (user.till < new Date().getTime()) user = {};

      if (!user.amount) user.amount = 1;

      if (!user.till)
        user.till = new Date().getTime() + f.parse_duration("20s");

      if (user.amount >= this.config.anti_flood.max) {
        let user_profile = new f.Profile(this.db, message.author.id);

        let report_data = {
          user_id: message.author.id,
          report_data: {
            by: Bot.bot.id,
            type: "USER",
            reason: "Флуд сообщениями.",
            channel: message.channel,
          },
        };

        f.warn_emitter.report(report_data);

        let mute = {
          time: f.parse_duration("1h"),
          reason: "Флуд сообщениями",
          by: Bot.bot.user.id,
          date: new Date().getTime(),
        };
        user_profile.mute({ mute_data: mute });

        user.amount = 0;
        f.flood[message.author.id] = user;
        return;
      }

      // if (f.same_messages[message.author.id])
      user.amount++;
      f.flood[message.author.id] = user;
    }
  }

  new Event(args).execute();
};
