const Emitter = require("events");
const Discord = require("discord.js");
const { time } = require("@discordjs/builders");

/** Обработчик наказаний */
class Warn_emitter {
  constructor(mongo) {
    if (!mongo) throw new Error("База данных не передана.");

    /**
     * Стандартные слушатели событий для старых версий
     */

    this._functions_list = {
      warn: this.warn,
      mute: this.mute,
    };

    /**
     * Объект со слушателями евентов
     * @type Object
     */

    this._events_emitters = { ...this._functions_list };

    /**
     * Сервер
     */
    this.guild = Bot.bot.guilds.cache.get(f.config.slash_guild);

    /**
     * База данных
     */

    this.db = mongo.db("gtaEZ");

    /**
     *  Бесконечная ссылка на сервер
     * @type {string}
     */
    this._link = "https://discord.gg/QtwrAaJ";

    /**
     * Ссылка на сервер для забаненых
     * @type {string}
     */
    this._banned_link = "https://discord.gg/tnUzfgd3vU";
  }

  on(event_name, callback_function) {
    if (!event_name) throw new Error("Не указано название эвента.");
    if (typeof event_name != "string")
      throw new Error("Название эвента должно быть строкой.");
    if (!callback_function || typeof callback_function != "function")
      throw new Error("Не указана или неправильно указана колл-бек функция.");

    if (this._events_emitters[event_name]) {
      this._events_emitters[event_name].push(callback_function);
    } else {
      this._events_emitters[event_name] = [callback_function];
    }
  }

  emit(...args) {
    try {
      let event_name = args[0];

      if (!event_name || typeof event_name != "string")
        throw new Error(
          "Название эвента для вызова не указано или указано неправильно."
        );

      if (this._events_emitters[event_name]) {
        let emitter_functions = this._events_emitters[event_name];

        args.splice(0, 1);

        for (let emitter_function of emitter_functions) {
          try {
            emitter_function(...args);
          } catch (err) {
            f.handle_error(
              err,
              `[Warns_emitter] emit in ListenerEmit: ${event_name}`,
              {
                emit_data: args,
              }
            );
          }
        }
      }
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method emit", { emit_data: args });
    }
  }

  async warn({ user_id, warn_data }) {
    try {
      if (!warn_data) throw new Error("Не переданы данные о варне.");
      if (!user_id) throw new Error("Айди участника для варна не передан.");

      let member_profile = new f.Profile(this.db, user_id);

      let member_data = await member_profile.fetch();

      let warns = member_data.warns || [];

      if (!warn_data.by || !warn_data.reason || !warn_data.date)
        throw new Error("Информация о варне неполная.");

      warns.push(warn_data);

      let member = await this._get_member(user_id);
      let moderator = (await this._get_member(warn_data.by)) || Bot.bot;

      if (member) {
        member.send(
          `:warning: Вам было выдано предупреждение на сервере \`${this.guild.name}\`.\n\n:pencil: Причина: \`${warn_data.reason}\``
        );
      }

      member_profile.update_data({
        warns: warns,
      });

      let logs_embed = new Discord.MessageEmbed()
        .setDescription(":warning: Выдано предупреждение")
        .setColor("#ffff00")
        .setThumbnail(member.user.avatarURL({ dynamic: true }))
        .setTimestamp()
        .addField(
          ":small_blue_diamond: Пользователю",
          `${member || ""} ${
            member.user?.tag || "Пользователь#0000"
          } ID: ${user_id}`
        )
        .addField(
          ":tools: Модератором",
          `${moderator} ${moderator.user.tag} ID: ${member.id}`
        )
        .addField(":pencil: Причина", warn_data.reason, true);

      this._send_logs(logs_embed);

      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method warn", {
        emit_data: { user_id, warn_data },
      });

