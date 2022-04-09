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
        name: "alert",
        description: "Срочная связь с администрацией [Игрок]",
        options: [
          {
            name: "сообщение",
            description: "Сообщение к администрации",
            type: 3,
            required: true,
          },
        ],
      },
    };
  }

  async execute() {
    try {
      let alert_content = this.command_args.filter(
        (arg) => arg.name === "сообщение"
      )[0]?.value;
      if (!alert_content) this.msgFalseH("Вы не указали причину бана.");

      var repChannel = this.interaction.guild.channels.cache.find(
        (val) => val.name == "reports"
      );
      if (!repChannel) return channel.send("Ошибка поиска канала **reports**");

      repChannel.send(
        `<@&465581489535582208>\n:warning: **${this.interaction.user.tag}** ID: ${this.interaction.user.id} сообщает: "${alert_content}"`
      );

      this.msgH("Вы успешно отправили сообщение для администрации.");
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.slash.name}`);
    }
  }
}

module.exports = Command;
