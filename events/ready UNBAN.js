module.exports = function (args) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      setInterval(this.unban.bind(null, this.db, f), f.parse_duration("1m"));
    }

    async unban(db, f) {
      let users = await db
        .collection("banneds")
        .find({
          till: {
            $gt: 0,
            $lt: new Date().getTime(),
          },
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

        if (user.till > new Date().getTime()) {
          current_user++;
          next_user();
          return;
        }

        let unbanned_user = await reports_channel.guild.members
          .unban(
            user.login,
            `Разбан от ${Bot.bot.user.tag} ID: ${Bot.bot.user.id}: Время бана истекло.`
          )
          .catch((e) => undefined);

        if (unbanned_user === undefined) {
          db.collection("banneds").deleteOne({ login: user.login });
          return;
        }

        let unban = {
          reason: "Время бана истекло.",
          by: Bot.bot.user.id,
          date: new Date().getTime(),
        };

        f.warn_emitter.emit("unban", {
          unbanned_user: unbanned_user,
          user_id: user.login,
          mongo: db,
          data: unban,
        });

        current_user++;
        next_user();
      }
    }
  }

  new Event(args).execute();
};
