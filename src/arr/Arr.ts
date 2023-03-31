import { BodyInit } from 'node-fetch-commonjs';
import path from 'path';
import { Base } from '../Base';
import { fetch, type Method } from '../fetch';
import { log } from '../logger/log';

export abstract class Arr extends Base {
    config!: Config;

    async api(
        method: Method,
        apiPath: string,
        pathValue?: string | number,
        requestBody?: BodyInit,
    ): Promise<Record<string, unknown> | null> {
        const url = this.genURL(apiPath, pathValue);
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

    private genURL(apiPath: string, pathValue?: string | number): URL {
        const url = new URL(this.config.host);
        url.port = this.config.port;
        url.searchParams.append('apikey', this.config.key);
        url.pathname = path.join(this.config.path, apiPath);
        if (pathValue !== undefined) {
            url.pathname = path.join(url.pathname, `${pathValue}`);
        }
        return url;
    }
}

export type Config = {
    host: string;
    port: string;
    key: string;
    path: string;
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
    multiLanguages: number[];
    additionalParameters: string;
    removeYear: boolean;
    minimumSeeders: number;
    seedRatio: string;
    seedTime: string;
    requiredFlags: number[];
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
