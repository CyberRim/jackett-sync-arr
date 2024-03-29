import { BodyInit } from 'node-fetch-commonjs';
import path from 'path';
import { Base, Config as BaseConfig } from '../Base';
import { fetch, Method } from '../fetch';
import { log } from '../logger/log';
import { Category, Indexer } from '../jackett/jackett';
import { isValidKey } from '../util';

export abstract class Arr extends Base {
    config: Config | undefined;

    indexerCache: IndexerResource[] = [];

    async api(
        method: Method,
        apiPath: string,
        pathValue?: string | number,
        requestBody?: BodyInit,
    ): Promise<Record<string, unknown> | null> {
        const url = this.genURL(apiPath, pathValue);
        if (url === null) {
            return null;
        }
        const responseBody = await fetch(url, method, requestBody);
        if (responseBody === null) {
            return null;
        }
        try {
            const responseBodyJSON = JSON.parse(responseBody);
            return responseBodyJSON;
        } catch (error) {
            log.error(error);
            return null;
        }
    }

    protected checkConfig(): boolean {
        if (!this.checkConfigApiInfo()) {
            return false;
        }
        return true;
    }

    async getDownloadClient(): Promise<DownloadClient | null> {
        const apiPath = '/downloadclient';
        const clients = await this.api(Method.GET, apiPath);
        return clients as DownloadClient | null;
    }

    async getIndexer(): Promise<IndexerResource[] | null> {
        const apiPath = '/indexer';
        const indexer = await this.api(Method.GET, apiPath);
        return indexer as IndexerResource[] | null;
    }

    async postIndexer(indexer: Indexer): Promise<void> {
        const apiPath = '/indexer';
        const indexerResource = this.genIndexerResource(indexer);
        if (indexerResource === null) {
            return;
        }
        const body: IndexerResource = indexerResource;
        const response = await this.api(
            Method.POST,
            apiPath,
            '',
            JSON.stringify(body),
        );
        if (response === null) {
            return;
        }
        // {
        //     propertyName: 'Name',
        //     errorMessage: 'Should be unique',
        //     attemptedValue: 'XXX',
        //     severity: 'error',
        //     errorCode: 'PredicateValidator',
        //     formattedMessageArguments: [],
        //     formattedMessagePlaceholderValues: { propertyName: 'Name', propertyValue: 'XXX' }
        // }
        if (
            response instanceof Array &&
            response[0].severity === 'error' &&
            response[0].errorCode === 'PredicateValidator' &&
            response[0].propertyName === 'Name'
        ) {
            this.indexerCache =
                this.indexerCache.length === 0
                    ? (await this.getIndexer()) ?? []
                    : this.indexerCache;

            const isDup = this.indexerCache.some((indexer2): boolean => {
                if (indexer2.name === body.name) {
                    let baseUrlValue = '';
                    for (let i = 0; i < body.fields.length; i += 1) {
                        const { name, value } = body.fields[i];
                        if (name === 'baseUrl') {
                            if (typeof value !== 'string') {
                                break;
                            }
                            baseUrlValue = value;
                            break;
                        }
                    }

                    return body.fields.some((field) => {
                        return (
                            field.name === 'baseUrl' &&
                            field.value === baseUrlValue
                        );
                    });
                }
                return false;
            });
            if (!isDup) {
                // TODO:
                return;
            }
            log.info(`${body.name} already exists.`);
            return;
        }

        // {
        //     isWarning: false,
        //     propertyName: '',
        //     errorMessage: 'Unable to connect to indexer, check the log for more details',
        //     severity: 'error'
        //   }

        if (response instanceof Array && response[0].severity === 'error') {
            log.warn(`${body.name} ${response[0].errorMessage as string}`);
            return;
        }

        if (response.name === body.name) {
            log.info(`${response.name} success.`);
            return;
        }

        log.info(response);
    }

    genIndexerResource(indexer: Indexer): IndexerResource | null {
        const indexerResource = {
            enableRss: this.getSetting<boolean>(indexer, 'enableRss'),
            enableAutomaticSearch: this.getSetting<boolean>(
                indexer,
                'enableAutomaticSearch',
            ),
            enableInteractiveSearch: this.getSetting<boolean>(
                indexer,
                'enableInteractiveSearch',
            ),
            supportsRss: true,
            supportsSearch: true,
            protocol: 'torrent',
            priority: this.getSetting<number>(indexer, 'priority'),
            downloadClientId: this.getSetting<number>(
                indexer,
                'downloadClientId',
            ),
            name: indexer.title,
            fields: this.genIndexerFields(indexer),
            implementationName: 'Torznab',
            implementation: 'Torznab',
            configContract: 'TorznabSettings',
            tags: this.getSetting<Array<number>>(indexer, 'tags'),
            id: undefined,
        };
        const keys = Object.keys(indexerResource);
        for (let index = 0; index < keys.length; index += 1) {
            const key = keys[index];
            if (isValidKey(key, indexerResource)) {
                const value = indexerResource[key];
                if ((key !== 'id' && value === undefined) || value === null) {
                    return null;
                }
            }
        }
        return indexerResource as IndexerResource;
    }
    abstract genIndexerFields(indexer: Indexer): Fields | null;

