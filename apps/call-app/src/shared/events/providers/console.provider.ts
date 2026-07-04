import type { EventPayload, EventProvider, EventWhitelist } from '../event-service.types.js';

export class ConsoleProvider implements EventProvider {
  readonly name = 'console';
  readonly whitelist: EventWhitelist;

  constructor(whitelist: EventWhitelist = '*') {
    this.whitelist = whitelist;
  }

  send(payload: EventPayload): void {
    console.warn(`[event] ${payload.event}`, payload);
  }
}
