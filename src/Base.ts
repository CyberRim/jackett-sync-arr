import configUtil from 'config';
import { log } from './logger/log';

export default {};
export enum ConfigName {
    JACKETT = 'jackett',
    RADARR = 'radarr',
    SONARR = 'sonarr',
}
export abstract class Base {
    config: {
        host: string;
        port: string;
        path: string;
        key: string;
    };

    constructor() {
        this.config = configUtil.get(this.getConfigName());
        if (this.checkConfig()) {
            log.info('配置文件载入成功');
        } else {
            log.error('配置文件载入失败');
        }
    }

    protected checkConfigApiInfo(): boolean {
        if (
            this.config.host === '' ||
            this.config.port === '' ||
            this.config.path === '' ||
            this.config.key === ''
        ) {
            log.error(`配置文件中字段'host'，'port'，'path'，'key'存在空值`);
            log.debug(`checkConfigApiInfo false`);
            return false;
        }
        log.debug(`checkConfigApiInfo true`);
        return true;
    }

    protected abstract getConfigName(): string;

    protected abstract checkConfig(): boolean;
}
