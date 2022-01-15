const {Command_template} = require("../../config/templates");
const Discord = require("discord.js");

class Command extends Command_template {
  constructor(args, interaction) {
    super(interaction);
    Object.assign(this, args);
    this.current_page = 0;
    this.curr_category;
    this.current_pages;

    this.warns_menu;
    this.mutes_menu;

    this.warns = [];
    this.mutes = [];

    this.max_page = 5;

    this.cooldown = {
      till: 0,
      count: 1
    };

    this.prev_page = new Discord.MessageButton({
      type: "BUTTON",
      label: "Назад",
      customId: "prev_page",
      style: 1,
      disabled: true
    });
    this.next_page = new Discord.MessageButton({
      type: "BUTTON",
      label: "Вперед",
      customId: "next_page",
      style: 1,
      disabled: false
    });

    this.stop_button = new Discord.MessageButton({
      type: "BUTTON",
      label: "Закрыть",
      customId: "close_page",
      style: 2,
      disabled: false
    });

    this.options = {
      permissions: ["ADMINISTRATOR"],
      custom_perms: [],
      allowed_roles: ["468374000947560459", "596307104802013208"],
      slash: {
        name: "delete-punishment",
        description:
          "Снять какому-либо участнику предупреждение. [Смотритель+]",
        options: [
          {
            name: "упоминание",
            description: "ЛИБО Упоминание участника",
            type: 6,
            required: false
          },
          {
            name: "айди",
            description: "ЛИБО Айди участника",
            type: 3,
            required: false
          }
        ]
      }
    };
  }

