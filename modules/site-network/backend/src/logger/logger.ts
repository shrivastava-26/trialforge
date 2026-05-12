import { createLogger, format, transports } from 'winston';

const isProd = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  format: isProd
    ? format.combine(format.timestamp(), format.errors({ stack: true }), format.json())
    : format.combine(
        format.colorize(),
        format.timestamp({ format: 'HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}: ${message}${extra}`;
        })
      ),
  transports: [new transports.Console()],
});

export default logger;
