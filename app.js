const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

puppeteer.use(StealthPlugin());

const app = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (
      request.resourceType() === "image" ||
      request.resourceType() === "font"
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });

  const url =
    "https://www.dns-shop.ru/catalog/17a8d26216404e77/vstraivaemye-xolodilniki/?stock=now-today-tomorrow-later&p=";
  let items = [];
  let currentPage = 1;
  let isDisabled = false;
  while (!isDisabled) {
    await page.goto(url + currentPage);

    await page.waitForTimeout(4000);

    const products = await page.$$(".catalog-product");

    for (const product of products) {
      let title = null;
      let price = null;

      try {
        title = await page.evaluate(
          (el) => el.querySelector(".catalog-product__name").textContent,
          product
        );
      } catch (err) {}

      try {
        const priceText = await page.evaluate(
          (el) => el.querySelector(".product-buy__price").textContent,
          product
        );

        const indexOfSymbol = priceText.indexOf("₽");
        price =
          indexOfSymbol !== -1
            ? priceText.substring(0, indexOfSymbol + 1).trim()
            : priceText.trim();
      } catch (err) {}

      items.push({ title, price });
    }
    isDisabled =
      (await page.$(
        ".pagination-widget__page-link_next.pagination-widget__page-link_disabled"
      )) !== null;

    currentPage += 1;
  }

  //csv
  const csvHeader = [
    { id: "title", title: "Title" },
    { id: "price", title: "Price" },
  ];

  const csvWriter = createCsvWriter({
    path: "output.csv",
    header: csvHeader,
  });

  csvWriter
    .writeRecords(items)
    .then(() => console.log("CSV file created successfully"))
    .catch((err) => console.error("Error writing CSV:", err));

  await browser.close();
};

app();
