import { LogEntry } from './types'

export function log(entry: LogEntry) {
  console.log(JSON.stringify({
    timestamp: entry.timestamp,
    level: entry.level,
    route: entry.route,
    method: entry.method,
    status: entry.status,
    duration: entry.duration,
    ...(entry.error && { error: entry.error }),
  }))
}
