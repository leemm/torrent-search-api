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
    const url = this.getUrl(category, query, this.name);
    if (url === null) {
      return [];
    }

    const html = await this.scrapeHTMLWithPuppeteer(url, this.name);

    const mirror = this.getMirrorJson(this.name);

    // Scrape torrents from html
    const torrents = await this.xray(
      html,
      mirror.selectors?.itemsSelector ? mirror.selectors.itemsSelector : this.itemsSelector,
      [mirror.selectors?.itemSelectors ? mirror.selectors.itemSelectors : this.itemSelectors]
    );

    if (torrents.length > 1) {
      torrents.shift();
    }

    return (
      torrents &&
      torrents.length > 0 &&
      torrents
        .map(r => ({
          provider: this.name,
          id: r.id,
          title: r.title,
          time: r.time,
          seeds: r.seeds,
          peers: r.peers,
          size: r.size,
          magnet: r.magnet
        }))
        .filter(torrent => torrent.size > 0)
    );
  }
}

module.exports = ThePirateBay;
