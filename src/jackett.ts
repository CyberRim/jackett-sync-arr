import fetch from 'node-fetch-commonjs';
import { xml2js } from 'xml-js';
import configUtil from 'config';

export namespace JackettNS {
    export class Jackett {
        config: {
            host: string;
            port: string;
            path: string;
            key: string;
        };

        private constructor() {
            this.config = configUtil.get('jackett');
        }

        private static jackettInstance: Jackett;

        static getInstance(): Jackett {
            if (Jackett.jackettInstance) {
                return this.jackettInstance;
            }
            const instance = new Jackett();
            Jackett.jackettInstance = instance;
            return Jackett.jackettInstance;
        }

        async getConfiguredIndexers() {
            // console.log(url.href);
            const url = this.genTorznabFeed('all');
            url.searchParams.append('apikey', this.config.key);
            url.searchParams.append('t', 'indexers');
            url.searchParams.append('configured', 'true');
            const response = await fetch(url.href);
            const text = await response.text();
            return Jackett.postFetch(text);
            // console.log(JSON.stringify(indexersArray as Indexer[], null, 4));
        }

        static postFetch(resultText: string): JackettNS.Indexer[] | null {
            const indexersJson = xml2js(resultText, { compact: true });
            if (!('indexers' in indexersJson)) {
                // TODO:log
                return null;
            }
            const indexersArray = indexersJson.indexers?.indexer;
            if (!indexersArray || !(indexersArray instanceof Array)) {
                // TODO:log
                return null;
            }
            async function formatJson(item: any[] | any) {
                if (item instanceof Object) {
                    if ('_attributes' in item) {
                        // eslint-disable-next-line no-underscore-dangle
                        const attributeNames = Object.keys(item._attributes);
                        for (let i = 0; i < attributeNames.length; i += 1) {
                            const attributeName = attributeNames[i];
                            // eslint-disable-next-line no-param-reassign
                            item[attributeName] =
                                // eslint-disable-next-line no-underscore-dangle
                                item._attributes[attributeName];
                        }
                        // eslint-disable-next-line no-underscore-dangle, no-param-reassign
                        delete item._attributes;
                    }
                    const keys = Object.keys(item);
                    for (let i = 0; i < keys.length; i += 1) {
                        const key = keys[i];
                        const value = item[key];
                        if (Object.keys(value).includes('_text')) {
                            // eslint-disable-next-line no-underscore-dangle, no-param-reassign
                            item[key] = item[key]._text;
                        } else {
                            formatJson(item[key]);
                        }
                    }
                }
            }
            formatJson(indexersArray);

            return indexersArray as JackettNS.Indexer[];
        }

        genTorznabFeed(indexer: Indexer | string) {
            const indexerId =
                typeof indexer === 'string' ? indexer : indexer.id;
            const url = new URL(this.config.host);
            url.port = this.config.port;
            url.pathname = `${this.config.path}/indexers/${indexerId}/results/torznab`;
            return url;
        }
    }
    export type Indexer = {
        title: string;
        configured: string;
        id: string;
        description: string;
        link: string;
        language: string;
        type: string;
        caps: {
            searching: {
                search: Search;
                'tv-search': Search;
                'movie-search': Search;
                'music-search': Search;
                'audio-search': Search;
                'book-search': Search;
            };
            categories: {
                category: Array<Category>;
            };
        };
    };
    type Search = {
        available: string;
        supportedParams: string;
    };
    type Category = {
        id: string;
        name: string;
        subcat?: Subcat;
    };
    type Subcat = {
        id: string;
        name: string;
    };
}
