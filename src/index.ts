import { JackettNS } from './jackett';
import { RadarrNS } from './arr/radarr';
import { log } from './logger/log';

(async () => {
    log.debug(`$NODE_ENV=${process.env.NODE_ENV as string}`);
    const jackett = JackettNS.Jackett.getInstance();
    const indexers = await jackett.getConfiguredIndexers();
    const radarr = new RadarrNS.Radarr();
    if (indexers == null) {
        return;
    }
    indexers.forEach(async (indexer) => {
        await radarr.postIndexer(indexer);
    });
})();
