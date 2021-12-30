module.exports = function (args, raw) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      if (raw.t != "MESSAGE_REACTION_ADD") return;

      let ver_roles = [
        "896446473175203860",
        "896446739035324436",
        "896459039867813888",
      ];

      let emoji = raw.d.emoji;
      let d = raw.d;
      let member = await this.bot.guilds.cache
        .get(d.guild_id)
        .members.fetch(d.user_id);
      let choice_reaction = "check_mark_allow"; //
      let channel = this.bot.channels.cache.get(d.channel_id);
      if (!channel) return;

      if (!emoji || emoji.name !== choice_reaction) return;

      switch (d.channel_id) {
        case "896265997357576192": // 1
          member.roles.add(ver_roles[0]);
          break;
        case "896269441090879548": // 2
          member.roles.add(ver_roles[1]);
          break;
        case "896305520028287016": // 3
          member.roles.add(ver_roles[2]);
          break;
        default:
      }
    }
  }

  new Event(args).execute();
};
