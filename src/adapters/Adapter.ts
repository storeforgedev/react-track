import type { Event } from "../types";

export abstract class Adapter {
  /**
   * Emit the given event to the SDK managed by this adapter.
   */
  abstract onEvent(event: Event): Promise<void>;

  /**
   * Human readable name for adapter.
   */
  name: string;

  /**
   * Uniqud handle for this adapter instance.
   */
  handle: string;

  /**
   * Is the SDK managed by this adapter ready to receive events?
   */
  isConnected: boolean = false;

  /**
   * Callback for when this adapter is connected.
   */
  onConnected?: () => void;

  /**
   * Array of buffered events.
   */
  bufferedEvents: Event[] = [];

  /**
   * Construct an adapter with the given name and handle.
   */
  constructor({ name, handle }: { name: string; handle: string }) {
    this.name = name;
    this.handle = handle;
  }

  /**
   * Called by the adapter when the SDK is ready to receive events.
   */
  connect() {
    this.isConnected = true;
    if (this.onConnected) this.onConnected();
    this._emitBufferedEvents();
  }

  /**
   * Load the adapter with the given buffered events.
   * These events will be emitted when the adapter is connected.
   */
  load({
    onConnected,
    bufferedEvents,
  }: {
    bufferedEvents: Event[];
    onConnected: () => void;
  }) {
    this.onConnected = onConnected;
    this.bufferedEvents = bufferedEvents;
  }

  /**
   * Append a new event for emit.
   *
   * - If the adapter is connected, send it to the onEvent handler.
   * - Otherwise, append it to the buffered events array for future emit.
   */
  appendEvent(event: Event) {
    if (this.isConnected) this.onEvent(event);
    else this.bufferedEvents.push(event);
  }

  /**
   * Sort and emit buffered events.
   */
  private _emitBufferedEvents() {
    // Do nothing if we have no buffered events.
    if (0 === this.bufferedEvents.length) return;

    /**
     * Sort buffered events by rank.
     * This ensures that identify, page and track events are sent in that order if they all appear in the buffer at the same time.
     */
    this.bufferedEvents.sort(
      (a, b) =>
        EVENT_RANK_ORDER.indexOf(a.type) - EVENT_RANK_ORDER.indexOf(b.type),
    );

    // Emit each of the buffered events.
    this.bufferedEvents.forEach((event) => this.onEvent(event));

    // Clear the event buffer.
    this.bufferedEvents = [];
  }
}

/**
 * Order in which buffered events should be emitted.
 */
const EVENT_RANK_ORDER: Event["type"][] = [
  "identify",
  "page",
  "track",
  "group",
  "alias",
  "reset",
];
