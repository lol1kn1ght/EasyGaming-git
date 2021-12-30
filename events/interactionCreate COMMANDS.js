module.exports = function (args, interaction) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
      this.interaction = interaction;
    }

    async execute() {
      if (!this.interaction.isCommand()) return;

      let Command = this.commands.slash_commands[this.interaction.commandName];

      if (!Command) return;

      args.command_args = this.interaction.options.data || [];
      let command = new Command(args, this.interaction);
      let options = command.options;
      let allowed_roles = command.options.allowed_roles || [];
      let roles = this.interaction.member.roles.cache.filter((role) =>
        allowed_roles.includes(role.id)
      );

      if (options.permissions && options.permissions[0]) {
        let member_perms = options.permissions.filter((permission) =>
          this.interaction.member.permissions.has(permission.toUpperCase())
        );

        if (!member_perms[0]) {
          if (allowed_roles[0] && !roles.first())
            return this.noRoles(allowed_roles);
          if (!allowed_roles[0]) return this.noPermissions();
        }
      }

      if (options.custom_perms && options.custom_perms[0]) {
        if (
          options.custom_perms.includes("OWNER") &&
          this.interaction.member.id !== this.config.owner
        )
          return this.noPermissions();
      }

      if (
        options.channels &&
        options.channels[0] &&
        !options.channels?.includes(this.interaction.channelId) &&
        this.interaction.member.id !== this.config.owner
      )
        return this.noChannel(options.channels);

      try {
        command.execute();
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

    noPermissions() {
      this.interaction.reply({
        content: "У вас недостаточно прав для использования этой команды!",
        ephemeral: true,
      });
    }

    noChannel(channels = []) {
      this.interaction.reply({
        content:
          "Вы используете команду в неположенном месте!\nДоступные для использования места:\n" +
          channels
            .map((channel_id) => {
              return (
                this.interaction.guild.channels.cache.get(channel_id) || ""
              );
            })
            .join(", "),
        ephemeral: true,
      });
    }

    async noRoles(roles = []) {
      let roles_cache = this.interaction.guild.roles.cache.filter((role) =>
        roles.includes(role.id)
      );

      this.interaction.reply({
        content:
          "У вас нет разрешенной роли!\n Разрешенные роли:\n" +
          roles_cache.map((role) => `<@&${role.id}>`).join(", "),
        ephemeral: true,
      });
    }
  }

  new Event(args).execute();
};
