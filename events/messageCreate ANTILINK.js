module.exports = function (args, message) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      if (
        message.author.bot ||
        message.member?.roles?.cache
          ?.filter((role) => f.config.moderator_roles.includes(role.id))
          ?.first()
      )
        return;

      let links_regex =
        /(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?([a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5})(:[0-9]{1,5})?(\/.*)?/;

      if (!links_regex.test(message.content)) return;

      let message_links = message.content.match(links_regex);
      let domain = message_links[2];
      if (domain.endsWith(".")) domain = domain.slice(0, -1);

      let domains = f.domains;

      if (!domains) {
        let utils_db = this.db.collection("utils");
        let domains_data = await utils_db.findOne({ name: "domains" });
        domains = domains_data?.domains || [];

        f.domains = domains;
        domains;
      }

      if (!domains.map((domain) => domain.toLowerCase()).includes(domain))
        return;
      let user_profile = new f.Profile(this.db, message.author.id);

      message.delete();

      if (f.anti_link_muted[message.author.id]) return;

      f.anti_link_muted[message.author.id] = true;
      let report_data = {
        user_id: message.author.id,

        report_data: {
          type: "MESSAGE",
          reason: `Спам-ссылка: ${domain}`,
          channel: message.channel,
          by: Bot.bot.user.id,
          attachments: message.attachments,
          message_id: message.id,
        },
      };

      f.warn_emitter.report(report_data);

      let mute = {
        time: f.parse_duration("1h"),
        reason: "Спам-ссылка",
        by: Bot.bot.user.id,
        date: new Date().getTime(),
      };
      user_profile.mute({ mute_data: mute });
    }
  }

  new Event(args).execute();
};
