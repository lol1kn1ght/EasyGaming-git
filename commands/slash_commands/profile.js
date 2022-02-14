const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");
const { time } = require("@discordjs/builders");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.options = {
      permissions: [],
      custom_perms: [],
      allowed_roles: [],
      slash: {
        name: "profile",
        description: "Просмотреть свой профиль или профиль другого участника.",
        options: [
          {
            name: "упоминание",
            description:
              "ИЛИ Упоминание участника (не указывать если нужен ваш профиль)",
            type: 6,
            required: false,
          },
          {
            name: "айди",
            description:
              "ИЛИ Айди участника (не указывать если нужен ваш профиль)",
            type: 3,
            required: false,
          },
        ],
      },
    };
  }

  async execute() {
    let member = this.command_args.filter((arg) => arg.name === "упоминание")[0]
      ?.member;

    let member_id = member?.id;

    if (!member) {
      member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
        ?.value;

      if (member_id)
        member = await this.interaction.guild.members
          .fetch(member_id)
          .catch((e) => undefined);
    }

    if (!member) member = this.interaction.member;

    let profile = new f.Profile(this.db, member.id);
    let profile_data = await profile.fetch();

    let stats_db = this.db.collection("stats");
    let stats_data = (await stats_db.findOne({ login: member.id })) || {};

    let filtred_timed_roles = profile_data.timedRoles?.filter(
      (time_role) => time_role.time > new Date().getTime()
    );

    var temproles =
      filtred_timed_roles
        ?.map(
          (val) => `<@&${val.role}>: ${f.time(val.time - new Date().getTime())}`
        )
        .join("\n") || "Список пуст";

    let wins =
      profile_data.lesterWinStats?.reduce((prev, next) => prev + next) || 0;

    if (isNaN(wins)) wins = 0;

    let level = 0;

    let totalExp = 0;

    function xp(lvl) {
      let xp = 5 * (lvl * lvl) + 50 * lvl + 100;

      totalExp = totalExp + xp;
      return totalExp;
    }

    if (profile_data.rank && profile_data.rank != 0) {
      while (xp(level) <= profile_data.rank) {
        level++;
      }
    }
    let totalExpa = totalExp;
    totalExp = 0;

    let lv = xp(level + 1);

    let event_role = this.interaction.member.roles.cache.find(
      (role) =>
        !isNaN(Number(role.name)) &&
        Number(role.name) > 0 &&
        Number(role.name) < 50
    )?.name;

    let eventswins = Number(event_role) || 0;

    let member_archieve = profile_data.archieve || {};

    let others = `\`Текущее\`: ${profile_data.bans?.length || "0"} 🔨   |    ${
      profile_data.mutes?.length || "0"
    } 🔇   |   ${profile_data.warns?.length || "0"} ⚠️\n\`Архив\`: ${
      member_archieve?.bans.length || 0
    } 🔨  | ${member_archieve?.mutes?.length || 0} 🔇  | ${
      member_archieve?.warns?.length
    } ⚠️`;

    let joined_date = new Date(member.joinedTimestamp);

    const repMsg = new Discord.MessageEmbed()
      .setAuthor(
        member.user.tag,
        member.user.displayAvatarURL({ dynamic: true })
      )
      .setColor("#EAECEA") // #111111
      .setTimestamp()
      .addField(
        ":bank: Монеты",
        `  ${f.discharge(profile_data.coins || 0)} ${this.config.currency}`,
        true
      )
      .addField(
        ":school_satchel: Алмазы",
        `  ${f.discharge(profile_data.diamonds || 0)} :gem:`,
        true
      )
      .addField("\u200b", "\u200b")
      .addField(":trophy: Уровень", `${f.discharge(level)}`, true)
      .addField(
        ":medal: До следующего уровня",
        `${lv - (totalExpa - (profile_data.rank || 0)) + " из " + lv}` +
          " опыта",
        true
      )
      .addField("\u200b", "\u200b")
      .addField(":medal: Побед в мероприятиях", `${eventswins}`, true)
      .addField(":military_medal: Побед у Лестера", `${wins}`, true)
      .addField("\u200b", "\u200b")
      .addField(":alarm_clock: Временные роли", temproles)

      .addField(
        ":diamond_shape_with_a_dot_inside: Высшая роль",
        `${member.roles?.highest || "Нет"}`,
        true
      )
      .addField(
        ":round_pushpin: Отображение",
        `${member.roles?.hoist || "Нет"}`,
        true
      )

      .addField(":scroll: Примечания", others)
      .addField("\u200b", "\u200b")
      .addField(
        "🗓️ Дата присоединения",
        `\`${joined_date.toLocaleDateString()} ${joined_date.toLocaleTimeString()} по МСК\``
      );

    this.interaction.reply({ embeds: [repMsg] });
  }
}

module.exports = Command;
