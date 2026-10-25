// Errors that carry a status the error middleware sends as-is.
function httpError(status, message, extra) {
  return Object.assign(new Error(message), { status, ...extra });
}

module.exports = { httpError };
