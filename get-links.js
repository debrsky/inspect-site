import * as cheerio from 'cheerio';

function getLinks(html, baseUrl) {
  const $ = cheerio.load(html);

  const resources = [];
  const hiddenUrls = new Set();
  [
    ['img', 'img', 'src'],
    ['css', 'link[rel="stylesheet"]', 'href'],
    ['script', 'script[src]', 'src'],
    ['anchor', 'a[href]', 'href']
  ].forEach(([resType, selector, attrName]) => {
    $(selector).each((_, elem) => {
      const url = $(elem).attr(attrName);
      if (url) {
        const urlObj = new URL(url, baseUrl);
        urlObj.hash = ''; // clear hash
        const urlNormalized = urlObj.href;
        let anchorContent;
        if (resType === 'anchor') {
          anchorContent = $(elem).text();
        };

        resources.push({
          resType,
          url: urlNormalized,
          urlSource: url,
          anchorContent
        });

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

  const title = $('title').text();
  const description = $('meta[name=description][content]').attr('content');

  resources.forEach((resource) => {
    if (hiddenUrls.has(resource.url)) resource.hidden = true;
  });

  return {
    metadata: { title, description },
    links: resources
  };
}

export default getLinks;
