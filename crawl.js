import checkUrl from "./check-url.js";

async function crawl(startUrl, onCheckUrl = () => { }, maxConcurrency = 5) {
  const links = {
    [startUrl]: {}
  };

  let linksToCheck = Object.fromEntries(Object.entries(links).filter(([url, props]) => !props.checked));

  // Функция для обработки одной ссылки
  const processLink = async (url, props) => {
    const res = await checkUrl(url, startUrl);
    onCheckUrl({ url, status: res.status, ok: res.ok, error: res.error });

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

  // Основной цикл
  while (Object.keys(linksToCheck).length > 0) {
    const currentTasks = Object.entries(linksToCheck).slice(0, maxConcurrency).map(([url, props]) => {
      return processLink(url, props);
    });

    // Выполняем текущие задачи
    await Promise.all(currentTasks);

    // Удаляем обработанные ссылки из linksToCheck
    for (const [url] of Object.entries(linksToCheck).slice(0, maxConcurrency)) {
      delete linksToCheck[url];
    }

    // Обновляем состояние linksToCheck
    linksToCheck = Object.fromEntries(Object.entries(links).filter(([url, props]) => !props.checked));
  }

  // Убираем временные метки
  Object.keys(links).forEach(key => {
    delete links[key].checked;
  });

  return links;
}

export default crawl;
