import { ConfigName } from '../Base';
import { Indexer, Jackett } from '../jackett/jackett';
import { Arr, Fields, Config as ArrConfig, Setting as ArrSetting } from './Arr';

export default {};

export class Sonarr extends Arr {
    private static SonarrInstance: Sonarr;

    private constructor() {
        super();
    }

    // eslint-disable-next-line class-methods-use-this
    protected getConfigName(): string {
        return ConfigName.SONARR;
    }

    static getInstance(): Sonarr {
        if (Sonarr.SonarrInstance) {
            return this.SonarrInstance;
        }
        const instance = new Sonarr();
        Sonarr.SonarrInstance = instance;
        return Sonarr.SonarrInstance;
    }

    genIndexerFields(indexer: Indexer): Fields | null {
        const baseUrlValue =
            Jackett.getInstance().genTorznabFeed(indexer)?.href;
        const apiKeyValue = Jackett.getInstance().config?.key;
        if (baseUrlValue === undefined || apiKeyValue === undefined) {
            return null;
        }
        const categoriesValue = Sonarr.genSonarrCategoriesValue(indexer);
        const animeCategoriesValue =
            Sonarr.genSonarrAnimeCategoriesValue(indexer);
        const fields = [
            { name: 'baseUrl', value: baseUrlValue },
            { name: 'apiPath', value: '/api' },
            { name: 'apiKey', value: apiKeyValue },
            { name: 'categories', value: categoriesValue },
            {
                name: 'additionalParameters',
                value: this.getSetting<string>(indexer, 'additionalParameters'),
            },
            {
                name: 'animeCategories',
                value: animeCategoriesValue,
            },
            {
                name: 'animeStandardFormatSearch',
                value: this.getSetting<number>(
                    indexer,
                    'animeStandardFormatSearch',
                ),
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
                name: 'seedCriteria.seasonPackSeedTime',
                value: this.getSetting<string>(indexer, 'seasonPackSeedTime'),
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

    static genSonarrAnimeCategoriesValue(indexer: Indexer) {
        return this.genCategoriesValue(indexer, [
            /anime|animation|动漫|动画|動畫/i,
        ]);
    }

    static genSonarrCategoriesValue(indexer: Indexer): number[] {
        return this.genCategoriesValue(indexer, [
            /tv|连续剧|影劇|documentaries|documentary|纪录|紀錄/i,
            '5000',
        ]);
    }

    private static genDefaultConfigPort() {
        return '8989';
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
                    animeStandardFormatSearch: false,
                    additionalParameters: '',
                    minimumSeeders: 1,
                    seedRatio: '',
                    seedTime: '',
                    seasonPackSeedTime: '',
                    priority: 25,
                    downloadClientId: 0,
                    tags: [],
                },
                public: {
                    downloadClientId: 0,
                },
                private: {
                    enableRss: false,
                    enableAutomaticSearch: false,
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
    animeStandardFormatSearch: boolean;
    seasonPackSeedTime: string;
};
