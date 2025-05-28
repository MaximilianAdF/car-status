require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY;

async function getCarInfo(registration) {
    const targetUrl = `https://www.car.info/en-se/license-plate/S/${registration}`;
    const apiUrl = `https://app.scrapingbee.com/api/v1`;

    try {
        console.log(`Fetching data from car.info for ${registration} via ScrapingBee`);

        const response = await axios.get(apiUrl, {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: targetUrl,
                render_js: true
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract breadcrumb info
        const make = $('ul.breadcrumb.clearfix li.breadcrumb-item:nth-child(2) a').text().trim() || 'N/A';
        const year = $('ul.breadcrumb.clearfix li.breadcrumb-item:nth-child(6) a').text().trim() || 'N/A';
        const model = $('ul.breadcrumb.clearfix li.breadcrumb-item:nth-child(7)').text().trim() || 'N/A';

        // Extract valuations
        const individualVal = $('div.featured_info_valuation:has(div:contains("Indicative valuation (individual)")) div.size_h3.mb-0.text-nowrap').text().trim();
        const companyVal = $('div.featured_info_valuation:has(div:contains("Indicative valuation (company)")) div.size_h3.mb-0.text-nowrap').text().trim();

        let valuation = 'N/A';
        if (individualVal && companyVal) {
            valuation = `${individualVal} - ${companyVal}`;
        } else if (individualVal) {
            valuation = individualVal;
        } else if (companyVal) {
            valuation = companyVal;
        }

        const carData = {
            make,
            model,
            year,
            valuation
        };

        return carData;

    } catch (error) {
        console.error(`Failed to fetch car info for ${registration}:`, error.message);
        return {
            registration: registration.toUpperCase(),
            error: 'Failed to fetch or parse car information.',
        };
    }
}

module.exports = getCarInfo;