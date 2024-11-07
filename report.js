import crawl from './crawl.js';

const postProcessing = (links) => {
  let idx = 1;
  const linksWithId = Object.fromEntries(
    Object.entries(links)
      .map(([url, value]) => {
        return [url, { id: idx++, ...value }];
      })
  );

  Object.entries(linksWithId).forEach(([url, value]) => {
    if (value.linksTo) {
      for (const linkTo of value.linksTo) {
        const url = linkTo.url;
        linkTo.id = linksWithId[url].id;
      };
    };
  });

  Object.entries(linksWithId).forEach(([url, value]) => {
    const linksFromSet = new Set();
    // console.log('processing:', url, value.id);
    Object.entries(linksWithId).forEach(([urlWithLinksTo, { id, linksTo }]) => {
      if ((linksTo ?? []).some((linkTo) => linkTo.url === url)) {
        linksFromSet.add(id);
      }
    });

    value.linksFrom = [...linksFromSet];
  });

  Object.entries(linksWithId).forEach(([, { linksTo }]) => {
    if (!linksTo) return;

    linksTo.forEach((linkTo) => {
      delete linkTo.url;
    });
  });

  const linksWithIdArray = Object.entries(linksWithId);
  linksWithIdArray.sort(([a], [b]) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  return Object.fromEntries(
    linksWithIdArray
      .map(([url, data]) => [data.id, { url, ...data }])
  );
};

async function report(startUrl, onCheckUrl = () => { }) {
  const links = await crawl(startUrl, onCheckUrl);

  const links2 = postProcessing(links);

  return {
    metadata: {
      date: new Date().toISOString()
    },
    links: links2
  }
}

export default report;
