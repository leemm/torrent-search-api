const TorrentProvider = require('../TorrentProvider');
const { int } = require('../utils/filters');
const filesizeParser = require('filesize-parser');
const addSubtractDate = require('add-subtract-date');

class KickassTorrents extends TorrentProvider {
  constructor() {
    super({
      name: 'KickassTorrents',
      baseUrl: 'https://katcr.co',
      searchUrl: '/katsearch/page/1/{query}',
      categories: {
        All: '',
        Movies: 'url:/category/movies/page/1',
        TV: 'url:/category/tv/page/1',
        Music: 'url:/category/music/page/1',
        Games: 'url:/category/games/page/1',
        Books: 'url:/category/books/page/1',
        Applications: 'url:/category/applications/page/1',
        Anime: 'url:/category/anime/page/1'
      },
      defaultCategory: 'All',
      resultsPerPageCount: 25,
      itemsSelector: 'table.data tbody tr',
      itemSelectors: {
        title: 'a.cellMainLink@text',
        time: 'td:nth-child(3)@text',
        seeds: 'td.green@text | int',
        peers: 'td.red@text | int',
        size: 'td:nth-child(2)@text',
        link: 'a.cellMainLink@href',
        desc: 'a:nth-last-child(2)@href'
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

    return (
      torrents &&
      torrents.length > 0 &&
      torrents.map(r => ({
        provider: this.name,
        id: r.link.substring(1).split('.')[0],
        title: r.title,
        time: this.ageToUTCString(r.time).toUTCString(),
        seeds: int(r.seeds),
        peers: int(r.peers),
        size: filesizeParser(r.size.replace(' ', '')),
        magnet: this.mylinkToMagnet(r.desc)
      }))
    );
  }

  ageToUTCString(age) {
    const dateParts = age.split(' ');
    return addSubtractDate.subtract(new Date(), int(dateParts[0]), dateParts[1]);
  }
}

module.exports = KickassTorrents;
