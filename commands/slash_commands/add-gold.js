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
        name: "add-gold",
        description: "Выдать какому-то игроку золотой слиток [ADMINISTRATOR]",
        options: [
          {
            name: "упоминание",
            description: "ЛИБО Упоминание участника",
            type: 6,
            required: false,
          },
          {
            name: "айди",
            description: "ЛИБО Айди участника",
            type: 3,
            required: false,
          },
        ],
      },
    };

    this.amount = 1;
  }

  async execute() {
    try {
      let member = this.command_args.filter(
        (arg) => arg.name === "упоминание"
      )[0]?.member;

      let member_id = member?.id;

      if (!member) {
        member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
          ?.value;

        if (!member_id)
          return this.msgFalseH(
            "Вы не указали участника для выдачи слитка либо участник не находится на сервере."
          );

        member = await this.interaction.guild.members
          .fetch(member_id)
          .catch((e) => undefined);
      }

      let member_profile = new f.Profile(this.db, member_id);
      let member_data = await member_profile.fetch();

      let gold_balance = member_data?.gold || 0;

      gold_balance += this.amount;

      await member_profile.update_data({
        gold: gold_balance,
      });

      this.msg(
        `Вы успешно выдали \`${this.amount}\`${f.config.gold_icon} золотых слитков участнику \`${member.user.tag}\``
      );
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.slash.name}`);
    }
  }
}

module.exports = Command;
