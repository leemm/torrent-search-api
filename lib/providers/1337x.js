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

    const html = await this.scrapeHTMLWithPuppeteer(url, this.name);

    // Scrape torrents from html
    const torrents = await this.xray(html, this.itemsSelector, [this.itemSelectors]);
    if (torrents.length > 1) {
      torrents.shift();
    }

    let final =
      torrents &&
      torrents.length > 0 &&
      torrents.map(r => ({
        provider: this.name,
        id: int(r.desc.split('/')[4]),
        title: r.title,
        time: parse(r.time.replace(/nd|st|rd|th/gi, ''), "MMM. D 'YY").toUTCString(),
        seeds: int(r.seeds),
        peers: int(r.peers),
        size: filesizeParser(r.size.replace(' ', '')),
        magnet: r.desc
      }));

    if (!final) {
      final = [];
    }

    for await (let torrent of final) {
      torrent.magnet = await this.getMagnetFromDescriptionPage(torrent.magnet);
    }

    return final;
  }
}

module.exports = _1337x;
