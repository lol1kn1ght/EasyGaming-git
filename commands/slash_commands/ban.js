const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.ask_buttons = [
      new Discord.MessageButton({
        type: "BUTTON",
        label: "Да",
        customId: "accept",
        style: 1,
        disabled: false,
      }),
      new Discord.MessageButton({
        type: "BUTTON",
        label: "Нет",
        customId: "deny",
        style: 1,
        disabled: false,
      }),
    ];

    this.options = {
      permissions: ["BAN_MEMBERS"],
      custom_perms: [],
      allowed_roles: [
        "596307104802013208",
        "626296522048274452",
        "801538565820383233",
      ],
      slash: {
        name: "ban",
        description: "Выдать бан. [Куратор+]",
        options: [
          {
            name: "причина",
            description: "Причина бана",
            type: 3,
            required: true,
          },
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
          {
            name: "время",
            description: "Время бана (пример: 1h, 1d, 7d)",
            type: 3,
            required: false,
          },
        ],
      },
    };
  }

  async execute() {
    try {
      let reason = this.command_args.filter((arg) => arg.name === "причина")[0]
        ?.value;
      if (!reason) this.msgFalseH("Вы не указали причину бана.");

      let time_arg = this.command_args.filter((arg) => arg.name === "время")[0]
        ?.value;

      let time = f.parse_duration(time_arg);

      if (time === null || time < 0) time = f.parse_duration("30d");
      if (time < 60000 && time !== 0)
        return this.msgFalseH("Время бана не может быть меньше `1 часа`.");

      let member = this.command_args.filter(
        (arg) => arg.name === "упоминание"
      )[0]?.member;

      let member_id = member?.id;

      if (!member) {
        member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
          ?.value;

        if (!member_id)
          return this.msgFalseH(
            "Вы не указали участника для бана либо участник не находится на сервере."
          );

        member = await this.interaction.guild.members
          .fetch(member_id)
          .catch((e) => undefined);
      }

      if (!member_id)
        return this.msgFalseH(
          "Вы не указали участника для бана либо участник не находится на сервере."
        );

      if (member) {
        if (member?.user.bot || member?.user.id === this.interaction.member.id)
          return this.msgFalseH("Вы не можете забанить бота или самого себя.");

        if (
          member.roles.highest.position >=
          this.interaction.member.roles.highest.position
        )
          return this.msgFalseH(
            "Вы не можете выдавать наказания этому участнику."
          );

        let profile = new f.Profile(this.db, member_id);
        let bans = profile.fetch(["bans"]) || [];

        if (bans[0]) {
          let await_ask = await this.ask(
            "Пользователь имеет 1 или более блокировок, выдать блокировку на год?"
          );
          if (await_ask && await_ask.customId === "accept") {
            let bans = profile_data.bans || [];
            time = f.parse_duration("365d");
            let ban = {
              time: time,
              reason: "Пользователь имеет 1 или более блокировок.",
              by: this.interaction.member.id,
              date: new Date().getTime(),
            };

            let result = await f.warn_emitter.ban({
              user_id: member?.id || member_id,
              ban_data: ban,
            });

            if (result === null) {
              this.msgFalseH(
                "Я не могу забанить этого участника. Возможно у меня недостаточно прав или этого участника не существует."
              );

              return;
            }

            if (result === false) {
              this.msgFalseH(
                "При выполнении команды произошла ошибка. Обратитесь к loli_knight"
              );

              return;
            }

            this.msgH(
              `Выдана блокировка участнику \`${
                member?.user?.tag || member_id
              }\` на \`${f.time(time)}\`.`
            );
            return;
          }
        }
      }

      let ban = {
        time: time,
        reason: reason,
        by: this.interaction.member.id,
        date: new Date().getTime(),
      };

      let result = await f.warn_emitter.ban({
        user_id: member?.id || member_id,
        ban_data: ban,
      });

      if (result === null) {
        this.msgFalseH(
          "Я не могу забанить этого участника. Возможно у меня недостаточно прав или этого участника не существует."
        );

        return;
      }

      if (result === false) {
        this.msgFalseH(
          "При выполнении команды произошла ошибка. Обратитесь к loli_knight"
        );

        return;
      }
      this.msgH(
        `Успешно выдан Бан участнику \`${
          member?.user?.tag || member_id
        }\` на время \`${time === 0 ? "Перманентно" : f.time(time)}\`.`
      );
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.slash.name}`);
    }
  }

  async ask(message_content) {
    try {
      let ask_message = await this.msg(message_content, {
        components: [
          new Discord.MessageActionRow().addComponents(...this.ask_buttons),
        ],
        fetchReply: true,
      });

      let filter = (button) => button.user.id === this.interaction.member.id;
      let await_ask = await ask_message
        .awaitMessageComponent({
          filter,
          max: 1,
          time: 60000,
          errors: ["time"],
        })
        .catch((err) => undefined);

      await ask_message.delete();
      return await_ask;
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.slash.name}`);
    }
  }
}

module.exports = Command;
