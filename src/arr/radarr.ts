import { Arr, Config as ArrConfig, Setting as ArrSetting, Fields } from './Arr';
import { Indexer, Jackett } from '../jackett/jackett';
import { ConfigName } from '../Base';

export default {};

export class Radarr extends Arr {
    private static radarrInstance: Radarr;

    private constructor() {
        super();
    }

    // eslint-disable-next-line class-methods-use-this
    protected getConfigName(): string {
        return ConfigName.RADARR;
    }

    static getInstance(): Radarr {
        if (Radarr.radarrInstance) {
            return this.radarrInstance;
        }
        const instance = new Radarr();
        Radarr.radarrInstance = instance;
        return Radarr.radarrInstance;
    }

    genIndexerFields(indexer: Indexer): Fields | null {
        const baseUrlValue =
            Jackett.getInstance().genTorznabFeed(indexer)?.href;
        const apiKeyValue = Jackett.getInstance().config?.key;
        const categoriesValue = Radarr.genRadarrCategoriesValue(indexer);
        if (baseUrlValue === undefined || apiKeyValue === undefined) {
            return null;
        }
        const fields = [
            { name: 'baseUrl', value: baseUrlValue },
            { name: 'apiPath', value: '/api' },
            { name: 'apiKey', value: apiKeyValue },
            { name: 'multiLanguages', value: [-2] },
            { name: 'categories', value: categoriesValue },
            {
                name: 'additionalParameters',
                value: this.getSetting<string>(indexer, 'additionalParameters'),
            },
            {
                name: 'removeYear',
                value: this.getSetting<boolean>(indexer, 'removeYear'),
            },
            {
                name: 'minimumSeeders',
                value: this.getSetting<number>(indexer, 'minimumSeeders'),
            },
            {
                name: 'seedCriteria.seedRatio',
                value: this.getSetting<string>(indexer, 'seedRatio'),
            },
            {
                name: 'seedCriteria.seedTime',
                value: this.getSetting<string>(indexer, 'seedTime'),
            },
            {
                name: 'requiredFlags',
                value: this.getSetting<number[]>(indexer, 'requiredFlags'),
            },
        ];
        for (let index = 0; index < fields.length; index += 1) {
            const { value } = fields[index];
            if (value === null || value === undefined) {
                return null;
            }
        }
        return fields as Fields;
    }

    static genRadarrCategoriesValue(indexer: Indexer): number[] {
        return this.genCategoriesValue(indexer, [
            /movie|电影|電影|documentaries|documentary|纪录|紀錄/i,
            '2000',
        ]);
    }

    private static genDefaultConfigPort() {
        return '7878';
    }

    static genDefaultConfig() {
        const config: Config = {
            host: this.genDefaultConfigHost(),
            port: this.genDefaultConfigPort(),
            key: '',
            path: this.genDefaultConfigPath(),
            setting: {
                default: {
                    enableRss: true,
                    enableAutomaticSearch: true,
                    enableInteractiveSearch: true,
                    apiPath: '/api',
                    multiLanguages: [-2],
                    additionalParameters: '',
                    removeYear: false,
                    minimumSeeders: 1,
                    seedRatio: '',
                    seedTime: '',
                    requiredFlags: [],
                    priority: 25,
                    downloadClientId: 0,
                    tags: [],
                },
                public: {
                    downloadClientId: 0,
                },
                private: {
                    requiredFlags: [1],
                    downloadClientId: 0,
                },
            },
        };
        return config;
    }
}

export type Config = Omit<ArrConfig, 'setting'> & {
    setting: {
        default: Setting;
        public?: Partial<Setting>;
        private?: Partial<Setting>;
    };
};

type Setting = ArrSetting & {
    multiLanguages: Array<number>;
    removeYear: boolean;
    requiredFlags: Array<number>;
};