      return false;
    }
  }

  async mute({ user_id, mute_data }) {
    try {
      if (!user_id) throw new Error("Не указан айди участника для варна.");
      if (!mute_data) throw new Error("Не укзана информация о мьюте.");

      if (!mute_data.by || !mute_data.reason || !mute_data.time)
        throw new Error("Информация о мьюте не полная.");

      let mute_role_id = f.config.muted_role;
      if (!mute_role_id) throw new Error("Роль для мьюта не указана.");

      let mute_role = this.guild.roles.cache.get(mute_role_id);
      if (!mute_role) throw new Error("Роль мьюта не найдена.");

      let member = await this._get_member(user_id);
      let moderator = await this._get_member(mute_data.by);

      if (!member) throw new Error("Участник для мьюта не найден.");

      let member_profile = new f.Profile(this.db, user_id);
      let member_data = await member_profile.fetch();

      let mutes = member_data.mutes || [];

      let bot_member = await this._get_member(Bot.bot.user.id);

      let roles_to_remove = member.roles.cache
        .filter(
          (role) =>
            role.position < bot_member.roles?.highest?.position &&
            !role.tags?.premiumSubscriberRole &&
            !role.botRole &&
            role.id !== this.guild.id &&
            role.id !== mute_role_id
        )
        .map((role) => role.id);

      await member.roles.remove(roles_to_remove);

      setTimeout(() => member.roles.add(mute_role_id), 1000);

      let till = new Date(new Date().getTime() + mute_data.time);

      f.muted_members[member.id] = { till };

      mutes.push(mute_data);

      let muted = {
        reason: mute_data.reason,
        till: till.getTime(),
        is: true,
        roles: roles_to_remove,
      };
      member_profile.update_data({ mutes, muted });

      let logs_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setDescription(":mute: Выдано Дисциплинарное наказание")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member} ${member.user.tag} ID: ${member.id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator || ``} ${moderator?.user?.tag || ""} ID: ${moderator.id}`
        )
        .addField(":alarm_clock: На:", `${f.time(mute_data.time)}`)
        .addField(
          ":speaker: Снятие в:",
          `${time(
            till,
            "R"
          )} (**\`${till.toLocaleDateString()} ${till.toLocaleTimeString()} по МСК\`**)`
        )
        .addField(":pencil: Причина:", mute_data.reason);

      this._send_logs(logs_embed);

      member
        .send(
          `:mute: Вам было выдано дисциплинарное наказание на сервере **${
            this.guild.name
          }**. Истечет: ${time(
            till,
            "R"
          )} (**\`${till.toLocaleDateString()} ${till.toLocaleTimeString()} по МСК\`**) .\n:pencil: По причине: \`${
            mute_data.reason
          }\``
        )
        .catch((e) => {
          f.handle_error(e, "[Warns_emitter] member.send in method mute", {
            emit_data: { user_id, mute_data },
          });
        });

      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method mute", {
        emit_data: { user_id, mute_data },
      });

      return false;
    }
  }

  async ban({ user_id, ban_data }) {
    try {
      if (!user_id) throw new Error("Не указан айди участника.");
      if (!ban_data) throw new Error("Не указана информация о бане.");

      if (!ban_data.reason || !ban_data.by || !ban_data.time || !ban_data.date)
        throw new Error("Указана не полная информация о бане.");

      let member = await this._get_member(user_id);
      let till = new Date(new Date().getTime() + ban_data.time);

      if (member) {
        await member
          .send(
            `:hammer: Вам была выдана блокировка на сервере \`${
              this.guild.name
            }\`. На срок: ${
              ban_data.time === 0
                ? "Навсегда"
                : `${f.time(
                    ban_data.time || 0,
                    "R"
                  )}  (\`\`${till.toLocaleDateString()} ${till.toLocaleTimeString()} по МСК\`\`)\n\nСсылка для возвращения после разбана: ${
                    this._link
                  }`
            }
             \nПо причине: ${ban_data.reason}\n\nЕсли хотите оспорить бан - ${
              this._banned_link
            }`
          )
          .catch((err) => {
            f.handle_error(err, "[Warns_emitter] member.send in method ban", {
              emit_data: { user_id, ban_data },
            });
          });
      }

      let banned_member = await this.guild.members.ban(user_id).catch((err) => {
        f.handle_error(err, "[Warn_emitter] method ban", {
          emit_data: ban_data,
        });

        return null;
      });

      if (banned_member === null) {
        return banned_member;
      }

      if (!banned_member) return false;

      let member_profile = new f.Profile(this.db, user_id);
      let member_data = await member_profile.fetch();

      let bans = member_data.bans || [];

      bans.push(ban_data);

      let moderator = await this._get_member(ban_data.by);

      member_profile.update_data({ bans });

      let member_avatar_url;

      if (member && member?.user?.avatarURL)
        member_avatar_url = member.user.avatarURL();
      if (member && member?.avatarURL) member_avatar_url = member.avatarURL();

      let ban_logs = new Discord.MessageEmbed()
        .setDescription(":hammer: Пользователь заблокирован")
        .setColor("#EA1414")
        .setThumbnail(member_avatar_url)
        .setTimestamp()
        .addField(
          ":small_blue_diamond: Пользователь",
          `${banned_member?.tag || "Unknown#0000"} ID: ${user_id}`
        )
        .addField(
          ":tools: Модератором",
          `${moderator} ${moderator?.user?.tag} ID: ${ban_data.by}`
        )
        .addField(":pencil: За", ban_data.reason)
        .addField(
          ":alarm_clock: На срок:",
          ban_data.time === 0 ? "Навсегда" : f.time(ban_data.time)
        )
        .addField(
          ":unlock: Разбан в:",
          ban_data.time === 0
            ? "Никогда"
            : `${time(
                till,
                "R"
              )} (**\`${till.toLocaleDateString()} ${till.toLocaleTimeString()} по МСК\`**)`
        );

      this._send_logs(ban_logs);
      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method ban", {
        emit_data: { user_id, ban_data },
      });

      return false;
    }
  }

  async kick({ user_id, kick_data }) {
    try {
      if (!user_id) throw new Error("Айди участника не указан.");
      if (!kick_data) throw new Error("Информация о кике не указана.");

      if (!kick_data.reason || !kick_data.by)
        throw new Error("Информация о кике не полная.");

      let member = await this._get_member(user_id);
      if (!member) throw new Error("Указан несуществующий участник");

      let moderator = await this._get_member(kick_data.by);

      await member
        .send(
          `:hiking_boot: Вас выгнали с сервера \`${this.guild.name}\`\nПо причине: ${kick_data.reason}\n\nСсылка для возвращения: ${this._link}`
        )
        .catch((err) => {
          f.handle_error(err, "[Warns_emitter] member.send in method kick", {
            emit_data: { user_id, kick_data },
          });
        });

      let kicked_user = await this.guild.members
        .kick(
          user_id,
          `Кик от ${moderator.user.tag} ID: ${moderator.user.id}: ${kick_data.reason}`
        )
        .catch((err) => {
          f.handle_error(err, "[Warns_emitter] members.kick in method kick", {
            emit_data: { user_id, kick_data },
          });

          return null;
        });

      if (kicked_user === null) return kicked_user;

      if (!kicked_user) throw new Error("Указанный участник не найден.");

      let kick_logs = new Discord.MessageEmbed()
        .setDescription(":hiking_boot: Пользователь выгнан с сервера")
        .setThumbnail(
          member.user.avatarURL({
            dynamic: true,
          })
        )
        .setTimestamp()
        .addField(
          ":small_blue_diamond: Пользователь",
          `${member.user.tag || "Unknown#0000"} ID: ${user_id}`
        )
        .addField(
          ":tools: Модератором",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(":pencil: За", kick_data.reason);

      this._send_logs(kick_logs);

      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method kick", {
        emit_data: { user_id, kick_data },
      });

      return;
    }
  }

  async unmute({ user_id, unmute_data }) {
    try {
      if (!user_id) throw new Error("Не указан айди участника.");
      if (!unmute_data)
        throw new Error("Неправильно указана информация о анмьюте.");

      if (!unmute_data.by || !unmute_data.reason)
        throw new Error("Неправильно указана информация о размьюте.");

      let member = await this._get_member(user_id);
      if (!member) throw new Error("Указанный участник не найден");

      let moderator = await this._get_member(unmute_data.by);

      let member_porfile = new f.Profile(this.db, user_id);
      let member_data = await member_porfile.fetch();

      let { muted, mutes } = member_data;

      if (!muted.is) return true;

      muted.is = false;
      delete f.muted_members[member.id];

      let roles = muted?.roles.filter((role) => !member.roles.cache.has(role));
      await member.roles.add(roles).catch((err) => {
        f.handle_error(
          err,
          "[Warns_emitter] member.roles.add in method unmute",
          {
            emit_data: { user_id, roles: muted.roles, unmute_data },
          }
        );
      });

      let unmute_logs = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setDescription(":speaker: Снято Дисциплинарное наказание")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member} ${member.user.tag} ID: ${member.id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(":pencil: Причина:", unmute_data.reason);

      member
        .send(
          `:speaker: С вас был снят мьют по причине: \`${unmute_data.reason}\` на сервере \`${member.guild.name}\``
        )
        .catch((err) => {
          f.handle_error(err, "[Warns_emitter] member.send in method unmute", {
            emit_data: {
              user_id,
              unmute_data,
            },
          });
        });

      setTimeout(() => {
        member.roles.remove(f.config.muted_role).catch((err) => {
          f.handle_error(
            err,
            "[Warns_emitter] member.roles.remove in method unmute",
            {
              emit_data: {
                user_id,
                role_id: f.config.muted_role,
              },
            }
          );
        });
      }, 1000);

      member_porfile.update_data({
        muted,
      });
      this._send_logs(unmute_logs);
      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method unmute", {
        emit_data: { user_id, unmute_data },
      });

      return false;
    }
  }

  async unban({ user_id, unban_data }) {
    try {
      if (!user_id) throw new Error("Не указан айди участника.");
      if (!unban_data) throw new Error("Не указана информация о бане.");

      if (!unban_data.by || !unban_data.reason)
        throw new Error("Неправильно заполнена информация о бане.");

      let moderator = await this._get_member(unban_data.by);

      let unbanned_user = await this.guild.members
        .unban(user_id)
        .catch((err) => undefined);

      if (!unbanned_user) return null;

      let unban_logs = new Discord.MessageEmbed()
        .setDescription(":hammer: Пользователь Разблокирован")
        .setColor("#48EA14")
        .setThumbnail(
          unbanned_user?.displayAvatarURL
            ? unbanned_user.displayAvatarURL({
                dynamic: true,
              })
            : ""
        )
        .setTimestamp()
        .addField(
          ":small_blue_diamond: Пользователь",
          `${unbanned_user?.tag || "Unknown#0000"} ID: ${
            unbanned_user?.id || user_id
          }`
        )
        .addField(
          ":tools: Модератором",
          `${moderator} ${moderator?.user?.tag} ID: ${unban_data.by}`
        )
        .addField(":pencil: Причина:", unban_data.reason);

      this._send_logs(unban_logs);
      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method kick", {
        options: {
          user_id,
          unban_data,
        },
      });

      return false;
    }
  }

  async report({ user_id, report_data }) {
    try {
      let {
        channel,
        reason,
        attachments = [],
        type,
        by,
        message_id,
      } = report_data;
      if (!channel || !reason || !attachments || !type || !by)
        throw new Error("Неправильно заполнена информация о репорте.");

      let member_by = await this._get_member(by);

      let reports_channel = this.guild.channels.cache.get(
        f.config.user_reports_channel
      );

      if (!reports_channel)
        throw new Error(
          "Осутствует канал для репортов.",
          "[Warns_emitter] method report",
          {
            emit_data: { user_id, report_data },
          }
        );
      if (type === "USER") {
        let member = await this._get_member(user_id);
        if (!member) throw new Error("Участник для репорта не найден.");

        let moderator_roles = f.config.moderator_roles || [];

        let reason_attachments = attachments.map(
          (attach) => `${attach.contentType}: [Вложение](${attach.url})`
        );
        let report_embed = new Discord.MessageEmbed()
          .setColor(f.config.colorEmbed)
          .setAuthor(`Репорт пользователя:`)
          .setThumbnail(member?.user?.displayAvatarURL({ dynamic: true }))
          .addField(
            "Автор репорта:",
            `${member_by} ${member_by.user.tag} ID: ${by}`
          )
          .addField(
            "Нарушитель:",
            `${member || ""} ${
              member?.user.tag || "Unknown#0000"
            } ID: ${user_id}`
          )
          .addField("Причина:", reason || "Почему-то не указано.")

          .addField(
            "Вложения:",
            reason_attachments[0] ? reason_attachments.join("\n") : "Нет."
          );
        reports_channel.send({
          content: moderator_roles[0]
            ? moderator_roles.map((role_id) => `<@&${role_id}>`).join(", ")
            : undefined,
          embeds: [report_embed],
        });

        return true;
      }

      if (type === "MESSAGE") {
        let reported_message = await channel.messages.fetch(message_id);
        let member = reported_message.member;

        let moderator_roles = f.config.moderator_roles || [];

        let reason_attachments = attachments.map(
          (attach) => `${attach.contentType}: [Вложение](${attach.url})`
        );
        let report_embed = new Discord.MessageEmbed()
          .setColor(f.config.colorEmbed)
          .setAuthor(`Репорт сообщения:`)
          .setThumbnail(
            reported_message.author?.displayAvatarURL({ dynamic: true })
          )
          .addField(
            "Автор репорта:",
            `${member_by} ${member_by.user.tag} ID: ${by}`
          )
          .addField(
            "Нарушитель:",
            `${reported_message?.author.tag || "Unknown#0000"} ID: ${user_id}`
          )
          .addField("Причина:", reason || "Почему-то не указано.")
          .addField(
            "Содержание сообщения:",
            `${
              reported_message?.content || "Пусто."
            }\n\n[Ссылка на сообщение](https://discord.com/channels/${
              channel.guild.id
            }/${channel.id}/${message_id})`
          )
          .addField(
            "Вложения:",
            reason_attachments[0] ? reason_attachments.join("\n") : "Нет."
          );
        reports_channel.send({
          content: moderator_roles[0]
            ? moderator_roles.map((role_id) => `<@&${role_id}>`).join(", ")
            : undefined,
          embeds: [report_embed],
        });

        return true;
      }
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method report", {
        emit_data: {
          user_id,
          report_data,
        },
      });

      return false;
    }
  }

  async time_role({ user_id, time_role_data }) {
    try {
      let { time, till, id, by } = time_role_data;

      if (!time || !till || !id || !by)
        throw new Error("Один из аргументов роли не указан.");

      let new_role = {
        role: id,
        time: till,
      };

      let member = await this._get_member(user_id);
      if (!member) throw new Error("Участник не найден");

      let moderator = await this._get_member(by);

      let guild_role = this.guild.roles.cache.get(id);

      let member_profile = new f.Profile(this.db, user_id);
      let member_data = await member_profile.fetch();

      let member_timed_roles = member_data.timedRoles || [];

      let same_role = member_timed_roles.filter(
        (time_role) => time_role.role === id
      )[0];

      if (same_role)
        member_timed_roles[member_timed_roles.indexOf(same_role)] = new_role;
      else member_timed_roles.push(new_role);

      if (!member.roles.cache.has(id))
        await member.roles.add(id).catch((err) => {
          f.handle_error(
            err,
            "[Warns_emitter] member.roles.add in method time_role",
            {
              emit_data: { user_id, time_role_data },
            }
          );
        });

      member_profile.update_data({ timedRoles: member_timed_roles });

      member
        .send(
          `${`:white_check_mark: Вам была выдана временная роль \`${guild_role.name}\``} на сервере \`${
            member.guild.name
          }\`\n:timer: На срок: \`${f.time(time)}\``
        )
        .catch((e) => {});

      let role_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTitle(":calendar_spiral: Выдана временная роль:")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member} ${member.user.tag} ID: ${user_id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(":round_pushpin: Роль:", `${guild_role}`)
        .addField(
          ":alarm_clock: На:",
          `${time === 0 ? "Навсегда" : f.time(time)}`
        );

      this._send_logs(role_embed);

      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method role", {
        emit_data: { user_id, time_role_data },
      });

      return false;
    }
  }

  async time_role_remove({ user_id, time_roles_data }) {
    try {
      if (!user_id) throw new Error("Не указан айди участника");

      let { id, by } = time_roles_data;

      if (!id || !by) throw new Error("Один из аргументов роли не указан.");

      let member = await this._get_member(user_id);

      let moderator = await this._get_member(by);

      let guild_role = this.guild.roles.cache.get(id);

      let member_profile = new f.Profile(this.db, user_id);
      let member_data = await member_profile.fetch();

      let member_timed_roles = member_data.timedRoles || [];

      let new_roles = member_timed_roles.filter(
        (time_role) =>
          !(id.includes ? id.includes(time_role.role) : time_role.role === id)
      );

      let roles_to_remove = member.roles.cache.filter((role) =>
        id.includes ? id.includes(role.id) : id === role.id
      );

      await member.roles
        .remove(roles_to_remove.map((role) => role.id))
        .catch((err) => {
          f.handle_error(err, "[Warns_emitter] member.roles.remove", {
            emit_data: { user_id, time_roles_data },
          });
        });

      member_profile.update_data({ timedRoles: new_roles });

      let role_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTitle(":calendar_spiral: Снята временная роль:")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member || "Пользователь#0000"} ${member?.user?.tag} ID: ${user_id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator || "Пользователь#0000"} ${
            moderator?.user?.tag || ""
          } ID: ${moderator?.id || ""}`
        )
        .addField(
          ":round_pushpin: Роль:",
          `${roles_to_remove.map((role) => role).join(", ")}`
        );

      member
        .send(
          `:wastebasket: С вас была снята временная роль: \`${roles_to_remove
            .map((role) => role.name)
            .join(", ")}\` на сервере \`${member.guild.name}\``
        )
        .catch((err) => {
          f.handle_error(
            err,
            "[Warns_emitter] member.send in method time_role_remove",
            {
              emit_data: { user_id, time_roles_data },
            }
          );
        });

      this._send_logs(role_embed);

      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method time_role_remove", {
        emit_data: { user_id, time_roles_data },
      });

      return false;
    }
  }

  async warn_remove({ user_id, warn_remove_data }) {
    try {
      if (!user_id) throw new Error("Не указан айди участника.");
      if (!warn_remove_data)
        throw new Error("Неправильно указана информация о снятом варне.");

      let { by, warn_data } = warn_remove_data;

      if (!by || !warn_data)
        throw new Error("Неправильно указана информация о снятом варне.");

      let member = await this._get_member(user_id);

      let moderator = await this._get_member(by);

      let warn_moderator = await this._get_member(warn_data.by);

      let warn_date = new Date(warn_data.date);

      let warn_embed = new Discord.MessageEmbed()
        .setDescription(":warning: Снято предупреждение")
        .setThumbnail(member?.user?.avatarURL({ dynamic: true }))
        .setTimestamp()
        .addField(
          ":small_blue_diamond: С Пользователя",
          `${member || ""} ${
            member?.user?.tag || "Пользователь#0000"
          } ID: ${user_id}`
        )
        .addField(
          ":tools: Модератором",
          `${moderator || ""} ${
            moderator.user.tag || "Модератор#0000"
          } ID: ${by}`
        )
        .addField(
          "⚠️ Содержание предупреждения:",
          `Дата: \`${warn_date.toLocaleDateString()} ${warn_date.toLocaleTimeString()} по МСК\`\nМодератор: \`${
            warn_moderator?.user?.tag || warn_data.by
          }\`\nПричина: \`${warn_data.reason}\``
        );

      this._send_logs(warn_embed);

      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] warn_remove", {
        emit_data: { user_id, warn_remove_data },
      });

      return false;
    }
  }

  async mute_remove({ user_id, mute_remove_data }) {
    try {
      if (!user_id) throw new Error("Айди участника не указан");

      if (!mute_remove_data)
        throw new Error("Информация о снятом мьюте не указана.");

      let { by, mute_data } = mute_remove_data;

      if (!by || !mute_data) throw new Error("Один из аргументов не указан.");

      let member = await this._get_member(user_id);

      let moderator = await this._get_member(by);

      let mute_moderator = await this._get_member(mute_data.by);

      let mute_date = new Date(mute_data.date);

      let warn_embed = new Discord.MessageEmbed()
        .setDescription("🔇 Снят мьют")
        .setThumbnail(member?.user?.avatarURL({ dynamic: true }))
        .setTimestamp()
        .addField(
          ":small_blue_diamond: С Пользователя",
          `${member || ""} ${
            member?.user?.tag || "Пользователь#0000"
          } ID: ${user_id}`
        )
        .addField(
          ":tools: Модератором",
          `${moderator || ""} ${
            moderator.user.tag || "Модератор#0000"
          } ID: ${by}`
        )
        .addField(
          "🔇 Содержание мьюта:",
          `Дата: \`${mute_date.toLocaleDateString()} ${mute_date.toLocaleTimeString()} по МСК\`\nМодератор: \`${
            mute_moderator?.user?.tag || mute_data.by
          }\`\nПричина: \`${mute_data.reason}\``
        );

      this._send_logs(warn_embed);

      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method mute_remove", {
        emit_data: { user_id, mute_remove_data },
      });

      return false;
    }
  }

  async role({ user_id, role_data }) {
    try {
      if (!user_id) throw new Error("Айди участника не указан.");

      if (!role_data)
        throw new Error("Не указана информация о роли для выдачи.");

      let { id, by } = role_data;

      if (!id || !by) throw new Error("Информация не полная.");

      let member = await this._get_member(user_id);

      if (!member) throw new Error("Указан несуществующий участник");

      let moderator = await this._get_member(by);

      let roles_to_add;

      if (id.includes) {
        roles_to_add = id.filter((role_id) => !member.roles.cache.has(role_id));
      } else {
        roles_to_add = id;
      }

      let result = await member.roles.add(roles_to_add).catch((err) => {
        f.handle_error(err, "[Warns_emitter] member.roles.add in method role", {
          emit_data: { user_id, roles_to_add },
        });

        return false;
      });

      if (!result) return false;

      let guild_roles = member.guild.roles.cache
        .filter((role) => (id.includes ? id.includes(role.id) : id === role.id))
        .map((role) => role);

      let role_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTitle(":calendar_spiral: Выдана роль:")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member} ${member.user.tag} ID: ${member.id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(":round_pushpin: Роль:", `${guild_roles.join(", ")}`);

      member
        .send(
          `:white_check_mark: Вам были выданы роли \`${guild_roles
            .map((r) => r.name)
            .join(", ")}\` на сервере \`${member.guild.name}\``
        )
        .catch((err) => {
          f.handle_error(err, "[Warns_emitter] member.send in method role", {
            emit_data: { user_id, role_data },
          });
        });
      this._send_logs(role_embed);

      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method role", {
        emit_data: { user_id, role_data },
      });

      return false;
    }
  }

  async role_remove({ user_id, role_remove_data }) {
    try {
      if (!user_id) throw new Error("Не указан айди участника.");

      if (!role_remove_data)
        throw new Error("Не указана информация о роли для снятия.");

      let { id, by } = role_remove_data;
      if (!id || !by) throw new Error("Информация о снятии ролей не полная.");

      let member = await this._get_member(user_id);
      if (!member) throw new Error("Указан несуществующий участник");

      let moderator = await this._get_member(by);

      let roles_to_remove;

      if (id.includes) {
        roles_to_remove = member.roles.cache.filter((role) =>
          id.includes(role.id)
        );
      } else {
        roles_to_remove = id;
      }

      let result = await member.roles.remove(roles_to_remove).catch((err) => {
        f.handle_error(
          err,
          "[Warns_emitter] member.roles.remove in method role_remove",
          {
            emit_data: { user_id, role_remove_data },
          }
        );

        return false;
      });

      if (!result) return false;

      let guild_roles = this.guild.roles.cache
        .filter((role) => (id.includes ? id.includes(role.id) : id === role.id))
        .map((r) => r);

      member.send(
        `:wastebasket: С вас была снята роль \`${guild_roles
          .map((role) => role.name)
          .join(", ")}\` на сервере \`${this.guild.name}\``
      );

      let role_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTitle(":calendar_spiral: Снята роль:")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member} ${member.user.tag} ID: ${user_id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator} ${moderator?.user?.tag} ID: ${by}`
        )
        .addField(":round_pushpin: Роль:", `${guild_roles.join(", ")}`);

      this._send_logs(role_embed);
      return true;
    } catch (err) {
      f.handle_error(err, "[Warns_emitter] method role_remove", {
        emit_data: { user_id, role_remove_data },
      });

      return false;
    }
  }

  _send_logs(log_embed, options = {}) {
    if (!log_embed) throw new Error("Ембед для отправки в логи не указан.");

    let logs_channel = Bot.bot.channels.cache.get(f.config.reports_channel);

    if (!logs_channel) {
      f.handle_error(
        new Error("Не найден канал для логов."),
        "[Warns_emitter] _send_logs"
      );

      return;
    }

    logs_channel.send({ embeds: [log_embed], ...options });
  }

  async _get_member(member_id) {
    let member = await this.guild.members
      .fetch(member_id)
      .catch((err) => undefined);

    return member;
  }
}

module.exports = Warn_emitter;
