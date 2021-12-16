class DefaultMap extends Map {
  constructor(factory) {
    super();
    this.factory = factory;
  }
  get(key) {
    if (!this.has(key)) this.set(key, this.factory(key));
    return super.get(key);
  }
}

module.exports = {DefaultMap};
