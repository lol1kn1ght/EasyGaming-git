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
        name: "kick",
        description: "Выгнать участника [Смотритель+]",
        options: [
          {
            name: "причина",
            description: "Причина кика",
            type: 3,
            required: true,
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
      let reason = this.command_args.filter((arg) => arg.name === "причина")[0]
        ?.value;
      if (!reason) this.msgFalseH("Вы не указали причину кика.");

      let member = this.command_args.filter(
        (arg) => arg.name === "упоминание"
      )[0]?.member;

      let member_id = member?.id;

      if (!member) {
        member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
          ?.value;

        if (!member_id)
          return this.msgFalseH(
            "Вы не указали участника для кика либо участник не находится на сервере."
          );

        member = await this.interaction.guild.members
          .fetch(member_id)
          .catch((e) => undefined);
      }

      if (!member)
        return this.msgFalseH(
          "Вы не указали участника для кика либо участник не находится на сервере."
        );

      if (!member_id)
        return this.msgFalseH(
          "Вы не указали участника для кика либо участник не находится на сервере."
        );

      if (member?.user.bot || member?.user.id === this.interaction.member.id)
        return this.msgFalseH("Вы не можете кикнуть бота или самого себя.");

      if (
        member.roles.highest.position >=
        this.interaction.member.roles.highest.position
      )
        return this.msgFalseH(
          "Вы не можете выдавать наказания этому участнику."
        );

      let kick = {
        reason: reason,
        by: this.interaction.member.id,
        date: new Date().getTime(),
      };

      let result = await f.warn_emitter.kick({
        user_id: member?.id || member_id,
        kick_data: kick,
      });

      if (result === null)
        return this.msgFalseH(
          `У меня недостаточно прав для действия или указанного участника нет на сервере.`
        );

      if (!result)
        return this.msgFalseH(
          "При выполнении команды возникла ошибка. Обратитесь к loli_knight"
        );
      this.msgH(
        `Успешно выгнали участника \`${member?.user?.tag || member_id}\`.`
      );
    } catch (error) {
      f.handle_error(err, `/-команда ${this.options.slash.name}`);
    }
  }
}

module.exports = Command;
