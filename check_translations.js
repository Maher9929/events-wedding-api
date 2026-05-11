const en = require('./frontend/src/locales/en.json');
const ar = require('./frontend/src/locales/ar.json');

function getKeys(obj, prefix) {
    prefix = prefix || '';
    var keys = [];
    for (var k of Object.keys(obj)) {
        var v = obj[k];
        var p = prefix ? prefix + '.' + k : k;
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            keys = keys.concat(getKeys(v, p));
        } else {
            keys.push(p);
        }
    }
    return keys;
}

var enK = new Set(getKeys(en));
var arK = new Set(getKeys(ar));
var missingInEn = [...arK].filter(function(k) { return !enK.has(k); });
var missingInAr = [...enK].filter(function(k) { return !arK.has(k); });

console.log('Missing in EN (' + missingInEn.length + '):');
missingInEn.forEach(function(k) { console.log('  ' + k); });
console.log('Missing in AR (' + missingInAr.length + '):');
missingInAr.forEach(function(k) { console.log('  ' + k); });
