import bunyan, { LogLevel } from "bunyan";
import bunyanFormat from "bunyan-format";

const formatOut = bunyanFormat({
  outputMode: "short",
});

export let logger: bunyan;

export const initLogger = () => {
  const LOG_LEVEL = "info" as LogLevel;

  logger = bunyan.createLogger({
    name: "logger",
    stream: formatOut,
    level: LOG_LEVEL,
  });
};
