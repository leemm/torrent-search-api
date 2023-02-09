const TorrentProvider = require('../TorrentProvider');
const { int } = require('../utils/filters');
const filesizeParser = require('filesize-parser');
const addSubtractDate = require('add-subtract-date');

class Eztv extends TorrentProvider {
  constructor() {
    super({
      name: 'Eztv',
      baseUrl: 'https://eztv.re',
      searchUrl: '/search/?q1={query}',
      categories: {
        All: ''
      },
      defaultCategory: 'All',
      resultsPerPageCount: 50,
      itemsSelector: 'tr.forum_header_border',
      itemSelectors: {
        title: 'a.epinfo@text',
        link: 'a.download_1@href',
        magnet: 'a.magnet@href',
        time: 'td.forum_thread_post:nth-child(5)@text',
        seeds: 'td.forum_thread_post_end | int',
        size: 'td.forum_thread_post:nth-child(4)@text',
        desc: 'a.epinfo@href'
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

    return (
      torrents &&
      torrents.length > 0 &&
      torrents.map(r => ({
        provider: this.name,
        id: int(r.desc.split('/')[2]),
        title: r.title.trim(),
        time: this.ageToUTCString(r.time).toUTCString(),
        seeds: r.seeds === '-' ? 0 : int(r.seeds),
        size: r.size ? filesizeParser(r.size.replace(' ', '')) : 0,
        magnet: r.magnet,
        link: r.link
      }))
    );
  }

  ageToUTCString(age) {
    const dateParts = age.split(' ');

    const customSuffixes = [
      { suffix: 'm', replaceWith: 'minutes' },
      { suffix: 'h', replaceWith: 'hours' },
      { suffix: 'd', replaceWith: 'days' }
    ];

    const suffix = dateParts[0].substring(dateParts[0].length - 1);

    if (customSuffixes.map(s => s.suffix).indexOf(suffix) > -1) {
      const repl = customSuffixes.find(s => s.suffix === suffix);
      return addSubtractDate.subtract(
        new Date(),
        int(dateParts[0].replace(suffix, '')),
        repl.replaceWith
      );
    } else if ((dateParts.length > 1 ? dateParts[1] : '') === 'mo') {
      return addSubtractDate.subtract(new Date(), int(dateParts[0]), 'months');
    }

    return addSubtractDate.subtract(new Date(), int(dateParts[0]), dateParts[1]);
  }
}

module.exports = Eztv;
