module.exports = function (args, member) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      let db = this.mongo.db("gtaEZ").collection("users");

      let user_data = await db.findOne({
        login: member.id,
      });

      let user = user_data || {};
      let bot = this.bot;
      let current_time = new Date().getTime();

      await (async () => {
        try {
          if (!user.muted?.is) return;

          member.roles
            .add(this.config.muted_role, "Возврат роли мьюта.")
            .catch((e) => {});
        } catch (e) {
          console.log(e);
        }
      })();

      await (async () => {
        try {
          if (!user.timedRoles || !user.timedRoles[0]) return;

          let actual_roles = user.timedRoles.filter(
            (role_data) => role_data.time > current_time
          );

          if (!actual_roles[0]) return;
          await member.roles
            .add(
              actual_roles.map((role_data) => role_data.role),
              "Возврат ролей после перезахода."
            )
            .catch((e) => {
              console.log(e);
            });
        } catch (e) {
          console.log(e);
        }
      })();

      await (async () => {
        try {
          if (!user?.archieve?.bans || !user?.archieve?.bans[0]) return;

          let last_ban = user.bans[user.bans.length - 1];

          if (!last_ban || last_ban.marked) return;

          let last_ban_place = user.bans.indexOf(last_ban);

          let marks_count = user.bans.filter(
            (ban_data) => ban_data.marked
          ).length;

          let time;

          // if (marks_count < 1)
          time = f.parse_duration("30d");
          // if (marks_count === 1) time = f.parse_duration("365d");
          // if (marks_count > 1) time = 0;

          last_ban.marked = true;

          user.bans[last_ban_place] = last_ban;

          f.warn_emitter.time_role({
            user_id: member.id,
            time_role_data: {
              id: [this.config.half_of_ban],
              till: time === 0 ? 0 : new Date().getTime() + time,
              by: bot.user.id,
              time: time,
            },
          });

          db.updateOne(
            {
              login: member.id,
            },
            {
              $set: {
                bans: user.bans,
              },
            }
          );
        } catch (e) {
          console.log(e);
        }
      })();
    }
  }

  new Event(args).execute();
};
