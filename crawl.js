import checkUrl from "./check-url.js";

async function crawl(startUrl, log = () => { }) {
  const links = {
    [startUrl]: { resType: 'link' }
  };

  let linksToCheck = Object.fromEntries(Object.entries(links).filter(([url, props]) => !props.checked));

  while (Object.keys(linksToCheck).length > 0) {
    for (const [url, props] of Object.entries(linksToCheck)) {
      const res = await checkUrl(url, startUrl);
      log({ url, status: res.status, ok: res.ok ? '✅' : '❌' });
      Object.assign(props, res);
      props.checked = true;

      if (res.linksTo) {
        res.linksTo.forEach(({ url }) => {
          if (!links[url]) {
            links[url] = { isExternal: new URL(url).hostname !== new URL(startUrl).hostname };
          }
        });
      }
    };

    linksToCheck = Object.fromEntries(Object.entries(links).filter(([url, props]) => !props.checked));
  };

  Object.keys(links).forEach(key => {
    delete links[key].checked;
  })

  return links;
};

export default crawl;
