const filter = require('./filter').filter;
const fetch = require('./filter').fetch;
const express = require('express');
const Promise = require('bluebird');


function listen(port, swaggers) {
    let app = express();

    swaggers.forEach((swagger, index) => {
        app.get(`/${swagger['x-id'] || index}`, (req, res) => {
            res.send(swagger);
        });
    });

    return new Promise((resolve, reject) => {
        let server = app.listen(port, (err) => {
            if (err) {
                console.error(err.stack || err);
                reject(err);
            } else {
                console.log(`listening on ${port}`);
                resolve(server);
            }
        });
    })
}

const FILTER = JSON.parse(process.env.FILTER);
const PORT = parseInt(process.env.PORT) || 80;

Promise.try(() => {
        let promises = [];
        for (let [k, v] of Object.entries(FILTER)) {
            let promise = Promise.try(() => {
                    return fetch(v.url);
                })
                .then((api) => {
                    return filter({
                        api,
                        id: k,
                        includes: v.includes,
                        override: v.override,
                        pathOverride: v.pathOverride
                    });
                });
            promises.push(promise);
        }
        return Promise.all(promises);
    })
    .then(swaggers => {
        return listen(PORT, swaggers);
    })
    .catch(err => {
        console.error(err.stack||err);
        process.exit(1);
    });
