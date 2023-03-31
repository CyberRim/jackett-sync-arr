import { Arr, type Config as ConfigArr } from './arr';
import { Method } from '../fetch';
import { JackettNS } from '../jackett/jackett';
import { isValidKey } from '../util';
import { log } from '../logger/log';
import { ConfigName } from '../Base';

export namespace RadarrNS {
    export class Radarr extends Arr {
        private static radarrInstance: Radarr;

        config!: Config;

        indexerCache: Indexer.IndexerResource[] = [];

        private constructor() {
            super();
        }

        protected checkConfig(): boolean {
            if (!this.checkConfigApiInfo()) {
                return false;
            }
            return true;
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

        async getDownloadClient(): Promise<DownloadClient | null> {
            const apiPath = '/downloadclient';
            const clients = await this.api(Method.GET, apiPath);
            return clients as DownloadClient | null;
        }

        async getIndexer(): Promise<Indexer.IndexerResource[] | null> {
            const apiPath = '/indexer';
            const indexer = await this.api(Method.GET, apiPath);
            return indexer as Indexer.IndexerResource[] | null;
        }

        async postIndexer(indexer: JackettNS.Indexer): Promise<void> {
            const apiPath = '/indexer';
            const body: Indexer.IndexerResource =
                this.genIndexerResource(indexer);
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
                log.warn(
                    `${body.name}>>>>${response[0].errorMessage as string}`,
                );
                return;
            }

            if (response.name === body.name) {
                log.info(`${response.name} success`);
                return;
            }

            log.info(response);
        }

        genIndexerResource(
            indexer: JackettNS.Indexer,
        ): Indexer.IndexerResource {
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

        getSetting<T>(indexer: JackettNS.Indexer, settingName: string): T {
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

        genIndexerFields(indexer: JackettNS.Indexer): Indexer.Fields {
            const baseUrlValue =
                JackettNS.Jackett.getInstance().genTorznabFeed(indexer).href;
            const apiKeyValue = JackettNS.Jackett.getInstance().config.key;
            const categoriesValue = Radarr.genCategoriesValue(indexer);
            return [
                { name: 'baseUrl', value: baseUrlValue },
                { name: 'apiPath', value: '/api' },
                { name: 'apiKey', value: apiKeyValue },
                { name: 'multiLanguages', value: [-2] },
                { name: 'categories', value: categoriesValue },
                {
                    name: 'additionalParameters',
                    value: this.getSetting<string>(
                        indexer,
                        'additionalParameters',
                    ),
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

        static genCategoriesValue(indexer: JackettNS.Indexer): number[] {
            const categories = indexer.caps.categories.category;
            const selectCategories = (
                categories instanceof Array ? categories : [categories]
            ).filter((v) => {
                const reg =
                    /movie|电影|電影|documentaries|documentary|纪录|紀錄/i;
                if (reg.test(v.name) || v.id === '2000') {
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

    type Config = ConfigArr & {
        setting: {
            default: Setting;
            public?: Partial<Setting>;
            private?: Partial<Setting>;
        };
    };
    interface Setting {
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
    }

    export interface DownloadClient {
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
    }

    export namespace Indexer {
        export interface IndexerResource {
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
        }
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
    }
}
