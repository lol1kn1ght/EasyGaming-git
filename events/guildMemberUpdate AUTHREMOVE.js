module.exports = function (args, old_member, new_member) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      if (!new_member) return;

      let first_stage = "896446473175203860";
      let second_stage = "896446739035324436";
      let third_stage = "896459039867813888";

      if (
        new_member.roles.cache.get(first_stage) &&
        new_member.roles.cache.get(second_stage)
      )
        new_member.roles.remove(first_stage);
      if (
        new_member.roles.cache.get(second_stage) &&
        new_member.roles.cache.get(third_stage)
      )
        new_member.roles.remove(second_stage);

      if (
        (new_member.roles.cache.get(first_stage) ||
          new_member.roles.cache.get(second_stage)) &&
        new_member.roles.cache.get(third_stage)
      ) {
        new_member.roles.remove(second_stage);
        new_member.roles.remove(first_stage);
      }
    }
  }

  new Event(args).execute();
};