  async execute() {
    try {
      let member = this.command_args.filter(arg => arg.name === "упоминание")[0]
        ?.member;

      let member_id = member?.id;

      if (!member) {
        member_id = this.command_args.filter(arg => arg.name === "айди")[0]
          ?.value;

        if (!member_id) return this.msgFalseH("Вы не указали участника.");

        member = await this.interaction.guild.members
          .fetch(member_id)
          .catch(e => undefined);
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

      this.get_data();
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.name}`);
    }
  }

  async get_data() {
    try {
      let users_db = this.db.collection("users");
      let user_data = await users_db.findOne({
        login: this.member.id
      });

      this.warns = user_data?.warns || [];
      this.mutes = user_data?.mutes || [];

      this.user_data = user_data;

      await this.get_warns();
      await this.get_mutes();

      this.send_panel();
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.name}`);
    }
  }

  async get_warns() {
    try {
      let user_data = this.user_data;

      if (!user_data)
        return this.msgFalseH(
          `Участник ${this.member.user.tag} не имеет предупреждений или наказаний`
        );

      let warns = this.warns;

      let warns_pages = [];
      let warns_menu_button = [];

      let warn_page_text = "";
      let position = 1;
      let current_page = 0;
      let num = 1;
      let total_warn_pos = 0;

      for (let warn of warns) {
        let moderator = await this.interaction.guild.members
          .fetch(warn.by)
          .catch(err => undefined);

        let warn_date = new Date(warn.date);

        let warn_text = `\`\`\`js\n${position}. Модератор: ${moderator?.user
          ?.tag || "Пользователь#0000"} ID: ${warn.by}\nПричина: ${
          warn.reason
        }\nДата: ${warn_date.toLocaleDateString()} ${warn_date.toLocaleTimeString()}\`\`\`\n\n`;

        if (warns_pages[current_page]) warns_pages[current_page] += warn_text;
        else warns_pages[current_page] = warn_text;

        let warn_menu_button = {
          label: `Удалить предупреждение ${position}`,
          description: `Удалить предупреждение с номером ${position}`,
          value: `delete-warn_${total_warn_pos++}`
        };

        if (warns_menu_button[current_page])
          warns_menu_button[current_page].push(warn_menu_button);
        else warns_menu_button[current_page] = [warn_menu_button];

        num++;
        position++;

        if (num > this.max_page) {
          num = 0;
          current_page++;
        }
      }

      let warns_menu_pages = [];

      for (let i = 0; i < warns_pages.length; i++) {
        warns_menu_pages.push({
          page_text: warns_pages[i],
          menu_buttons: warns_menu_button[i]
        });
      }

      this.warns_menu = warns_menu_pages;

      return this.warns_menu;
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.name}`);
    }
  }

  async get_mutes() {
    try {
      let user_data = this.user_data;

      if (!user_data)
        return this.msgFalseH(
          `Участник ${this.member.user.tag} не имеет предупреждений или наказаний`
        );

      let mutes = this.mutes;

      let mutes_pages = [];
      let mutes_menu_button = [];

      let position = 1;
      let current_page = 0;
      let num = 1;
      let total_mute_pos = 0;

      for (let mute of mutes) {
        let moderator = await this.interaction.guild.members
          .fetch(mute.by)
          .catch(err => undefined);

        let mute_date = new Date(mute.date);

        let mute_text = `\`\`\`js\n${position}. Модератор: ${moderator?.user
          ?.tag || "Пользователь#0000"} ID: ${mute.by}\nПричина: ${
          mute.reason
        }\nНа сколько выдан: ${f.time(
          mute.time
        )}\nДата: ${mute_date.toLocaleDateString()} ${mute_date.toLocaleTimeString()}\`\`\`\n\n`;

        if (mutes_pages[current_page]) mutes_pages[current_page] += mute_text;
        else mutes_pages[current_page] = mute_text;

        let mute_menu_button = {
          label: `Удалить мьют ${position}`,
          description: `Удалить мьют с номером ${position}`,
          value: `delete-mute_${total_mute_pos++}`
        };

        if (mutes_menu_button[current_page])
          mutes_menu_button[current_page].push(mute_menu_button);
        else mutes_menu_button[current_page] = [mute_menu_button];

        num++;
        position++;

        if (num > this.max_page) {
          num = 0;
          current_page++;
        }
      }

      let mutes_menu_pages = [];

      for (let i = 0; i < mutes_pages.length; i++) {
        mutes_menu_pages.push({
          page_text: mutes_pages[i],
          menu_buttons: mutes_menu_button[i]
        });
      }

      this.mutes_menu = mutes_menu_pages;

      return this.mutes_menu;
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.name}`);
    }
  }

  async send_panel() {
    try {
      let panel_embed = new Discord.MessageEmbed()
        .setTitle(`Снять накзания с ${this.member.user.tag}:`)
        .setDescription(
          `Данный участник имеет:\n :warning: ${this.warns.length} предупреждений\n :mute: ${this.mutes.length} мьютов\n\nС помощью кнопок ниже выберите что вы хотите снять:`
        )
        .setColor(f.config.colorEmbed)
        .setThumbnail(this.member.user.displayAvatarURL({dynamic: true}))
        .setTimestamp();

      let warns_button = new Discord.MessageButton({
        type: "BUTTON",
        label: "⚠️ Предупреждения",
        customId: "toggle_warns",
        style: 1,
        disabled: false
      });

      let mutes_button = new Discord.MessageButton({
        type: "BUTTON",
        label: "🔇 Мьюты",
        customId: "toggle_mutes",
        style: 1,
        disabled: false
      });

      if (!this.default_buttons()[0])
        return this.msgFalseH(
          `Участник ${this.member.user.tag} не имеет наказаний.`
        );

      let components_row = new Discord.MessageActionRow().addComponents(
        ...this.default_buttons()
      );

      let menu_message = await this.interaction.reply({
        embeds: [panel_embed],
        components: [components_row],
        fetchReply: true
      });

      this.menu_message = menu_message;

      let collector = menu_message.createMessageComponentCollector({
        filter: button => button.user.id === this.interaction.user.id,
        time: 180000
      });

      this.collector = collector;

      this.listen_collector();
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.name}`);
    }
  }

  listen_collector() {
    this.collector.on("collect", async interaction => {
      try {
        if (interaction.isButton()) {
          let button = interaction;

          switch (button.customId) {
            case "toggle_warns":
              if (this.curr_category === "warns") {
                button.update({embeds: [button.message.embeds]});
                return;
              }

              this.toggle_warns(button);
              break;

            case "toggle_mutes":
              if (this.curr_category === "mutes") {
                button.update({embeds: [button.message.embeds]});
                return;
              }

              this.toggle_mutes(button);
              break;

            case "prev_page":
              this.change_prev_page(button);
              break;

            case "next_page":
              this.change_next_page(button);
              break;
            default:
          }
        }

        if (interaction.isSelectMenu()) {
          let select = interaction;

          let select_args = select.values[0].split("_");

          let method = select_args[0];
          let id = Number(select_args[1]);

          switch (method) {
            case "delete-warn":
              let removed_warn = this.warns.splice(id, 1);

              this.update_data({warns: this.warns});

              f.warn_emitter.emit("warn_remove", {
                user_id: this.member?.id || this.member_id,
                mongo: this.db,
                data: {
                  by: this.interaction.user.id,
                  warn_data: removed_warn[0]
                }
              });

              if (this.mutes.length === 0 && this.warns.length === 0) {
                select.update({
                  embeds: [],
                  components: [],
                  content: `Участник ${this.member.user.tag} не имеет нарушений`
                });

                return;
              }

              if (this.warns.length === 0) {
                return this.toggle_mutes(select);
              }

              await this.get_warns();
              await this.toggle_warns(select);
              break;
            case "delete-mute":
              let removed_mute = this.mutes.splice(id, 1);

              f.warn_emitter.emit("mute_remove", {
                user_id: this.member?.id || this.member_id,
                mongo: this.db,
                data: {
                  by: this.interaction.user.id,
                  mute_data: removed_mute[0]
                }
              });

              this.update_data({mutes: this.mutes});

              if (this.mutes.length === 0 && this.warns.length === 0) {
                select.update({
                  embeds: [],
                  components: [],
                  content: `Участник ${this.member.user.tag} не имеет нарушений`
                });

                return;
              }

              if (this.mutes.length === 0) {
                return this.toggle_warns(select);
              }

              await this.get_mutes();
              await this.toggle_mutes(select);
              break;
            default:
          }
        }
      } catch (err) {
        f.handle_error(err, `/-команда ${this.options.name}`);
      }
    });

    this.collector.on("end", () => {
      this.menu_message.delete();
    });
  }

  change_prev_page(button) {
    try {
      if (!this.curr_category) return;

      if (this.current_page - 1 < 0) return;

      --this.current_page;

      let new_page = this.current_pages[this.current_page];

      this.prev_page.disabled = this.current_page <= 0;
      this.next_page.disabled =
        this.current_page === this.current_pages.length - 1;

      let new_buttons = [
        this.prev_page,
        this.default_buttons(),
        this.next_page
      ];
      let new_buttons_row = new Discord.MessageActionRow().addComponents(
        ...new_buttons
      );

      let old_menu = button.message.components[1].components[0];
      old_menu.options = [];
      old_menu.addOptions(...new_page.menu_buttons);
      let new_menu_row = new Discord.MessageActionRow().addComponents(old_menu);

      let new_menu = new Discord.MessageSelectMenu()
        .setCustomId(`${this.current_page}`)
        .setPlaceholder(old_menu.placeholder)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(...new_page.menu_buttons);

      this.current_embed
        .setDescription(new_page.page_text)
        .setFooter(
          `Страница ${this.current_page + 1} из ${this.current_pages.length}`
        );

      button.update({
        embeds: [this.current_embed],
        components: [new_buttons_row, new_menu_row]
      });
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.name}`);
    }
  }

  change_next_page(button) {
    try {
      if (!this.curr_category) return;
      if (this.current_page + 1 > this.current_pages.length - 1) return;

      ++this.current_page;

      let new_page = this.current_pages[this.current_page];

      this.prev_page.disabled = this.current_page <= 0;
      this.next_page.disabled =
        this.current_page === this.current_pages.length - 1;

      let new_buttons = [
        this.prev_page,
        this.default_buttons(),
        this.next_page
      ];
      let new_buttons_row = new Discord.MessageActionRow().addComponents(
        ...new_buttons
      );

      let old_menu = button.message.components[1].components[0];
      old_menu.options = [];
      old_menu.addOptions(...new_page.menu_buttons);
      let new_menu_row = new Discord.MessageActionRow().addComponents(old_menu);

      let new_menu = new Discord.MessageSelectMenu()
        .setCustomId(`${this.current_page}`)
        .setPlaceholder(old_menu.placeholder)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(...new_page.menu_buttons);

      this.current_embed
        .setDescription(new_page.page_text)
        .setFooter(
          `Страница ${this.current_page + 1} из ${this.current_pages.length}`
        );
      button.update({
        embeds: [this.current_embed],
        components: [new_buttons_row, new_menu_row]
      });
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.name}`);
    }
  }

  toggle_mutes(button) {
    try {
      this.curr_category = "mutes";

      this.current_page = 0;

      let current_mutes_page = this.mutes_menu;

      this.current_pages = current_mutes_page;

      this.prev_page.disabled = this.current_page <= 0;
      this.next_page.disabled =
        this.current_page === this.current_pages.length - 1;

      let new_buttons = new Discord.MessageActionRow().addComponents(
        ...[this.prev_page, ...this.default_buttons(), this.next_page]
      );

      let new_menu = new Discord.MessageSelectMenu()
        .setCustomId(`${this.current_page}_delete-mute`)
        .setPlaceholder(`Выберите номер мьюта что бы удалить его:`)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(...current_mutes_page[this.current_page].menu_buttons);

      let menu_row = new Discord.MessageActionRow().addComponents(new_menu);

      let new_embed = new Discord.MessageEmbed()
        .setTitle(`Снять мьюты с ${this.member.user.tag}:`)
        .setDescription(current_mutes_page[this.current_page].page_text)
        .setThumbnail(this.member.user.displayAvatarURL({dynamic: true}))
        .setTimestamp()
        .setColor(f.config.colorEmbed)
        .setFooter(
          `Страница ${this.current_page + 1} из ${this.current_pages.length}`
        );

      this.current_embed = new_embed;

      button.update({
        embeds: [new_embed],
        components: [new_buttons, menu_row]
      });
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.name}`);
    }
  }

  toggle_warns(button) {
    try {
      this.current_page = 0;

      this.curr_category = "warns";

      let current_warn_page = this.warns_menu;

      this.current_pages = current_warn_page;

      this.prev_page.disabled = this.current_page <= 0;
      this.next_page.disabled =
        this.current_page === this.current_pages.length - 1;

      let new_buttons = new Discord.MessageActionRow().addComponents(
        ...[this.prev_page, ...this.default_buttons(), this.next_page]
      );

      let new_menu = new Discord.MessageSelectMenu()
        .setCustomId(`${this.current_page}_delete-warn`)
        .setPlaceholder(`Выберите номер предупреждения что бы удалить его:`)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(...current_warn_page[this.current_page].menu_buttons);

      let menu_row = new Discord.MessageActionRow().addComponents(new_menu);

      let new_embed = new Discord.MessageEmbed()
        .setTitle(`Снять предупреждения с ${this.member.user.tag}:`)
        .setDescription(current_warn_page[this.current_page].page_text)
        .setThumbnail(this.member.user.displayAvatarURL({dynamic: true}))
        .setTimestamp()
        .setColor(f.config.colorEmbed)
        .setFooter(
          `Страница ${this.current_page + 1} из ${this.current_pages.length}`
        );

      this.current_embed = new_embed;

      button.update({
        embeds: [new_embed],
        components: [new_buttons, menu_row]
      });
    } catch (err) {
      f.handle_error(err, `/-команда ${this.options.name}`);
    }
  }
  update_data(new_data = {}) {
    let users_db = this.db.collection("users");

    users_db.updateOne(
      {
        login: this.member.id
      },
      {
        $set: new_data
      }
    );
  }

  default_buttons() {
    let buttons_arr = []; //[warns_button, mutes_button]

    if (this.warns.length != 0) {
      buttons_arr.push(
        new Discord.MessageButton({
          type: "BUTTON",
          label: "⚠️ Предупреждения",
          customId: "toggle_warns",
          style: 1,
          disabled: false
        })
      );
    }

    if (this.mutes.length != 0) {
      buttons_arr.push(
        new Discord.MessageButton({
          type: "BUTTON",
          label: "🔇 Мьюты",
          customId: "toggle_mutes",
          style: 1,
          disabled: false
        })
      );
    }

    return buttons_arr;
  }
}

module.exports = Command;
