const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.options = {
      permissions: [],
      custom_perms: [],
      allowed_roles: [],
      slash: {
        name: "top-gold",
        description: "Посмотреть топ участников по золоту.",
      },
    };
  }

  async execute() {
    try {
      let users_db = this.db.collection("users");
      let users_data = await users_db
        .find(
          {
            gold: {
              $gt: 0,
            },
          },
          {
            projection: {
              _id: 0,
              gold: 1,
              login: 1,
            },
          }
        )
        .toArray();

      let users_ids = users_data.map((user_data) => user_data.login);

      if (!users_ids[0]) return this.msgFalse("Топ по золоту пуст!");

      let members = await this.interaction.guild.members.fetch({
        id: users_ids,
      });

      let pages = [];
      let current_page = 0;
      let number = 1;
      let pos = 1;
      let first_place;

      for (let user of users_data) {
        let member = members.get(user.login);

        if (!member) continue;

        if (pos === 1) first_place = member;
        let field = `${pos++}. ${member.user.tag} - \`${user.gold}\`${
          f.config.gold_icon
        }\n\n`;

        if (pages[current_page]) pages[current_page] += field;
        else pages[current_page] = field;

        number++;

        if (number >= 10) {
          number = 1;
          current_page++;
        }
      }

      let embeds = [];

      for (let page of pages) {
        let page_embed = new Discord.MessageEmbed({
          title: "Топ по золотым слиткам:",
          thumbnail: {
            url: first_place?.user?.avatarURL({ dynamic: true }),
          },
          description: page,
          color: f.config.colorEmbed,
          timestamp: new Date(),
        });

        embeds.push(page_embed);
      }

      f.pages({
        interaction: this.interaction,
        pages: embeds,
        filter: (interaction) =>
          interaction.member.id === this.interaction.member.id,
      });
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.slash.name}`);
    }
  }
}

module.exports = Command;
