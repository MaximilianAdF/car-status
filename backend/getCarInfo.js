const axios = require('axios');
const cheerio = require('cheerio');

async function getCarInfo(registration) {
    try {
        const url = `https://www.car.info/en-se/license-plate/S/${registration}`;
        
        console.log(`Fetching data from: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // --- Extracting from Breadcrumbs ---
        const makeFromBreadcrumb = $('ul.breadcrumb.clearfix li.breadcrumb-item:nth-child(2) a').text().trim();
        const yearFromBreadcrumb = $('ul.breadcrumb.clearfix li.breadcrumb-item:nth-child(6) a').text().trim();
        const modelFromBreadcrumb = $('ul.breadcrumb.clearfix li.breadcrumb-item:nth-child(7)').text().trim();

        // --- Extracting Valuation Range ---
        // Selector for the div containing "Indicative valuation (individual)" text
        const individualValDescriptionSelector = 'div.text-muted.fs-7:contains("Indicative valuation (individual)")';
        // Selector for the div containing "Indicative valuation (company)" text
        const companyValDescriptionSelector = 'div.text-muted.fs-7:contains("Indicative valuation (company)")';
        // Selector for the actual value relative to its description's parent block
        const valueSelector = 'div.size_h3.mb-0.text-nowrap';

        const individualValText = $(`div.featured_info_valuation:has(${individualValDescriptionSelector}) ${valueSelector}`).text().trim();
        const companyValText = $(`div.featured_info_valuation:has(${companyValDescriptionSelector}) ${valueSelector}`).text().trim();

        let valuationRange = 'N/A';
        if (individualValText && companyValText) {
            // Assuming individual is typically the lower bound for the range presentation
            valuationRange = `${individualValText} - ${companyValText}`;
        } else if (individualValText) {
            valuationRange = individualValText; // Only individual found
        } else if (companyValText) {
            valuationRange = companyValText; // Only company found
        }


        const carData = {
            make: makeFromBreadcrumb || 'N/A',
            model: modelFromBreadcrumb || 'N/A',
            year: yearFromBreadcrumb || 'N/A',
            valuation: valuationRange || 'N/A',
            //valuationIndividual: individualValText || 'N/A',
            //valuationCompany: companyValText || 'N/A',
            //color: color || 'N/A',
            //sourceUrl: url
        };
        
        console.log('Extracted car data:', carData);
        return carData;

    } catch (error) {
        const regtoUpperCase = registration.toUpperCase();
        if (error.response) {
            console.error(`Error fetching car info for ${regtoUpperCase}: Status ${error.response.status} from ${error.config.url}`);
        } else if (error.request) {
            console.error(`Error fetching car info for ${regtoUpperCase}: No response from ${error.config.url}`);
        } else {
            console.error(`Error processing car info for ${regtoUpperCase}:`, error.message);
        }
        return {
            registration: regtoUpperCase,
            error: 'Failed to fetch or parse car information.',
        };
    }
}

module.exports = getCarInfo;

// --- Example Usage (for testing) ---
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