import { writeFile } from "fs/promises";

import crawl from "./crawl.js";

const links = await crawl('http://dvggtk.ru', ({ url, ok }) => {
  console.log(ok, url);
});

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

const links2 = postProcessing(links);

const content = JSON.stringify(links2, null, 4);


await writeFile(`storage/${generateFileName()}`, content, 'utf8');
await writeFile('storage/links@latest.json', content, 'utf8');

function generateFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `links@${year}-${month}-${day}_${hours}-${minutes}-${seconds}.json`;
}
