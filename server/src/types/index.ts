export type ActionType = 'calendar'|'reminder'|'drive'|'telegram'|'unknown';
export type ActionStatus = 'queued'|'running'|'success'|'error'|'cancelled'|'awaiting_confirmation';
export interface CommandAction { id:string; type:ActionType; description:string; payload:Record<string,any>; requiresConfirmation?:boolean; }
export interface ParsedCommand { reply:string; actions:CommandAction[]; }
export interface ActionLog { id:string; type:ActionType; description:string; status:ActionStatus; result?:any; error?:string; timestamp:string; }
