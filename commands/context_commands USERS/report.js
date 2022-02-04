const {Command_template} = require("../../config/templates");
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
        name: "Пожаловаться",
        type: 2
      }
    };
  }

  async execute() {
    try {
      console.log("USERAIBAB");
      if (
        !this.interaction.member
          .permissionsIn(this.interaction.channel)
          ?.has("SEND_MESSAGES")
      )
        return this.msgFalseH("У вас недостаточно прав для этого действия.");

      this.msgH(
        `Укажите причину репорта (У вас есть \`60 секунд\`).\n\n\`Если есть вложения в виде скриншотов/видео - указывайте ссылку на них или прикрепите к сообщению.\``
      );

      let filter = msg => msg.author.id === this.interaction.user.id;
      let reason_message = await this.interaction.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ["time"]
        })
        .catch(e => undefined);

      if (!reason_message?.first())
        return this.msgFalseH("Вы не указали причину репорта.");

      let reason = reason_message.first()?.content;

      reason_message.first().delete();

      let report_data = {
        type: "USER",
        reason: reason,
        channel: this.interaction.channel,
        attachments: reason_message.first()?.attachments,
        by: this.interaction.member.id
      };
      f.warn_emitter.report({user_id: this.interaction.targetId, report_data});
    } catch (error) {
      console.log(
        `Произошла ошибка при исполнении контекст-сообщение команды ${this.interaction.commandName}`
      );
      let errors_channel = Bot.bot.channels.cache.get(f.config.errorsChannel);
      errors_channel.send(
        `Ошибка при исполнении контекст-пользователь команды \`${this.interaction.commandName}\`:\n\`${error.name}: ${error.message}\``
      );
    }
  }
}

module.exports = Command;
