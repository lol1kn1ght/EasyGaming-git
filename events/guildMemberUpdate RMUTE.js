module.exports = function (args, old_member, new_member) {
  class Event {
    constructor(args) {
      Object.assign(this, args);
    }

    async execute() {
      (async () => {
        if (!(new_member.id in f.muted_members)) return;

        let till = f.muted_members[new_member.id];

        if (new Date().getTime() > till) return;

        if (!new_member.roles.cache.has(this.config.muted_role))
          new_member.roles.add(this.config.muted_role);
      })();

      (async () => {
        if (!(new_member.id in f.muted_members)) return;

        let till = f.muted_members[new_member.id];

        if (new Date().getTime() > till) return;

        let new_role = new_member.roles.cache.filter(
          (role) => !old_member.roles.cache.has(role.id)
        );

        let new_roles_filtred = new_role.filter(
          (role) => role.id != this.config.muted_role
        );

        if (new_roles_filtred.first())
          new_member.roles.remove(new_roles_filtred);
      })();
    }
  }

  new Event(args).execute();
};
