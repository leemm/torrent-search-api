const TorrentProvider = require('../TorrentProvider');
const { int } = require('../utils/filters');
const { parse } = require('date-format-parse');
const filesizeParser = require('filesize-parser');

class Ytsme extends TorrentProvider {
  constructor() {
    super({
      name: 'Ytsme',
      baseUrl: 'https://yts-yify.me',
      searchUrl:
        '/movies?keyword={query}&quality=&genre=&rating=0&year=0&language=&order_by=latest',
      categories: {
        All: ''
      },
      defaultCategory: 'All',
      resultsPerPageCount: 20,
      itemsSelector: 'div.browse-movie-wrap',
      itemSelectors: {
        title: 'a.browse-movie-title@text',
        desc: 'a.browse-movie-link@href'
      },
      paginateSelector: 'ul.tsc_pagination:first-of-type li a[rel="next"]@href'
    });
  }

  async search(query, category) {
    const url = this.getUrl(category, query.replace(/ /g, '+'), this.name, true);
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
        id: r.desc,
        title: r.title,
        seeds: -1,
        peers: -1,
        size: 0,
        magnet: r.desc
      }));

    if (!final) {
      final = [];
    }

    let combine = [];

    for await (let torrent of final) {
      const separateTorrents = await this.getMetaDataFromDescriptionPage(torrent.magnet);

      separateTorrents.map(separateTorrent => {
        combine.push({
          provider: torrent.provider,
          id: separateTorrent.id,
          title: torrent.title + ' ' + separateTorrent.quality,
          seeds: -1,
          peers: -1,
          size: separateTorrent.size,
          magnet: separateTorrent.magnetLink,
          link: separateTorrent.torrentLink
        });
      });
    }

    return combine;
  }

  async getMetaDataFromDescriptionPage(url) {
    const browser = await this.openBrowserWithPuppeteer();

    let page = await browser.newPage();
    await this.setUserAgent(page);

    await page.setDefaultNavigationTimeout(120000);
    await page.goto(url, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    let torrents = [];

    try {
      const modalClose = await page.waitForSelector('.modal-close', { timeout: 8000 });
      await modalClose.click();

      const downloadLink = await page.waitForSelector('a.torrent-modal-download', {
        timeout: 8000
      });
      await downloadLink.click();

      const torrentsLink = await page.$$('div.modal-torrent', {
        timeout: 8000
      });

      for (let torrent of torrentsLink) {
        const torrentLink = await page.evaluate(
          el => el.querySelector('a.download-torrent').getAttribute('href'),
          torrent
        );

        const size = await page.evaluate(
          el => el.querySelector('p.quality-size:nth-of-type(3)').innerText.replace(' ', ''),
          torrent
        );

        const magnetLink = await page.evaluate(
          el => el.querySelector('a.magnet-download').getAttribute('href'),
          torrent
        );

        const quality = await page.evaluate(
          el => el.querySelector('a.download-torrent').getAttribute('title'),
          torrent
        );

        const id = await page.evaluate(
          el => el.querySelector('a.magnet-download').getAttribute('data-torrent-id'),
          torrent
        );

        torrents.push({
          id: int(id),
          size: filesizeParser(size),
          quality: quality.split(' ')[quality.split(' ').length - 1],
          torrentLink,
          magnetLink
        });
      }
    } catch (err) {
      // timeout error
    } finally {
      await page.close();
      await browser.close();
    }

    return torrents;
  }
}

module.exports = Ytsme;
