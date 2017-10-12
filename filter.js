const _ = require('lodash');
const Promise = require('bluebird');
const jsyaml = require('js-yaml');
const request = require('request');


function extractRefs(value, results) {
    if (value && _.isString(value['$ref'])) {
        let simpleRef = value['$ref'].replace('#/definitions/', '');
        value['$ref'] = `#/definitions/${simpleRef}`;
        results.add(simpleRef);
        return results;
    } else if (_.isObject(value)) {
        for (let k in value) {
            extractRefs(value[k], results);
        }
    } else if (_.isArray(value)) {
        for (let k in value) {
            return extractRefs(value[k], results);
        }
    }
    return results;
}

function recurseForRefs(value, results, definitions) {
    let refSet = extractRefs(value, new Set());

    if (refSet.size === 0) {
        return results;
    } else {
        for (let ref of refSet) {
            results.add(ref);
            let def = definitions[ref];
            recurseForRefs(def, results, definitions);
        }
        return results;
    }
}

function getBaseUrl(swagger) {
    let data = {};
    data.host = swagger.host;
    data.protocol = swagger.schemes ? swagger.schemes[0] : '';
    data.baseUrl = data.protocol + '://' + data.host + (swagger.basePath ? swagger.basePath : '/');
    return data.baseUrl;
}

function getPath(api, path) {
    let swagger = api.res;

    let value = {};
    let tags;
    let key = '';
    _.each(swagger.paths, (p, pathId) => {
        _.each(p, (m, methodId) => {
            if (m.operationId === path.operationId) {
                key = pathId;
                value[methodId] = Object.assign(_.cloneDeep(m), path);
                tags = value[methodId].tags;
            }
        });
    });

    let refs = recurseForRefs(value, new Set(), swagger.definitions);
    let definitions = {};
    for (let ref of refs) {
        definitions[ref] = swagger.definitions[ref];
    }

    return {key, value, definitions, tags};
}


function fetch(url) {
    return new Promise((resolve) => {
        request(url, {timeout: 6000}, function(error, response, body) {
            if (error) {
                console.error(error.stack||error);
                resolve({
                    url,
                    res: null,
                    error: error.message || error
                });
            } else if (response.statusCode == 200) {
                try {
                    let protocol = response.request.uri.protocol;
                    let host = response.request.uri.host;
                    let res = jsyaml.load(body) || JSON.parse(body);
                    if (!res.host) {
                        res.host = host;
                    }
                    if (!res.schemes) {
                        res.schemes = [ (protocol.match(/^([^:]+):?$/)[1]) ];
                    }
                    resolve({
                        url,
                        res,
                        error: null
                    });
                } catch (err) {
                    console.error(err);
                    resolve({
                        url,
                        res: null,
                        error: err
                    });
                }
            } else {
                let err = `response for ${item.url} is ${response.statusCode}`;
                console.error(err);
                resolve({
                    url,
                    res: null,
                    error: err
                });
            }
        });
    });
}

function filter(spec) {
    let swagger = _.assign({}, spec.api.res, spec.override || {});
    swagger.definitions = {};
    swagger.paths = {};
    swagger.tags = [];
    swagger['x-id'] = spec.id;

    let tags = new Set();

    return Promise.try(() => {
        _.each(spec.includes, (value, key) => {
            let path = spec.pathOverride || {};
            if (_.isString(value)) {
                path.operationId = value;
            } else {
                Object.assign(path, value, {operationId: key});
            }
            let p = getPath(spec.api, path);
            swagger.paths[p.key] = _.defaults(swagger.paths[p.key], p.value);
            swagger.definitions = _.defaults(p.definitions, swagger.definitions);
            (p.tags || []).forEach((t) => {
                tags.add(t);
            });
        });
        tags.forEach((t) => {
            swagger.tags.push({name: t});
        });
        return swagger;
    });
}

module.exports = {
    filter,
    fetch
};
