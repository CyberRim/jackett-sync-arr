import { Jackett } from './jackett/jackett';
// import { Radarr } from './arr/radarr';
import { log } from './logger/log';
import { Sonarr } from './arr/sonarr';

(async () => {
    log.debug(`$NODE_ENV=${process.env.NODE_ENV as string}`);
    const jackett = Jackett.getInstance();
    const indexers = await jackett.getConfiguredIndexers();
    // const radarr = Radarr.getInstance();
    const sonarr = Sonarr.getInstance();
    if (indexers == null) {
        log.info(`exit`);
        return;
    }
    indexers.forEach(async (indexer) => {
        // await radarr.postIndexer(indexer);
        await sonarr.postIndexer(indexer);
    });
})();
