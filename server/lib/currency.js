const https = require('https');
const { setDevises } = require('./config');

const CURRENCY_SOURCE_URL =
  'https://bestchangetanger.com/cours-des-billets-de-banques-etrangers/';
const CURRENCY_REFRESH_MS = 30 * 60 * 1000;

const htmlEntityMap = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>'
};

const decodeHtmlEntities = (value) =>
  value.replace(/&[a-zA-Z0-9#]+;/g, (match) => htmlEntityMap[match] || match);

const stripTags = (value = '') =>
  decodeHtmlEntities(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

const sanitizeCurrencyValue = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim();
};

const resolveImageUrl = (src = '') => {
  try {
    return new URL(src, CURRENCY_SOURCE_URL).toString();
  } catch (error) {
    return src;
  }
};

const extractTableHtml = (html = '') => {
  const match = html.match(/<table[\s\S]*?<\/table>/i);
  return match ? match[0] : '';
};

const parseCurrencyRows = (tableHtml) => {
  if (!tableHtml) {
    return [];
  }
  const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  return rows
    .map((rowHtml) => {
      const cells = rowHtml.match(/<t[hd][^>]*?<\/t[hd]>/gi) || [];
      const values = [];
      let iconUrl = null;
      cells.forEach((cellHtml) => {
        const imgMatch = cellHtml.match(/<img[^>]+src=["']([^"']+)/i);
        if (imgMatch && !iconUrl) {
          iconUrl = resolveImageUrl(imgMatch[1]);
          const base = imgMatch[1].split('/').pop() || '';
          const name = base.split('.')[0];
          if (name) {
            values.push(sanitizeCurrencyValue(name));
          }
        }
        const text = stripTags(cellHtml);
        if (text) {
          values.push(text);
        }
      });
      if (values.length >= 5) {
        return {
          values,
          iconUrl,
        };
      }
      return null;
    })
    .filter(Boolean);
};

const formatCurrencies = (rows) => {
  const currencies = [];
  rows.forEach((row) => {
    const [unite, code, name, achat, vente] = row.values;
    const cleanedCode = sanitizeCurrencyValue(code).toUpperCase();
    if (!cleanedCode) {
      return;
    }
    currencies.push({
      unite: sanitizeCurrencyValue(unite),
      code: cleanedCode,
      name: sanitizeCurrencyValue(name),
      achat: sanitizeCurrencyValue(achat),
      vente: sanitizeCurrencyValue(vente),
      iconUrl: row.iconUrl,
    });
  });
  return currencies;
};

const mapCurrenciesToTickerItems = (currencies) =>
  currencies.map((currency) => ({
    code: currency.code,
    label: currency.name,
    icon: currency.iconUrl || currency.code.charAt(0),
    buyLabel: 'Achat',
    sellLabel: 'Vente',
    buy: currency.achat,
    sell: currency.vente,
  }));

const fetchCurrencyHtml = (url, redirectCount = 0) =>
  new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        rejectUnauthorized: false,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          redirectCount < 3
        ) {
          res.resume();
          let nextUrl = res.headers.location;
          try {
            nextUrl = new URL(res.headers.location, url).toString();
          } catch (error) {
          // ignore, fallback to raw header
          }
          resolve(fetchCurrencyHtml(nextUrl, redirectCount + 1));
          return;
        }

        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
      }
    );

    request.on('error', reject);
  });

const refreshCurrencyTicker = async () => {
  try {
    const html = await fetchCurrencyHtml(CURRENCY_SOURCE_URL);
    const tableHtml = extractTableHtml(html);
    if (!tableHtml) {
      console.warn('Aucune table de devises trouvée sur la page distante.');
      return;
    }
    const rows = parseCurrencyRows(tableHtml);
    const currencies = formatCurrencies(rows);
    if (!currencies.length) {
      console.warn('Impossible de parser les devises récupérées.');
      return;
    }
    const tickerItems = mapCurrenciesToTickerItems(currencies);
    
    await setDevises(tickerItems);
    
    console.log(`Ticker mis à jour depuis la source distante (${tickerItems.length} devises).`);
  } catch (error) {
    console.error('Impossible de rafraîchir les devises distantes', error);
  }
};

const startCurrencyTickerScheduler = () => {
  refreshCurrencyTicker();
  setInterval(refreshCurrencyTicker, CURRENCY_REFRESH_MS);
};

module.exports = {
  refreshCurrencyTicker,
  startCurrencyTickerScheduler,
};
