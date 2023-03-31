import { ConfigName } from '../Base';
import { Method } from '../fetch';
import { Indexer, Jackett } from '../jackett/jackett';
import { log } from '../logger/log';
import { isValidKey } from '../util';
import { Arr, Config, DownloadClient, Fields, IndexerResource } from './Arr';

export default {};
export class Sonarr extends Arr {
    private constructor() {
        super();
    }

    // eslint-disable-next-line class-methods-use-this
    protected getConfigName(): string {
        return ConfigName.SONARR;
    }

    private static SonarrInstance: Sonarr;

    config!: Config;

    indexerCache: IndexerResource[] = [];

    protected checkConfig(): boolean {
        if (!this.checkConfigApiInfo()) {
            return false;
        }
        return true;
    }

    static getInstance(): Sonarr {
        if (Sonarr.SonarrInstance) {
            return this.SonarrInstance;
        }
        const instance = new Sonarr();
        Sonarr.SonarrInstance = instance;
        return Sonarr.SonarrInstance;
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
        const body: IndexerResource = this.genIndexerResource(indexer);
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
                    const bodyFieldsNames = Object.keys(body.fields);
                    for (let i = 0; i < bodyFieldsNames.length; i += 1) {
                        const name = bodyFieldsNames[i];
                        const value = body.fields.values;
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
            if (isDup) {
                log.warn(`${body.name}>>>>duplicate`);
            }
            return;
        }

        // {
        //     isWarning: false,
        //     propertyName: '',
        //     errorMessage: 'Unable to connect to indexer, check the log for more details',
        //     severity: 'error'
        //   }

        if (response instanceof Array && response[0].severity === 'error') {
            log.warn(`${body.name}>>>>${response[0].errorMessage as string}`);
            return;
        }

        if (response.name === body.name) {
            log.info(`${response.name} success`);
            return;
        }

        log.info(response);
    }

    genIndexerResource(indexer: Indexer): IndexerResource {
        return {
            enableRss: this.getSetting(indexer, 'enableRss'),
            enableAutomaticSearch: this.getSetting(
                indexer,
                'enableAutomaticSearch',
            ),
            enableInteractiveSearch: this.getSetting(
                indexer,
                'enableInteractiveSearch',
            ),
            supportsRss: true,
            supportsSearch: true,
            protocol: 'torrent',
            priority: this.getSetting(indexer, 'priority'),
            downloadClientId: this.getSetting(indexer, 'downloadClientId'),
            name: indexer.title,
            fields: this.genIndexerFields(indexer),
            implementationName: 'Torznab',
            implementation: 'Torznab',
            configContract: 'TorznabSettings',
            tags: this.getSetting(indexer, 'tags'),
            id: undefined,
        };
    }

    getSetting<T>(indexer: Indexer, settingName: string): T {
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

    genIndexerFields(indexer: Indexer): Fields {
        const baseUrlValue = Jackett.getInstance().genTorznabFeed(indexer).href;
        const apiKeyValue = Jackett.getInstance().config.key;
        const categoriesValue = Sonarr.genCategoriesValue(indexer);
        return [
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
    }

    static genCategoriesValue(indexer: Indexer): number[] {
        const categories = indexer.caps.categories.category;
        const selectCategories = (
            categories instanceof Array ? categories : [categories]
        ).filter((v) => {
            const reg = /tv|连续剧|影劇|documentaries|documentary|纪录|紀錄/i;
            if (reg.test(v.name) || v.id === '5000') {
                return true;
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
}
