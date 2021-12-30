module.exports = exports = function(time) {
  try {
    if (!time) throw new Error("Время не передано");

    var diff = time;

    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor(diff / (1000 * 60 * 60));
    var mins = Math.floor(diff / (1000 * 60));
    var secs = Math.floor(diff / 1000);

    var d = days;
    var h = hours - days * 24;
    var m = mins - hours * 60;
    var s = secs - mins * 60;

    var toTime = `${
      d === 0
        ? `${
            h === 0
              ? `${
                  m === 0
                    ? `${s === 0 ? `` : `${s} секунд(ы)`}`
                    : `${m} минут(ы) ${s === 0 ? `` : `${s} секунд(ы)`}`
                }`
              : `${h} часа(ов) ${m === 0 ? `` : `${m} минут(ы)`} ${
                  s === 0 ? `` : `${s} секунд(ы)`
                }`
          }`
        : `${d} день(ей) ${h === 0 ? "" : `${h} часа(ов)`} ${
            m === 0 ? `` : `${m === 0 ? `` : `${m} минут(ы)`}`
          }`
    }`;

    return toTime;
  } catch (e) {
    return e.message;
  }
};
