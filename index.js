const {Api} = require('./api.js');
const {Shop} = require('./etsy.js');
const {decode} = require('html-entities');
const {DefaultMap} = require('./defaultmap.js');
const {MajoritySet} = require('./majorityset.js');

(async () => {
  const e = new Shop(new Api(), process.argv[2]);
  const listings = await e.getAllActiveListings();
  const colors = new DefaultMap(() => ({url: new MajoritySet(), listings: []}));
  for (const listing of listings) {
    //console.log(decode(`${listing.price} \t${listing.title}`));
    const vars = await listing.getVariations();
    for (const [prop, map] of vars || []) {
      if (!/color|print/i.test(prop)) continue;
      for (const [val, img] of map) {
        //console.log(decode(`  ${prop}: ${val} => ${img}`));
        const color = colors.get(val);
        if (img?.url_75x75) color.url.add(img.url_75x75);
        color.listings.push(listing);
      }
    }
  }
  // Now print a list of all the colors as a webpage
  console.log(`<!DOCTYPE html>`);
  console.log(`<style>li.hidden > ul { display: none; }</style><ul>`);
  for (const [color, {url, listings}] of colors) {
    console.log(`<li class="hidden color">${color}`);
    if (url.get()) console.log(`<img src="${url.get()}">`);
    console.log(`<ul>`);
    for (const listing of listings) {
      console.log(`<li>$${listing.price} <a href="https://etsy.com/listing/${listing.id}">${listing.title}</a>`);
    }
    console.log(`</ul>`);
  }
  console.log(`</ul>`);
  console.log(`<script>
    document.body.addEventListener('click', e => {
      const li = e.target.closest('.color');
      li.classList.toggle('hidden');
    });
</script>`);
})().then(process.exit);
