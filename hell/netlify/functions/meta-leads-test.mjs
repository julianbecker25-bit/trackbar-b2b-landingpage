// ../../isokiro-demo-lp/_functions-src/node_modules/@netlify/runtime-utils/dist/main.js
var getString = (input) => typeof input === "string" ? input : JSON.stringify(input);
var base64Decode = globalThis.Buffer ? (input) => Buffer.from(input, "base64").toString() : (input) => atob(input);
var base64Encode = globalThis.Buffer ? (input) => Buffer.from(getString(input)).toString("base64") : (input) => btoa(getString(input));
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

// ../../isokiro-demo-lp/_functions-src/node_modules/@netlify/otel/dist/main.js
var GET_TRACER = "__netlify__getTracer";
var getTracer = (name, version) => {
  return globalThis[GET_TRACER]?.(name, version);
};
function withActiveSpan(tracer, name, optionsOrFn, contextOrFn, fn) {
  const func = typeof contextOrFn === "function" ? contextOrFn : typeof optionsOrFn === "function" ? optionsOrFn : fn;
  if (!func) {
    throw new Error("function to execute with active span is missing");
  }
  if (!tracer) {
    return func();
  }
  return tracer.withActiveSpan(name, optionsOrFn, contextOrFn, func);
}

// ../../isokiro-demo-lp/_functions-src/node_modules/@netlify/blobs/dist/chunk-SQCJ2S3G.js
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
  if (!header?.startsWith(BASE64_PREFIX)) {
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
var NF_ERROR = "x-nf-error";
var NF_REQUEST_ID = "x-nf-request-id";
var DEPLOY_STORE_PREFIX = "deploy:";
var SITE_STORE_PREFIX = "site:";
var isDeniedWrite = (res, { method, storeName }) => (res.status === 401 || res.status === 403) && (method === "put" || method === "delete") && storeName !== void 0 && !storeName.startsWith(DEPLOY_STORE_PREFIX);
var blobsErrorMessage = (res, context, responseBody) => {
  let details = res.headers.get(NF_ERROR) || `${res.status} status code`;
  if (res.headers.has(NF_REQUEST_ID)) {
    details += `, ID: ${res.headers.get(NF_REQUEST_ID)}`;
  }
  if (isDeniedWrite(res, context)) {
    const storeName = context.storeName?.startsWith(SITE_STORE_PREFIX) ? context.storeName.slice(SITE_STORE_PREFIX.length) : context.storeName;
    const summary = `Netlify Blobs could not write to store '${storeName}' (${details}).`;
    if (context.edgeAccess) {
      return summary;
    }
    return `${summary} Builds and build plugins can only write to deploy-specific stores: use 'getDeployStore' instead of 'getStore', or pass a 'token' with write access to the store. If this code is not running in a build, check that the token and site ID are valid. See https://docs.netlify.com/build/data-and-storage/netlify-blobs/#deploy-specific-stores`;
  }
  let message = `Netlify Blobs has generated an internal error (${details})`;
  if (!res.headers.get(NF_ERROR) && responseBody) {
    message += `: ${responseBody}`;
  }
  return message;
};
var BlobsInternalError = class extends Error {
  constructor(res, context = {}, responseBody) {
    super(blobsErrorMessage(res, context, responseBody));
    this.name = "BlobsInternalError";
    this.status = res.status;
    this.responseBody = responseBody;
  }
};
var createBlobsInternalError = async (res, context = {}) => {
  const responseBody = await res.clone().text().catch(() => void 0);
  return new BlobsInternalError(res, context, responseBody);
};
var discardBody = async (res) => {
  await res.body?.cancel().catch(() => {
  });
};
var collectIterator = async (iterator) => {
  const result = [];
  for await (const item of iterator) {
    result.push(item);
  }
  return result;
};
function withSpan(span, name, fn) {
  if (span) return fn(span);
  return withActiveSpan(getTracer(), name, (span2) => {
    return fn(span2);
  });
}
var BlobsConsistencyError = class extends Error {
  constructor() {
    super(
      `Netlify Blobs has failed to perform a read using strong consistency because the environment has not been configured with a 'uncachedEdgeURL' property`
    );
    this.name = "BlobsConsistencyError";
  }
};
var REGION_AUTO = "auto";
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
var fetchAndRetry = async (fetch2, url, options, attemptsLeft = MAX_RETRY, getRetryUrl) => {
  try {
    const res = await fetch2(url, options);
    const isRetryable = res.status === 429 || res.status >= 500 || getRetryUrl !== void 0 && res.status === 403;
    if (attemptsLeft > 0 && isRetryable) {
      await discardBody(res);
      const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
      await sleep(delay);
      const retryUrl = getRetryUrl ? await getRetryUrl() : url;
      return fetchAndRetry(fetch2, retryUrl, options, attemptsLeft - 1, getRetryUrl);
    }
    return res;
  } catch (error) {
    if (attemptsLeft === 0) {
      throw error;
    }
    const delay = getDelay();
    await sleep(delay);
    const retryUrl = getRetryUrl ? await getRetryUrl() : url;
    return fetchAndRetry(fetch2, retryUrl, options, attemptsLeft - 1, getRetryUrl);
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
  /**
   * Whether requests reach Blobs through the edge rather than the API. Only
   * runtime environments are given an edge URL.
   */
  get edgeAccess() {
    return this.edgeURL !== void 0;
  }
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
      throw await createBlobsInternalError(res, { edgeAccess: this.edgeAccess, method, storeName });
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
    conditions = {},
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
    if ("onlyIfMatch" in conditions && conditions.onlyIfMatch) {
      headers["if-match"] = conditions.onlyIfMatch;
    } else if ("onlyIfNew" in conditions && conditions.onlyIfNew) {
      headers["if-none-match"] = "*";
    }
    const options = {
      body,
      headers,
      method
    };
    if (body instanceof ReadableStream) {
      options.duplex = "half";
    }
    const usesSignedUrl = !this.edgeURL && key !== void 0 && storeName !== void 0 && method !== "head" && method !== "delete";
    let getRetryUrl;
    if (usesSignedUrl) {
      getRetryUrl = async () => {
        const finalRequest = await this.getFinalRequest({ consistency, key, metadata, method, parameters, storeName });
        return finalRequest.url;
      };
    }
    return fetchAndRetry(this.fetch, url, options, void 0, getRetryUrl);
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

// ../../isokiro-demo-lp/_functions-src/node_modules/@netlify/blobs/dist/main.js
var LEGACY_STORE_INTERNAL_PREFIX = "netlify-internal/legacy-namespace/";
var STATUS_OK = 200;
var STATUS_PRE_CONDITION_FAILED = 412;
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
    await discardBody(res);
    if (![200, 204, 404].includes(res.status)) {
      throw new BlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "delete",
        storeName: this.name
      });
    }
  }
  async deleteAll() {
    let totalDeletedBlobs = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await this.client.makeRequest({ method: "delete", storeName: this.name });
      if (res.status !== 200) {
        await discardBody(res);
        throw new BlobsInternalError(res, {
          edgeAccess: this.client.edgeAccess,
          method: "delete",
          storeName: this.name
        });
      }
      const data = await res.json();
      if (typeof data.blobs_deleted !== "number") {
        throw new BlobsInternalError(res);
      }
      totalDeletedBlobs += data.blobs_deleted;
      hasMore = typeof data.has_more === "boolean" && data.has_more;
    }
    return {
      deletedBlobs: totalDeletedBlobs
    };
  }
  async get(key, options) {
    return withSpan(options?.span, "blobs.get", async (span) => {
      const { consistency, type } = options ?? {};
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.type": type,
        "blobs.method": "GET",
        "blobs.consistency": consistency
      });
      const res = await this.client.makeRequest({
        consistency,
        key,
        method: "get",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        await discardBody(res);
        return null;
      }
      if (res.status !== 200) {
        await discardBody(res);
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
      await discardBody(res);
      throw new BlobsInternalError(res);
    });
  }
  async getMetadata(key, options = {}) {
    return withSpan(options?.span, "blobs.getMetadata", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "HEAD",
        "blobs.consistency": options.consistency
      });
      const res = await this.client.makeRequest({
        consistency: options.consistency,
        key,
        method: "head",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.status": res.status
      });
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
    });
  }
  async getWithMetadata(key, options) {
    return withSpan(options?.span, "blobs.getWithMetadata", async (span) => {
      const { consistency, etag: requestETag, type } = options ?? {};
      const headers = requestETag ? { "if-none-match": requestETag } : void 0;
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "GET",
        "blobs.consistency": options?.consistency,
        "blobs.type": type,
        "blobs.request.etag": requestETag
      });
      const res = await this.client.makeRequest({
        consistency,
        headers,
        key,
        method: "get",
        storeName: this.name
      });
      const responseETag = res?.headers.get("etag") ?? void 0;
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.etag": responseETag,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        await discardBody(res);
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        await discardBody(res);
        throw new BlobsInternalError(res);
      }
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
      await discardBody(res);
      throw new Error(`Invalid 'type' property: ${type}. Expected: arrayBuffer, blob, json, stream, or text.`);
    });
  }
  list(options = {}) {
    return withSpan(options.span, "blobs.list", (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.method": "GET",
        "blobs.list.paginate": options.paginate ?? false
      });
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
    });
  }
  async set(key, data, options = {}) {
    return withSpan(options.span, "blobs.set", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.size": typeof data == "string" ? data.length : data instanceof Blob ? data.size : data.byteLength,
        "blobs.data.type": typeof data == "string" ? "string" : data instanceof Blob ? "blob" : "arrayBuffer",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const res = await this.client.makeRequest({
        conditions,
        body: data,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        await discardBody(res);
        return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
      }
      if (res.status === STATUS_OK) {
        await discardBody(res);
        return {
          etag,
          modified: true
        };
      }
      throw await createBlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "put",
        storeName: this.name
      });
    });
  }
  async setJSON(key, data, options = {}) {
    return withSpan(options.span, "blobs.setJSON", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.type": "json",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const payload = JSON.stringify(data);
      const headers = {
        "content-type": "application/json"
      };
      const res = await this.client.makeRequest({
        conditions,
        body: payload,
        headers,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      await discardBody(res);
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
      }
      if (res.status === STATUS_OK) {
        return {
          etag,
          modified: true
        };
      }
      throw new BlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "put",
        storeName: this.name
      });
    });
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
  static getConditions(options) {
    if ("onlyIfMatch" in options && "onlyIfNew" in options) {
      throw new Error(
        `The 'onlyIfMatch' and 'onlyIfNew' options are mutually exclusive. Using 'onlyIfMatch' will make the write succeed only if there is an entry for the key with the given content, while 'onlyIfNew' will make the write succeed only if there is no entry for the key.`
      );
    }
    if ("onlyIfMatch" in options && options.onlyIfMatch) {
      if (typeof options.onlyIfMatch !== "string") {
        throw new Error(`The 'onlyIfMatch' property expects a string representing an ETag.`);
      }
      return {
        onlyIfMatch: options.onlyIfMatch
      };
    }
    if ("onlyIfNew" in options && options.onlyIfNew) {
      if (typeof options.onlyIfNew !== "boolean") {
        throw new Error(
          `The 'onlyIfNew' property expects a boolean indicating whether the write should fail if an entry for the key already exists.`
        );
      }
      return {
        onlyIfNew: true
      };
    }
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
            return withSpan(options?.span, "blobs.list.next", async (span) => {
              span?.setAttributes({
                "blobs.store": storeName,
                "blobs.method": "GET",
                "blobs.list.paginate": options?.paginate ?? false,
                "blobs.list.done": done,
                "blobs.list.cursor": currentCursor ?? void 0
              });
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
              span?.setAttributes({
                "blobs.response.status": res.status
              });
              let blobs = [];
              let directories = [];
              if (![200, 204, 404].includes(res.status)) {
                await discardBody(res);
                throw new BlobsInternalError(res);
              }
              if (res.status === 404) {
                await discardBody(res);
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
            });
          }
        };
      }
    };
  }
};
var getDeployStoreRegion = (clientOptions, context) => {
  if (clientOptions.region) {
    return clientOptions.region;
  }
  if (clientOptions.edgeURL || clientOptions.uncachedEdgeURL) {
    if (!context.primaryRegion) {
      throw new Error(
        "When accessing a deploy store, the Netlify Blobs client needs to be configured with a region, and one was not found in the environment. To manually set the region, set the `region` property in the store options. If you are using the Netlify CLI, you may have an outdated version; run `npm install -g netlify-cli@latest` to update and try again."
      );
    }
    return context.primaryRegion;
  }
  return REGION_AUTO;
};
var getStore = (input, options) => {
  if (typeof input === "string") {
    const contextOverride = options?.siteID && options?.token ? { siteID: options?.siteID, token: options?.token } : void 0;
    const clientOptions = getClientOptions(options ?? {}, contextOverride);
    const client = new Client(clientOptions);
    return new Store({ client, name: input });
  }
  if (typeof input?.name === "string") {
    const { name } = input;
    const contextOverride = input?.siteID && input?.token ? { siteID: input?.siteID, token: input?.token } : void 0;
    const clientOptions = getClientOptions(input, contextOverride);
    if (!name) {
      throw new MissingBlobsEnvironmentError(["name"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, name });
  }
  if (typeof input?.deployID === "string") {
    const context = getEnvironmentContext();
    const clientOptions = getClientOptions(input, context);
    const { deployID } = input;
    if (!deployID) {
      throw new MissingBlobsEnvironmentError(["deployID"]);
    }
    clientOptions.region = getDeployStoreRegion(clientOptions, context);
    const client = new Client(clientOptions);
    return new Store({ client, deployID });
  }
  throw new Error(
    "The `getStore` method requires the name of the store as a string or as the `name` property of an options object"
  );
};

// meta-core.mjs
var SHEET_ID = "1WgQp6-U0CHS8uCrRoHWwVt7WrAQAEN5TSTCMK_eI1uQ";
var NOTIFY = ["kontakt@expertenfilm.de"];
var STORE = "trackbar-meta-leads";
var MAX_AGE_MS = 48 * 36e5;
var RETRY_MS = 24 * 36e5;
var ALERT_AFTER_MS = 15 * 6e4;
var ALERT_EVERY_MS = 6 * 36e5;
var store = () => getStore({ name: STORE, consistency: "strong" });
async function loadCfg() {
  try {
    return await getStore("trackbar-config").get("env", { type: "json" }) || {};
  } catch (e) {
    return {};
  }
}
var esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function parseCSV(text) {
  const rows = [];
  let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(f);
      f = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = "";
    } else f += c;
  }
  if (f !== "" || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ""));
}
async function fetchText(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 1e4);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: "follow" });
    const body = await r.text();
    return { ok: r.ok, status: r.status, body, type: r.headers.get("content-type") || "" };
  } finally {
    clearTimeout(t);
  }
}
async function listGids() {
  const r = await fetchText(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`);
  if (!r.ok) throw new Error("htmlview " + r.status);
  const gids = [...new Set([...r.body.matchAll(/gid: "(\d+)"/g)].map((m) => m[1]))];
  return gids.length ? gids : ["0"];
}
async function readTab(gid) {
  const r = await fetchText(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`);
  if (!r.ok || /text\/html/i.test(r.type)) throw new Error(`csv gid ${gid}: ${r.status}`);
  const rows = parseCSV(r.body);
  if (!rows.length) return [];
  const head = rows[0].map((h) => String(h).trim());
  return rows.slice(1).map((r2) => Object.fromEntries(head.map((h, i) => [h, (r2[i] || "").trim()])));
}
var LABEL = {
  full_name: "Name",
  "full name": "Name",
  name: "Name",
  email: "E-Mail",
  phone_number: "Telefon",
  name_des_unternehmens: "Unternehmen",
  company_name: "Unternehmen",
  "was_interessiert_dich_an_trackbar?": "Was interessiert dich an Trackbar?",
  "wie_viele_anlagen_umfasst_deine_einrichtung?": "Wie viele Anlagen umfasst deine Einrichtung?",
  "wie_k\xF6nnen_wir_dich_am_besten_erreichen?": "Wie k\xF6nnen wir dich am besten erreichen?",
  campaign_name: "Kampagne",
  adset_name: "Anzeigengruppe",
  ad_name: "Anzeige",
  form_name: "Formular",
  platform: "Plattform",
  is_organic: "Organisch",
  created_time: "Eingang",
  lead_status: "Lead-Status",
  id: "Lead-ID"
};
var SKIP = /* @__PURE__ */ new Set(["ad_id", "adset_id", "campaign_id", "form_id"]);
var FIRST = ["full_name", "full name", "name_des_unternehmens", "company_name", "email", "phone_number"];
var LAST = ["campaign_name", "adset_name", "ad_name", "form_name", "platform", "is_organic", "created_time", "lead_status", "id"];
var nice = (k) => LABEL[k] || k.replace(/_/g, " ").replace(/\?$/, "?").replace(/^\w/, (c) => c.toUpperCase());
var pick = (lead, keys) => {
  for (const k of keys) if (lead[k]) return lead[k];
  return "";
};
var cleanVal = (k, v) => {
  if (k === "phone_number") return v.replace(/^p:/, "");
  if (k === "created_time") {
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) + " Uhr";
  }
  if (k === "platform") return { fb: "Facebook", ig: "Instagram", an: "Audience Network", msg: "Messenger" }[v] || v;
  if (k === "is_organic") return v === "true" ? "ja" : v === "false" ? "nein" : v;
  if (FIRST.includes(k) || LAST.includes(k) || k === "name") return v;
  return v.replace(/_/g, " ");
};
function isTest(lead) {
  if (String(lead.lead_status || "").trim().toUpperCase() === "TEST") return true;
  if (Object.values(lead).some((v) => /^<test lead: dummy data/i.test(String(v)))) return true;
  return /^(test@meta\.com|test@fb\.com)$/i.test(String(lead.email || "").trim());
}
function buildMail(lead) {
  const test = isTest(lead);
  const name = pick(lead, ["full_name", "full name", "name"]);
  const org = pick(lead, ["name_des_unternehmens", "company_name"]);
  const keys = Object.keys(lead).filter((k) => !SKIP.has(k) && lead[k] !== "");
  const order = [...FIRST.filter((k) => keys.includes(k)), ...keys.filter((k) => !FIRST.includes(k) && !LAST.includes(k)), ...LAST.filter((k) => keys.includes(k))];
  const rows = order.map((k) => [nice(k), cleanVal(k, lead[k])]);
  const subject = `${test ? "[TEST] " : ""}Neuer Trackbar-Lead (Sofortformular): ${org || name || "ohne Namen"}`;
  const text = ["Neuer Lead aus dem Trackbar-Sofortformular (Meta)", "", ...rows.map(([a, b]) => `${a}: ${b}`)].join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0A0B0A"><p style="margin:0 0 12px;font-weight:bold">Neuer Lead aus dem Trackbar-Sofortformular (Meta)${test ? " [TEST]" : ""}</p><table cellpadding="6" cellspacing="0" style="border-collapse:collapse">${rows.map(([a, b]) => `<tr><td style="border-bottom:1px solid #E8EBED;color:#6A7282;vertical-align:top;white-space:nowrap">${esc(a)}</td><td style="border-bottom:1px solid #E8EBED">${esc(b)}</td></tr>`).join("")}</table></div>`;
  return { subject, text, html, replyTo: /@/.test(lead.email || "") ? lead.email : void 0 };
}
async function sendMail(cfg, to, m) {
  const key = String(cfg.TB_RESEND_API_KEY || process.env.TB_RESEND_API_KEY || "").trim();
  const from = String(cfg.TB_MAIL_FROM || process.env.TB_MAIL_FROM || "").trim();
  if (!key || !from) return { ok: false, error: "no mail config" };
  const body = { from, to, subject: m.subject, text: m.text, html: m.html };
  if (m.replyTo) body.reply_to = m.replyTo;
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const raw = await r.text();
    if (!r.ok) return { ok: false, status: r.status, error: raw.slice(0, 200) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
var leadKey = (id) => "lead/" + String(id).replace(/^l:/, "").replace(/[^0-9A-Za-z_-]/g, "_");
async function run({ dry = false } = {}) {
  const st = store();
  const cfg = await loadCfg();
  const now = Date.now();
  const out = { tabs: [], rows: 0, sent: 0, skipped_old: 0, baseline: false, errors: [] };
  const health = await st.get("meta/health", { type: "json" }) || {};
  let leads = [];
  try {
    const gids = await listGids();
    for (const gid of gids) {
      const rows = await readTab(gid);
      out.tabs.push({ gid, rows: rows.length });
      leads.push(...rows);
    }
    health.lastOk = now;
    health.firstFail = null;
  } catch (e) {
    out.errors.push("sheet: " + e.message);
    health.firstFail = health.firstFail || now;
    if (now - health.firstFail > ALERT_AFTER_MS && now - (health.lastAlert || 0) > ALERT_EVERY_MS && !dry) {
      const r = await sendMail(cfg, NOTIFY, { subject: "Hinweis: Trackbar-Lead-Sheet nicht lesbar", text: `Das Sheet mit den Trackbar-Sofortformular-Leads ist seit ${Math.round((now - health.firstFail) / 6e4)} Minuten nicht lesbar (${e.message}). Neue Leads kommen solange nicht per Mail. Bitte im Meta-Leads-Center nachsehen.

https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`, html: "" });
      if (r.ok) health.lastAlert = now;
    }
    await st.setJSON("meta/health", health);
    return out;
  }
  await st.setJSON("meta/health", health);
  out.rows = leads.length;
  const base = await st.get("meta/baseline", { type: "json" });
  if (!base) {
    for (const l of leads) {
      const lid = l.id || `x:${l.created_time}|${l.email}|${l.phone_number}`;
      await st.setJSON(leadKey(lid), { t: now, sent: true, baseline: true });
    }
    if (!dry) await st.setJSON("meta/baseline", { t: now, marked: leads.length });
    out.baseline = true;
    out.marked = leads.length;
    return out;
  }
  for (const l of leads) {
    const lid = l.id || (l.created_time || l.email || l.phone_number ? `x:${l.created_time}|${l.email}|${l.phone_number}` : "");
    if (!lid) continue;
    const k = leadKey(lid);
    let rec = await st.get(k, { type: "json" });
    if (rec && rec.sent) continue;
    if (!rec) {
      const ct = Date.parse(l.created_time || "");
      if (!isNaN(ct) && now - ct > MAX_AGE_MS) {
        await st.setJSON(k, { t: now, sent: true, old: true });
        out.skipped_old++;
        continue;
      }
      rec = { t: now, sent: false, tries: 0 };
      const w = await st.setJSON(k, rec, { onlyIfNew: true });
      if (w && w.modified === false) continue;
    }
    if (now - rec.t > RETRY_MS) {
      if (!rec.gaveUp && !dry) {
        const h = await sendMail(cfg, NOTIFY, { subject: "Hinweis: Trackbar-Lead konnte nicht gemeldet werden", text: `Ein Lead aus dem Trackbar-Sofortformular konnte 24 Stunden lang nicht per Mail gemeldet werden (${rec.lastError || "unbekannter Fehler"}). Bitte im Sheet oder im Meta-Leads-Center nachsehen.

Name: ${pick(l, ["full_name", "full name", "name"])}
Unternehmen: ${pick(l, ["name_des_unternehmens", "company_name"])}
Telefon: ${String(l.phone_number || "").replace(/^p:/, "")}
E-Mail: ${l.email || ""}

https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`, html: "" });
        if (h.ok) await st.setJSON(k, { ...rec, gaveUp: Date.now() });
      }
      continue;
    }
    if (rec.sending && now - rec.sending < 12e4) continue;
    if (dry) {
      out.sent++;
      continue;
    }
    await st.setJSON(k, { ...rec, sending: now });
    const r = await sendMail(cfg, NOTIFY, buildMail(l));
    if (r.ok) {
      await st.setJSON(k, { ...rec, sending: 0, sent: true, sentAt: Date.now() });
      out.sent++;
    } else {
      await st.setJSON(k, { ...rec, sending: 0, tries: (rec.tries || 0) + 1, lastError: r.error || r.status });
      out.errors.push(`mail ${lid}: ${r.error || r.status}`);
    }
  }
  return out;
}

// meta-leads-test.mjs
var meta_leads_test_default = async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const cfg = await loadCfg();
  const secret = String(cfg.TB_META_SECRET || "").trim();
  if (!secret || req.headers.get("x-lead-secret") !== secret) return Response.json({ ok: false }, { status: 401 });
  let d = {};
  try {
    d = await req.json();
  } catch (e) {
  }
  if (d.mode === "status") {
    const gids = await listGids();
    const tabs = [];
    for (const g of gids) tabs.push({ gid: g, rows: (await readTab(g)).length });
    return Response.json({ ok: true, tabs, notify: NOTIFY });
  }
  if (d.mode === "run") return Response.json({ ok: true, ...await run() });
  if (d.mode === "demo") {
    const m = buildMail({ id: "l:demo", created_time: (/* @__PURE__ */ new Date()).toISOString(), campaign_name: "Okt 26 broad", adset_name: "Demo", ad_name: "Demo", form_name: "Trackbar Logic-shorter", platform: "ig", is_organic: "false", "was_interessiert_dich_an_trackbar?": "Demo-Antwort", "wie_viele_anlagen_umfasst_deine_einrichtung?": "Demo-Antwort", "wie_k\xF6nnen_wir_dich_am_besten_erreichen?": "Demo-Antwort", email: "test@meta.com", "full name": "Demo Lead", phone_number: "p:+49000000000", name_des_unternehmens: "Demo-Studio", lead_status: "TEST" });
    return Response.json({ ok: true, mail: await sendMail(cfg, NOTIFY, m) });
  }
  return Response.json({ ok: false, error: "mode" }, { status: 400 });
};
export {
  meta_leads_test_default as default
};
