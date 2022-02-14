const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");
const { time } = require("@discordjs/builders");

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
        name: "warn",
        description: "Выдать предупреждение участнику. [Смотритель+]",
        options: [
          {
            name: "причина",
            description: "Причина предупреждения",
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
        ],
      },
    };
  }

  async execute() {
    try {
      let reason = this.command_args.filter((arg) => arg.name === "причина")[0]
        ?.value;
      if (!reason) this.msgFalseH("Вы не указали причину варна.");

      let member = this.command_args.filter(
        (arg) => arg.name === "упоминание"
      )[0]?.member;

      if (!member) {
        let member_id = this.command_args.filter(
          (arg) => arg.name === "айди"
        )[0]?.value;

        if (!member_id)
          return this.msgFalseH("Вы не указали участника для варна.");

        member = await this.interaction.guild.members
          .fetch(member_id)
          .catch((e) => undefined);
      }

      if (!member) return this.msgFalseH("Вы не указали участника для варна.");

      if (member.user.bot || member.user.id === this.interaction.member.id)
        return this.msgFalseH("Вы не можете заварнить бота или самого себя.");

      if (
        member.roles.highest.position >=
        this.interaction.member.roles.highest.position
      )
        return this.msgFalseH(
          "Вы не можете выдавать предупреждения этому участнику."
        );

      let warn = {
        reason: reason,
        by: this.interaction.member.id,
        date: new Date().getTime(),
      };
      let profile = new f.Profile(this.db, member);

      let profile_data = await profile.fetch();

      let warns = profile_data.warns || [];
      let mutes = profile_data.mutes || [];

      let result = await profile.add_warn({ warn_data: warn });

      if (!result)
        return this.msgFalseH(
          "Произошла ошибка при выполнении команды. Обратитесь к loli_knight"
        );

      this.msgH(`Успешно выдан варн участнику \`${member.user.tag}\`.`);

      if (warns[0] && (warns.length + 1) % 3 === 0) {
        console.log(`mutes: ${mutes.length}`);
        console.log(`mutes?.length % 3 === 0: ${mutes?.length % 3 === 0}`);
        if (mutes[0] && mutes?.length % 3 === 0) {
          let await_ask = await this.ask(
            `Пользователь \`${member.user.tag}\` имеет более 2-х последних дисциплинарных наказаний, выдать блокировку?`
          );

          if (await_ask && await_ask.customId === "accept") {
            let time;
            let bans = profile_data.bans || [];

            if (bans.length === 0) time = f.parse_duration("30d");
            if (bans.length >= 1) time = f.parse_duration("365d");

            if (!time) time = f.parse_duration("30d");

            let ban = {
              time: time,
              reason:
                bans.length === 0
                  ? "Пользователь имеет 2 и более дисциплинарных наказаний."
                  : "Пользователь имеет 1 и более блокировок.",
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
              `Выдана блокировка участнику \`${member.user.tag}\` на \`${f.time(
                time
              )}\`.`
            );

            return;
          }
        } else if (warns[0] && (warns.length + 1) % 3 === 0) {
          let await_ask = await this.ask(
            `Пользователь \`${member.user.tag}\` имеет более 3-х последних варнов, выдать дисциплинарное наказание?`
          );

          if (await_ask && await_ask.customId === "accept") {
            let time = f.parse_duration("24h");

            await profile.mute({
              mute_data: {
                time: time,
                reason: "Пользователь имеет 3 и более предупреждений.",
                by: this.interaction.member.id,
                date: new Date().getTime(),
              },
            });
            this.msgH(
              `Выдано дисциплинарное наказание участнику \`${
                member.user.tag
              }\` на \`${f.time(time)}\`.`
            );

            return;
          }
        }
      }
    } catch (error) {
      f.handle_error(error, "/-команда warn");
    }
  }

  async ask(message_content) {
    try {
      let ask_message = await this.followUp(message_content, {
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
    } catch (error) {
      f.handle_error(error, "/-команда warn");
    }
  }
}

module.exports = Command;
