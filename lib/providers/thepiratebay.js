const TorrentProvider = require('../TorrentProvider');
const { int } = require('../utils/filters');
const filesizeParser = require('filesize-parser');

class ThePirateBay extends TorrentProvider {
  constructor() {
    super({
      name: 'ThePirateBay',
      baseUrl: 'https://thepiratebay.org',
      searchUrl: '/search.php?q={query}&cat={cat}',
      categories: {
        All: '',
        Audio: '100',
        Video: '200',
        Movies: '201',
        Applications: '300',
        Games: '400',
        Porn: '500',
        Other: '600',
        Top100: 'url:/top/all'
      },
      defaultCategory: 'All',
      itemsSelector: 'ol#torrents > li',
      itemSelectors: {
        title: 'span.item-title > a@text',
        time: 'span.item-uploaded > label@text',
        seeds: 'span.item-seed@text | int',
        peers: 'span.item-leech@text | int',
        size: 'span.item-size@text',
        desc: 'span.item-title > a@href',
        magnet: 'span.item-icons > a@href'
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

    return (
      torrents &&
      torrents.length > 0 &&
      torrents.map(r => ({
        provider: this.name,
        id: r.desc?.split('=').length > 1 ? int(r.desc.split('=')[1]) : 0,
        title: r.title,
        time: new Date(r.time).toUTCString(),
        seeds: int(r.seeds),
        peers: int(r.peers),
        size: filesizeParser(r.size.replace(' ', '')),
        magnet: r.magnet
      }))
    );
  }
}

module.exports = ThePirateBay;
