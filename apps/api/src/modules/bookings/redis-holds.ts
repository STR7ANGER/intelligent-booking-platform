import type { HoldStore } from "./service.js";

type RedisCommands = {
  set(
    key: string,
    value: string,
    options: { NX: true; PX: number },
  ): Promise<string | null>;
  get(key: string): Promise<string | null>;
  eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown>;
};

const releaseScript =
  "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end";
export class RedisHoldStore implements HoldStore {
  constructor(private client: RedisCommands) {}
  async acquire(key: string, token: string, ttlMs: number) {
    return (
      (await this.client.set(key, token, { NX: true, PX: ttlMs })) === "OK"
    );
  }
  async owns(key: string, token: string) {
    return (await this.client.get(key)) === token;
  }
  async release(key: string, token: string) {
    await this.client.eval(releaseScript, { keys: [key], arguments: [token] });
  }
}
