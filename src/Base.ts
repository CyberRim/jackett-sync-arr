import configUtil from 'config';
import { log } from './logger/log';

export default {};
export enum ConfigName {
    JACKETT = 'jackett',
    RADARR = 'radarr',
    SONARR = 'sonarr',
}
export type Config = {
    host: string;
    port: string;
    path: string;
    key: string;
};

export abstract class Base {
    config: Config | undefined;

    constructor() {
        try {
            this.config = configUtil.get(this.getConfigName());
        } catch (error) {
            log.warn(error);
        }

        if (this.checkConfig()) {
            log.info(`配置文件${this.getConfigName()}载入成功`);
        } else {
            log.warn(
                `配置文件${this.getConfigName()}载入失败，没有找到相关配置`,
            );
        }
    }

    protected checkConfigApiInfo(): boolean {
        if (this.config === undefined) {
            return false;
        }
        if (
            this.config.host === '' ||
            this.config.port === '' ||
            this.config.path === '' ||
            this.config.key === ''
        ) {
            log.error(
                `配置文件${this.getConfigName()}中字段'host'，'port'，'path'，'key'存在空值`,
            );
            log.debug(`checkConfigApiInfo false`);
            return false;
        }
        log.debug(`checkConfigApiInfo true`);
        return true;
    }

    protected abstract getConfigName(): string;

    protected abstract checkConfig(): boolean;
}
