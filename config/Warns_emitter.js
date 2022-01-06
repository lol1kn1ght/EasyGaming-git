const Emitter = require("events");
const warn_emitter = new Emitter();
const Discord = require("discord.js");
const {time} = require("@discordjs/builders");
const {resolve} = require("path/posix");

function check_args(args = {}) {
  return args.user_id && args.data && args.mongo;
}

function update_data(db, data, user_id) {
  if (data.login) {
    db.updateOne(
      {
        login: data.login
      },
      {
        $set: data
      }
    );
  }

  if (!data.login) {
    if (!user_id) throw new Error("Айди пользователя не указан.");
    db.insertOne({login: user_id, ...data});
  }
}

module.exports = () => {
  warn_emitter.on("warn", async args => {
    try {
      if (!check_args(args)) throw new Error("Один из аргументов не указан.");

      let reports_channel = await Bot.bot.channels
        .fetch(f.config.reports_channel)
        .catch(e => {
          throw new Error("Канал репортов не найден.");
        });
      if (!reports_channel) throw new Error("Канал репортов не найден.");

      let db = args.mongo.collection("users");

      let user_data =
        (await db.findOne({
          login: args.user_id
        })) || {};

      let warns = user_data.warns || [];

      warns.push(args.data);

      user_data.warns = warns;

      update_data(db, user_data, args.user_id);

      if (!reports_channel) return;

      let member = await reports_channel.guild.members.fetch(args.user_id);
      let moderator = await reports_channel.guild.members.fetch(args.data.by);

      if (!moderator) moderator = Bot.bot;

      let warn_embed = new Discord.MessageEmbed()
        .setDescription(":warning: Выдано предупреждение")
        .setColor("#ffff00")
        .setThumbnail(member.user.avatarURL({dynamic: true}))
        .setTimestamp()
        .addField(
          ":small_blue_diamond: Пользователю",
          `${member || ""} ${member.user?.tag || "Пользователь#0000"} ID: ${
            args.user_id
          }`
        )
        .addField(
          ":tools: Модератором",
          `${moderator} ${moderator.user.tag} ID: ${member.id}`
        )
        .addField(":pencil: Причина", args.data.reason, true);
      reports_channel.send({embeds: [warn_embed]});

      if (member)
        member
          .send(
            `:warning: Вам было выдано предупреждение на сервере **${reports_channel.guild.name}**\nПо причине: ${args.data.reason}`
          )
          .catch(e => {});
    } catch (err) {
      f.handle_error("EMITTER warn", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("mute", async args => {
    try {
      if (!check_args(args)) throw new Error("Один из аргументов не передан.");

      let reports_channel = await Bot.bot.channels
        .fetch(f.config.reports_channel)
        .catch(e => {
          throw new Error("Канал репортов не найден.");
        });
      if (!reports_channel) throw new Error("Канал репортов не найден.");

      let muted_role_id = f.config.muted_role;
      let muted_role = await reports_channel.guild.roles
        .fetch(muted_role_id)
        .catch(e => {
          throw new Error("Роль для мьюта не найдена.");
        });

      if (!muted_role) throw new Error("Роль для мьюта не найдена.");

      let member = await reports_channel.guild.members.fetch(args.user_id);
      let moderator = await reports_channel.guild.members.fetch(args.data.by);
      let bot_member = await reports_channel.guild.members.fetch(
        Bot.bot.user.id
      );

      if (!moderator) moderator = Bot.bot;

      let remove_roles = member.roles.cache
        .filter(
          role =>
            role.position < bot_member.roles?.highest?.position &&
            !role.tags?.premiumSubscriberRole &&
            !role.botRole &&
            role.id !== reports_channel.guild.id &&
            role.id !== muted_role_id
        )
        .map(role => role.id);

      let db = args.mongo.collection("users");

      let user_data =
        (await db.findOne({
          login: args.user_id
        })) || {};

      // if (user_data?.muted?.is) throw new Error("Пользователь уже замьючен.");

      let till = new Date(new Date().getTime() + args.data.time);

      let mutes = user_data.mutes || [];

      mutes.push(args.data);

      user_data.muted = {
        is: true,
        reason: args.data.reason,
        till: till.getTime(),
        roles: remove_roles
      };

      user_data.mutes = mutes;
      await update_data(db, user_data, args.user_id);

      member
        .send(
          `:mute: Вам было выдано дисциплинарное наказание на сервере **${
            reports_channel.guild.name
          }**. Истечет: ${time(
            till,
            "R"
          )} (**\`${till.toLocaleDateString()} ${till.toLocaleTimeString()} по МСК\`**) .\nПо причине: ${
            args.data.reason
          }`
        )
        .catch(e => {});

      await member.roles
        .remove(
          remove_roles,
          `Мьют от ${moderator.user.tag} ID: ${moderator.id}: ${args.data.reason}`
        )
        .catch(e => {
          // throw new Error("Недостаточно прав для снятия ролей для мьюта.");
        });

      try {
        await new Promise(resolve =>
          setTimeout(() => {
            member.roles.add(muted_role_id).catch(e => {});
            resolve(true);
          }, 1000)
        );
      } catch (e) {}
      // let non_remove_roles = member.roles.cache
      //   .filter((role) => !remove_roles.includes(role.id))
      //   .map((role) => role.id);

      // non_remove_roles.push(muted_role_id);

      // await member.roles
      //   .set(
      //     non_remove_roles,
      //     `Мьют от ${moderator.user.tag} ID: ${moderator.id}: ${args.data.reason}`
      //   )
      //   .catch((e) => {
      //     // throw new Error("Не могу выдать роль мьюта.");
      //   });

      let mute_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({dynamic: true}))
        .setTimestamp()
        .setDescription(":mute: Выдано Дисциплинарное наказание")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member} ${member.user.tag} ID: ${member.id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(":alarm_clock: На:", `${f.time(args.data.time)}`)
        .addField(
          ":speaker: Снятие в:",
          `${time(
            till,
            "R"
          )} (**\`${till.toLocaleDateString()} ${till.toLocaleTimeString()} по МСК\`**)`
        )
        .addField(":pencil: Причина:", args.data.reason);

      f.muted_members[member.id] = {
        till
      };

      reports_channel.send({
        embeds: [mute_embed]
      });
    } catch (err) {
      f.handle_error("EMITTER warn", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("unmute", async args => {
    try {
      if (!check_args(args)) throw new Error("Один из аргументов не указан.");

      let reports_channel = await Bot.bot.channels
        .fetch(f.config.reports_channel)
        .catch(e => {
          throw new Error("Канал репортов не найден.");
        });
      if (!reports_channel) throw new Error("Канал репортов не найден.");

      let muted_role_id = f.config.muted_role;
      let muted_role = await reports_channel.guild.roles
        .fetch(muted_role_id)
        .catch(e => {
          throw new Error("Роль для мьюта не найдена.");
        });

      if (!muted_role) throw new Error("Роль для мьюта не найдена.");

      let member = await reports_channel.guild.members.fetch(args.user_id);
      let moderator = await reports_channel.guild.members.fetch(args.data.by);

      let db = args.mongo.collection("users");

      let user_data =
        (await db.findOne({
          login: args.user_id
        })) || {};

      if (!user_data.muted?.is) throw new Error("У юзера нету мьютов.");

      let roles_add = user_data.muted?.roles || [];

      roles_add = roles_add.filter(role_id => !member.roles.cache.has(role_id));

      if (member.id in f.muted_members) delete f.muted_members[member.id];

      await member.roles
        .add(
          roles_add,
          `Размьют от ${moderator.user.tag} ID: ${moderator.id}: ${args.data.reason}`
        )
        .catch(e => {
          console.log(e);
          // throw new Error("Я не могу вернуть роли после мьюта.");
        });

      await member.roles
        .remove(
          muted_role_id,
          `Размьют от ${moderator.user.tag} ID: ${moderator.id}: ${args.data.reason}`
        )
        .catch(e => {
          // throw new Error("Я не могу снять роль мьюта.");
        });

      user_data.muted.is = false;

      update_data(db, user_data, args.user_id);

      let unmute_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({dynamic: true}))
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
        .addField(":pencil: Причина:", args.data.reason);

      reports_channel.send({embeds: [unmute_embed]}).catch(e => {});
    } catch (err) {
      f.handle_error("EMITTER unmute", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("kick", async args => {
    try {
      if (!check_args(args)) throw new Error("Недостаточно аргументов.");

      let reports_channel = await Bot.bot.channels
        .fetch(f.config.reports_channel)
        .catch(e => {
          throw new Error("Канал репортов не найден.");
        });
      if (!reports_channel) throw new Error("Канал репортов не найден.");

      let moderator = await reports_channel.guild.members.fetch(args.data.by);

      let member_id = args.user_id;
      let member = args.user;
      let {guild} = args;

      await member
        .send(
          `:hiking_boot: Вас выгнали с сервера \`${guild.name}\`\nПо причине: ${args.data.reason}\n\nСсылка для возвращения: https://discord.gg/QtwrAaJ`
        )
        .catch(e => {});

      let banned_user = await guild.members
        .kick(
          member_id,
          `Кик от ${moderator.user.tag} ID: ${moderator.user.id}: ${args.data.reason}`
        )
        .catch(e => undefined);

      banned_user = banned_user?.user || banned_user;

      let banned_embed = new Discord.MessageEmbed()
        .setDescription(":hiking_boot: Пользователь выгнан с сервера")
        .setThumbnail(
          member.displayAvatarURL
            ? member.displayAvatarURL({
                dynamic: true
              })
            : ""
        )
        .setTimestamp()
        .addField(
          ":small_blue_diamond: Пользователь",
          `${member.user.tag || "Unknown#0000"} ID: ${member.id}`
        )
        .addField(
          ":tools: Модератором",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(":pencil: За", args.data.reason);

      reports_channel.send({embeds: [banned_embed]}).catch(e => {});
    } catch (err) {
      f.handle_error("EMITTER kick", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("ban", async args => {
    try {
      if (!check_args(args)) throw new Error("Недостаточно аргументов.");

      let reports_channel = await Bot.bot.channels
        .fetch(f.config.reports_channel)
        .catch(e => {
          throw new Error("Канал репортов не найден.");
        });
      if (!reports_channel) throw new Error("Канал репортов не найден.");

      let moderator = await reports_channel.guild.members.fetch(args.data.by);

      let member_id = args.user_id;
      let member = args.user;
      let {guild} = args;

      let till =
        args.data.time === 0
          ? 0
          : new Date(new Date().getTime() + args.data.time);

      let ban_time = args.data?.time || 0;

      if (member)
        await member
          .send(
            `:hammer: Вам была выдана блокировка на сервере \`${
              guild.name
            }\`. На срок: ${
              args.data.time === 0
                ? "Навсегда"
                : `${f.time(
                    ban_time,
                    "R"
                  )}  (\`\`${till.toLocaleDateString()} ${till.toLocaleTimeString()} по МСК\`\`)\n\nСсылка для возвращения после разбана: https://discord.gg/QtwrAaJ`
            }
             \nПо причине: ${
               args.data.reason
             }\n\nЕсли хотите оспорить бан - https://discord.gg/9FrrHqYe6C`
          )
          .catch(e => {});

      let banned_user = await guild.members
        .ban(member_id, {
          reason: `Бан от ${moderator.user.tag} ID: ${moderator.user.id}: ${args.data.reason}`,
          days: 7
        })
        .catch(e => undefined);

      banned_user = banned_user?.user || banned_user;

      let users_db = args.mongo.collection("users");
      let banneds_db = args.mongo.collection("banneds");
      let ban_data =
        (await banneds_db.findOne({
          login: banned_user?.id || banned_user
        })) || {};

      let user_data =
        (await users_db.findOne({
          login: banned_user?.id || banned_user
        })) || {};

      let bans = user_data.bans || [];

      bans.push(args.data);

      user_data.bans = bans;

      let new_data = {
        login: user_data.login,
        bans
      };

      await update_data(users_db, new_data, member_id);

      let ban = {
        reason: args.data.reason,
        till: till === 0 ? 0 : till.getTime()
      };

      if (ban_data.login) ban.login = ban_data.login;

      await update_data(banneds_db, ban, args.user_id);

      let banned_embed = new Discord.MessageEmbed()
        .setDescription(":hammer: Пользователь заблокирован")
        .setColor("#EA1414")
        .setThumbnail(
          banned_user.displayAvatarURL
            ? banned_user.displayAvatarURL({
                dynamic: true
              })
            : ""
        )
        .setTimestamp()
        .addField(
          ":small_blue_diamond: Пользователь",
          `${banned_user?.tag || "Unknown#0000"} ID: ${banned_user?.id ||
            banned_user}`
        )
        .addField(
          ":tools: Модератором",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(":pencil: За", args.data.reason)
        .addField(
          ":alarm_clock: На срок:",
          args.data.time === 0 ? "Навсегда" : f.time(args.data.time)
        )
        .addField(
          ":unlock: Разбан в:",
          args.data.time === 0
            ? "Никогда"
            : `${time(
                till,
                "R"
              )} (**\`${till.toLocaleDateString()} ${till.toLocaleTimeString()} по МСК\`**)`
        );

      reports_channel.send({embeds: [banned_embed]}).catch(e => {});
    } catch (err) {
      f.handle_error("EMITTER ban", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("unban", async args => {
    try {
      if (!check_args(args)) throw new Error("Недостаточно аргументов.");

      let reports_channel = await Bot.bot.channels
        .fetch(f.config.reports_channel)
        .catch(e => {
          throw new Error("Канал репортов не найден.");
        });
      if (!reports_channel) throw new Error("Канал репортов не найден.");

      let moderator = await reports_channel.guild.members.fetch(args.data.by);
      let member_id = args.user_id;
      let unbanned_user = args.unbanned_user?.user || args.unbanned_user;
      let banneds_db = args.mongo.collection("banneds");

      banneds_db.deleteOne({
        login: member_id
      });

      let banned_embed = new Discord.MessageEmbed()
        .setDescription(":hammer: Пользователь Разблокирован")
        .setColor("#48EA14")
        .setThumbnail(
          unbanned_user?.displayAvatarURL
            ? unbanned_user.displayAvatarURL({
                dynamic: true
              })
            : ""
        )
        .setTimestamp()
        .addField(
          ":small_blue_diamond: Пользователь",
          `${unbanned_user?.tag || "Unknown#0000"} ID: ${unbanned_user?.id ||
            unbanned_user ||
            args.user_id}`
        )
        .addField(
          ":tools: Модератором",
          `${moderator} ${moderator?.user?.tag} ID: ${args.data.by}`
        )
        .addField(":pencil: Причина:", args.data.reason);

      reports_channel.send({embeds: [banned_embed]}).catch(e => {});
    } catch (err) {
      f.handle_error("EMITTER unban", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("report", async args => {
    try {
      if (!check_args(args)) throw new Error("Недостаточно аргументов.");

      let report_author = args.report_author?.user || args.report_author;
      let {channel, targetId, reason, attachments = [], type} = args.data;

      let reports_channel = Bot.bot.channels.cache.get(
        f.config.user_reports_channel
      );

      if (type === "MESSAGE") {
        let reported_message = await channel.messages.fetch(targetId);

        let moderator_roles = f.config.moderator_roles || [];

        let reason_attachments = attachments.map(
          attach => `${attach.contentType}: [Вложение](${attach.url})`
        );
        let report_embed = new Discord.MessageEmbed()
          .setColor(f.config.colorEmbed)
          .setAuthor(`Репорт сообщения:`)
          .setThumbnail(
            reported_message.author?.displayAvatarURL({dynamic: true})
          )
          .addField(
            "Автор репорта:",
            `${report_author} ${report_author.tag} ID: ${report_author.id}`
          )
          .addField(
            "Нарушитель:",
            `${reported_message?.author.tag ||
              "Unknown#0000"} ID: ${reported_message?.author.id ||
              "000000000000000000"}`
          )
          .addField("Причина:", reason || "Почему-то не указано.")
          .addField(
            "Содержание сообщения:",
            `${reported_message?.content ||
              "Пусто."}\n\n[Ссылка на сообщение](https://discord.com/channels/${
              channel.guild.id
            }/${channel.id}/${targetId})`
          )
          .addField(
            "Вложения:",
            reason_attachments[0] ? reason_attachments.join("\n") : "Нет."
          );
        reports_channel.send({
          content: moderator_roles[0]
            ? moderator_roles.map(role_id => `<@&${role_id}>`).join(", ")
            : undefined,
          embeds: [report_embed]
        });
      }

      if (type === "USER") {
        let reported_user = await channel.guild.members
          .fetch(targetId)
          .catch(e => undefined);

        let moderator_roles = f.config.moderator_roles || [];

        let reason_attachments = attachments.map(
          attach => `${attach.contentType}: [Вложение](${attach.url})`
        );
        let report_embed = new Discord.MessageEmbed()
          .setColor(f.config.colorEmbed)
          .setAuthor(`Репорт пользователя:`)
          .setThumbnail(reported_user?.user?.displayAvatarURL({dynamic: true}))
          .addField(
            "Автор репорта:",
            `${report_author} ${report_author.tag} ID: ${report_author.id}`
          )
          .addField(
            "Нарушитель:",
            `${reported_user || ""} ${reported_user?.user.tag ||
              "Unknown#0000"} ID: ${targetId}`
          )
          .addField("Причина:", reason || "Почему-то не указано.")

          .addField(
            "Вложения:",
            reason_attachments[0] ? reason_attachments.join("\n") : "Нет."
          );
        reports_channel.send({
          content: moderator_roles[0]
            ? moderator_roles.map(role_id => `<@&${role_id}>`).join(", ")
            : undefined,
          embeds: [report_embed]
        });
      }
    } catch (err) {
      f.handle_error("EMITTER report", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("time_role", async args => {
    try {
      if (!check_args(args)) throw new Error("Недостаточно аргументов.");

      let reports_channel = Bot.bot.channels.cache.get(
        f.config.reports_channel
      );

      let members = await reports_channel.guild.members
        .fetch({
          user: [args.user_id, args.data.by]
        })
        .catch(e => {
          throw new Error("Указан неправильный пользователь.");
        });
      let member = members.filter(member => member.id === args.user_id).first();

      let moderator = members
        .filter(member => member.id === args.data.by)
        .first();

      if (!member || !moderator)
        throw new Error("Указан неправильный модератор или участник.");

      let user_data = await args.mongo
        .collection("users")
        .findOne({login: args.user_id});

      let user = user_data || {};

      let timed_roles = user.timedRoles || [];

      let role_data = args.data;

      if (!role_data.id || !role_data.till)
        throw new Error("Один из аргументов роли не указан.");

      let role = {
        role: role_data.id[0],
        time: role_data.till
      };

      let same_role = timed_roles.filter(
        time_role => role.role === time_role.role
      )[0];

      if (same_role) timed_roles[timed_roles.indexOf(same_role)] = role;
      else timed_roles.push(role);

      let role_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({dynamic: true}))
        .setTitle(":calendar_spiral: Выдана временная роль:")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member} ${member.user.tag} ID: ${member.id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(
          ":round_pushpin: Роль:",
          `${role_data.id.map(role_id =>
            reports_channel.guild.roles.cache.get(role_id)
          )}`
        )
        .addField(
          ":alarm_clock: На:",
          `${role_data.time === 0 ? "Навсегда" : f.time(role_data.time)}`
        );

      member.roles
        .add(role_data.id)
        .catch(e =>
          console.log("API ERROR: Не могу выдать роль " + role_data.id)
        );

      reports_channel.send({embeds: [role_embed]});

      let guild_roles = role_data.id.map(
        role_id => reports_channel.guild.roles.cache.get(role_id)?.name
      );

      member
        .send(
          `${
            guild_roles[1]
              ? `Вам были выданы временные роли \`${guild_roles.join(", ")}\``
              : `Вам была выдана временная роль \`${guild_roles.join(", ")}\``
          }\n На срок: \`${f.time(role_data.time)}\``
        )
        .catch(e => {});
      user.timedRoles = timed_roles;

      let new_data = {
        login: user.login,
        timedRoles: timed_roles
      };
      update_data(args.mongo.collection("users"), new_data, args.user_id);
    } catch (err) {
      f.handle_error("EMITTER time_role", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("time_role_remove", async args => {
    try {
      if (!check_args(args)) throw new Error("Недостаточно аргументов.");

      let reports_channel = Bot.bot.channels.cache.get(
        f.config.reports_channel
      );

      let members = await reports_channel.guild.members
        .fetch({
          user: [args.user_id, args.data.by]
        })
        .catch(e => {
          throw new Error("Указан неправильный пользователь.");
        });
      let member =
        members.filter(member => member.id === args.user_id).first() || {};

      let moderator =
        members.filter(member => member.id === args.data.by).first() || {};

      // if (!member || !moderator)
      //   throw new Error("Указан неправильный модератор или участник.");

      let user_data = await args.mongo
        .collection("users")
        .findOne({login: args.user_id});

      let user = user_data || {};

      let timed_role = user.timedRoles || [];

      let roles_to_remove = args.data.id;

      let final_roles = timed_role.filter(
        role_data => !roles_to_remove.includes(role_data.role)
      );

      user.timedRoles = final_roles;

      member.roles.remove(roles_to_remove).catch(e => {
        console.log("API ERROR: Не могу снять роль " + roles_to_remove);
        // f.handle_error();
      });

      let guild_roles_to_remove = roles_to_remove.map(role_id =>
        reports_channel.guild.roles.cache.get(role_id)
      );

      let role_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({dynamic: true}))
        .setTitle(":calendar_spiral: Снята временная роль:")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member || "Пользователь#0000"} ${
            member?.user?.tag
          } ID: ${member?.id || member_id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator || "Пользователь#0000"} ${moderator?.user?.tag ||
            ""} ID: ${moderator?.id || ""}`
        )
        .addField(
          ":round_pushpin: Роль:",
          `${
            roles_to_remove.map
              ? guild_roles_to_remove.join(`, `)
              : reports_channel.guild.roles.cache.get(role_data) ||
                "ROLE_IS_NOT_DEFINED"
          }`
        );

      member.roles
        .remove(roles_to_remove)
        .catch(e =>
          console.log("API ERROR: Не могу снять роль " + roles_to_remove)
        );

      member
        .send(
          `${
            guild_roles_to_remove[1]
              ? `Вам были сняты временные роли \`${guild_roles_to_remove
                  .map(role => role?.name)
                  .join(", ")}\``
              : `Вам была снята временная роль \`${guild_roles_to_remove
                  .map(role => role?.name)
                  .join(", ")}\``
          }`
        )
        .catch(e => {});

      reports_channel.send({embeds: [role_embed]});

      let new_data = {
        login: user.login,
        timedRoles: final_roles
      };

      update_data(args.mongo.collection("users"), new_data, args.user_id);
    } catch (err) {
      f.handle_error("EMITTER time_role_remove", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("warn_remove", async args => {
    try {
      if (!check_args(args)) throw new Error("Один из аргументов не указан.");

      let reports_channel = await Bot.bot.channels
        .fetch(f.config.reports_channel)
        .catch(e => {
          throw new Error("Канал репортов не найден.");
        });
      if (!reports_channel) throw new Error("Канал репортов не найден.");

      let db = args.mongo.collection("users");

      let warn_data = args.data.warn_data;
      let warn_date = new Date(warn_data.date);

      let members_cache = await reports_channel.guild.members.fetch({
        id: [args.user_id, args.data.by, warn_data.by]
      });

      let member = members_cache
        .filter(member => member.id === args.user_id)
        .first();
      let moderator = members_cache
        .filter(member => member.id === args.data.by)
        .first();

      let warn_moderator = members_cache
        .filter(member => member.id === warn_data.by)
        .first();

      if (!moderator) moderator = Bot.bot;

      let warn_embed = new Discord.MessageEmbed()
        .setDescription(":warning: Снято предупреждение")
        .setThumbnail(member?.user?.avatarURL({dynamic: true}))
        .setTimestamp()
        .addField(
          ":small_blue_diamond: С Пользователя",
          `${member || ""} ${member?.user?.tag ||
            "Пользователь#0000"} ID: ${member?.id || args.user_id}`
        )
        .addField(
          ":tools: Модератором",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(
          "⚠️ Содержание предупреждения:",
          `Дата: \`${warn_date.toLocaleDateString()} ${warn_date.toLocaleTimeString()} по МСК\`\nМодератор: \`${warn_moderator
            ?.user?.tag || warn_data.by}\`\nПричина: \`${warn_data.reason}\``
        );

      reports_channel.send({embeds: [warn_embed]});
    } catch (err) {
      f.handle_error("EMITTER warn_remove", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("mute_remove", async args => {
    try {
      if (!check_args(args)) throw new Error("Один из аргументов не указан.");

      let reports_channel = await Bot.bot.channels
        .fetch(f.config.reports_channel)
        .catch(e => {
          throw new Error("Канал репортов не найден.");
        });
      if (!reports_channel) throw new Error("Канал репортов не найден.");

      let db = args.mongo.collection("users");

      let warn_data = args.data.warn_data;
      let warn_date = new Date(warn_data.date);

      let members_cache = await reports_channel.guild.members.fetch({
        id: [args.user_id, args.data.by, warn_data.by]
      });

      let member = members_cache
        .filter(member => member.id === args.user_id)
        .first();
      let moderator = members_cache
        .filter(member => member.id === args.data.by)
        .first();

      let warn_moderator = members_cache
        .filter(member => member.id === warn_data.by)
        .first();

      if (!moderator) moderator = Bot.bot;

      let warn_embed = new Discord.MessageEmbed()
        .setDescription("🔇 Снят мьют")
        .setThumbnail(member?.user?.avatarURL({dynamic: true}))
        .setTimestamp()
        .addField(
          ":small_blue_diamond: С Пользователя",
          `${member || ""} ${member?.user?.tag ||
            "Пользователь#0000"} ID: ${member?.id || args.user_id}`
        )
        .addField(
          ":tools: Модератором",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(
          "🔇 Содержание мьюта:",
          `Дата: \`${warn_date.toLocaleDateString()} ${warn_date.toLocaleTimeString()} по МСК\`\nМодератор: \`${warn_moderator
            ?.user?.tag || warn_data.by}\`\nПричина: \`${warn_data.reason}\``
        );

      reports_channel.send({embeds: [warn_embed]});
    } catch (err) {
      f.handle_error("EMITTER warn_remove", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("role", async args => {
    try {
      if (!check_args(args)) throw new Error("Недостаточно аргументов.");

      let role_data = args.data.id;

      let reports_channel = Bot.bot.channels.cache.get(
        f.config.reports_channel
      );

      let members = await reports_channel.guild.members
        .fetch({
          user: [args.user_id, args.data.by]
        })
        .catch(e => {
          throw new Error("Указан неправильный пользователь.");
        });
      let member = members.filter(member => member.id === args.user_id).first();

      let moderator = members
        .filter(member => member.id === args.data.by)
        .first();

      if (!member || !moderator)
        throw new Error("Указан неправильный модератор или участник.");

      let role_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({dynamic: true}))
        .setTitle(":calendar_spiral: Выдана роль:")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member} ${member.user.tag} ID: ${member.id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(
          ":round_pushpin: Роль:",
          `${role_data
            .map(role_id => reports_channel.guild.roles.cache.get(role_id))
            .join(", ")}`
        );

      member.roles
        .add(role_data)
        .catch(e =>
          console.log("API ERROR: Не могу выдать роль " + role_data.id)
        );

      let guild_roles = role_data.map(
        role_id => reports_channel.guild.roles.cache.get(role_id)?.name
      );

      member
        .send(
          `${
            guild_roles[1]
              ? `Вам были выданы роли \`${guild_roles.join(", ")}\``
              : `Вам была выдана роль \`${guild_roles.join(", ")}\``
          }\n На срок: \`${f.time(role_data.time)}\``
        )
        .catch(e => {});

      reports_channel.send({embeds: [role_embed]});
    } catch (err) {
      f.handle_error("EMITTER role", err, {
        emitt_data: args
      });
    }
  });

  warn_emitter.on("role_remove", async args => {
    try {
      if (!check_args(args)) throw new Error("Недостаточно аргументов.");

      let reports_channel = Bot.bot.channels.cache.get(
        f.config.reports_channel
      );

      let members = await reports_channel.guild.members
        .fetch({
          user: [args.user_id, args.data.by]
        })
        .catch(e => {
          throw new Error("Указан неправильный пользователь.");
        });
      let member = members.filter(member => member.id === args.user_id).first();

      let moderator = members
        .filter(member => member.id === args.data.by)
        .first();

      if (!member || !moderator)
        throw new Error("Указан неправильный модератор или участник.");

      let roles_to_remove = args.data.id;

      let role_embed = new Discord.MessageEmbed()
        .setThumbnail(member.user.displayAvatarURL({dynamic: true}))
        .setTitle(":calendar_spiral: Снята роль:")
        .addField(
          ":small_blue_diamond: Пользователю:",
          `${member} ${member.user.tag} ID: ${member.id}`
        )
        .addField(
          ":tools: Модератором:",
          `${moderator} ${moderator.user.tag} ID: ${moderator.id}`
        )
        .addField(
          ":round_pushpin: Роль:",
          `${
            roles_to_remove.map
              ? roles_to_remove
                  .map(role_id =>
                    reports_channel.guild.roles.cache.get(role_id)
                  )
                  .join(`, `)
              : reports_channel.guild.roles.cache.get(role_data) ||
                "ROLE_IS_NOT_DEFINED"
          }`
        );

      member.roles
        .remove(roles_to_remove)
        .catch(e =>
          console.log("API ERROR: Не могу снять роль " + roles_to_remove)
        );

      let guild_roles = roles_to_remove.id.map(
        role_id => reports_channel.guild.roles.cache.get(role_id)?.name
      );

      member
        .send(
          `${
            guild_roles[1]
              ? `Вам были выданы временные роли \`${guild_roles.join(", ")}\``
              : `Вам была выдана временная роль \`${guild_roles.join(", ")}\``
          }\n На срок: \`${f.time(role_data.time)}\``
        )
        .catch(e => {});

      reports_channel.send({embeds: [role_embed]});
    } catch (err) {
      f.handle_error("EMITTER role_remove", err, {
        emitt_data: args
      });
    }
  });

  return warn_emitter;
};
