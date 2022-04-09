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
      permissions: ["ADMINISTRATOR"],
      custom_perms: [],
      allowed_roles: [
        "468374000947560459",
        "596307104802013208",
        "806026123669798922",
        "370298202819133440",
      ],

      slash: {
        name: "mute",
        description: "Выдать дисциплинарное наказание участнику. [Смотритель+]",
        options: [
          {
            name: "причина",
            description: "Причина мьюта",
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
            description: "Время мьюта (пример: 1h, 1d, 7d)",
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
      if (!reason)
        this.msgFalseH("Вы не указали причину дисциплинарного наказания.");

      let time_arg = this.command_args.filter((arg) => arg.name === "время")[0]
        ?.value;

      let time = f.parse_duration(time_arg);

      if (time === null || time <= 0) time = f.parse_duration("24h");
      if (time < 6000)
        return this.msgFalseH(
          "Время дисциплинарного наказания не может быть меньше `1 минуты`."
        );

      let member = this.command_args.filter(
        (arg) => arg.name === "упоминание"
      )[0]?.member;

      let member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
        ?.value;

      if (!member) {
        if (!member_id)
          return this.msgFalseH(
            "Вы не указали участника для дисциплинарного наказания."
          );

        member = await this.interaction.guild.members
          .fetch(member_id)
          .catch((e) => undefined);
      }

      if (!member)
        return this.msgFalseH(
          "Вы не указали участника для дисциплинарного наказания."
        );

      if (member.user.bot || member.user.id === this.interaction.member.id)
        return this.msgFalseH(
          "Вы указали неверного участника для выдачи дисциплинарного наказания."
        );

      if (
        member.roles.highest.position >=
        this.interaction.member.roles.highest.position
      )
        return this.msgFalseH(
          "Вы не можете выдавать дисциплинарные наказания этому участнику."
        );

      let profile = new f.Profile(this.db, member);

      let profile_data = await profile.fetch();

      // if (profile_data?.muted?.is)
      //   return this.msgFalseH(
      //     "Этот пользователь уже имеет дисциплинарное наказания."
      //   );

      let mutes = profile_data.mutes || [];
      let mute_limits = this.config.punishments.mutes;

      let mute = {
        time: time,
        reason: reason,
        by: this.interaction.member.id,
        date: new Date().getTime(),
      };

      let result = await profile.mute({ mute_data: mute });

      if (!result)
        return this.msgFalse(
          "Произошла ошибка при выполнении команды. Обратитесь к loli_knight"
        );

      await this.msg(
        `Успешно выдано дисциплинарное наказание участнику \`${
          member.user.tag
        }\` на время \`${f.time(time)}\`.`
      );

      if (mutes[0] && (mutes.length + 1) % mute_limits[0] === 0) {
        let await_ask = await this.ask(
          `Пользователь \`${member.user.tag}\` имеет ${mute_limits[0]} и более последних дисциплинарных наказаний, выдать блокировку?`
        );

        if (await_ask && await_ask.customId === "accept") {
          let time;
          let bans = profile_data.bans || [];

          let ban_limits = this.config.punishments.bans;

          if (bans.length === ban_limits[0]) time = f.parse_duration("30d");
          if (bans.length >= ban_limits[1]) time = f.parse_duration("365d");

          if (!time) time = f.parse_duration("30d");

          let ban = {
            time: time,
            reason:
              bans.length === ban_limits[0]
                ? `Пользователь имеет ${mute_limits[0]} и более дисциплинарных наказаний.`
                : `Пользователь имеет ${ban_limits[1]} и более блокировок.`,
            by: await_ask.member.id,
            date: new Date().getTime(),
          };

          let ban_result = await f.warn_emitter.ban({
            user_id: member_id,
            ban_data: ban,
          });

          if (!ban_result)
            return this.msgFalseH(
              "При попытке забанить пользователя произошла ошибка. Обратитесь в loli_knight"
            );
          this.msgH(
            `Выдана блокировка участнику \`${member.user.tag}\` на \`${f.time(
              time
            )}\`.`
          );

          return;
        }
      }
    } catch (error) {
      f.handle_error(error, `/- команда ${this.interaction.commandName}`);
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
      let filter = (button) => button.member.permissions.has("BAN_MEMBERS");
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
