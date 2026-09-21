import { createHash } from 'node:crypto';
import { createProtocolObject } from './protocol.mjs';

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
}

export function hashEvent(event = {}) {
  const { event_hash: _ignoredEventHash, ...unsigned } = event;
  return createHash('sha256').update(canonical(unsigned)).digest('hex');
}

export function verifyEventHash(event = {}) {
  if (!event.event_hash) throw new Error('EVENT_HASH_MISSING');
  if (hashEvent(event) !== event.event_hash) throw new Error('EVENT_HASH_INVALID');
  return true;
}

export function createEvent(input = {}) {
  const event=createProtocolObject('Event',input);
  if (!event.event_type) throw new Error('EVENT_TYPE_MISSING');
  if (!event.aggregate_id) throw new Error('EVENT_AGGREGATE_ID_MISSING');
  const unsigned={...event,sequence:input.sequence ?? 0,previous_hash:input.previous_hash || null};
  const event_hash=hashEvent(unsigned);
  return Object.freeze({...unsigned,event_hash});
}

export function appendEvent(events=[],input={}) {
  if (!Array.isArray(events)) throw new Error('EVENT_LOG_INVALID');
  const previous=events.at(-1) || null;
  const { event_hash: _ignoredEventHash, ...eventInput } = input;
  const event=createEvent({...eventInput,sequence:previous ? previous.sequence+1 : 0,previous_hash:previous?.event_hash || null});
  return Object.freeze([...events,event]);
}

export function verifyEventChain(events=[]) {
  if (!Array.isArray(events)) throw new Error('EVENT_LOG_INVALID');
  let previousHash=null;
  for (let i=0;i<events.length;i+=1) {
    const event=events[i];
    if (event.sequence!==i) throw new Error('EVENT_SEQUENCE_INVALID');
    if (event.previous_hash!==previousHash) throw new Error('EVENT_CHAIN_BROKEN');
    verifyEventHash(event);
    previousHash=event.event_hash;
  }
  return true;
}

export function replayEvents(events=[],reducer,initialState) {
  verifyEventChain(events);
  if(typeof reducer!=='function') throw new Error('REPLAY_REDUCER_REQUIRED');
  return events.reduce((state,event)=>reducer(state,event),initialState);
}

export { canonical as canonicalizeEventValue };
