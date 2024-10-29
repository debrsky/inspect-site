import getLinks from "./get-links.js";

// TODO implement retry (with increasing delay) for fetch if an error occurs
async function checkUrl(url, startUrl) {
  const urlObj = url instanceof URL ? url : new URL(url);
  const startUrlObj = startUrl instanceof URL ? startUrl : new URL(startUrl);

  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    return { ok: true };
  }

  let status;
  let contentType;
  let contentLength;
  let lastModified;
  const startTime = new Date().getTime();
  try {
    const controller = new AbortController();
    const signal = controller.signal;
    const res = await fetch(url, { redirect: 'manual', signal });
    status = res.status;

    if (res.status >= 300 && res.status < 400) {
      const redirect = res.headers.get('location');
      return {
        responseTime: new Date().getTime() - startTime,
        ok: true,
        status: res.status,
        linksTo: [{ url: new URL(redirect, url).href, resType: 'redirect' }]
      };
    }

    if (!res.ok) {
      return {
        responseTime: new Date().getTime() - startTime,
        ok: false,
        status: res.status
      };
    }

    contentType = res.headers.get('content-type');
    contentLength = res.headers.get('content-length');
    lastModified = res.headers.get('last-modified');

    const isHtml = contentType && contentType.includes('text/html');

    if (!isHtml || urlObj.hostname !== startUrlObj.hostname) {
      controller.abort(); // throws exception in fetch and goes to catch block
    }

    const html = await res.text();
    const links = getLinks(html, url);

    return {
      responseTime: new Date().getTime() - startTime,
      ok: true,
      status,
      contentType,
      contentLength,
      lastModified,
      linksTo: links
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        responseTime: new Date().getTime() - startTime,
        ok: true,
        status,
        contentType,
        contentLength,
        lastModified
      };
    }

    // console.log(err.code, err.name);
    // console.error(err);

    const message = !!err.cause
      ? `${err.cause.code} ${err.cause.name}: ${err.cause.message}`
      : `${err.code} ${err.name}: ${err.message}`;

    return { ok: false, error: `${message}` };
  }
}

export default checkUrl;
