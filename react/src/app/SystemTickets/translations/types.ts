import type { copy } from "./en-CA";
export type TicketCopy = { [K in keyof typeof copy]: string };
