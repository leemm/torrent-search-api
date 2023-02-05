const TorrentProvider = require('../TorrentProvider');
const { int } = require('../utils/filters');
const filesizeParser = require('filesize-parser');
const addSubtractDate = require('add-subtract-date');

class TorrentProject extends TorrentProvider {
  constructor() {
    super({
      name: 'TorrentProject',
      baseUrl: 'https://torrentproject.cc',
      searchUrl: '/?t={query}&orderby=seeders',
      categories: {
        All: ''
      },
      defaultCategory: 'All',
      resultsPerPageCount: 50,
      itemsSelector: '#similarfiles > div:not(.gac_bb)',
      itemSelectors: {
        title: 'a@text',
        time: 'span:nth-child(4)@text',
        seeds: 'span:nth-child(3)@text | int',
        peers: 'span:nth-child(4)@text | int',
        size: 'span:nth-child(5)@text',
        desc: 'a@href'
      },
      paginateSelector: 'td.cur + td > a@href',
      torrentDetailsSelector: '#res2@text'
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
        time: this.ageToUTCString(r.time).toUTCString(),
        seeds: new RegExp(/^\d+$/).test(r.seeds) ? int(r.seeds) : 0,
        peers: new RegExp(/^\d+$/).test(r.peers) ? int(r.peers) : 0,
        size: filesizeParser(r.size.replace(' ', '')),
        magnet: r.desc
      }));

    if (!final) {
      final = [];
    }

    for await (let torrent of final) {
      torrent.magnet = this.mylinkToMagnet(
        await this.getMagnetFromDescriptionPage(
          this.baseUrl + torrent.magnet,
          'a[href*="url=magnet"]'
        )
      );
    }

    return final;
  }

  extractId(link) {
    const parts = link.split('/')[1].split('-');
    return int(parts[1]);
  }

  ageToUTCString(age) {
    if (age === 'just now') {
      return new Date();
    }

    const dateParts = age.split(' ');
    return addSubtractDate.subtract(new Date(), int(dateParts[0]), dateParts[1]);
  }
}

module.exports = TorrentProject;
