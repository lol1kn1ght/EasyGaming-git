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
        console.log("1");
        if (!user) return;
        console.log("2");

        if (user.till > new Date().getTime()) {
          current_user++;
          next_user();
          return;
        }
        console.log("3");

        let unban = {
          reason: "Время бана истекло.",
          by: Bot.bot.user.id,
          date: new Date().getTime(),
        };

        let result = await f.warn_emitter.unban({
          user_id: user.login,
          unban_data: unban,
        });

        if (result) {
          db.collection("banneds").deleteOne({ login: user.login });
        }
        current_user++;
        next_user();
      }
    }
  }

  new Event(args).execute();
};
