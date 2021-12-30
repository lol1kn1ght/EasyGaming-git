module.exports = function (args, old_state, new_state) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      if (!new_state?.channel) return;
      if (new_state.channelId != this.config.auth_channel) return;

      if (new Date().getTime() < f.authoirse_members_cooldown) return;

      let channel = this.bot.channels.cache.get("869194593265143808");

      if (new_state.channel.members.size === 0) return;

      f.authoirse_members_cooldown =
        new Date().getTime() + f.parse_duration("10m");

      let inChannel = await new Promise((resolve) => {
        setTimeout(async () => {
          if (new_state.channelId !== this.config.auth_channel)
            return resolve(false);

          resolve(true);
        }, 60000);
      });

      if (!inChannel) return (f.authoirse_members_cooldown = 0);
      channel.send(
        `<@&468374000947560459> <@&626297105048141874>: \`${new_state.channel.members.size}\` человек(-а) желают получить авторизацию в ${new_state.channel}`
      );

      f.authoirse_members_cooldown =
        new Date().getTime() + f.parse_duration("10m");
    }
  }

  new Event(args).execute();
};
