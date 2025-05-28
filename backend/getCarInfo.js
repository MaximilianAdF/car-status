const puppeteer = require('puppeteer');

async function getCarInfo(registration) {
    const url = `https://www.car.info/en-se/license-plate/S/${registration}`;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2' });

    const data = await page.evaluate(() => {
        const breadcrumbItems = document.querySelectorAll('ul.breadcrumb.clearfix li.breadcrumb-item');
        const make = breadcrumbItems[1]?.innerText.trim() || 'N/A';
        const year = breadcrumbItems[5]?.innerText.trim() || 'N/A';
        const model = breadcrumbItems[6]?.innerText.trim() || 'N/A';

        const valuations = document.querySelectorAll('div.featured_info_valuation');
        let individual = 'N/A', company = 'N/A';
        valuations.forEach(val => {
            const text = val.innerText;
            if (text.includes('Indicative valuation (individual)')) {
                individual = val.querySelector('.size_h3.mb-0.text-nowrap')?.innerText.trim();
            }
            if (text.includes('Indicative valuation (company)')) {
                company = val.querySelector('.size_h3.mb-0.text-nowrap')?.innerText.trim();
            }
        });

        let valuation = 'N/A';
        if (individual && company) valuation = `${individual} - ${company}`;
        else if (individual) valuation = individual;
        else if (company) valuation = company;

        return { make, model, year, valuation };
    });

    await browser.close();
    return data;
}