const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const util = require('util');


const datasetsDir = process.env["DATASET_DIR"];

// ////////////////////////////////////////////////////////////////////////////////////////
// file printing
// /////////////////////////////////////////////////////////////////////////////////////////
function printToFile(data, file = `info.txt`) {
  // const file = typeof file !== 'undefined' ? file : `${appDir}/info.txt`;
  util.promisify(fs.appendFile)(file, util.inspect(data));
}

function clearFile(file = `info.txt`) {
  // var file = typeof file !== 'undefined' ? file : `${appDir}/info.txt`;
  return util.promisify(fs.truncate)(file, 0);
}

// Convert into Promise
const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);

// /////////////////////////////////////////////////////////////////////////////////////////
// trace
// /////////////////////////////////////////////////////////////////////////////////////////
function stringToTelegram(my_str, length = 2000) {
  if (my_str.length <= length * 2) {
    return my_str;
  }
  return (
    my_str.substr(0, length) +
    "...\n" +
    my_str.substr(my_str.length - length, my_str.length)
  );
}

function sendMessageToTelegram(msg) {
  const myId = process.env.TELEGRAM_ID;
  const token = process.env.TELEGRAM_SNT_TOKEN;

  const bot = new TelegramBot(token);
  let msg_to_send = stringToTelegram(msg);
  bot.sendMessage(myId, msg_to_send);
}

function traceInfo(msg, res) {
  let msgStr = msg;
  if (typeof msg === "object") {
    msgStr = String(util.inspect(msg));
  }

  res.set("Content-Type", "application/json");
  res.send(msgStr);
  printToFile(msgStr);
  sendMessageToTelegram(msgStr);

  return msgStr;
}


module.exports.datasetsDir = datasetsDir;
module.exports.readFile = readFile;
module.exports.readdir = readdir;

module.exports.printToFile = printToFile;
module.exports.clearFile = clearFile;

module.exports.sendMessageToTelegram = sendMessageToTelegram;
module.exports.traceInfo = traceInfo;
