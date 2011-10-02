/*!
 * helper functions for error reporting and generating HTML markup
 */

var reg_tmpl = /\$(\w*)\{(\w+)\}/g;

var errorDesc = {
  '404': 'The requested resource was not found.',
  '503': 'Error communicating with gateway.'
};
var htmlFrags = {

  //HTML Redirect
  redirect: [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head><title>Redirecting ...</title><meta http-equiv="refresh" content="0;url=${redir}"/></head>',
    '<body onload="location.replace(unescape(\'$esc{redir}\'))">',
    '<noscript><p>If you are not redirected, <a href="${redir}">Click Here</a> to continue.</p></noscript>',
    '</body>',
    '</html>'
  ].join('\n'),

  //HTTP Error
  error: [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head><title>${err}</title></head>',
    '<body><h1>${err}</h1><p>${desc}</p></body>',
    '</html>'
  ].join('\n')

};

function constructHTML(markup, params) {
  return String(markup).replace(reg_tmpl, function(_, $1, $2) {
    if ($1 == 'esc') {
      return escape(params[$2]);
    } else
    if ($1 == 'raw') {
      return String(params[$2]);
    } else {
      return htmlEnc(params[$2]);
    }
  });
}

function htmlEnc(s) {
  return String(s)
      .replace(/&/g, '&amp;')
      .replace(/>/g, '&gt;')
      .replace(/</g, '&lt;');
}

module.exports = {

  htmlError: function(req, res, error, description) {
    var statusCode = Number(String(error).split(' ')[0]);
    var html = constructHTML(htmlFrags.error, {
      err: error,
      desc: description || errorDesc[statusCode] || ''
    });
    res.sendHTML(statusCode, html, {pad: 512});
  },

  htmlRedirect: function(req, res, url) {
    var html = constructHTML(htmlFrags.redirect, {redir: url});
    res.sendHTML(200, html, {pad: 512});
  },

  proxyError: {
    'socket hang up': '502 Bad Gateway',
    'enotfound': '502 Bad Gateway',
    'parse Error': '502 Bad Gateway',
    'eperm': '503 Bad Gateway',
    'connection timeout': '504 Gateway Time-out'
  }

};
