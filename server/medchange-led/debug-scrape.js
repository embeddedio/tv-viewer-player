
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({ family: 4 });
const url = "https://bestchangetanger.com/cours-des-billets-de-banques-etrangers/";

async function debug() {
  try {
    console.log("Fetching...");
    const response = await axios.get(url, { httpsAgent });
    console.log("Status:", response.status);
    
    const $ = cheerio.load(response.data);
    const table = $("table");
    console.log("Tables found:", table.length);

    if (table.length > 0) {
        table.find("tr").each((i, row) => {
            const cells = $(row).find("td").map((j, cell) => $(cell).text().trim()).get();
            if (cells.length > 0) {
                console.log(`Row ${i}:`, cells);
            }
        });
    } else {
        console.log("HTML Preview:", response.data.substring(0, 500));
    }

  } catch (e) {
    console.error(e);
  }
}

debug();
