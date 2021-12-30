const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.options = {
      permissions: ["ADMINISTRATOR"],
      custom_perms: [],
      allowed_roles: ["468374000947560459", "596307104802013208"],
      slash: {
        name: "remove-role",
        description:
          "Снять временную или обычную роль с пользователя [Смотритель+]",
        options: [
          {
            name: "роль",
            type: 3,
            description: "Роль для снятия",
            required: true,
            choices: [
              {
                name: "Лучший игрок недели",
                value: "best-player_TIMED",
              },
              {
                name: "На грани до бана",
                value: "half-ban_TIMED",
              },
              {
                name: "Цветы нашего сервера",
                value: "flowers_DEF",
              },
              {
                name: "Есть читы",
                value: "cheats_DEF",
              },
              {
                name: "18+",
                value: "adult_DEF",
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
    let role_tag_args = this.command_args.filter(
      (arg) => arg.name === "роль"
    )[0]?.value;
    if (!role_tag_args) this.msgFalseH("Вы не указали роль.");

    let roles = {
      "best-player": f.config.best_player,
      "half-ban": f.config.half_of_ban,
      flowers: f.config.roles.flowers,
      cheats: f.config.roles.cheats,
      adult: f.config.roles.adult,
    };

    let member = this.command_args.filter((arg) => arg.name === "упоминание")[0]
      ?.member;

    let member_id = member?.id;

    if (!member) {
      member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
        ?.value;

      if (!member_id)
        return this.msgFalseH("Вы не указали участника для бана.");

      member = await this.interaction.guild.members
        .fetch(member_id)
        .catch((e) => undefined);
    }

    if (!member)
      return this.msgFalseH("Вы не указали участника для выдачи роли.");

    if (member?.user.bot)
      return this.msgFalseH("Вы указали неверного участника для выдачи роли.");

    let role_vals = role_tag_args.split("_");

    let role_tag = role_vals[0];
    let role_type = role_vals[1];

    if (role_type === "TIMED") {
      f.warn_emitter.emit("time_role_remove", {
        user_id: member_id,
        user: member,
        guild: this.interaction.guild,
        data: {
          id: [roles[role_tag]],
          by: this.interaction.member.id,
        },
        mongo: this.db,
      });
    }

    if (role_type === "DEF") {
      f.warn_emitter.emit("role_remove", {
        user_id: member_id,
        user: member,
        guild: this.interaction.guild,
        data: {
          id: [roles[role_tag]],
          by: this.interaction.member.id,
        },
        mongo: this.db,
      });
    }

    this.msgH(
      `Вы успешно сняли роль ${this.interaction.guild.roles.cache.get(
        roles[role_tag]
      )} участнику \`${member.user.tag}\``
    );
  }
}

module.exports = Command;
