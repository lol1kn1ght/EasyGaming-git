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
        return this.msgFalseH("Вы не указали участника для разбана.");

      let unban = {
        reason: reason,
        by: this.interaction.member.id,
        date: new Date().getTime(),
      };

      let result = await f.warn_emitter.unban({
        user_id: member_id,

        unban_data: unban,
      });

      if (result === null) {
        return this.msgFalseH(
          "Вы указали несуществующего участника для разбана."
        );
      }

      if (!result) {
        return this.msgFalseH(
          "При выполнении команды произошла ошибка. Обратитесь к loli_knight"
        );
      }

      this.msgH(`Вы успешно разбанили \`${member_id}\`.`);
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.slash.name}`);
    }
  }
}

module.exports = Command;
