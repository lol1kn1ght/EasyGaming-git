module.exports = function(args, member) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      let user_data = await this.mongo
        .db("gtaEZ")
        .collection("users")
        .findOne({
          login: member.id
        });

      let user = user_data || {};

      if (!user.muted?.is) return;

      member.roles
        .add(this.config.muted_role, "Возврат роли мьюта.")
        .catch(e => {});
    }
  }

  new Event(args).execute();
};
