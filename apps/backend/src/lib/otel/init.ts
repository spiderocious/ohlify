import { env } from '../../env.js';
import { logger } from '../logger.js';

export const initOtel = () => {
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    logger.info('OTel disabled (no OTEL_EXPORTER_OTLP_ENDPOINT set)');
    return;
  }
  // OTel packages are optional and installed only when observability is enabled.
  // Install: @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/auto-instrumentations-node
  logger.warn('OTel endpoint configured but SDK not installed — skipping');
};

export const shutdownOtel = async (): Promise<void> => {
  // no-op until OTel SDK is installed
};
