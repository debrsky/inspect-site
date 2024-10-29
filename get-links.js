import * as cheerio from 'cheerio';

function getLinks(html, baseUrl) {
  const $ = cheerio.load(html);

  const resources = {};
  const hiddenUrls = new Set();
  [
    ['img', 'img', 'src'],
    ['css', 'link[rel="stylesheet"]', 'href'],
    ['script', 'script[src]', 'src'],
    ['link', 'a[href]', 'href']
  ].forEach(([resType, selector, attr]) => {
    $(selector).each((_, elem) => {
      const url = $(elem).attr(attr);
      if (url) {
        if (!resources[resType]) resources[resType] = new Set();
        const urlNormalized = new URL(url, baseUrl).href;
        resources[resType].add(urlNormalized);

        // check visibility
        let currentElement = $(elem);
        while (currentElement.length) {
          const style = currentElement.attr('style');
          if (style?.includes('display: none')) {
            hiddenUrls.add(urlNormalized);
            break;
          };
          currentElement = currentElement.parent();
        }

      }
    });
  })

  return Object.entries(resources)
    .map(([resType, urlSet]) =>
    ([...urlSet].map((url =>
      (hiddenUrls.has(url) ? { url, resType, hidden: true } : { url, resType })
    ))))
    .flat();
}

export default getLinks;
