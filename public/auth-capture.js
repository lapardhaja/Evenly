/**
 * Password reset / email confirm: capture tokens before the PWA service worker
 * (HashRouter). Classic script on purpose — CSP script-src 'self' only, no inline.
 */
(function () {
  try {
    function parseKv(qs) {
      var o = {};
      if (!qs) return o;
      qs.split(/[?&]/).forEach(function (part) {
        if (!part || part.indexOf('=') < 0) return;
        var i = part.indexOf('=');
        var k = decodeURIComponent(part.slice(0, i).replace(/\+/g, ' '));
        var v = decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
        if (k) o[k] = v;
      });
      return o;
    }
    var h = window.location.hash || '';
    var search = window.location.search || '';
    var fromHash = {};
    if (h.length > 1) {
      var raw = h.charAt(0) === '#' ? h.slice(1) : h;
      var i2 = raw.indexOf('#');
      if (i2 >= 0) {
        Object.assign(fromHash, parseKv(raw.slice(0, i2)));
        Object.assign(fromHash, parseKv(raw.slice(i2 + 1)));
      } else {
        Object.assign(fromHash, parseKv(raw));
      }
    }
    var fromSearch = parseKv(search.charAt(0) === '?' ? search.slice(1) : search);
    var params = Object.assign({}, fromSearch, fromHash);
    if (
      !params.access_token &&
      !params.refresh_token &&
      !params.code &&
      !params.token_hash
    )
      return;
    var payload = {};
    if (params.access_token && params.refresh_token) {
      payload.access_token = params.access_token;
      payload.refresh_token = params.refresh_token;
    }
    if (params.code) payload.code = params.code;
    if (params.token_hash) payload.token_hash = params.token_hash;
    if (params.type) payload.type = params.type;
    if (Object.keys(payload).length === 0) return;
    sessionStorage.setItem('evenly:auth:pending', JSON.stringify(payload));
    var route = '#/update-password';
    var m = h.match(/^#(\/[^?&#]*)/);
    if (m) route = '#' + m[1];
    window.history.replaceState(window.history.state, '', window.location.pathname + route);
  } catch (e) {}
})();
