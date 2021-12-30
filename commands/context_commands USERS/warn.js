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
      allowed_roles: ["468374000947560459", "596307104802013208"],
      slash: {
        name: "Предупредить [Смотритель+]",
        type: 2,
      },
    };
  }

  async execute() {
    try {
      if (this.interaction.targetType !== "USER")
        return this.msgFalseH(
          "Команду можно применить только к пользователям."
        );

      let member = await this.interaction.guild.members.fetch(
        this.interaction.targetId
      );

      if (!member) return this.msgFalseH("Вы не указали участника для варна.");

      if (member.user.bot || member.user.id === this.interaction.member.id)
        return this.msgFalseH(
          "Вы указали неверного участника для предупреждения."
        );

      if (
        member.roles.highest.position >=
        this.interaction.member.roles.highest.position
      )
        return this.msgFalseH(
          "Вы не можете выдавать предупреждения этому участнику."
        );

      this.msgH(
        `Укажите причину для варна \`${member.user.tag}\`.\n\nВремя \`60\` секунд`
      );

      let filter = (msg) => msg.author.id === this.interaction.user.id;

      let ask_reason = await this.interaction.channel
        .awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] })
        .catch((e) => undefined);

      if (!ask_reason) return this.msgFalseH("Вы не указали причину варна.");

      let reason = ask_reason.first()?.content;

      ask_reason.first().delete();

      let warn = {
        reason: reason,
        by: this.interaction.member.id,
        date: new Date().getTime(),
      };
      let profile = new f.Profile(this.db, member);

      let profile_data = await profile.fetch();

      let warns = profile_data.warns || [];

      if (warns[0] && warns.length % 3 === 0) {
        if (profile_data.mutes?.length % 2 != 0) {
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
              `Выдано дисциплинарное наказание участнику **${
                member.user.tag
              }** на **${f.time(time)}**.`
            );

            return;
          }
        }

        if (profile_data.mutes?.length % 2 === 0) {
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

            f.warn_emitter.emit("ban", {
              guild: this.interaction.guil,
              user: member,
              user_id: member.id,
              mongo: this.db,
              data: ban,
            });
            this.msgH(
              `Выдана блокировка участнику \`${member.user.tag}\` на \`${f.time(
                time
              )}\`.`
            );

            return;
          }
        }
      }

      await profile.add_warn({ warn_data: warn });

      this.msgH(`Успешно выдан варн участнику \`${member.user.tag}\`.`);
    } catch (error) {
      console.log(
        `Произошла ошибка при исполнении контекст-пользователь команды ${this.interaction.commandName}`
      );
      let errors_channel = Bot.bot.channels.cache.get(f.config.errorsChannel);
      errors_channel.send(
        `Ошибка при исполнении команды \`${this.interaction.commandName}\`:\n\`${error.name}: ${error.message}\``
      );
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
    } catch (error) {
      console.log(
        `Произошла ошибка при исполнении контекст-пользователь команды ${this.interaction.commandName}`
      );
      let errors_channel = Bot.bot.channels.cache.get(f.config.errorsChannel);
      errors_channel.send(
        `Ошибка при исполнении контекст-пользователь команды \`${this.interaction.commandName}\`:\n\`${error.name}: ${error.message}\``
      );
    }
  }
}

module.exports = Command;
