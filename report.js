import crawl from './crawl.js';

async function report(startUrl, onProgress = () => { }) {
  const links = Object.fromEntries(
    Object.entries(
      await crawl(startUrl, onProgress)
    )
      .sort(([a], [b]) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      })
  );

  Object.keys(links).forEach((urlProcessed) => {
    const linksFrom = [];

    for (const [urlLinkFromCandidate, props] of Object.entries(links)) {
      if (props.linksTo
        ?.some(({ url: urlLinkTo, resType, hidden }) =>
          resType !== 'redirect' && !hidden && urlProcessed === urlLinkTo
        )) {
        linksFrom.push(urlLinkFromCandidate);
      };
    };

    if (linksFrom.length > 0) {
      linksFrom.sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      })

      links[urlProcessed].linksFrom = linksFrom;
    }
  });

  const linksArr = Object.entries(links)
    .map(([url, props]) => ({ url, ...props }));

  const brokenLinks = linksArr
    .filter(({ status, linksFrom }) => status >= 400 && status < 500 && linksFrom?.length > 0);

  const testLinks = linksArr
    .filter(({ url, linksFrom }) => new URL(url).hostname.includes('test-dv.ru') && linksFrom?.length > 0);

  return { links: linksArr, brokenLinks, testLinks };
}

export default report;
