// If one element has a majority of uses, returns it.
// Otherwise returns a random element.
class MajoritySet {
  constructor() {
    this.item = undefined;
    this.count = 0;
  }
  add(elt) {
    if (!this.count) {
      this.item = elt;
      this.count = 1;
    } else {
      this.count += (elt === this.item ? 1 : -1);
    }
  }
  get() {
    return this.item;
  }
}

module.exports = {MajoritySet};
