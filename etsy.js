// Additional layer on top of API.

const {Api} = require('./api.js');
const {DefaultMap} = require('./defaultmap.js');

class Shop {
  constructor(api, shop) {
    this.api = api;
    this.shop = shop;
    this.imgCache = new Map();
  }

  async getAllActiveListings() {
    const listings = [];
    const limit = 100;
    let offset = 0;
    do {
      const response = await this.api.getActiveListings(this.shop, {limit, offset});
      listings.push(...response.results.map(l => new Listing(this, l)));
      offset = response.pagination?.next_offset;
    } while (offset);
    return listings;
  }

}

class Listing {
  constructor(shop, listing) {
    this.shop = shop;
    this.listing = listing;
    this.id = listing.listing_id;
    this.imagesFetched = false;
  }

  get price() {
    return this.listing.price;
  }

  get title() {
    return this.listing.title;
  }

  get has_variations() {
    return this.listing.has_variations;
  }

  async getVariations() {
    // Are there variations at all?
    if (!this.listing.has_variations) return [];
    // Get the inventory.
    const inv = await this.shop.api.getInventory(this.id);
    const vars = new DefaultMap(() => new Map()); // (prop, val) -> valId
    const propIds = new Map(); // propId -> prop
    for (const product of inv.results.products) {
      for (const prop of product.property_values) {
        propIds.set(prop.property_name, prop.property_id);
        const vals = vars.get(prop.property_name);
        for (let i = 0; i < prop.values.length; i++) {
          vals.set(prop.values[i], prop.value_ids[i]);
        }
      }
    }
    // Now link to images.
    const imgs = await this.shop.api.getVariationImages(this.id);
    const imgIds = new DefaultMap(() => new Map()); // (propId, valId) -> imgObj
    for (const img of imgs.results) {
      imgIds.get(img.property_id)
          .set(img.value_id, await this.getImage(img.image_id));
    }
    // Replace vars values with image URLs
    for (const [prop, map] of vars) {
      for (const [val, valId] of map) {
          // ?.url_fullxfull
        map.set(val, imgIds.get(propIds.get(prop))?.get(valId));
      }
    }
    return vars;
  }

  async getImage(imageId) {
    // if (this.shop.imgCache.has(imageId) && !this.imagesFetched) {
    //   console.log(`Cache hit!`);
    // }
    if (!this.shop.imgCache.has(imageId) && !this.imagesFetched) {
      this.imagesFetched = true;
      const response = await this.shop.api.getImages(this.id);
      for (const result of response.results) {
        this.shop.imgCache.set(result.listing_image_id, result);
        // note: result.url_fullxfull is probably the one we want, or else _75x75
      }
    }
    return this.shop.imgCache.get(imageId);
  }
}

module.exports = {Shop, Listing};
