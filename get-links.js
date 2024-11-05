import * as cheerio from 'cheerio';

function isHidden(element) {
  const style = element.attr('style')?.toLowerCase() || '';
  const cssClasses = element.attr('class') || '';

  return (
    style.includes('display: none') ||
    style.includes('visibility: hidden') ||
    style.includes('opacity: 0') ||
    cssClasses.includes('hidden') ||
    cssClasses.includes('invisible')
  );
}

function normalizeUrl(url, baseUrl) {
  try {
    const urlObj = new URL(url, baseUrl);
    urlObj.hash = '';
    return urlObj.href;
  } catch {
    return null;
  }
}

function extractResourceInfo(selector, resType, attrName, $, baseUrl) {
  return $(selector)
    .map((_, elem) => {
      const urlSource = $(elem).attr(attrName);
      if (!urlSource) return null;

      const url = normalizeUrl(urlSource, baseUrl);
      if (!url) return null;

      const resource = {
        resType,
        url,
        urlSource,
      };

      if (resType === 'anchor') {
        resource.anchorContent = $(elem).text().trim();
      }

      let currentElement = $(elem);
      while (currentElement.length) {
        if (isHidden(currentElement)) {
          resource.hidden = true;
          break;
        }
        currentElement = currentElement.parent();
      }

      return resource;
    })
    .get() // Преобразуем результат map в массив
    .filter(Boolean);
}

function getLinks(html, baseUrl) {
  const $ = cheerio.load(html);

  const resourceTypes = [
    ['img', 'img', 'src'],
    ['css', 'link[rel="stylesheet"]', 'href'],
    ['script', 'script[src]', 'src'],
    ['anchor', 'a[href]', 'href']
  ];

  const resources = resourceTypes.flatMap(([resType, selector, attrName]) =>
    extractResourceInfo(selector, resType, attrName, $, baseUrl)
  );

  return {
    metadata: {
      title: $('title').text().trim(),
      description: $('meta[name=description][content]').attr('content')?.trim()
    },
    links: resources
  };
}

export default getLinks;
