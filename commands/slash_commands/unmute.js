const {Command_template} = require("../../config/templates");
const Discord = require("discord.js");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.options = {
      permissions: ["ADMINISTRATOR"],
      custom_perms: [],
      allowed_roles: [
        "468374000947560459",
        "596307104802013208",
        "806026123669798922",
        "370298202819133440"
      ],
      slash: {
        name: "unmute",
        description:
          "Снять дисциплинарное наказание с участника. [Смотритель+]",
        options: [
          {
            name: "причина",
            description: "Причина мьюта",
            type: 3,
            required: true
          },
          {
            name: "упоминание",
            description: "ЛИБО Упоминание участника",
            type: 6,
            required: false
          },
          {
            name: "айди",
            description: "ЛИБО Айди участника",
            type: 3,
            required: false
          }
        ]
      }
    };
  }

  async execute() {
    try {
      let reason = this.command_args.filter(arg => arg.name === "причина")[0]
        ?.value;
      if (!reason) this.msgFalseH("Вы не указали причину мьюта.");

      let member = this.command_args.filter(arg => arg.name === "упоминание")[0]
        ?.member;

      if (!member) {
        let member_id = this.command_args.filter(arg => arg.name === "айди")[0]
          ?.value;

        if (!member_id)
          return this.msgFalseH("Вы не указали участника для мьюта.");

        member = await this.interaction.guild.members
          .fetch(member_id)
          .catch(e => undefined);
      }

      if (!member) return this.msgFalseH("Вы не указали участника для мьюта.");

      // if (member.user.bot || member.user.id === this.interaction.member.id)
      //   return this.msgFalseH(
      //     "Вы указали неверного участника для снятия наказания."
      //   );

      // if (
      //   member.roles.highest.position >=
      //     this.interaction.member.roles.highest.position &&
      //   !this.interaction.member.permissions.has("ADMINISTRATOR")
      // )
      //   return this.msgFalseH(
      //     "Вы не можете снимать наказания этому участнику."
      //   );

      let profile = new f.Profile(this.db, member);
      let profile_data = await profile.fetch();

      if (!profile_data.muted?.is)
        return this.msgFalseH(
          `Участник \`${member.user.tag}\` не имеет мьюта.`
        );

      let unmute = {
        reason: reason,
        by: this.interaction.member.id
      };

      let result = await profile.unmute({unmute_data: unmute});

      if (!result)
        return this.msgFalseH(
          "Возникла ошибка при выполнении команды. Обратитесь к loli_knight."
        );
      this.msgH(`Успешно снят мьют с участника \`${member.user.tag}\``);
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
