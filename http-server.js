const csv = require('csvtojson');
const rp = require('request-promise');
const express = require('express');
const moment = require('moment');
const hf = require('./helper-functions');


hf.clearFile();

var AuthTokens = {};
AuthTokens[process.env.SELF_TOKEN] = "myself";
AuthTokens[process.env.VTI_TOKEN] = "VTI_data";
AuthTokens[process.env.GUEST_TOKEN] = "guest";
// const AuthTokens = { process.env.SELF_TOKEN : 'myself', process.env.VTI_TOKEN : 'VTI_data', process.env.GUEST_TOKEN : 'guest' };
const socialPlatforms = [
  "Reddit",
  "Twitter",
  "OK",
  "Google Play",
  "windows10",
  "apple",
  "google_play",
  "steam"
];

const app = express();

const hostAddress = process.env.NODE_HOST_ADRESS;
const py_server_adress =
  "http://" + process.env.PY_HOST_ADRESS + ":" + process.env.PY_PORT;
const server = app.listen(process.env.NODE_PORT, hostAddress, () => {
  const { host, port } = server.address();

  hf.printToFile(`Example app listening at ${host}, ${port}`);
});

// ////////////////////////////////////////////////////////////////////////////////////////////
// help endpoint
// ////////////////////////////////////////////////////////////////////////////////////////////

async function GetHelp(req, res, dictToSend) {
  dictToSend.data = await hf.readFile(`README.md`, "utf8");
  return dictToSend;
}

// ////////////////////////////////////////////////////////////////////////////////////////////
// system info endpoint
// ////////////////////////////////////////////////////////////////////////////////////////////
async function getInfo(req, res, dictToSend) {
  let options = {
    method: "GET",
    uri: py_server_adress + "/info",
    json: true // Automatically parses the JSON string in the response
  };

  const response = await rp(options);
  if (response.error === null) {
    dictToSend.data = response.data;
  } else {
    dictToSend.error = response.error;
  }

  return dictToSend;
}

// ////////////////////////////////////////////////////////////////////////////////////////////
// data delivery endpoint
// ////////////////////////////////////////////////////////////////////////////////////////////
async function getDataset(req, res, dictToSend) {
  const datasetNames = await hf.readdir(hf.datasetsDir);

  if (
    !(
      "filename" in dictToSend.query &&
      "start_date" in dictToSend.query &&
      "end_date" in dictToSend.query
    )
  ) {
    throw new Error("params keys are not correct");
  }
  if (
    !(
      moment(dictToSend.query.start_date, "YYYY-MM-DD", true).isValid() &&
      moment(dictToSend.query.end_date, "YYYY-MM-DD", true).isValid()
    )
  ) {
    throw new Error("dates have incorrect format");
  }
  if (!datasetNames.includes(dictToSend.query.filename)) {
    throw new Error("there is no such dataset filename");
  }
  const resultArray = [];
  const fileContent = await csv().fromFile(
    hf.datasetsDir + "/" + dictToSend.query.filename
  );
  fileContent.forEach(rowDict => {
    if (
      moment.utc(rowDict.Date, "YYYY-MM-DD").toDate() <=
      moment.utc(dictToSend.query.end_date, "YYYY-MM-DD").toDate() &&
      moment.utc(rowDict.Date, "YYYY-MM-DD").toDate() >=
      moment.utc(dictToSend.query.start_date, "YYYY-MM-DD").toDate()
    ) {
      resultArray.push(rowDict);
    }
  });
  dictToSend.data = resultArray;

  return dictToSend;
}

// ////////////////////////////////////////////////////////////////////////////////////////////
// dataset creation endpoint
// ////////////////////////////////////////////////////////////////////////////////////////////
async function createDataset(req, res, dictToSend) {
  if (
    !(
      "query" in dictToSend.query &&
      "start_date" in dictToSend.query &&
      "end_date" in dictToSend.query &&
      "work_time" in dictToSend.query &&
      "social_platform" in dictToSend.query
    )
  ) {
    throw new Error("params keys are not correct");
  }
  if (
    !(
      moment(dictToSend.query.start_date, "YYYY-MM-DD", true).isValid() &&
      moment(dictToSend.query.end_date, "YYYY-MM-DD", true).isValid()
    )
  ) {
    throw new Error("dates have incorrect format");
  }
  if (!(socialPlatforms.indexOf(dictToSend.query.social_platform) > -1)) {
    throw new Error("such social_platform is not allowed");
  }

  let options = {
    method: "POST",
    uri: py_server_adress + "/create_dataset",
    qs: dictToSend.query,
    json: true // Automatically parses the JSON string in the response
  };

  const response = await rp(options);
  if (response.error === null) {
    dictToSend.data = response.data;
  } else {
    dictToSend.error = response.error;
  }

  return dictToSend;
}

// middleware

function wrap(innerFn) {
  return async function (req, res) {
    let dictToSend = { data: null, error: null, query: req.query };
    // , "headers": req.headers, "ip": req.ip}

    try {
      if (!("x-access-token" in req.headers)) {
        throw new Error("x-access-token is not specified");
      }

      if (!(req.headers["x-access-token"] in AuthTokens)) {
        throw new Error("x-access-token is not correct");
      }

      dictToSend.user = AuthTokens[req.headers["x-access-token"]];

      await innerFn(req, res, dictToSend);
    } catch (error) {
      await hf.printToFile("error is caught:");
      await hf.printToFile(error);
      dictToSend.error = error.message;
    } finally {
      hf.traceInfo(JSON.stringify(dictToSend), res);
    }
  };
}

// ////////////////////////////////////////////////////////////////////////////////////////////
// endpoints

app.get("/info", wrap(getInfo));
app.get("/help", wrap(GetHelp));
app.post("/info", wrap(getInfo));
app.post("/help", wrap(GetHelp));
app.post("/get_dataset", wrap(getDataset));
app.post("/create_dataset", wrap(createDataset));
