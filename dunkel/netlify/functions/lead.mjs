import { promises as dns } from "node:dns";
import { createHash } from "node:crypto";
// node_modules/@netlify/blobs/dist/chunk-XR3MUBBK.js
var NF_ERROR = "x-nf-error";
var NF_REQUEST_ID = "x-nf-request-id";
var BlobsInternalError = class extends Error {
  constructor(res) {
    let details = res.headers.get(NF_ERROR) || `${res.status} status code`;
    if (res.headers.has(NF_REQUEST_ID)) {
      details += `, ID: ${res.headers.get(NF_REQUEST_ID)}`;
    }
    super(`Netlify Blobs has generated an internal error (${details})`);
    this.name = "BlobsInternalError";
  }
};
var collectIterator = async (iterator) => {
  const result = [];
  for await (const item of iterator) {
    result.push(item);
  }
  return result;
};
var base64Decode = (input) => {
  const { Buffer } = globalThis;
  if (Buffer) {
    return Buffer.from(input, "base64").toString();
  }
  return atob(input);
};
var base64Encode = (input) => {
  const { Buffer } = globalThis;
  if (Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return btoa(input);
};
var getEnvironment = () => {
  const { Deno, Netlify, process: process2 } = globalThis;
  return Netlify?.env ?? Deno?.env ?? {
    delete: (key) => delete process2?.env[key],
    get: (key) => process2?.env[key],
    has: (key) => Boolean(process2?.env[key]),
    set: (key, value) => {
      if (process2?.env) {
        process2.env[key] = value;
      }
    },
    toObject: () => process2?.env ?? {}
  };
};
var getEnvironmentContext = () => {
  const context = globalThis.netlifyBlobsContext || getEnvironment().get("NETLIFY_BLOBS_CONTEXT");
  if (typeof context !== "string" || !context) {
    return {};
  }
  const data = base64Decode(context);
  try {
    return JSON.parse(data);
  } catch {
  }
  return {};
};
var MissingBlobsEnvironmentError = class extends Error {
  constructor(requiredProperties) {
    super(
      `The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: ${requiredProperties.join(
        ", "
      )}`
    );
    this.name = "MissingBlobsEnvironmentError";
  }
};
var BASE64_PREFIX = "b64;";
var METADATA_HEADER_INTERNAL = "x-amz-meta-user";
var METADATA_HEADER_EXTERNAL = "netlify-blobs-metadata";
var METADATA_MAX_SIZE = 2 * 1024;
var encodeMetadata = (metadata) => {
  if (!metadata) {
    return null;
  }
  const encodedObject = base64Encode(JSON.stringify(metadata));
  const payload = `b64;${encodedObject}`;
  if (METADATA_HEADER_EXTERNAL.length + payload.length > METADATA_MAX_SIZE) {
    throw new Error("Metadata object exceeds the maximum size");
  }
  return payload;
};
var decodeMetadata = (header) => {
  if (!header || !header.startsWith(BASE64_PREFIX)) {
    return {};
  }
  const encodedData = header.slice(BASE64_PREFIX.length);
  const decodedData = base64Decode(encodedData);
  const metadata = JSON.parse(decodedData);
  return metadata;
};
var getMetadataFromResponse = (response) => {
  if (!response.headers) {
    return {};
  }
  const value = response.headers.get(METADATA_HEADER_EXTERNAL) || response.headers.get(METADATA_HEADER_INTERNAL);
  try {
    return decodeMetadata(value);
  } catch {
    throw new Error(
      "An internal error occurred while trying to retrieve the metadata for an entry. Please try updating to the latest version of the Netlify Blobs client."
    );
  }
};
var BlobsConsistencyError = class extends Error {
  constructor() {
    super(
      `Netlify Blobs has failed to perform a read using strong consistency because the environment has not been configured with a 'uncachedEdgeURL' property`
    );
    this.name = "BlobsConsistencyError";
  }
};
var regions = {
  "us-east-1": true,
  "us-east-2": true,
  "eu-central-1": true,
  "ap-southeast-1": true,
  "ap-southeast-2": true
};
var isValidRegion = (input) => Object.keys(regions).includes(input);
var InvalidBlobsRegionError = class extends Error {
  constructor(region) {
    super(
      `${region} is not a supported Netlify Blobs region. Supported values are: ${Object.keys(regions).join(", ")}.`
    );
    this.name = "InvalidBlobsRegionError";
  }
};
var DEFAULT_RETRY_DELAY = getEnvironment().get("NODE_ENV") === "test" ? 1 : 5e3;
var MIN_RETRY_DELAY = 1e3;
var MAX_RETRY = 5;
var RATE_LIMIT_HEADER = "X-RateLimit-Reset";
var fetchAndRetry = async (fetch2, url, options, attemptsLeft = MAX_RETRY) => {
  try {
    const res = await fetch2(url, options);
    if (attemptsLeft > 0 && (res.status === 429 || res.status >= 500)) {
      const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
      await sleep(delay);
      return fetchAndRetry(fetch2, url, options, attemptsLeft - 1);
    }
    return res;
  } catch (error) {
    if (attemptsLeft === 0) {
      throw error;
    }
    const delay = getDelay();
    await sleep(delay);
    return fetchAndRetry(fetch2, url, options, attemptsLeft - 1);
  }
};
var getDelay = (rateLimitReset) => {
  if (!rateLimitReset) {
    return DEFAULT_RETRY_DELAY;
  }
  return Math.max(Number(rateLimitReset) * 1e3 - Date.now(), MIN_RETRY_DELAY);
};
var sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
var SIGNED_URL_ACCEPT_HEADER = "application/json;type=signed-url";
var Client = class {
  constructor({ apiURL, consistency, edgeURL, fetch: fetch2, region, siteID, token, uncachedEdgeURL }) {
    this.apiURL = apiURL;
    this.consistency = consistency ?? "eventual";
    this.edgeURL = edgeURL;
    this.fetch = fetch2 ?? globalThis.fetch;
    this.region = region;
    this.siteID = siteID;
    this.token = token;
    this.uncachedEdgeURL = uncachedEdgeURL;
    if (!this.fetch) {
      throw new Error(
        "Netlify Blobs could not find a `fetch` client in the global scope. You can either update your runtime to a version that includes `fetch` (like Node.js 18.0.0 or above), or you can supply your own implementation using the `fetch` property."
      );
    }
  }
  async getFinalRequest({
    consistency: opConsistency,
    key,
    metadata,
    method,
    parameters = {},
    storeName
  }) {
    const encodedMetadata = encodeMetadata(metadata);
    const consistency = opConsistency ?? this.consistency;
    let urlPath = `/${this.siteID}`;
    if (storeName) {
      urlPath += `/${storeName}`;
    }
    if (key) {
      urlPath += `/${key}`;
    }
    if (this.edgeURL) {
      if (consistency === "strong" && !this.uncachedEdgeURL) {
        throw new BlobsConsistencyError();
      }
      const headers = {
        authorization: `Bearer ${this.token}`
      };
      if (encodedMetadata) {
        headers[METADATA_HEADER_INTERNAL] = encodedMetadata;
      }
      if (this.region) {
        urlPath = `/region:${this.region}${urlPath}`;
      }
      const url2 = new URL(urlPath, consistency === "strong" ? this.uncachedEdgeURL : this.edgeURL);
      for (const key2 in parameters) {
        url2.searchParams.set(key2, parameters[key2]);
      }
      return {
        headers,
        url: url2.toString()
      };
    }
    const apiHeaders = { authorization: `Bearer ${this.token}` };
    const url = new URL(`/api/v1/blobs${urlPath}`, this.apiURL ?? "https://api.netlify.com");
    for (const key2 in parameters) {
      url.searchParams.set(key2, parameters[key2]);
    }
    if (this.region) {
      url.searchParams.set("region", this.region);
    }
    if (storeName === void 0 || key === void 0) {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    if (encodedMetadata) {
      apiHeaders[METADATA_HEADER_EXTERNAL] = encodedMetadata;
    }
    if (method === "head" || method === "delete") {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    const res = await this.fetch(url.toString(), {
      headers: { ...apiHeaders, accept: SIGNED_URL_ACCEPT_HEADER },
      method
    });
    if (res.status !== 200) {
      throw new BlobsInternalError(res);
    }
    const { url: signedURL } = await res.json();
    const userHeaders = encodedMetadata ? { [METADATA_HEADER_INTERNAL]: encodedMetadata } : void 0;
    return {
      headers: userHeaders,
      url: signedURL
    };
  }
  async makeRequest({
    body,
    consistency,
    headers: extraHeaders,
    key,
    metadata,
    method,
    parameters,
    storeName
  }) {
    const { headers: baseHeaders = {}, url } = await this.getFinalRequest({
      consistency,
      key,
      metadata,
      method,
      parameters,
      storeName
    });
    const headers = {
      ...baseHeaders,
      ...extraHeaders
    };
    if (method === "put") {
      headers["cache-control"] = "max-age=0, stale-while-revalidate=60";
    }
    const options = {
      body,
      headers,
      method
    };
    if (body instanceof ReadableStream) {
      options.duplex = "half";
    }
    return fetchAndRetry(this.fetch, url, options);
  }
};
var getClientOptions = (options, contextOverride) => {
  const context = contextOverride ?? getEnvironmentContext();
  const siteID = context.siteID ?? options.siteID;
  const token = context.token ?? options.token;
  if (!siteID || !token) {
    throw new MissingBlobsEnvironmentError(["siteID", "token"]);
  }
  if (options.region !== void 0 && !isValidRegion(options.region)) {
    throw new InvalidBlobsRegionError(options.region);
  }
  const clientOptions = {
    apiURL: context.apiURL ?? options.apiURL,
    consistency: options.consistency,
    edgeURL: context.edgeURL ?? options.edgeURL,
    fetch: options.fetch,
    region: options.region,
    siteID,
    token,
    uncachedEdgeURL: context.uncachedEdgeURL ?? options.uncachedEdgeURL
  };
  return clientOptions;
};

// node_modules/@netlify/blobs/dist/main.js
var DEPLOY_STORE_PREFIX = "deploy:";
var LEGACY_STORE_INTERNAL_PREFIX = "netlify-internal/legacy-namespace/";
var SITE_STORE_PREFIX = "site:";
var Store = class _Store {
  constructor(options) {
    this.client = options.client;
    if ("deployID" in options) {
      _Store.validateDeployID(options.deployID);
      let name = DEPLOY_STORE_PREFIX + options.deployID;
      if (options.name) {
        name += `:${options.name}`;
      }
      this.name = name;
    } else if (options.name.startsWith(LEGACY_STORE_INTERNAL_PREFIX)) {
      const storeName = options.name.slice(LEGACY_STORE_INTERNAL_PREFIX.length);
      _Store.validateStoreName(storeName);
      this.name = storeName;
    } else {
      _Store.validateStoreName(options.name);
      this.name = SITE_STORE_PREFIX + options.name;
    }
  }
  async delete(key) {
    const res = await this.client.makeRequest({ key, method: "delete", storeName: this.name });
    if (![200, 204, 404].includes(res.status)) {
      throw new BlobsInternalError(res);
    }
  }
  async get(key, options) {
    const { consistency, type } = options ?? {};
    const res = await this.client.makeRequest({ consistency, key, method: "get", storeName: this.name });
    if (res.status === 404) {
      return null;
    }
    if (res.status !== 200) {
      throw new BlobsInternalError(res);
    }
    if (type === void 0 || type === "text") {
      return res.text();
    }
    if (type === "arrayBuffer") {
      return res.arrayBuffer();
    }
    if (type === "blob") {
      return res.blob();
    }
    if (type === "json") {
      return res.json();
    }
    if (type === "stream") {
      return res.body;
    }
    throw new BlobsInternalError(res);
  }
  async getMetadata(key, { consistency } = {}) {
    const res = await this.client.makeRequest({ consistency, key, method: "head", storeName: this.name });
    if (res.status === 404) {
      return null;
    }
    if (res.status !== 200 && res.status !== 304) {
      throw new BlobsInternalError(res);
    }
    const etag = res?.headers.get("etag") ?? void 0;
    const metadata = getMetadataFromResponse(res);
    const result = {
      etag,
      metadata
    };
    return result;
  }
  async getWithMetadata(key, options) {
    const { consistency, etag: requestETag, type } = options ?? {};
    const headers = requestETag ? { "if-none-match": requestETag } : void 0;
    const res = await this.client.makeRequest({
      consistency,
      headers,
      key,
      method: "get",
      storeName: this.name
    });
    if (res.status === 404) {
      return null;
    }
    if (res.status !== 200 && res.status !== 304) {
      throw new BlobsInternalError(res);
    }
    const responseETag = res?.headers.get("etag") ?? void 0;
    const metadata = getMetadataFromResponse(res);
    const result = {
      etag: responseETag,
      metadata
    };
    if (res.status === 304 && requestETag) {
      return { data: null, ...result };
    }
    if (type === void 0 || type === "text") {
      return { data: await res.text(), ...result };
    }
    if (type === "arrayBuffer") {
      return { data: await res.arrayBuffer(), ...result };
    }
    if (type === "blob") {
      return { data: await res.blob(), ...result };
    }
    if (type === "json") {
      return { data: await res.json(), ...result };
    }
    if (type === "stream") {
      return { data: res.body, ...result };
    }
    throw new Error(`Invalid 'type' property: ${type}. Expected: arrayBuffer, blob, json, stream, or text.`);
  }
  list(options = {}) {
    const iterator = this.getListIterator(options);
    if (options.paginate) {
      return iterator;
    }
    return collectIterator(iterator).then(
      (items) => items.reduce(
        (acc, item) => ({
          blobs: [...acc.blobs, ...item.blobs],
          directories: [...acc.directories, ...item.directories]
        }),
        { blobs: [], directories: [] }
      )
    );
  }
  async set(key, data, { metadata } = {}) {
    _Store.validateKey(key);
    const res = await this.client.makeRequest({
      body: data,
      key,
      metadata,
      method: "put",
      storeName: this.name
    });
    if (res.status !== 200) {
      throw new BlobsInternalError(res);
    }
  }
  async setJSON(key, data, { metadata } = {}) {
    _Store.validateKey(key);
    const payload = JSON.stringify(data);
    const headers = {
      "content-type": "application/json"
    };
    const res = await this.client.makeRequest({
      body: payload,
      headers,
      key,
      metadata,
      method: "put",
      storeName: this.name
    });
    if (res.status !== 200) {
      throw new BlobsInternalError(res);
    }
  }
  static formatListResultBlob(result) {
    if (!result.key) {
      return null;
    }
    return {
      etag: result.etag,
      key: result.key
    };
  }
  static validateKey(key) {
    if (key === "") {
      throw new Error("Blob key must not be empty.");
    }
    if (key.startsWith("/") || key.startsWith("%2F")) {
      throw new Error("Blob key must not start with forward slash (/).");
    }
    if (new TextEncoder().encode(key).length > 600) {
      throw new Error(
        "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long."
      );
    }
  }
  static validateDeployID(deployID) {
    if (!/^\w{1,24}$/.test(deployID)) {
      throw new Error(`'${deployID}' is not a valid Netlify deploy ID.`);
    }
  }
  static validateStoreName(name) {
    if (name.includes("/") || name.includes("%2F")) {
      throw new Error("Store name must not contain forward slashes (/).");
    }
    if (new TextEncoder().encode(name).length > 64) {
      throw new Error(
        "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long."
      );
    }
  }
  getListIterator(options) {
    const { client, name: storeName } = this;
    const parameters = {};
    if (options?.prefix) {
      parameters.prefix = options.prefix;
    }
    if (options?.directories) {
      parameters.directories = "true";
    }
    return {
      [Symbol.asyncIterator]() {
        let currentCursor = null;
        let done = false;
        return {
          async next() {
            if (done) {
              return { done: true, value: void 0 };
            }
            const nextParameters = { ...parameters };
            if (currentCursor !== null) {
              nextParameters.cursor = currentCursor;
            }
            const res = await client.makeRequest({
              method: "get",
              parameters: nextParameters,
              storeName
            });
            let blobs = [];
            let directories = [];
            if (![200, 204, 404].includes(res.status)) {
              throw new BlobsInternalError(res);
            }
            if (res.status === 404) {
              done = true;
            } else {
              const page = await res.json();
              if (page.next_cursor) {
                currentCursor = page.next_cursor;
              } else {
                done = true;
              }
              blobs = (page.blobs ?? []).map(_Store.formatListResultBlob).filter(Boolean);
              directories = page.directories ?? [];
            }
            return {
              done: false,
              value: {
                blobs,
                directories
              }
            };
          }
        };
      }
    };
  }
};
var getStore = (input) => {
  if (typeof input === "string") {
    const clientOptions = getClientOptions({});
    const client = new Client(clientOptions);
    return new Store({ client, name: input });
  }
  if (typeof input?.name === "string" && typeof input?.siteID === "string" && typeof input?.token === "string") {
    const { name, siteID, token } = input;
    const clientOptions = getClientOptions(input, { siteID, token });
    if (!name || !siteID || !token) {
      throw new MissingBlobsEnvironmentError(["name", "siteID", "token"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, name });
  }
  if (typeof input?.name === "string") {
    const { name } = input;
    const clientOptions = getClientOptions(input);
    if (!name) {
      throw new MissingBlobsEnvironmentError(["name"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, name });
  }
  if (typeof input?.deployID === "string") {
    const clientOptions = getClientOptions(input);
    const { deployID } = input;
    if (!deployID) {
      throw new MissingBlobsEnvironmentError(["deployID"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, deployID });
  }
  throw new Error(
    "The `getStore` method requires the name of the store as a string or as the `name` property of an options object"
  );
};

// functions/lead.mjs
var BUILD = "2026-10-17b";
var AUD = { fitness: "Fitnessstudio", physio: "Physio-Studio", partner: "Hersteller / Partner" };
var CFG = {};
async function loadCfg() {
  try {
    CFG = await getStore("trackbar-config").get("env", { type: "json" }) || {};
  } catch (e) {
    CFG = {};
  }
}
var env = (k) => String(CFG[k] || process.env[k] || "").trim();
var clean = (v, n = 200) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
var esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function hostAllowed(host) {
  if (!host) return false;
  const extra = env("TB_ALLOWED_HOSTS").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const list = ["trackbar-b2b-entwurf-expf.netlify.app", "trackbar-b2b.com", "www.trackbar-b2b.com", ...extra];
  host = host.toLowerCase();
  return list.includes(host) || /--trackbar-b2b-entwurf-expf\.netlify\.app$/.test(host);
}
// Spamschutz (17.10.2026): Plausibilitaet von Name, Telefon und E-Mail, Wegwerf-Adressen, Mailserver-Pruefung
var JUNK = /^(test|tester|testing|asdf\w*|qwer\w*|yxcv\w*|abc|abcd|xxx+|aaa+|foo|bar|admin|name|vorname|nachname|max mustermann|mustermann|keine|none|null|nix|spam|fake|hallo|hi)$/i;
var DISPOSABLE = /@(.*\.)?(mailinator|guerrillamail|sharklasers|grr|10minutemail|10minmail|tempmail|temp-mail|tempmailo|tmpmail|trashmail|trash-mail|yopmail|wegwerfmail|wegwerfemail|einrot|spamgourmet|getnada|nada|dispostable|maildrop|throwawaymail|fakeinbox|fakemail|mohmal|emailondeck|mintemail|spam4|byom|moakt|tempr|discard|mailnesia|mytemp|minuteinbox|burnermail|33mail)\./i;
function nameOk(v) {
  const s = String(v || "").trim();
  if (!/^[\p{L}][\p{L}\s.'’-]{1,79}$/u.test(s)) return false;
  if (JUNK.test(s) || /^(.)\1+$/i.test(s.replace(/\s/g, ""))) return false;
  return /[aeiouyäöüàáâèéêìíîòóôùúû]/i.test(s);
}
function orgOk(v) {
  const s = String(v || "").trim();
  return s.length >= 2 && !/https?:|www\./i.test(s) && !JUNK.test(s) && !/^(.)\1+$/i.test(s.replace(/\s/g, "")) && /\p{L}/u.test(s);
}
var SEQ = "0123456789012345678909876543210987654321";
function phoneOk(raw) {
  const s = String(raw || "").trim();
  if (!s || /[^\d\s+()\/.-]/.test(s)) return false;
  const dg = s.replace(/\D/g, "");
  if (dg.length < 8 || dg.length > 15) return false;
  let nat = dg;
  if (s.startsWith("+") || dg.startsWith("00")) nat = dg.replace(/^00/, "").replace(/^(49|43|41|31|32|352|39|33|34|44|45|46|47|48|420|421|36|386|385|40|359|30|351|353|358|370|371|372|1)/, "");
  else nat = dg.replace(/^0+/, "");
  if (nat.length < 6 || new Set(nat).size < 3) return false;
  if (/(\d)\1{5,}/.test(dg)) return false;
  for (let i = 0; i + 7 <= nat.length; i++) if (SEQ.includes(nat.slice(i, i + 7))) return false;
  if (nat.length <= 9 && SEQ.includes(nat)) return false;
  return true;
}
async function mailDomainOk(email) {
  const dom = String(email).split("@")[1];
  if (!dom) return false;
  const tryRes = (fn) => Promise.race([fn().then((r) => Array.isArray(r) && r.length > 0, (e) => (e && /ENOTFOUND|ENODATA|NXDOMAIN|ESERVFAIL/.test(e.code || "")) ? false : null), new Promise((r) => setTimeout(() => r(null), 2500))]);
  const mx = await tryRes(() => dns.resolveMx(dom));
  if (mx === true) return true;
  const a = await tryRes(() => dns.resolve4(dom));
  if (a === true) return true;
  return mx === null && a === null ? true : false;
}
function normalizePhone(raw) {
  const cleaned = String(raw || "").replace(/[^\d+]/g, "");
  if (cleaned.replace(/\D/g, "").length < 6) return null;
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
  const cc = env("TB_SMS_DEFAULT_CC") || "+49";
  if (cleaned.startsWith("0")) return cc + cleaned.slice(1);
  return cc + cleaned;
}
async function sendMail({ to, subject, html, text, replyTo }) {
  const key = env("TB_RESEND_API_KEY"), from = env("TB_MAIL_FROM");
  if (!key || !from) return { skipped: "no mail config" };
  try {
    const body = { from, to: Array.isArray(to) ? to : [to], subject, html, text };
    if (replyTo) body.reply_to = replyTo;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error("Mail error", res.status, raw.slice(0, 300));
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (e) {
    console.error("Mail exception", e);
    return { ok: false, error: String(e) };
  }
}
async function sendSMS(nr, text) {
  const key = env("TB_SEVEN_IO_API_KEY");
  if (!key) return { skipped: "no sms key" };
  if (!nr) return { skipped: "no phone" };
  try {
    const sender = env("TB_SMS_SENDER");
    const payload = { to: nr, text, json: 1 };
    if (sender) payload.from = sender;
    const res = await fetch("https://gateway.seven.io/api/sms", {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json", SentWith: "trackbar-b2b" },
      body: JSON.stringify(payload)
    });
    const raw = await res.text();
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
    }
    const code = parsed && parsed.success != null ? String(parsed.success) : raw.trim();
    if (code === "100" || code === "101") return { ok: true, code };
    console.error("SMS abgelehnt", { code, sender: sender || "(numerisch)", raw: raw.slice(0, 300) });
    return { ok: false, code };
  } catch (e) {
    console.error("SMS exception", e);
    return { ok: false, error: String(e) };
  }
}
function mailHtml(first, reach, page) {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#F3F4F4;font-family:Arial,Helvetica,sans-serif;color:#0A0B0A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F4;padding:24px 0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0A0B0A;padding:22px 28px;color:#fff;font-weight:800;font-size:18px;letter-spacing:.5px">TRACKBAR<span style="color:#97D700">.</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.25">Danke, ${esc(first)}. Deine Anfrage ist angekommen.</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#4A5565">Das Trackbar-Team meldet sich bei dir${reach ? " am " + esc(reach) : ""}. Deine Angaben schauen wir uns vorher an.</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4A5565">Bis dahin kannst du die Software direkt im Browser ausprobieren.</p>
<a href="${esc(page)}#demo" style="display:inline-block;background:#97D700;color:#0A0B0A;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px">Software ausprobieren</a>
<p style="margin:26px 0 0;font-size:15px;line-height:1.6">Viele Gr\xFC\xDFe<br>dein Trackbar-Team</p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #E8EBED;font-size:12px;color:#6A7282">Trackbar, SKAIN GmbH \xB7 <a href="https://www.trackbar.com/impressum/" style="color:#6A7282">Impressum</a> \xB7 <a href="https://trackbar-b2b.com/datenschutz/" style="color:#6A7282">Datenschutz</a></td></tr>
</table></td></tr></table></body></html>`;
}
var lead_default = async (req, context) => {
  await loadCfg();
  if (req.method === "GET" && new URL(req.url).searchParams.get("diag") === "1") {
    return Response.json({ build: BUILD, mail: !!(env("TB_RESEND_API_KEY") && env("TB_MAIL_FROM")), sms: !!env("TB_SEVEN_IO_API_KEY"), notify: !!env("TB_LEAD_NOTIFY_TO") });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let originHost = "";
  try {
    originHost = new URL(req.headers.get("origin") || req.headers.get("referer") || "").host;
  } catch (e) {
  }
  if (!hostAllowed(originHost)) return Response.json({ ok: false, error: "origin" }, { status: 403 });
  let d;
  try {
    d = await req.json();
  } catch (e) {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  if (d && clean(d.website)) return Response.json({ ok: true });
  // Zeitfalle: Menschen brauchen fuer drei Fragen plus Kontaktdaten deutlich laenger als 4 s
  if (d && typeof d.t === "number" && d.t >= 0 && d.t < 4e3) return Response.json({ ok: true });
  const k = d && d.kontakt ? d.kontakt : {};
  const lead = {
    zeit: (/* @__PURE__ */ new Date()).toISOString(),
    bereich: AUD[d.bereich] ? d.bereich : "fitness",
    name: clean(k.name, 120),
    org: clean(k.org, 160),
    email: clean(k.email, 160),
    tel: clean(k.tel, 40),
    extra: clean(k.ort || k.position || "", 120),
    reach: (Array.isArray(d.erreichbar) ? d.erreichbar : []).map((x) => clean(x, 20)).filter(Boolean).slice(0, 4),
    antworten: {},
    fragen: {}
  };
  if (d.antworten && typeof d.antworten === "object") for (const key of Object.keys(d.antworten).slice(0, 8)) {
    const v = d.antworten[key];
    lead.antworten[clean(key, 20)] = clean(Array.isArray(v) ? v.join(", ") : v, 300);
    if (d.fragen && d.fragen[key]) lead.fragen[clean(key, 20)] = clean(d.fragen[key], 160);
  }
  const fields = [];
  if (!nameOk(lead.name)) fields.push("name");
  if (!orgOk(lead.org)) fields.push("org");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email) || JUNK.test(lead.email.split("@")[0])) fields.push("email");
  else if (DISPOSABLE.test(lead.email)) fields.push("email-wegwerf");
  if (!phoneOk(lead.tel)) fields.push("tel");
  if (fields.length) return Response.json({ ok: false, error: "invalid contact", fields }, { status: 422 });
  if (/@(example\.(com|org|net)|[^@\s]+\.(test|invalid|example))$/i.test(lead.email)) {
    return Response.json({ ok: true, dry: true, mail: "dry-run", sms: "dry-run" });
  }
  if (!await mailDomainOk(lead.email)) return Response.json({ ok: false, error: "invalid contact", fields: ["email-domain"] }, { status: 422 });
  const store = getStore("trackbar-leads");
  const ip = context && context.ip || req.headers.get("x-nf-client-connection-ip") || "unbekannt";
  const now = Date.now();
  // IP nur als Pruefwert (Hash), nie im Klartext gespeichert
  const rlKey = "rl/" + createHash("sha256").update("tb-rl:" + ip).digest("hex").slice(0, 32);
  const hits = (await store.get(rlKey, { type: "json" }) || []).filter((t) => now - t < 36e5);
  if (hits.length >= 5) return Response.json({ ok: false, error: "rate" }, { status: 429 });
  await store.setJSON(rlKey, [...hits, now]);
  // Doppelt abgeschickt: dieselbe Adresse innerhalb von 10 Minuten nur einmal verarbeiten
  const dKey = "dup/" + lead.email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  const dup = await store.get(dKey, { type: "json" });
  if (dup && now - dup.t < 6e5) return Response.json({ ok: true, mail: "dup", sms: "dup" });
  await store.setJSON(dKey, { t: now });
  await store.setJSON("lead/" + lead.zeit + "-" + Math.random().toString(36).slice(2, 8), lead);
  const first = lead.name.split(/\s+/)[0];
  const aud = AUD[lead.bereich];
  const reach = lead.reach.join(", ").replace(/, ([^,]*)$/, " oder $1");
  const page = env("TB_SITE_URL") || "https://trackbar-b2b-entwurf-expf.netlify.app/";
  const nr = normalizePhone(lead.tel);
  let smsAllowed = !!nr;
  if (nr) {
    const sKey = "sms/" + nr.replace(/\D/g, "");
    const last = await store.get(sKey, { type: "json" });
    if (last && now - last.t < 864e5) smsAllowed = false;
    else await store.setJSON(sKey, { t: now });
  }
  const rows = Object.keys(lead.antworten).map((key) => `${lead.fragen[key] || key}: ${lead.antworten[key]}`);
  const internalText = [
    `Neue Anfrage \xFCber die B2B-Seite (${aud})`,
    "",
    `Name: ${lead.name}`,
    `Unternehmen: ${lead.org}`,
    `E-Mail: ${lead.email}`,
    `Telefon: ${lead.tel}`,
    lead.extra ? `Zusatz: ${lead.extra}` : "",
    `Erreichbar: ${reach || "-"}`,
    "",
    ...rows
  ].join("\n");
  const [mailLead, mailTeam, sms] = await Promise.all([
    sendMail({
      to: lead.email,
      subject: "Deine Anfrage bei Trackbar",
      replyTo: env("TB_MAIL_REPLY_TO") || void 0,
      html: mailHtml(first, reach, page),
      text: `Danke, ${first}. Deine Anfrage ist angekommen.

Das Trackbar-Team meldet sich bei dir${reach ? " am " + reach : ""}.
Software ausprobieren: ${page}#demo

Viele Gr\xFC\xDFe
dein Trackbar-Team`
    }),
    env("TB_LEAD_NOTIFY_TO") ? sendMail({
      to: env("TB_LEAD_NOTIFY_TO").split(",").map((x) => x.trim()).filter(Boolean),
      subject: `Neue Anfrage: ${lead.org || lead.name} (${aud})`,
      replyTo: lead.email,
      text: internalText,
      html: '<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">' + esc(internalText) + "</pre>"
    }) : Promise.resolve({ skipped: "no notify address" }),
    smsAllowed ? sendSMS(nr, `Danke f\xFCr deine Anfrage bei Trackbar, ${first}! Wir melden uns${reach ? " am " + reach : ""}. Dein Trackbar-Team`) : Promise.resolve({ skipped: "sms limit" })
  ]);
  console.log("lead", { build: BUILD, bereich: lead.bereich, mailLead, mailTeam, sms });
  return Response.json({ ok: true, mail: mailLead.ok ? "sent" : mailLead.skipped || "error", sms: sms.ok ? "sent" : sms.skipped || "error" });
};
export {
  lead_default as default
};
