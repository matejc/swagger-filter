const filter = require('./filter').filter;
const fetch = require('./filter').fetch;
const express = require('express');

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

fetch(process.env.URL)
    .then(api => {
        let promises = [];
        for (let [k, v] of Object.entries(FILTER)) {
            promises.push(filter({
                api,
                id: k,
                includes: v.includes,
                override: v.override,
                pathOverride: v.pathOverride
            }));
        }
        return Promise.all(promises);
    })
    .then(swaggers => {
        return listen(80, swaggers);
    })
    .catch(err => {
        console.error(err.stack||err);
        process.exit(1);
    });
