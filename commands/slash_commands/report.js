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
        name: "report",
        description: "Подать жалобу на игрока. [Игрок]",
        options: [
          {
            name: "причина",
            description: "Причина репорта",
            type: 3,
            required: false,
          },
          {
            name: "упоминание",
            description: "ЛИБО Упоминание участника",
            type: 6,
          },
          {
            name: "айди",
            description: "ЛИБО Айди участника",
            type: 3,
          },
        ],
      },
    };
  }

  async execute() {
    let reason = this.command_args.filter((arg) => arg.name === "причина")[0]
      ?.value;
    // if (!reason) this.msgFalseH("Вы не указали причину мьюта.");

    let member = this.command_args.filter((arg) => arg.name === "упоминание")[0]
      ?.member;

    if (!member) {
      let member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
        ?.value;

      if (!member_id)
        return this.msgFalseH("Вы не указали участника для репорта.");

      member = await this.interaction.guild.members
        .fetch(member_id)
        .catch((e) => undefined);
    }

    if (!member) return this.msgFalseH("Вы не указали участника для репорта.");

    if (member.user.bot || member.user.id === this.interaction.member.id)
      return this.msgFalseH("Вы указали неверного участника для репорта.");

    let report_data = {
      by: this.interaction.member,
      type: "USER",
      reason: reason,
      channel: this.interaction.channel,
    };

    if (!reason) {
      this.msgH(
        `Укажите причину репорта (У вас есть \`60 секунд\`).\n\n\`Если есть вложения в виде скриншотов/видео - указывайте ссылку на них или прикрепите к сообщению.\``
      );

      let filter = (msg) => msg.author.id === this.interaction.user.id;
      let reason_message = await this.interaction.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ["time"],
        })
        .catch((e) => undefined);

      if (!reason_message?.first())
        return this.msgFalseH("Вы не указали причину репорта.");

      reason = reason_message.first()?.content;

      reason_message.first().delete();

      report_data.attachments = reason_message.first()?.attachments;
    }

    report_data.reason = reason;

    f.warn_emitter.report({
      user_id: member?.id || member_id,
      report_data,
    });

    this.msgH(
      `Вы успешно отправили репорт на участника \`${member.user.tag}\``
    );
  }
}

module.exports = Command;
