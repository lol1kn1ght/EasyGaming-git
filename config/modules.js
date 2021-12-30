function load_module(path) {
  if (!path) throw new Error("Путь для загрузки модуля не указан");

  let cache = require.cache[require.resolve(path)];
  if (cache) delete require.cache[require.resolve(path)];

  let module = require(path);

  return module;
}

module.exports = {
  parse_duration: load_module("parse-duration"),
  config: load_module("./config.json"),
  random: load_module("../functions/random"),
  pages: load_module("../functions/pages"),
  Profile: load_module("../functions/profile"),
  time: load_module("../functions/msToTime"),
  handle_error: load_module("../functions/handle_error"),
  discharge: load_module("../functions/numDischarge"),
  same_messages: {},
  anti_link_muted: {},
  muted_members: {},
  authoirse_members_cooldown: undefined,
  dialogues: (() => {
    let config = load_module("./config.json");
    return load_module(`../data/dialogues/${config.language}.js`);
  })(),
  warn_emitter: load_module("./Warns_emitter.js")(),
  flood: {},
  test: 50,
};
