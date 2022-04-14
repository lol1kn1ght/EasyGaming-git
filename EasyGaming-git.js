const Discord = require("discord.js");
const { Intents } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const config = require("./config/config.json");
const { token } = require("./config/token.json");
const { MongoClient } = require("mongodb");
const { promisify } = require("util");
const mongo_config = require("./config/mongo.json");

const fs = require("fs");
let f = require("./config/modules");

const connect_mongo = promisify(MongoClient.connect);
const Client = new Discord.Client({
  intents: [Object.values(Intents.FLAGS)],
});

class Bot_builder {
  constructor() {
    this.bot = Client;
    this.Mongo = MongoClient;
    this.mongo;
    this.config = config;
    this.commands = {};
    this.slash = [];
    this.events = [];
    this._launch();
  }

  async _launch() {
    let timer = this._timer();

    await this._load_mongodb();

    await this._load_commands();

    await this._load_events();

    await this._login();

    f.warn_emitter = new f.warn_emitter(this.mongo);

    await this._load_slash();
    timer.stop();
  }

  async reload_modules() {
    let cache = require.cache[require.resolve("./config/modules")];
    if (cache) delete require.cache[require.resolve("./config/modules")];

    f = require("./config/modules");
  }

  async _load_mongodb() {
    try {
      if (mongo_config.auth) {
        let { user, pass, ip, port, db } = mongo_config;

        this.mongo = await connect_mongo(
          `mongodb://${user}:${pass}@${ip}:${port}/${db}`
        );
        console.log(`Успешно подключен к базе данных: ${ip}:27017`);
      } else {
        this.mongo = await connect_mongo(`mongodb://localhost:27017`);
        console.log(`Успешно подключен к базе данных: localhost:27017`);
      }
    } catch (e) {
      console.log("Ошибка при соединении с базой данных:");
      throw e;
    }
  }

  async _load_commands() {
    let readdir = promisify(fs.readdir);
    this.slash = [];

    let commands_dir = await readdir("./commands");
    let commands = [];

    let folders = commands_dir.filter(
      (folder_name) => !folder_name.split(".")[1]
    );

    for (let folder_name of folders) {
      let folder_stats = fs.lstatSync("./commands/" + folder_name);
      if (!folder_stats.isDirectory()) continue;

      let commands_files = await readdir("./commands/" + folder_name);
      let name = folder_name.split(" ")[0];

      let files = commands_files
        .filter((file_name) => file_name.endsWith(".js"))
        .map((file_name) => {
          return {
            command_folder: folder_name,
            command_name: file_name,
          };
        });
      if (files[0]) commands.push(...files);
    }

    let step = this._percent(commands.length, "Комманды");

    for (let command_file of commands) {
      let command_name = command_file.command_name.replace(".js", "");

      try {
        let cache =
          require.cache[
            require.resolve(
              `./commands/${command_file.command_folder}/${command_file.command_name}`
            )
          ];
        if (cache)
          delete require.cache[
            require.resolve(
              `./commands/${command_file.command_folder}/${command_file.command_name}`
            )
          ];

        let Command = require(`./commands/${command_file.command_folder}/${command_file.command_name}`);
        let command = new Command();

        let folder_name = command_file.command_folder.split(" ")[0];
        if (!this.commands[folder_name]) this.commands[folder_name] = {};

        this.commands[folder_name][command.options?.slash.name] = Command;
        
        this.slash.push(command.options?.slash);
      } catch (e) {
        console.log(`Ошибка в команде ${command_name}:`);
        console.log(e);
      }
      step();
    }
  }

  async _load_events() {
    this.bot._events = undefined;

    let readdir = promisify(fs.readdir);

    let events_dir = await readdir("./events");
    let events = events_dir.filter((event_file) => event_file.endsWith(".js"));

    let step = this._percent(events.length, "Евенты");

    for (let event_file of events) {
      let event_name = event_file.split(` `)[0].replace(".js", "");

      try {
        let cache = require.cache[require.resolve(`./events/${event_file}`)];
        if (cache)
          delete require.cache[require.resolve(`./events/${event_file}`)];

        let event = require(`./events/${event_file}`);

        let args = {
          bot: this.bot,
          commands: this.commands,
          config: this.config,
          f: f,
          mongo: this.mongo,
          db: this.mongo.db("gtaEZ"),
        };

        console.log(event_file);

        this.bot.on(event_name, event.bind(null, args));
        this.events.push(event);
      } catch (e) {
        console.log(`Ошибка в евенте ${event_name}:`);
        console.log(e);
      }
      step();
    }
  }

  async _load_slash() {
    await this._load_commands();

    let rest = new REST({
      version: "9",
    }).setToken(token);

    try {
      console.log("Начал загрузку /-команд.");
      await rest.put(
        Routes.applicationGuildCommands(this.bot.user.id, config.slash_guild),
        {
          body: this.slash,
        }
      );

      console.log("Успешно загрузил /-команды.");
    } catch (error) {
      console.log("Ошибка при загрузке /-команд:");
      console.log(error);
    }
  }

  _timer() {
    let P = ["\\", "|", "/", "-"];
    let x = 0;
    return {
      // _timer_interval: setInterval(function() {
      //   process.stdout.write("\r" + P[x++]);
      //   x &= 3;
      // }, 250),
      stop: function (params) {
        // clearInterval(this._timer_interval);

        process.stdout.write("\rЗагрузка прошла успешно!\n");
      },
    };
  }

  _percent(amount = 1, module_name = "TEST") {
    let current_step = 1;

    function next_step() {
      let current_percent = (current_step++ / amount) * 100;

      process.stdout.write(
        `\r  Загрузка модуля "${module_name}" - ${Math.floor(current_percent)}%`
      );
      if (current_percent >= 100)
        console.log(`\n  Успешно закончена загрузка модуля "${module_name}"`);
    }

    return next_step;
  }

  async _login() {
    await this.bot.login(token);
  }
}

global.Bot = new Bot_builder();
global.f = f;
