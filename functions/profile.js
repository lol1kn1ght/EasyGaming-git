const Discord = require("discord.js");

class Profile {
  constructor(db, user) {
    if (!db || !user) throw new Error("Один из аргументов не указан.");

    this.db = db;
    this.user = user;
    this._user_id = this.user?.id || this.user;

    if (!this._user_id) throw new Error("Неправильно указан пользователь.");
  }

  async fetch(filter) {
    let data = await this._get_data();

    if (filter) {
      if (!filter.push) throw new Error("Невалидный фильтр.");
      if (!filter[0]) return data;

      let new_data = {};
      filter.map(value => {
        new_data[value] = data[value] || undefined;
      });

      if (Object.values(new_data).length === 1)
        return Object.values(new_data)[0];
      else return new_data;
    } else return data;
  }

  get data() {
    if (!this._user_data)
      throw new Error("Сначала нужно кешировать данные пользователя.");

    return this._user_data;
  }

  async add_warn(args) {
    try {
      JSON.stringify(args.warn_data);
    } catch (e) {
      throw new Error("Данные варна не JSON.");
    }

    if (!args.warn_data) throw new Error("Данные варна не указаны.");
    if (!this._user_data?.login) this._user_data = await this._get_data();

    return f.warn_emitter.warn({
      user_id: this._user_id,
      warn_data: args.warn_data
    });
  }

  async mute(args) {
    try {
      JSON.stringify(args.mute_data);
    } catch (e) {
      throw new Error("Данные мьюта не JSON.");
    }

    if (!args.mute_data) throw new Error("Данные варна не указаны.");
    if (!this._user_data?.login) this._user_data = await this._get_data();

    return f.warn_emitter.mute({
      user_id: this._user_id,
      mute_data: args.mute_data
    });
  }

  async unmute(args) {
    try {
      JSON.stringify(args.unmute_data);
    } catch (e) {
      throw new Error("Данные мьюта не JSON.");
    }

    if (!args.unmute_data) throw new Error("Данные варна не указаны.");
    if (!this._user_data?.login) this._user_data = await this._get_data();

    return f.warn_emitter.unmute({
      user_id: this._user_id,
      unmute_data: args.unmute_data
    });
  }

  async _get_data() {
    let user_data = await this.db.collection("users").findOne({
      login: this._user_id
    });

    this._user_data = user_data || {};
    return this._user_data;
  }

  async update_data(data) {
    if (!data) throw new Error("Данные для изменения не указаны.");

    if (!this._user_data?.login) {
      data.login = this._user_id;
      await this.db.collection("users").insertOne(data);

      let new_data = await this._get_data();

      return new_data;
    }

    await this.db
      .collection("users")
      .updateOne({login: this._user_id}, {$set: data});

    let new_data = await this._get_data();
    return new_data;
  }
}

module.exports = Profile;
