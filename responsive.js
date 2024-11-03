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
  const url = 'https://dvggtk.ru/student/elektronnye-resursy/';
  const elementSelector = 'h1, h2';




  // Цикл по разрешениям
  for (const resolution of resolutions) {
    // Устанавливаем размеры окна браузера
    await page.setViewport(resolution);

    // Переходим на целевую страницу
    await page.goto(url, { waitUntil: 'networkidle2' });

    const overflowingElements = await page.evaluate(selector => {
      const elements = document.querySelectorAll(selector);
      const overflowing = [];

      elements.forEach(element => {
        // Получение размеров блока и размера его содержимого
        const { clientWidth, clientHeight } = element;
        const scrollWidth = element.scrollWidth;
        const scrollHeight = element.scrollHeight;

        // Проверка, выходит ли текст за границы блока
        if (scrollWidth > clientWidth || scrollHeight > clientHeight) {
          // Добавление элемента в массив overflowing
          overflowing.push(element);
          // Добавление обводки
          element.style.outline = '10px dashed rgba(204, 0, 0, 0.7)'; // Обводка для визуализации
          // element.style.boxShadow = '0 0 50px 50px rgba(255, 0, 0, 0.7)'; // Тень
        }
      });

      return overflowing.length; // Возвращаем число переполненных элементов
    }, elementSelector);


    if (overflowingElements > 0) {
      // Делаем скриншот
      await page.screenshot({
        path: `storage/screenshots/screenshot-${resolution.width}.png`,
        fullPage: true // Если необходимо, чтобы скриншот был полной страницы
      });

      console.log(`Скриншот для ${resolution.width}x${resolution.height} сохранен.`);
    };
  }

  // Закрываем браузер
  await browser.close();
})();
