import { BodyInit } from 'node-fetch-commonjs';
import path from 'path';
import { Base } from '../Base';
import { fetch, type Method } from '../fetch';
import { log } from '../logger/log';

export interface Config {
    host: string;
    port: string;
    key: string;
    path: string;
}

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
