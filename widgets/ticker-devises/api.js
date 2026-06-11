'use strict';
// Données déléguées au module tableau-change (même source, même cache)
const tableauChange = require('../tableau-change/api.js');

exports.getData = tableauChange.getData;

exports.handleRequest = async function (method, pathname, req, res, sendJson) {
  if (method === 'GET' && pathname === '/api/widgets/ticker-devises') {
    return tableauChange.getData(req, res, sendJson);
  }
  sendJson(res, { message: 'Not found' }, 404);
};
