import winston from 'winston';
import config from 'config';

export default {};

class Log {
    private static log: winston.Logger | undefined = undefined;

    private static format = winston.format.combine(
        winston.format.timestamp(),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        winston.format.printf(({ level, message, label, timestamp }) => {
            return `${timestamp}  ${level}  ${message} `;
        }),
    );

    private static getLevel(): string {
        let level;
        try {
            const log: Record<string, string> = config.get('log');
            level = log.level ?? 'info';
        } catch (error) {
            level = 'info';
        }
        return level;
    }

    public static getInstance() {
        if (this.log === undefined) {
            this.log = winston.createLogger({
                level: this.getLevel(),
                format: this.format,
                transports: new winston.transports.Console(),
            });
        }

        return this.log;
    }
}

export const log = Log.getInstance();
