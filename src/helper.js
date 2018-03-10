var brain = require('brain.js');
var fs = require('fs');

module.exports = {
  run: function (klyng) {
    log(`${klyng.rank()}, is running`);
    return listeningForTask(klyng)
      .then(runTraining)
      .then(writeResutlsToFile)
      .then(sendResults)
      .then(() => {
        return new Promise ((resolve, reject) => {
          setTimeout(resolve, 3000) // delaying 3 seconds for 0 to recieve before close
        }); 
      })
      .catch((err) => {
        log(`${klyng.rank()} ERROR -> ${err}`);
      });
  }
};

function listeningForTask (klyng) {
  return new Promise((resolve, reject) => {
    let data = klyng.recv({ from: 0 });
    data = JSON.parse(data);
    log(`${klyng.rank()}, recieved ${data.trainingData.length} object to train`);
    resolve({
      klyng: klyng,
      data: data
    });
  });
}

function runTraining (opts) {
  return new Promise ((resolve, reject) => {
    opts.net = new brain.NeuralNetwork().fromJSON(opts.data.json);
    opts.data.trainRes = opts.net.train(opts.data.trainingData, {
      callback: (res) => { log(`${opts.klyng.rank()}, training => [${res.iterations}, ${res.error}]`); }
    });
    log(`${opts.klyng.rank()}, training => finished: [${opts.data.trainRes.iterations}, ${opts.data.trainRes.error}]`);
    resolve(opts);
  });
}

function writeResutlsToFile (opts) {
  return new Promise ((resolve, reject) => {
    if (!fs.existsSync('./networks')){
        fs.mkdirSync('./networks');
    }
    const err = fs.writeFileSync(`./networks/net-${opts.klyng.rank()}.json`, JSON.stringify(opts.data));
    if (err) reject (err);
    log(`${opts.klyng.rank()} wrote to file`);
    resolve(opts);
  });
}

function sendResults (opts) {
  return new Promise ((resolve, reject) => {
    log(`${opts.klyng.rank()} started sending back results`);
    delete opts.data.trainingData;
    opts.data.rank = opts.klyng.rank();
    opts.klyng.send({
      to: 0,
      data: opts.data
    })
    log(`${opts.klyng.rank()} finished sending back results`);
    resolve(opts);
  });
}

function log (str) {
  var now = new Date();
  console.log(`[${now.getMinutes()}:${now.getSeconds()}:${now.getMilliseconds()}] ${str}`);
}