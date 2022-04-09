const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");
const { read } = require("fs");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);

    this.options = {
      permissions: [],
      custom_perms: [],
      allowed_roles: [],
      slash: {
        name: "reset-gold",
        description: "Очистить все золото на сервере",
      },
    };
  }

  async execute() {
    try {
      let users_db = this.db.collection("users");
      let users_data = await users_db
        .find(
          {
            gold: {
              $gt: 0,
            },
          },
          {
            projection: {
              _id: 0,
              gold: 1,
              login: 1,
            },
          }
        )
        .toArray();

      if (!users_data[0])
        return this.msgFalse("Список участников с золотом пуст.");

      let ready_users = [];

      let result_message = await this.interaction.editReply({
        content: `Обработано \`${ready_users.length}\` из \`${users_data.length}\` человек.`,
        fetchReply: true,
      });

      let timer = setInterval(() => {
        if (ready_users.length != users_data.length)
          result_message.edit(
            `Удалено \`${ready_users.length}\` из \`${users_data.length}\` человек.`
          );
        else {
          result_message.edit(
            `Удаление завершено. Удалено \`${ready_users.length}\` из \`${users_data.length}\` человек.`
          );
          clearInterval(timer);
        }
      }, 2000);

      for (let user of users_data) {
        await users_db.updateOne(
          {
            login: user.login,
          },
          {
            $set: {
              gold: 0,
            },
          }
        );

        ready_users.push(user);
      }
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.slash.name}`);
    }
  }
}

module.exports = Command;
