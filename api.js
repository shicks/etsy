// Provides a single (cached) point of access to API calls.
const fs = require('fs').promises;
const axios = require('axios');
const AsyncLock = require('async-lock');

const DIR = './.etsy';

class Api {

  constructor() {
    this.key = undefined;
    this.accessTimes = undefined;
    this.lock = new AsyncLock();
  }

  async withLock(f) {
    //console.log(`waiting for lock`);
    while (this.lock) await this.lock;
    return new Promise((resolve, reject) => {
      this.lock = new Promise((done) => {
        const clean = () => {
          this.lock = undefined;
          done();
        }
        try {
          const p = f();
          p.finally(clean);
          resolve(p);
        } catch (err) {
          clean();
          reject(err);
        }
      });
    });
  }

  // Ensures we abide by the rate limit
  async wait() {
    if (!this.accessTimes) {
      await this.lock.acquire('t', async () => {
        if (this.accessTimes) return;
        const times = [];
        for (const file of await readdirOrEmpty(DIR)) {
          const path = `${DIR}/${file}`;
          times.push(fs.stat(path).then(s => s.mtimeMs));
        }
        this.accessTimes = (await Promise.all(times)).sort();
      });
    }
    // accessTimes now guaranteed to be the final list.
    const throttle = async (count, time, type) => {
      while (true) {
        const ts = this.accessTimes;
        const now = Date.now();
        if (ts.length < count || now - ts[ts.length - count] > time) return;
        const delay = time + ts[ts.length - 5] - now;
        if (type) console.log(`Waiting ${Math.ceil(delay / 60000)} minutes for ${type} quota`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    };
    await throttle(5, 1000);
    await throttle(4900, 86400000, 'daily');
  }

  async call(endpoint, params) {
    return this.lock.acquire('c', async () => {
      // Look in cache
      params = {...params};
      endpoint = endpoint.split(/\//g).map(term => {
        if (!term.startsWith(':')) return term;
        const k = term.substring(1);
        const v = params[k];
        if (!v) throw new Error(`missing param ${k}`);
        delete params[k];
        return v;
      }).join('/');
      const key = `${endpoint},${
          Object.keys(params).sort().map(k => `${k}=${params[k]}`).join(',')}`;
      const file = `${DIR}/${key.replace(/[\/:]/g, '_')}`;
      try {
        const result = await fs.readFile(file);
        return JSON.parse(result);
      } catch {} // just do it normally

      await this.wait();
      this.accessTimes.push(Date.now()); // NOTE: leaky
      params.api_key =
          this.key || (this.key = String(await fs.readFile('./.api_key')).trim());
      const path = `${endpoint}?${
          Object.keys(params).map(k => `${k}=${params[k]}`).join('&')}`;
      const url = `https://openapi.etsy.com/v2/${path}`;
      const resp = await axios.get(url);
      await fs.writeFile(file, JSON.stringify(resp.data));
      return resp.data;
    });
  }

  getActiveListings(shop, opts = {}) {
    return this.call('shops/:shop/listings/active', {...opts, shop});
  }

  getListing(listing) {
    return this.call('listings/:listing', {listing});
  }

  getInventory(listing) {
    return this.call('listings/:listing/inventory', {listing});
  }

  getVariationImages(listing) {
    return this.call('listings/:listing/variation-images', {listing});
  }

  getImages(listing) {
    return this.call('listings/:listing/images', {listing});
  }
};

async function readdirOrEmpty(dir) {
  try {
    return await fs.readdir(dir);
  } catch (err) {
    await fs.mkdir(dir, {recursive: true});
    return await fs.readdir(dir);
  }
}


module.exports = {Api};

// class CircularBuffer {
//   constructor() {
//     this.data = [];
//     this.start = 0;
//     this.end = 0;
//   }

//   get size() {
//     if (this.end = this.
//   }

//   expand() {
//     if (this.end !== this.start) return;
//     if (this.end === this.data.length) return;
//     this.data = [
//       ...this.data.slice(this.start),
//       ...this.data.slice(0, this.end),
//     ];
//   }

//   push(elem) {
//     this.expand();
//     this.data[this.end++] = elem;
//   }


//   pop() {
//     if 
//   }
// }
