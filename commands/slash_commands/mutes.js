const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");
const { time } = require("@discordjs/builders");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.options = {
      permissions: ["ADMINISTRATOR"],
      custom_perms: [],
      allowed_roles: ["468374000947560459", "596307104802013208"],
      slash: {
        name: "mutes",
        description:
          "Вывести список дисциплинарных наказаний человека. [Смотритель+]",
        options: [
          {
            name: "упоминание",
            description: "ЛИБО Упоминание участника",
            type: 6,
            required: false,
          },
          {
            name: "айди",
            description: "ЛИБО Айди участника",
            type: 3,
            required: false,
          },
        ],
      },
    };
  }

  async execute() {
    try {
      this.db = this.mongo.db("gtaEZ");

      let member = this.command_args.filter(
        (arg) => arg.name === "упоминание"
      )[0]?.member;

      let member_id = member?.id;

      if (!member) {
        member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
          ?.value;

        if (member_id) {
          member = await this.interaction.guild.members
            .fetch(member_id)
            .catch((e) => undefined);
        }
      }

      if (!member && !member_id) member = this.interaction.member;
      let profile = new f.Profile(this.db, member || member_id);

      let profile_data = await profile.fetch();

      let warns = profile_data.mutes || [];

      if (!warns[0])
        return this.msgFalseH(
          `У пользователя \`${
            member?.user?.tag || member_id
          }\` нет дисциплинарных наказаний.`
        );

      let pages = [];
      let count = 1;
      let current_page = 0;

      let warns_moderators = [...new Set(warns.map((warn) => warn.by))];

      let cache = await this.interaction.guild.members.fetch({
        user: warns_moderators,
      });

      for (let warn of warns) {
        let moderator = cache.filter((member) => member.id === warn.by).first();

        let warn_date = new Date(warn.date);

        let text = `\n\`\`\`js\nМодератор: ${
          moderator?.user?.tag || warn.by
        }\nПричина: ${
          warn.reason
        }\nВремя: ${warn_date.toLocaleDateString()} ${warn_date.toLocaleTimeString()} по МСК\nВремя наказания: ${f.time(
          warn.time
        )}\n\`\`\`\n`;

        if (pages[current_page])
          pages[current_page] = pages[current_page] + text;
        else pages[current_page] = text;

        if (count >= 5) {
          current_page++;
          count = 0;
        }
        count++;
      }

      let embeds = [];
      let page = 1;
      current_page = 1;

      for (let page of pages) {
        embeds.push(
          new Discord.MessageEmbed({
            color: f.config.colorEmbed,
            author: {
              icon_url: member?.user.displayAvatarURL(),
              name: `🔇 Список дисциплинарных наказаний - ${
                member?.user.tag || member_id
              }`,
            },
            description: page,
            footer: {
              text: `Страница ${current_page++} из ${
                pages.length === 0 ? 1 : pages.length
              }. Всего показано - ${warns.length}`,
            },
          })
        );
        page++;
      }

      if (!embeds[0])
        return this.msgFalseH(
          `У пользователя \`${
            member?.user?.tag || member_id
          }\` нет дисциплинарных наказаний.`
        );

      f.pages({
        interaction: this.interaction,
        pages: embeds,
        filter: (interaction) =>
          interaction.member.id === this.interaction.member.id,
      });
    } catch (error) {
      console.log(
        `Произошла ошибка при исполнении команды ${this.interaction.commandName}`
      );
      let errors_channel = Bot.bot.channels.cache.get(f.config.errorsChannel);
      errors_channel.send(
        `Ошибка при исполнении команды \`${this.interaction.commandName}\`:\n\`${error.name}: ${error.message}\``
      );
    }
  }
}

module.exports = Command;
