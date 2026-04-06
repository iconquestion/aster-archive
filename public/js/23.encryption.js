/*
  PoC
  https://cyberchef.org/#recipe=AES_Decrypt(%7B'option':'UTF8','string':'nothingisgonnachangemyloveforyou'%7D,%7B'option':'UTF8','string':'i%5C'llloveufora1k%2B'%7D,'CBC','Hex','Hex',%7B'option':'Hex','string':''%7D,%7B'option':'Hex','string':''%7D)From_Hex('Auto')&input=MjNiYmE2NGRlMzNkOGFkMzAyNmRhNDg1NTBiNzBhMWEwZDc2Y2I1MDQyMWY0NmYxMjQxYjQ2YTJhMmMwNjlmMQ
*/

/*
async function decryptAes256CbcHex() {
  const cipherHex = "23bba64de33d8ad3026da48550b70a1a0d76cb50421f46f1241b46a2a2c069f1";
  const keyText = "nothingisgonnachangemyloveforyou";
  const ivText = "i'llloveufora1k+";

  const hexToBytes = hex => new Uint8Array(hex.match(/../g).map(x => parseInt(x, 16)));
  const bytesToHex = bytes => [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");

  const keyBytes = new TextEncoder().encode(keyText);
  const ivBytes = new TextEncoder().encode(ivText);
  const cipherBytes = hexToBytes(cipherHex);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: ivBytes },
    cryptoKey,
    cipherBytes
  );

  return bytesToHex(new Uint8Array(plainBuffer));
}

async function saveDecryptedFlagToLocalStorage() {
  const hex = await decryptAes256CbcHex();
  const bytes = new Uint8Array(hex.match(/../g).map(x => parseInt(x, 16)));
  const text = new TextDecoder().decode(bytes);
  localStorage.setItem("top_secret", text);
}

setTimeout(async () => {
  saveDecryptedFlagToLocalStorage();
}, 2000)
*/

const _m = [
  "subtle",     // 0
  "importKey",  // 1
  "decrypt",    // 2
  "setItem",    // 3
  "match",      // 4
  "from",       // 5
  "join",       // 6
  "padStart",   // 7
  "toString",   // 8
  "encode",     // 9
  "decode",     // 10
  "name",       // 11
  "AES",        // 12
  "CBC",        // 13
  "raw",        // 14
  "top",        // 15
  "secret",     // 16
  "local",      // 17
  "Storage"     // 18
];

const _j = (...x) => x.join("");
const _p = xs => _j(...xs);

const _k = ["nothing", "isgonna", "changemy", "loveforyou"];
const _v = ["i", "'", "llloveu", "fora1k", "+"];
const _c = [
  "23bba64d",
  "e33d8ad3",
  "026da485",
  "50b70a1a",
  "0d76cb50",
  "421f46f1",
  "241b46a2",
  "a2c069f1"
];

const _alg = _p([_m[12], "-", _m[13]]);
const _storeKey = _p([_m[15], "_", _m[16]]);
const _keyText = _k.join("");
const _ivText = _v.join("");
const _cipherHex = _c.join("");

const _hexToBytes = s =>
  new Uint8Array((s.match(/../g) || []).map(x => parseInt(x, 16)));

const _bytesToHex = buf =>
  Array.from(buf)
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");

async function _a() {
  const _te = new TextEncoder();
  const _keyBytes = _te[_m[9]](_keyText);
  const _ivBytes = _te[_m[9]](_ivText);
  const _cipherBytes = _hexToBytes(_cipherHex);

  const _cryptoKey = await crypto[_m[0]][_m[1]](
    _m[14],
    _keyBytes,
    { [_m[11]]: _alg },
    false,
    [_m[2]]
  );

  const _plainBuffer = await crypto[_m[0]][_m[2]](
    { [_m[11]]: _alg, iv: _ivBytes },
    _cryptoKey,
    _cipherBytes
  );

  return _bytesToHex(new Uint8Array(_plainBuffer));
}

async function _b() {
  const _hex = await _a();
  const _bytes = _hexToBytes(_hex);
  const _text = new TextDecoder()[_m[10]](_bytes);
  globalThis[_p([_m[17], _m[18]])][_m[3]](_storeKey, _text);
}

setTimeout(() => {
  _b();
}, 2000);