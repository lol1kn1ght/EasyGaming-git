module.exports = function (args) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      setInterval(this.unmute.bind(null, this.db, f), f.parse_duration("1m"));
    }

    async unmute(db, f) {
      let users = await db
        .collection("users")
        .find({
          "muted.is": true,
        })
        .toArray();

      if (!users[0]) return;

      let current_user = 0;

      let reports_channel = await Bot.bot.channels
        .fetch(f.config.reports_channel)
        .catch((e) => {
          throw new Error("Канал репортов не найден.");
        });

      next_user();

      async function next_user() {
        let user = users[current_user];

        if (!user) return;

        if (user.muted?.till > new Date().getTime()) {
          current_user++;
          next_user();
          return;
        }

        let member = await reports_channel.guild.members
          .fetch(user.login)
          .catch((e) => {});

        if (!member) {
          current_user++;
          next_user();
          return;
        }

        let profile = new f.Profile(db, member.id);

        await profile.unmute({
          unmute_data: {
            reason: "Время наказания истекло.",
            by: Bot.bot,
          },
        });

        current_user++;
        next_user();
      }
    }
  }

  new Event(args).execute();
};
