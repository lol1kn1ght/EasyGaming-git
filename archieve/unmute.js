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
        name: "Снять дисциплинарное наказание",
        type: 2,
      },
    };
  }

  async execute() {
    try {
      if (this.interaction.targetType !== "USER")
        return this.msgFalseH(
          "Команду можно применить только к пользователям."
        );

      let member = await this.interaction.guild.members.fetch(
        this.interaction.targetId
      );

      if (!member) return this.msgFalseH("Вы не указали участника для варна.");

      if (member.user.bot || member.user.id === this.interaction.member.id)
        return this.msgFalseH(
          "Вы указали неверного участника для предупреждения."
        );

      if (
        member.roles.highest.position >=
        this.interaction.member.roles.highest.position
      )
        return this.msgFalseH(
          "Вы не можете выдавать предупреждения этому участнику."
        );

      this.msgH(
        `Укажите причину для варна \`${member.user.tag}\`.\n\nВремя \`60\` секунд`
      );

      let filter = (msg) => msg.author.id === this.interaction.user.id;

      let ask_reason = await this.interaction.channel
        .awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] })
        .catch((e) => undefined);

      if (!ask_reason) return this.msgFalseH("Вы не указали причину варна.");

      let reason = ask_reason.first()?.content;

      ask_reason.first().delete();

      let profile = new f.Profile(this.db, member);
      let profile_data = await profile.fetch();

      if (!profile_data.muted?.is)
        return this.msgFalseH(
          `Участник \`${member.user.tag}\` не имеет дисциплинарного наказания.`
        );

      let unmute = {
        reason: reason,
        by: this.interaction.member.id,
      };

      await profile.unmute({ unmute_data: unmute });

      this.msgH(
        `Успешно снято дисциплинарное наказание с участника \`${member.user.tag}\``
      );
    } catch (error) {
      console.log(
        `Произошла ошибка при исполнении контекст-пользователь команды ${this.interaction.commandName}`
      );
      let errors_channel = Bot.bot.channels.cache.get(f.config.errorsChannel);
      errors_channel.send(
        `Ошибка при исполнении контекст-пользователь команды \`${this.interaction.commandName}\`:\n\`${error.name}: ${error.message}\``
      );
    }
  }
}

module.exports = Command;
