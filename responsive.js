import puppeteer from 'puppeteer';
import { mkdir } from "fs/promises";

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
    { width: 768, height: 1024 },
    { width: 480, height: 320 },
    { width: 320, height: 480 }
    // Добавьте ваши разрешения по необходимости
  ];

  // URL целевой страницы
  const url = 'https://dvggtk.ru/student/elektronnye-resursy/';

  // Цикл по разрешениям
  for (const resolution of resolutions) {
    // Устанавливаем размеры окна браузера
    await page.setViewport(resolution);

    // Переходим на целевую страницу
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Делаем скриншот
    await page.screenshot({
      path: `storage/screenshots/screenshot-${resolution.width}x${resolution.height}.png`,
      fullPage: true // Если необходимо, чтобы скриншот был полной страницы
    });

    console.log(`Скриншот для ${resolution.width}x${resolution.height} сохранен.`);
  }

  // Закрываем браузер
  await browser.close();
})();
