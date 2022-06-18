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
        name: "avatar",
        description: "Просмотреть аватарку пользователя.",
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
        } else {
          member = this.interaction.member;
        }
      }

      if (!member) member = this.interaction.member;

      this.interaction.editReply({
        embeds: [
          {
            author: {
              name: `Аватар ${member.user.tag}`,
            },
            color: member.roles.highest.color,
            image: {
              url: member.displayAvatarURL({ dynamic: true, size: 1024 }),
            },
          },
        ],
      });
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.slash.name}`);
    }
  }
}

module.exports = Command;
