# TorrentSearchApi

This is a fork and reworking of https://github.com/JimmyLaurent/torrent-search-api designed to work server side, and adding support for:

- Proxy/Mirrors of popular torrent sites via a configuration
- Always returning the mirror url and, where possible, a direct link to the torrent file
- Browser spoofing via Puppeteer
- Removed broken providers, and fixed the remaining
- Removed Cloudflare bypass it no longer works

## Install

```bash
npm i https://github.com/leemm/torrent-search-api
```

You will also need chromium installing. https://command-not-found.com/chromium-browser

## Supported providers

Some providers are faster than others due to the amount of functionality required to parse magnets and torrent files. Everything is scraped live data, there is no cache within this module.

| Provider | Speed | Requires Auth |
| --- | ----------- | ----------- |
| 1337x | Medium | |
| Eztv | Fast | |
| KickassTorrents | Fast | |
| Rarbg | Slow | |
| ThePirateBay | Fast | |
| Torrent9 | Slow | |
| TorrentLeech | Medium | Yes |
| TorrentProject | Slow | |
| Yts | Medium | |
| Ytsme | Medium | |

## Features

- **Search:** search torrents on multiples providers.

- **Support for proxies/mirrors:** in the UK most commercial ISPs will block torrent sites if not using a vpn. You can now provide a `mirrors` object which allows overriding the default url and search provided by the providers in this API (see below for example).

- **Download:** get direct links of magnet and torrent files (where available)
 

## Quick Example

```js
const TorrentSearchApi = require('torrent-search-api');

TorrentSearchApi.enableProvider('KickassTorrents');

// Search '1080p'
const torrents = await TorrentSearchApi.search('1080p');
```

# Torrent Search API

### Get providers

```js
// Get providers
const providers = TorrentSearchApi.getProviders();

// Get active providers
const activeProviders = TorrentSearchApi.getActiveProviders();

// providers
{
    {
        name: 'Torrent9',
        public: true,
        categories: ['All', 'Movies', 'TV', 'Music', 'Apps', 'Books', 'Top100']
    },
    {
        name: '1337x',
        public: true,
        categories: [
            'All',          'Movies',
            'TV',           'Games',
            'Music',        'Anime',
            'Applications', 'Documentaries',
            'Other',        'Top100'
        ]
    },
    ...
}

```

### Enable provider

```js

// Enable public providers
TorrentSearchApi.enablePublicProviders();

// Enable public provider
TorrentSearchApi.enableProvider('Torrent9');

// Enable private provider with cookies
TorrentSearchApi.enableProvider('IpTorrents', ['uid=XXX;', 'pass=XXX;']);

// Enable private provider with credentials
TorrentSearchApi.enableProvider('IpTorrents', 'USERNAME', 'PASSWORD');

// Enable private provider with token
TorrentSearchApi.enableProvider('xxx', 'TOKEN');

```

### Disable provider

```js

// Disable provider
TorrentSearchApi.disableProvider('TorrentLeech');

// Disable all enabled providers
TorrentSearchApi.disableAllProviders();

```

### Check if a provider exists and is active

```js

TorrentSearchApi.isProviderActive('1337x');

```


### Set config

```js

await TorrentSearchApi.setConfig({
    chromiumPath: '/usr/bin/chromium-browser',
    debug: false,
    mirrors: {
        providers: {
            // Replace default baseUrl of the pirate bay with new Url
            ThePirateBay: { baseUrl : 'https://piratebay.pro' },
            // Replace default baseUrl and searchUrl of kickass torrents with new Urls
            KickassTorrents: { baseUrl : 'https://kickasstorrents.id', searchUrl: '/usearch/{query}' },
            // Replace default baseUrl of 1337x with new Url
            // This is a special situation for searchUrl. The roor url for searchUrl is generated on the fly and must be scraped from the page.
            // This finds the search form, in the html, and grabs the url from the action attribute.
            '1337x': { baseUrl : 'https://1337x-to.pages.dev', searchUrl: '|selector:form:property:action|?search={query}' }
        }
    },
    mirrorsUrl: 'https://site.com/mystuff/mirrors.json'
});

```

This config and all properties are completely optional.

| Option | Description | Default |
| --- | ----------- | ----------- |
| `chromiumPath` | path to chromium or chrome browser | default location for os |
| `debug` | if search requires puppeteer then disable headless mode by setting this true | false |
| `mirrors` | override provider baseUrl and searchUrls. See above for examples. | |
| `mirrorsUrl` | url of mirrors.json, an easier way to manage your proxies without needing to re-deploy any application using this package | undefined |


### Search torrent

The result is an array of torrents sorted by seeders with more or less properties depending on the provider.

```js

// Search all actives providers
// Query: 1080
// Category: Movies (optional)
// Limit: 20 (optional)
const torrents = await TorrentSearchApi.search('1080', 'Movies', 20);

// Search with given providers
// query: 1080
// category: Movies (optional)
// limit: 20 (optional)
const torrents = await TorrentSearchApi.search(['IpTorrents', 'Torrent9'], '1080', 'Movies', 20);

```

### Create TorrentSearchApi instance

If you want to create an instance of the api without loading all the default providers and only load the ones that you want

```js

// create instance
const createApi = require('torrent-search-api/createApi');
const TorrentSearchApi = createApi(/* same arguments as "loadProviders" method */)

```

### Override provider config
 ```js
 // Fully or partial override of the provider config
TorrentSearchApi.overrideConfig(providerName, newConfig);
 ```

## License

MIT © 2020 [Jimmy Laurent](https://github.com/JimmyLaurent)
