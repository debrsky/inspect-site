import puppeteer from 'puppeteer';
import { mkdir, rm } from "fs/promises";

await rm('storage/screenshots', { recursive: true, force: true });
await mkdir('storage/screenshots', { recursive: true });

(async () => {
  // Запускаем браузер
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Список разрешений
  const resolutions = [
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 800, height: 1024 },
    { width: 768, height: 1024 },
    { width: 480, height: 320 },
    { width: 400, height: 320 },
    { width: 360, height: 320 },
    { width: 320, height: 480 }
    // Добавьте ваши разрешения по необходимости
  ];

  // URL целевой страницы
  const url = 'https://dvggtk.ru/';

  const checkFn = () => {
    const errors = [];

    // Верний баннер
    const owlItems = document.querySelectorAll('.banner-top .owl-item');
    const totalWidth = [...owlItems]
      .reduce((prev, cur) => prev + cur.getBoundingClientRect().width, 0);

    if (totalWidth < window.innerWidth * 3 / 4) {
      document.querySelector('.banner-top').style.outline = "10px solid rgb(204, 0, 0, 0.5)";
      errors.push("Ошибки в верстке верхнего баннера");
    };

    // Главное меню
    const navElement = document.querySelector('#global_menu nav.navbar');
    const { width: navWidth, height: navHeight } = navElement.getBoundingClientRect();
    if (navHeight < 20) {
      navElement.style.outline = "10px solid rgb(204, 0, 0, 0.5)";
      errors.push("Не видно главное меню");
    };

    //
    const result = { ok: true, width: window.innerWidth };

    if (errors.length > 0) {
      Object.assign(result, { ok: false, errors });
    };

    return result;
  };

  // Цикл по разрешениям
  for (const resolution of resolutions) {
    // Устанавливаем размеры окна браузера
    await page.setViewport(resolution);

    // Переходим на целевую страницу
    await page.goto(url, { waitUntil: 'networkidle2' });

    const checkResult = await page.evaluate(checkFn);
    console.log(checkResult);

    if (!checkResult.ok) {
      // Делаем скриншот
      await page.screenshot({
        path: `storage/screenshots/screenshot@${resolution.width}.png`,
        fullPage: true // Если необходимо, чтобы скриншот был полной страницы
      });

      console.log(`Скриншот для ${resolution.width}x${resolution.height} сохранен.`);
    };
  }

  // Закрываем браузер
  await browser.close();
})();
