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

        // === Primary extraction using breadcrumb ===
        let make = $('ul.breadcrumb.clearfix li.breadcrumb-item:nth-child(2) a').text().trim() || 'N/A';
        let year = $('ul.breadcrumb.clearfix li.breadcrumb-item:nth-child(6) a').text().trim() || 'N/A';
        let model = $('ul.breadcrumb.clearfix li.breadcrumb-item:nth-child(7)').text().trim() || 'N/A';

        // === Fallback extraction from h1 if any value is N/A ===
        if (make === 'N/A' || model === 'N/A' || year === 'N/A') {
            const infoString = $('h1 a.ident_name').text().trim();

            // Format: "Porsche Panamera GTS PDK, 430hp, 2013"
            const infoMatch = infoString.match(/^([\w\s]+?)\s(.+?),\s\d+hp,\s(\d{4})$/);

            if (infoMatch && infoMatch.length === 4) {
                if (make === 'N/A') make = infoMatch[1].trim();
                if (model === 'N/A') model = infoMatch[2].trim();
                if (year === 'N/A') year = infoMatch[3].trim();
            }
        }

        // === Valuation extraction ===
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

async function testScraper() {
    if (process.argv.length > 2) {
        const registrationNumber = process.argv[2];
        console.log(`Attempting to fetch info for registration: ${registrationNumber}`);
        const info = await getCarInfo(registrationNumber);
        console.log("\n--- Returned Data ---");
        console.log(JSON.stringify(info, null, 2));
        console.log("---------------------\n");
    } else {
        console.log("Usage: node your_file_name.js <REGISTRATION_NUMBER>");
    }
}

if (require.main === module) {
    testScraper();
}