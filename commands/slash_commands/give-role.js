const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.options = {
      permissions: ["ADMINISTRATOR"],
      custom_perms: [],
      allowed_roles: [
        "468374000947560459",
        "596307104802013208",
        "626296522048274452",
      ],
      slash: {
        name: "give-role",
        description: "Выдать роль участнику.",
        options: [
          {
            name: "роль",
            type: 3,
            description: "Роль для выдачи",
            required: true,
            choices: [
              {
                name: "Цветы нашего сервера",
                value: "flowers",
              },
              {
                name: "Есть читы",
                value: "cheats",
              },
              {
                name: "18+",
                value: "adult",
              },
            ],
          },
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
      let role_tag = this.command_args.filter((arg) => arg.name === "роль")[0]
        ?.value;
      if (!role_tag) this.msgFalseH("Вы не указали роль.");

      let times = {
        flowers: f.config.roles.flowers,
        cheats: f.config.roles.cheats,
        adult: f.config.roles.adult,
      };

      if (role_tag === "adult") {
        if (
          !this.interaction.member.roles.cache.has("596307104802013208") &&
          !this.interaction.member.roles.cache.has("626296522048274452") &&
          !this.interaction.member.permissions.has("ADMINISTRATOR")
        )
          return this.msgFalseH(
            "У вас недостаточно прав для выдачи этой роли."
          );
      }

      let member = this.command_args.filter(
        (arg) => arg.name === "упоминание"
      )[0]?.member;

      let member_id = member?.id;

      if (!member) {
        member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
          ?.value;

        if (!member_id)
          return this.msgFalseH("Вы не указали участника выдачи роли.");

        member = await this.interaction.guild.members
          .fetch(member_id)
          .catch((e) => undefined);
      }

      if (!member)
        return this.msgFalseH("Вы не указали участника для выдачи роли.");

      if (member?.user.bot)
        return this.msgFalseH(
          "Вы указали неверного участника для выдачи роли."
        );

      f.warn_emitter.role({
        user_id: member_id,
        role_data: {
          id: [times[role_tag]],
          by: this.interaction.member.id,
        },
      });

      this.msgH(
        `Вы успешно выдали роль ${this.interaction.guild.roles.cache.get(
          times[role_tag]
        )} участнику \`${member.user.tag}\``
      );
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.slash.name}`);
    }
  }
}

module.exports = Command;
