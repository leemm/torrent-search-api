const TorrentProvider = require('../TorrentProvider');
const { int } = require('../utils/filters');
const filesizeParser = require('filesize-parser');
const { parse } = require('date-format-parse');

class Torrent9 extends TorrentProvider {
  constructor() {
    super({
      name: 'Torrent9',
      baseUrl: 'https://ww2.torrent9.re',
      searchUrl: '/recherche/{query}',
      categories: {
        All: '',
        Movies: 'url:/torrents/films',
        TV: 'url:/torrents/series',
        Music: 'url:/torrents/musique',
        Apps: 'url:/torrents/logiciels',
        Books: 'url:/torrents/ebook',
        Top100: 'url:/top'
      },
      defaultCategory: 'All',
      resultsPerPageCount: 60,
      itemsSelector: 'table tr',
      itemSelectors: {
        title: 'a',
        seeds: '.seed_ok | int',
        peers: 'td:nth-child(4) | int',
        size: 'td:nth-child(2)',
        desc: 'a@href | replace:t//,t/'
      },
      paginateSelector: 'a:contains(Suivant ►)@href',
      torrentDetailsSelector: '.movie-detail > .row:nth-child(1)@html'
    });
  }

  async search(query, category) {
    const url = this.getUrl(category, query.replace(/ /g, '+'), this.name);
    if (url === null) {
      return [];
    }

    const html = await this.scrapeHTMLWithPuppeteer(url, this.name);

    // Scrape torrents from html
    const torrents = await this.xray(html, this.itemsSelector, [this.itemSelectors]);

    let final =
      torrents &&
      torrents.length > 0 &&
      torrents.map(r => ({
        provider: this.name,
        id: this.extractId(r.desc),
        title: r.title,
        time: undefined,
        seeds: int(r.seeds),
        peers: int(r.peers),
        size: filesizeParser(r.size.replace(' ', '')),
        magnet: r.desc
      }));

    if (!final) {
      final = [];
    }

    for await (let torrent of final) {
      if (torrent.magnet.indexOf('://') === -1) {
        torrent.magnet = this.baseUrl + torrent.magnet;
      }
      const { torrentUrl, magnet, date } = await this.getMetaDataFromDescriptionPage(
        torrent.magnet
      );
      torrent.time = parse(date, 'DD/MM/YYYY').toUTCString();
      torrent.magnet = magnet;
      torrent.link = this.baseUrl + torrentUrl;
    }

    return final;
  }

  extractId(link) {
    const parts = link.split('/');
    return int(parts[parts.length - 1]);
  }

  async getMetaDataFromDescriptionPage(url) {
    const browser = await this.openBrowserWithPuppeteer(this.name);

    let page = await browser.newPage();
    await this.setUserAgent(page);

    await page.setDefaultNavigationTimeout(120000);
    await page.goto(url, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    let magnet, torrentUrl, date;
    try {
      const torrentLink = await page.waitForSelector('a[href*="/get_torrents"]', { timeout: 8000 });
      torrentUrl = await page.evaluate(el => el.getAttribute('href'), torrentLink);

      const magnetLink = await page.waitForSelector('a[href*="magnet:?"]', { timeout: 8000 });
      magnet = await page.evaluate(el => el.getAttribute('href'), magnetLink);

      const dateElement = await page.waitForSelector(
        'div.movie-information ul:nth-child(3) li:nth-child(3)',
        { timeout: 8000 }
      );
      date = await page.evaluate(el => el.innerText, dateElement);
    } catch (err) {
      // timeout error
    } finally {
      await page.close();
      await browser.close();
    }

    return { torrentUrl, magnet, date };
  }
}

module.exports = Torrent9;
