const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.options = {
      permissions: ["ADMINISTRATOR"],
      custom_perms: [],
      allowed_roles: [],
      slash: {
        name: "remove-link",
        description: "Добавить ссылку для автомодерации. [MODER+]",
        options: [
          {
            name: "домен",
            description: "Домен для добавления а в список.",
            type: 3,
            required: true,
          },
        ],
      },
    };
  }

  async execute() {
    let domain = this.command_args.filter((arg) => arg.name === "домен")[0]
      ?.value;
    if (!domain) this.msgFalseH("Вы не указали домен.");

    let utils_db = this.db.collection("utils");
    let domains_data = await utils_db.findOne({ name: "domains" });
    let domains = domains_data?.domains || [];

    if (domains.includes(domain)) domains.splice(domains.indexOf(domain), 1);
    else return this.msgH(`Указанный домен не находится в базе данных.`);

    f.domains = domains;

    if (!domains_data) {
      utils_db.insertOne({
        name: "domains",
        domains: domains,
      });
    }
    if (domains_data) {
      utils_db.updateOne(
        {
          name: "domains",
        },
        {
          $set: {
            domains: domains,
          },
        }
      );
    }

    this.msgH(`Вы успешно убрали домен \`${domain}\` из базы.`);
  }
}

module.exports = Command;
