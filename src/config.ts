import { writeFileSync } from 'fs';
import path from 'path';
import { Radarr, Config as RadarrConfig } from './arr/radarr';
import { Sonarr, Config as SonarConfig } from './arr/sonarr';
import { Jackett, Config as JacketConfig } from './jackett/jackett';

export default {};

export function configInti() {
    const configPath = path.resolve('./config');
    const configFile = 'default.json';
    const configFullPath = path.resolve(configPath, configFile);
    const config: Config = {
        jackett: Jackett.genDefaultConfig(),
        radarr: Radarr.genDefaultConfig(),
        sonarr: Sonarr.genDefaultConfig(),
        log: {
            level: 'info',
        },
    };
    writeFileSync(configFullPath, JSON.stringify(config, null, 4), {
        flag: 'w',
    });
}

type Config = {
    jackett: JacketConfig;
    radarr: RadarrConfig;
    sonarr: SonarConfig;
    log: {
        level: string;
    };
};
