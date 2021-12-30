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
        name: "add-link",
        description: "Добавить ссылку для автомодерации.",
        options: [
          {
            name: "домен",
            description: "Домен для добавления а в список. [MODER+]",
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

    if (domains.includes(domain))
      return this.msgFalseH("Указанный домен уже есть в базе данных.");
    f.domains = domains;

    domains.push(domain);

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

    this.msgH(`Вы успешно добавили домен \`${domain}\` в базу.`);
  }
}

module.exports = Command;
