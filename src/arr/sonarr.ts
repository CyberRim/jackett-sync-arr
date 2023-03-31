import { ConfigName } from '../Base';
import { Indexer, Jackett } from '../jackett/jackett';
import { Arr, Fields } from './Arr';

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
