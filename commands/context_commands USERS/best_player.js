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
        name: "Лучший игрок",
        type: 2,
      },
    };
  }

  async execute() {
    try {
      let time = f.parse_duration("1w");

      f.warn_emitter.emit("time_role", {
        user_id: this.interaction.targetId,
        data: {
          id: [this.config.best_player],
          till: new Date().getTime() + time,
          by: this.interaction.member.id,
          time: time,
        },
        mongo: this.db,
      });

      this.msgH(
        `Вы успешно выдали роль ${this.interaction.guild.roles.cache.get(
          f.config.best_player
        )} игроку <@${this.interaction.targetId}>`
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
