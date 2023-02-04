const TorrentProvider = require('../TorrentProvider');
const { int } = require('../utils/filters');
const filesizeParser = require('filesize-parser');
const { parse } = require('date-format-parse');

class Rarbg extends TorrentProvider {
  constructor() {
    super({
      name: 'Rarbg',
      baseUrl: 'https://rargb.to',
      searchUrl: '/search/?search={query}',
      categories: {
        All: ''
      },
      defaultCategory: 'All',
      resultsPerPageCount: 20,
      itemsSelector: 'table.lista2t tbody tr.lista2',
      itemSelectors: {
        title: 'td:nth-child(2) a@text',
        time: 'td:nth-child(4)@text',
        seeds: 'td:nth-child(6) font@text | int',
        peers: 'td:nth-child(7)@text | int',
        size: 'td:nth-child(5)@text',
        desc: 'td:nth-child(2) a@href'
      },
      paginateSelector: 'div#pager_links a:last-child@href'
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

    let final =
      torrents &&
      torrents.length > 0 &&
      torrents.map(r => ({
        provider: this.name,
        id: this.extractId(r.desc),
        title: r.title,
        time: parse(r.time, 'YYYY-MM-DD HH:mm:ss').toUTCString(),
        seeds: int(r.seeds),
        peers: int(r.peers),
        size: filesizeParser(r.size.replace(' ', '')),
        magnet: r.desc,
        numFiles: undefined,
        status: undefined,
        category,
        imdb: undefined
      }));

    if (!final) {
      final = [];
    }

    for await (let torrent of final) {
      torrent.magnet = await this.getMagnetFromDescriptionPage(this.baseUrl + torrent.magnet);
    }

    return final;
  }

  extractId(link) {
    const parts = link.split('.')[0].split('-');
    return int(parts[parts.length - 1]);
  }
}

module.exports = Rarbg;
