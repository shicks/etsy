const axios = require('axios');
const { JSDOM } = require('jsdom');

async function links(url) {
  const out = [];
  const resp = await axios.get(url);
  const html = String(resp.data);
  const dom = new JSDOM(html);
  const links = dom.window.document.querySelectorAll('a.listing-link');
  for (const link of links) {
    out.push(link.href);
  }
}

links(`https://www.etsy.com/shop/${process.argv[2]}?page=60&sort_order=date_desc`);

run().then(() => process.exit(0));
