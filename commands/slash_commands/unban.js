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
        name: "unban",
        description: "Разбанить участника. [Смотритель+]",
        options: [
          {
            name: "причина",
            description: "Причина разбана",
            type: 3,
            required: true,
          },
          {
            name: "айди",
            description: "Айди участника",
            type: 3,
            required: true,
          },
        ],
      },
    };
  }

  async execute() {
    try {
      let reason = this.command_args.filter((arg) => arg.name === "причина")[0]
        ?.value;
      if (!reason) this.msgFalseH("Вы не указали причину мьюта.");

      let member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
        ?.value;

      if (!member_id)
        return this.msgFalseH("Вы не указали участника для мьюта.");

      let unbanned_user = await this.interaction.guild.members
        .unban(
          member_id,
          `Разбан от ${this.interaction.member.user.tag} ID: ${this.interaction.member.user.id}: ${reason}`
        )
        .catch((e) => {
          console.log(e);
          return undefined;
        });

      if (unbanned_user === undefined)
        return this.msgFalseH(
          `Пользователь \`${member_id}\` не находится в бане.`
        );

      let unban = {
        reason: reason,
        by: this.interaction.member.id,
        date: new Date().getTime(),
      };

      f.warn_emitter.emit("unban", {
        unbanned_user: unbanned_user,
        user_id: member_id,
        mongo: this.db,
        data: unban,
      });

      this.msgH(`Вы успешно разбанили \`${member_id}\`.`);
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
