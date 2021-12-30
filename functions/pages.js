const Discord = require("discord.js");

module.exports = function (args) {
  if (!args || typeof args != "object")
    throw new Error("Аргументы не переданы");

  if (!args.pages || !args.interaction || !args.filter)
    throw new Error("Один из аргументов не передан.");

  class Pages {
    constructor(args) {
      Object.assign(this, args);
      this.current_page = 0;
      this.menu_message;
      this.prev_page = new Discord.MessageButton({
        type: "BUTTON",
        label: "Назад",
        customId: "prev_page",
        style: "PRIMARY",
        disabled: true,
      });
      this.next_page = new Discord.MessageButton({
        type: "BUTTON",
        label: "Вперед",
        customId: "next_page",
        style: "PRIMARY",
        disabled: false,
      });
    }

    async setup() {
      let row = new Discord.MessageActionRow();

      row.addComponents(this.prev_page, this.next_page);

      let menu = await this.interaction.reply({
        embeds: [this.pages[this.current_page]],
        components: this.pages[1] ? [row] : undefined,
        fetchReply: true,
      });

      if (!this.pages[1]) return menu;
      this.menu = menu;
      this.collectComponents();

      return menu;
    }

    async collectComponents() {
      let menu = this.menu;

      let filter = (interaction) => {
        return interaction.message.id && filter(interaction);
      };

      let collector = this.menu.createMessageComponentCollector({
        filter,
        time: 180000,
      });

      collector.on("collect", async (button) => {
        if (!button.isButton()) return;
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

              row.addComponents(this.prev_page, this.next_page);

              this.interaction.editReply({
                embeds: [this.pages[this.current_page]],
                components: [row],
              });
              this.updateButton(button, row);
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

              row.addComponents(this.prev_page, this.next_page);

              await this.interaction.editReply({
                embeds: [this.pages[this.current_page]],
                components: [row],
              });
              await this.updateButton(button, row);
            }
            break;
          default:
        }
      });

      collector.on("end", () => this.interaction.editReply({ components: [] }));
    }

    async updateButton(button, row) {
      return button.update({
        components: row ? [row] : undefined,
      });
    }
  }

  return new Pages(args).setup();
};