    getSetting<T>(indexer: Indexer, settingName: string): T | null {
        if (this.config === undefined) {
            return null;
        }
        const indexerType = indexer.type;
        if (isValidKey(indexerType, this.config.setting)) {
            if (isValidKey(settingName, this.config.setting[indexerType])) {
                return this.config.setting[indexerType][settingName];
            }
        }
        if (isValidKey('default', this.config.setting)) {
            if (isValidKey(settingName, this.config.setting.default)) {
                return this.config.setting.default[settingName];
            }
        }
        // TODO:
        throw new Error(settingName);
    }

    private genURL(apiPath: string, pathValue?: string | number): URL | null {
        if (this.config === undefined) {
            return null;
        }

        const url = new URL(this.config.host);
        url.port = this.config.port;
        url.searchParams.append('apikey', this.config.key);
        url.pathname = path.join(this.config.path, apiPath);
        if (pathValue !== undefined) {
            url.pathname = path.join(url.pathname, `${pathValue}`);
        }
        return url;
    }

    static genCategoriesValue(
        indexer: Indexer,
        pattens: Array<RegExp | string>,
    ): number[] {
        const categories = indexer.caps.categories.category;
        const selectCategories = (
            categories instanceof Array ? categories : [categories]
        ).filter((category) => {
            // const reg = /movie|电影|電影|documentaries|documentary|纪录|紀錄/i;

            // if (reg.test(v.name) || v.id === '2000') {
            //     return true;
            // }
            // return false;
            for (let index = 0; index < pattens.length; index += 1) {
                const patten = pattens[index];
                if (this.isFitCategory(category, patten)) {
                    return true;
                }
            }
            return false;
        });
        if (categories.length === 1 && /other/i.test(categories[0].name)) {
            selectCategories.push(categories[0]);
        }
        return selectCategories.map((v) => {
            return parseInt(v.id, 10);
        });
    }

    private static isFitCategory(
        category: Category,
        t: RegExp | string,
    ): boolean {
        if (typeof t === 'number' && category.id === t) {
            return true;
        }
        if (t instanceof RegExp && t.test(category.name)) {
            return true;
        }
        return false;
    }

    protected static genDefaultConfigHost() {
        return 'http://127.0.0.1';
    }

    protected static genDefaultConfigPath() {
        return '/api/v3';
    }
}

export type Config = BaseConfig & {
    setting: {
        default: Setting;
        public?: Partial<Setting>;
        private?: Partial<Setting>;
    };
};
export type Setting = {
    enableRss: boolean;
    enableAutomaticSearch: boolean;
    enableInteractiveSearch: boolean;
    apiPath: '/api';
    // multiLanguages: number[];
    additionalParameters: string;
    // removeYear: boolean;
    minimumSeeders: number;
    seedRatio: string;
    seedTime: string;
    // requiredFlags: number[];
    priority: number;
    downloadClientId: number;
    tags: number[];
};

export type DownloadClient = {
    id: number;
    name: string;
    implementationName: string;
    implementation: string;
    configContract: string;
    infoLink: string;
    message: {
        message: string;
        type: string;
    };
    tags: number[];
    presets: string[];
    enable: boolean;
    protocol: string;
    priority: number;
    removeCompletedDownloads: boolean;
    removeFailedDownloads: boolean;
    fields: Array<{
        order: number;
        name: string;
        label: string;
        unit: string;
        helpText: string;
        helpLink: string;
        value: string;
        type: string;
        advanced: boolean;
        selectOptions: Array<{
            value: number;
            name: string;
            order: number;
            hint: string;
            dividerAfter: boolean;
        }>;
        selectOptionsProviderAction: string;
        section: string;
        hidden: string;
        placeholder: string;
    }>;
};
export type IndexerResource = {
    id?: number;
    name: string;
    fields: Fields;
    implementationName: string;
    implementation: string;
    configContract: string;
    infoLink?: string;
    message?: {
        message: string;
        type: string;
    };
    tags?: number[];
    presets?: string[];
    enableRss: boolean;
    enableAutomaticSearch: boolean;
    enableInteractiveSearch: boolean;
    supportsRss: boolean;
    supportsSearch: boolean;
    protocol: string;
    priority: number;
    downloadClientId: number;
};
export type Fields = Array<{
    order?: number;
    name: string;
    label?: string;
    unit?: string;
    helpText?: string;
    helpLink?: string;
    value: string | number | boolean | number[];
    type?: string;
    advanced?: boolean;
    selectOptions?: Array<{
        value: number;
        name: string;
        order: number;
        hint: string;
        dividerAfter: boolean;
    }>;
    selectOptionsProviderAction?: string;
    section?: string;
    hidden?: string;
    placeholder?: string;
}>;
