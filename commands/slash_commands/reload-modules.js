const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.options = {
      permissions: [],
      custom_perms: ["OWNER"],
      allowed_roles: [],
      slash: {
        name: "reload-modules",
        description: "что здесь непонятного [OWNER]",
      },
    };
  }

  async execute() {
    Bot.reload_modules();

    this.msgH("Успешно перезагружены модули.");
  }
}

module.exports = Command;
