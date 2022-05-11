const { Command_template } = require("../../config/templates");
const { time } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.options = {
      permissions: [],
      custom_perms: [],
      allowed_roles: [],
      slash: {
        name: "status",
        description: "Проверить статус бота.",
      },
    };
  }

  async execute() {
    try {
      let events = Object.values(Bot.events).flat();
      let events_count = events.length;

      let commands = Object.values(Bot.commands)
        .map((command) => Object.values(command))
        .flat();
      let commands_count = commands.length;
      let embed = new MessageEmbed({
        color: "#8b0000",
        author: {
          name: `Статус ${this.bot.user.tag}:`,
        },
        thumbnail: { url: this.bot.user.avatarURL() },
        fields: [
          {
            name: "Время запуска:",
            value: `${time(new Date(this.bot.readyTimestamp), "R")}`,
          },
          {
            name: "\u200b",
            value: `\u200b`,
          },
          {
            name: "Кол-во комманд:",
            value: `\`${commands_count}\``,
            inline: true,
          },
          {
            name: "Кол-во евентов:",
            value: `\`${events_count}\``,
            inline: true,
          },
          {
            name: "\u200b",
            value: `\u200b`,
          },
          {
            name: "Пинг:",
            value: `\`${Math.floor(this.bot.ws.ping) || 0}\``,
            inline: true,
          },
          {
            name: "Время работы:",
            value: `\`${f.time(this.bot.uptime) || "0 секунд"}\``,
            inline: true,
          },
        ],
      });

      this.interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      f.handle_error(`/-команда ${this.interaction.commandName}`, error);
    }
  }
}

module.exports = Command;
