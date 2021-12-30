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
        "806026123669798922",
        "370298202819133440",
      ],
      slash: {
        name: "timed-role",
        description: "Выдать временную роль. [Смотритель+]",
        options: [
          {
            name: "роль",
            type: 3,
            description: "Роль для выдачи",
            required: true,
            choices: [
              {
                name: "Лучший игрок недели",
                value: "best_player",
              },
              {
                name: "На грани до бана",
                value: "half_ban",
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
          {
            name: "время",
            description: "Время на которое выдать роль (пример: 1h, 1d, 7d).",
            type: 3,
          },
        ],
      },
    };
  }

  async execute() {
    let role_tag = this.command_args.filter((arg) => arg.name === "роль")[0]
      ?.value;
    if (!role_tag) this.msgFalseH("Вы не указали роль.");

    let times = {
      best_player: { time: "7d", id: f.config.best_player },
      half_ban: { time: "30d", id: f.config.half_of_ban },
    };

    let allowed_roles = [
      "596307104802013208",
      "465581489535582208",
      "626296522048274452",
      "801538565820383233",
    ];

    if (
      role_tag !== "best_player" &&
      !this.interaction.member.roles.cache
        .filter((role) => allowed_roles.includes(role.id))
        ?.first()
    )
      return this.msgFalseH("У вас недостаточно прав для выдачи этой роли.");

    let time_arg = this.command_args.filter((arg) => arg.name === "время")[0]
      ?.value;

    let time = f.parse_duration(time_arg);

    if (time === null || time < 0)
      time = f.parse_duration(times[role_tag].time);
    if (time < 60000 && time !== 0)
      return this.msgFalseH("Время роли не может быть меньше `1 часа`.");

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

    f.warn_emitter.emit("time_role", {
      user_id: member.id,
      data: {
        id: [times[role_tag].id],
        till: new Date().getTime() + time,
        time: time,
        by: this.interaction.member.id,
      },
      mongo: this.db,
    });

    this.msgH(
      `Вы успешно выдали роль ${this.interaction.guild.roles.cache.get(
        times[role_tag].id
      )} участнику \`${member.user.tag}\` на срок \`${f.time(time)}\``
    );
  }
}

module.exports = Command;
