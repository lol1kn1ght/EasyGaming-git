const {Command_template} = require("../../config/templates");
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
        name: "reload-events",
        description: "что здесь непонятного [OWNER]"
      }
    };
  }

  async execute() {
    Bot._load_events();

    this.msgH("Успешно перезагружены евенты.");
  }
}

module.exports = Command;
