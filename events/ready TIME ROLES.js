module.exports = function (args) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      setInterval(this.unmute.bind(null, this.db, f), f.parse_duration("1m"));
    }

    async unmute(db, f) {
      let users_data = await db.collection("users").find().toArray();

      let users = users_data.filter(
        (user) => user.timedRoles && user.timedRoles[0]
      );

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

        let till_roles = user.timedRoles?.filter(
          (role) => role.time !== 0 && role.time < new Date().getTime()
        );

        if (!till_roles[0]) {
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

        let roles = till_roles.map((role) => role.role);

        // member.roles.remove(roles);

        f.warn_emitter.emit("time_role_remove", {
          user_id: member.id,
          data: {
            id: roles,
            by: Bot.bot.user.id,
          },
          mongo: db,
        });
        current_user++;
        next_user();
      }
    }
  }

  new Event(args).execute();
};
