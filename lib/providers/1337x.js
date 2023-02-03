const TorrentProvider = require('../TorrentProvider');
const { int } = require('../utils/filters');
const { parse } = require('date-format-parse');
const filesizeParser = require('filesize-parser');

class _1337x extends TorrentProvider {
  constructor() {
    super({
      name: '1337x',
      baseUrl: 'https://www.1337x.to',
      searchUrl: '/category-search/{query}/{cat}/1/',
      categories: {
        All: 'url:/search/{query}/1/',
        Movies: 'Movies',
        TV: 'TV',
        Games: 'Games',
        Music: 'Music',
        Anime: 'Anime',
        Applications: 'Apps',
        Documentaries: 'Documentaries',
        Xxx: 'XXX',
        Other: 'Other',
        Top100: 'url:/top-100'
      },
      defaultCategory: 'All',
      resultsPerPageCount: 20,
      itemsSelector: 'tbody > tr',
      itemSelectors: {
        title: 'a:nth-child(2)',
        time: '.coll-date',
        seeds: '.seeds | int',
        peers: '.leeches | int',
        size: '.size@html | until:<sp',
        desc: 'a:nth-child(2)@href'
      }
    });
  }

  async search(query, category) {
    const url = this.getUrl(category, query.replace(/ /g, '+'), this.name);
    if (url === null) {
      return [];
    }

    const html = await this.scrapeHTMLWithPuppeteer(url);

    // Scrape torrents from html
    const torrents = await this.xray(html, this.itemsSelector, [this.itemSelectors]);
    if (torrents.length > 1) {
      torrents.shift();
    }

    const final =
      torrents &&
      torrents.length > 1 &&
      torrents.map(r => ({
        provider: this.name,
        id: int(r.desc.split('/')[4]),
        title: r.title,
        time: parse(r.time.replace(/nd|st|rd|th/gi, ''), "MMM. D 'YY").toUTCString(),
        seeds: int(r.seeds),
        peers: int(r.peers),
        size: filesizeParser(r.size.replace(' ', '')),
        magnet: r.desc,
        numFiles: undefined,
        status: undefined,
        category,
        imdb: undefined
      }));

    for await (let torrent of final) {
      torrent.magnet = await this.getMagnet(torrent.magnet);
    }

    return final;
  }

  async getMagnet(url) {
    url = url.length > 2 && url.substring(0, 2) === '//' ? 'https:' + url : url;

    const browser = await this.openBrowserWithPuppeteer();

    let page = await browser.newPage();
    await this.setUserAgent(page);

    await page.setDefaultNavigationTimeout(120000);
    await page.goto(url, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    const magnetLink = await page.waitForSelector('a[href*="magnet:?"]', { timeout: 5000 });
    const magnet = await page.evaluate(el => el.getAttribute('href'), magnetLink);

    await page.close();
    await browser.close();

    return magnet;
  }
}

module.exports = _1337x;
