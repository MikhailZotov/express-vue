// @flow
'use strict';

import {Defaults} from './models';
import {
    setupComponentArray,
    renderError,
    renderComponents
} from './utils';

const NodeCache = require('node-cache');
//TODO add cache options via ENV
const myCache = new NodeCache({});

function expressVue(componentPath: string, options: Object, callback: Function) {
    if (!process.env.VUE_CACHE_ENABLED) {
        let defaults = new Defaults(options);
        setupComponentArray(componentPath, defaults).then(promiseArray => {
            Promise.all(promiseArray)
                .then(function(components) {
                    renderComponents(components, defaults, callback);
                })
                .catch(function(error) {
                    renderError(error, callback);
                });
        }).catch(error => {
            renderError(error, callback);
        });
    } else {
        let cacheObject = Object.assign({}, options.data);
        if (options.settings.vue && options.settings.vue.cache && options.settings.vue.cache.ignoredKeys) {
            for (let key of options.settings.vue.cache.ignoredKeys) {
                if (cacheObject[key]) {
                    delete cacheObject[key];
                }
            }
        }

        const cacheKey = componentPath + JSON.stringify(cacheObject);
        myCache.get(cacheKey, (error, cachedString) => {
            if (error) {
                callback(error, null);
            } else if (cachedString) {
                callback(null, cachedString);
            } else {
                let defaults = new Defaults(options);
                setupComponentArray(componentPath, defaults).then(promiseArray => {
                    Promise.all(promiseArray)
                        .then(function(components) {
                            renderComponents(components, defaults, (error, html) => {
                                if (error) {
                                    callback(error);
                                } else {
                                    myCache.set(cacheKey, html, (err, success) => {
                                        if (err) {
                                            callback(err);
                                        } else if (success) {
                                            callback(null, html);
                                        }
                                    });
                                }
                            });
                        })
                        .catch(function(error) {
                            renderError(error, callback);
                        });
                }).catch(error => {
                    renderError(error, callback);
                });
            }
        });
    }

}

export default expressVue;
