import { createApp } from "./app.ts";
import { PageRepository } from "./kv.ts";

const kv = await Deno.openKv();
const pageRepo = new PageRepository(kv);
const api = createApp(pageRepo);

Deno.serve(api.fetch);
