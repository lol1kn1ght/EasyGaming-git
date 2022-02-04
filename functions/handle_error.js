module.exports = function handle_error(error, place_name, options = {}) {
  let errors_channel = Bot.bot.channels.cache.get(f.config.errorsChannel);
  let err_text = `⚠️ Возникла ошибка в \`${place_name}\`: \`${error}\``;

  if (options.emit_data)
    err_text += `\n\n Параметры запроса: \`${JSON.stringify(
      options.emit_data
    )}\``;

  if (!errors_channel) {
    let owner = Bot.bot.users.cache.get(f.config.owner);

    owner.send(`Канал с ошибками не указан!\n` + err_text);

    return;
  }

  console.log(error);
  errors_channel.send(err_text);
};
