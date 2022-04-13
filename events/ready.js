module.exports = function(args) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      console.log(`\n${Bot.bot.user.tag} Запущен успешно.`);

      ///////////////////
      const http = require("http");
      const host = '194.226.28.38';
      const port = 2281;
      const requestListener = function(req, res) {
        res.writeHead(200);
        res.end("Ok");
      };
      const server = http.createServer(requestListener);
      server.listen(port, host, () => {
        console.log(`Server is running on http://${host}:${port}`);
      });
      //////////////////
      this.bot.channels.cache.get("432890572269813760").send("Запустился");

      const fs = require("fs");
      var guild = this.bot.guilds.cache.get("314105293682376707");

      setInterval(function() {
        var online = guild.members.cache.filter(
          (member) => member.presence && member.presence.clientStatus != null
        ).size;
        var voice = guild.members.cache.filter(
          (member) => member.voice.channel
        ).size;
        var date = new Date();
        var daten = `${date.getDate()}.${
          date.getMonth() + 1
        }.${date.getFullYear()}`;
        var text = `\n[${
          date.getHours() + 3
        }:${date.getMinutes()}:${date.getSeconds()}] ${
          guild.memberCount
        }:${online}:${voice}`;
        //console.log(text);
        fs.access(`./data/stat_logs/${daten}.txt`, function(error) {
          if (error) {
            fs.appendFile(
              `./data/stat_logs/${daten}.txt`,
              `[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}] Начато логирование статистики.\n[Время] Всего:Онлайн:Подключено` +
              text,
              function(error) {
                if (error) console.log(error);
              }
            );
          } else {
            fs.appendFile(
              `./data/stat_logs/${daten}.txt`,
              text,
              function(error) {
                if (error) console.log(error);
              }
            );
          }
        });
      }, 15 * 60 * 1000);

      let muted_users = await this.db
        .collection("users")
        .find({
          "muted.is": true,
        })
        .toArray();

      for (let user of muted_users) {
        f.muted_members[user.login] = user.muted.till;
      }
    }
  }

  new Event(args).execute();
};