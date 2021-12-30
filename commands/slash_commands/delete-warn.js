const { Command_template } = require("../../config/templates");
const Discord = require("discord.js");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);
    this.current_page = 0;

    this.cooldown = {
      till: 0,
      count: 1,
    };
    this.menu = new Discord.MessageSelectMenu()
      .setCustomId(`${this.current_page}_delete-warn`)
      .setPlaceholder("Выберите номер предупреждения что бы удалить его:")
      .setMinValues(1)
      .setMaxValues(1);

    this.prev_page = new Discord.MessageButton({
      type: "BUTTON",
      label: "Назад",
      customId: "prev_page",
      style: 1,
      disabled: true,
    });
    this.next_page = new Discord.MessageButton({
      type: "BUTTON",
      label: "Вперед",
      customId: "next_page",
      style: 1,
      disabled: false,
    });

    this.stop_button = new Discord.MessageButton({
      type: "BUTTON",
      label: "Закрыть",
      customId: "close_page",
      style: 2,
      disabled: false,
    });

    this.options = {
      permissions: ["ADMINISTRATOR"],
      custom_perms: [],
      allowed_roles: ["468374000947560459", "596307104802013208"],
      slash: {
        name: "delete-warn",
        description:
          "Снять какому-либо участнику предупреждение. [Смотритель+]",
        options: [
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
      let member = this.command_args.filter(
        (arg) => arg.name === "упоминание"
      )[0]?.member;

      let member_id = member?.id;

      if (!member) {
        member_id = this.command_args.filter((arg) => arg.name === "айди")[0]
          ?.value;

        if (!member_id) return this.msgFalseH("Вы не указали участника.");

        member = await this.interaction.guild.members
          .fetch(member_id)
          .catch((e) => undefined);
      }

      if (!member_id) return this.msgFalseH("Вы не указали участника.");

      this.member_id = member_id;

      if (member) {
        this.member = member;

        if (member?.user.bot || member?.user.id === this.interaction.member.id)
          return this.msgFalseH(
            "Вы указали неверного участника для снятия предупреждения."
          );

        if (
          member.roles.highest.position >=
          this.interaction.member.roles.highest.position
        )
          return this.msgFalseH(
            "Вы не можете снимать предупреждения этому участнику."
          );
      }

      let profile = new f.Profile(this.db, member || member_id);
      this.profile = profile;

      let profile_data = (await profile.fetch()) || {};
      this.profile_data = profile_data;

      let warns = profile_data.warns || [];

      if (!warns[0])
        return this.msgFalseH(
          "Выбранный пользователь не имеет предупреждений."
        );

      let embeds = await this.render_embed();

      if (!embeds[0])
        return this.msgFalseH(
          `У пользователя \`${member?.user?.tag || member_id}\` нет варнов.`
        );

      let menu = this.menu.addOptions(...this.menus[this.current_page]);

      let buttons_row = new Discord.MessageActionRow();

      if (embeds[1]) buttons_row.addComponents(this.prev_page, this.next_page);
      buttons_row.addComponents(this.stop_button);

      let menus_row = new Discord.MessageActionRow().addComponents(menu);

      this.message = await this.interaction.reply({
        embeds: [embeds[0]],
        fetchReply: true,
        components: [menus_row, buttons_row],
      });
      this.pages = embeds;

      this.create_menu();
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

  async render_embed() {
    try {
      this.profile_data = await this.profile.fetch();
      let warns = this.profile_data.warns || [];
      let pages = [];
      let count = 1;
      let current_page = 0;
      let warn_id = 1;
      let menus = [];
      this.menus = menus;
      let warns_ids = {};
      this.warns_ids = warns_ids;
      let warns_moderators = [...new Set(warns.map((warn) => warn.by))];

      let cache = await this.interaction.guild.members.fetch({
        user: warns_moderators,
      });

      for (let warn of warns) {
        let moderator = cache.filter((member) => member.id === warn.by).first();

        let text = `\n\`\`\`js\nНомер: ${warn_id}\nМодератор: ${moderator.user.tag}\nПричина: ${warn.reason}\n\`\`\`\n`;

        let current_menu = {
          label: `Удалить предупреждение ${warn_id}`,
          description: `Удалить предупреждение с номером ${warn_id}`,
          value: `delete_${warn_id}`,
        };

        if (pages[current_page])
          pages[current_page] = pages[current_page] + text;
        else pages[current_page] = text;

        warns_ids[warn_id] = warn;

        if (menus[current_page]) menus[current_page].push(current_menu);
        else menus[current_page] = [current_menu];

        if (count >= 1) {
          current_page++;
          count = 0;
        }
        warn_id++;
        count++;
      }

      let embeds = [];
      let page = 1;
      current_page = 1;

      for (let page of pages) {
        embeds.push(
          new Discord.MessageEmbed({
            color: f.config.colorEmbed,
            author: {
              icon_url: this.member?.user.displayAvatarURL(),
              name: `⚠️ Список предупреждений - ${
                this.member?.user.tag || this.member_id
              }`,
            },
            description: page,
            footer: {
              text: `Страница ${current_page++} из ${
                pages.length === 0 ? 1 : pages.length
              }. Всего показано - ${warns.length}`,
            },
          })
        );
        page++;
      }

      return embeds;
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

  async create_menu() {
    let filter = (button) => button.user.id === this.interaction.member.id;

    let collector = this.message.createMessageComponentCollector({
      filter,
      time: 180000,
    });

    collector.on("end", () => {
      this.interaction.editReply({
        components: [],
      });
    });

    collector.on("collect", async (button) => {
      let current_time = new Date().getTime();

      if (this.cooldown.count >= 3) {
        this.cooldown.count = 0;
        this.cooldown.till = current_time + 2000;
      }

      if (this.cooldown.till > current_time) {
        await this.updateButton(button);
        await this.msgFalseH("Не так часто! Подождите еще пару секунд.");
        return;
      }

      if (this.cooldown.till < current_time) {
        this.cooldown.till = 0;
      }

      this.cooldown.count++;

      if (button.isButton()) {
        let pages_count = this.pages.length - 1;

        switch (button.customId) {
          case "next_page":
            {
              if (this.current_page + 1 > pages_count)
                return this.updateButton(button);

              if (this.current_page === 0) this.prev_page.disabled = false;

              this.current_page++;

              let row = new Discord.MessageActionRow();

              if (this.current_page === pages_count) {
                this.next_page.disabled = true;
              }

              this.menu.options = [];
              let menu = this.menu
                .setCustomId(`${this.current_page}_delete_warn`)
                .addOptions(...this.menus[this.current_page]);

              let menu_row = new Discord.MessageActionRow().addComponents(menu);
              row.addComponents(
                this.prev_page,
                this.next_page,
                this.stop_button
              );

              this.interaction.editReply({
                embeds: [this.pages[this.current_page]],
                components: [menu_row, row],
              });
              this.updateButton(button);
            }
            break;
          case "prev_page":
            {
              if (this.current_page - 1 < 0) return this.updateButton(button);

              if (this.current_page === pages_count)
                this.next_page.disabled = false;

              this.current_page--;

              let row = new Discord.MessageActionRow();

              if (this.current_page === 0) this.prev_page.disabled = true;

              this.menu.options = [];
              let menu = this.menu
                .setCustomId(`${this.current_page}_delete_warn`)
                .addOptions(...this.menus[this.current_page]);

              let menu_row = new Discord.MessageActionRow().addComponents(menu);
              row.addComponents(
                this.prev_page,
                this.next_page,
                this.stop_button
              );

              await this.interaction.editReply({
                embeds: [this.pages[this.current_page]],
                components: [menu_row, row],
              });
              await this.updateButton(button);
            }
            break;
          case "close_page":
            button.update({
              components: [],
            });
            collector.stop();
            break;
        }
      }

      if (button.isSelectMenu()) {
        let warn_id = Number(button.values[0]?.split("_")[1]);

        f.warn_emitter.emit("warn_remove", {
          user_id: this.member?.id || this.member_id,
          mongo: this.db,
          data: {
            by: this.interaction.user.id,
            warn_data: this.warns_ids[warn_id],
          },
        });

        if (warn_id in this.warns_ids) {
          delete this.warns_ids[warn_id];
        }

        let warns = Object.values(this.warns_ids) || [];

        this.updateButton(button);

        this.current_page = 0;

        this.prev_page.disabled = true;
        this.next_page.disabled = false;

        this.msgH(`Вы успешно удалили предупреждение \`#${warn_id}\`.`);

        await this.profile.update_data({
          warns: warns,
        });

        this.pages = await this.render_embed();

        let buttons_row = new Discord.MessageActionRow();

        if (this.pages[1])
          buttons_row.addComponents(this.prev_page, this.next_page);
        buttons_row.addComponents(this.stop_button);

        this.menu.options = [];
        let menu = this.menu.addOptions(
          ...(this.menus[this.current_page] || [])
        );
        let menus_row = new Discord.MessageActionRow().addComponents(menu);

        if (!this.pages[this.current_page]) {
          if (this.pages[0]) {
            this.interaction.editReply({
              embeds: [this.pages[0]],
              components: [menus_row, buttons_row],
            });
          }

          if (!this.pages[0]) {
            this.interaction.editReply({
              content: "Участник больше не имеет предупреждений.",
              embeds: [],
              components: [],
            });
            collector.stop();
            return;
          }
        } else {
          this.interaction.editReply({
            embeds: [this.pages[this.current_page]],
            components: [menus_row, buttons_row],
          });
        }
      }
    });
  }

  async updateButton(button, row) {
    return button.update({
      components: row ? row : undefined,
    });
  }
}

module.exports = Command;
