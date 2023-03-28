import configUtil from 'config';

export default {};
export enum ConfigName {
    JACKETT = 'jackett',
    RADARR = 'radarr',
}
export abstract class Base {
    config;

    constructor() {
        this.config = configUtil.get(this.getConfigName());
    }

    protected abstract getConfigName(): string;
}
