module.exports = exports = function(number) {
  try {


    if (!number && number !== 0) return new Error(`Аргумент не является числом`)
    if (!Number.isInteger(number)) return new Error(`Аргумент не является числом`)
    // if (number === 0) return 0
    number = number + ``
    var outrez = number.replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ');
    return outrez

  } catch (e) {
    return e.message
  }
};