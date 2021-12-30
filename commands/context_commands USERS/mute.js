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
        name: "Мьют",
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

      let time = f.parse_duration("24h");

      let member = await this.interaction.guild.members.fetch(
        this.interaction.targetId
      );

      if (!member)
        return this.msgFalseH(
          "Вы не указали участника для дисциплинарного наказания."
        );

      if (member.user.bot || member.user.id === this.interaction.member.id)
        return this.msgFalseH(
          "Вы указали неверного участника для дисциплинарного наказания."
        );

      if (
        member.roles.highest.position >=
        this.interaction.member.roles.highest.position
      )
        return this.msgFalseH(
          "Вы не можете выдавать дисциплинарные наказания этому участнику."
        );

      this.msgH(
        `Укажите причину для дисциплинарного наказания \`${member.user.tag}\`.\n\nВремя \`60\` секунд`
      );

      let filter = (msg) => msg.author.id === this.interaction.user.id;

      let ask_reason = await this.interaction.channel
        .awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] })
        .catch((e) => undefined);

      if (!ask_reason)
        return this.msgFalseH(
          "Вы не указали причину дисциплинарного наказания."
        );

      let reason = ask_reason.first()?.content;

      ask_reason.first().delete();

      let profile = new f.Profile(this.db, member);

      let profile_data = await profile.fetch(["bans", "mutes"]);

      if (profile_data?.muted?.is)
        return this.msgFalseH(
          "Этот пользователь уже имеет дисциплинарное наказания."
        );

      let mutes = profile_data.mutes || [];
      let mute_limits = this.config.punishments.mutes;

      if (mutes[0] && mutes.length % mute_limits[0] === 0) {
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
            by: this.interaction.member.id,
            date: new Date().getTime(),
          };

          f.warn_emitter.emit("ban", {
            user_id: member.id,
            user: member,
            guild: this.interaction.guild,
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

      let mute = {
        time: time,
        reason: reason,
        by: this.interaction.member.id,
        date: new Date().getTime(),
      };

      await profile.mute({ mute_data: mute });

      this.msgH(
        `Успешно выдано дисциплинарное наказание участнику \`${
          member.user.tag
        }\` на время \`${f.time(time)}\`.`
      );
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

  async ask(message_content) {
    let ask_message = await this.msg(message_content, {
      components: [
        new Discord.MessageActionRow().addComponents(...this.ask_buttons),
      ],
      fetchReply: true,
    });
    let filter = (button) => button.user.id === this.interaction.member.id;
    let await_ask = await ask_message
      .awaitMessageComponent({ filter, max: 1, time: 60000, errors: ["time"] })
      .catch((err) => undefined);
    await ask_message.delete();
    return await_ask;
  }
}

module.exports = Command;
