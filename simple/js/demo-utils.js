(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":5}],3:[function(require,module,exports){
(function (global){
(function(a,b){if("function"==typeof define&&define.amd)define([],b);else if("undefined"!=typeof exports)b();else{b(),a.FileSaver={exports:{}}.exports}})(this,function(){"use strict";function b(a,b){return"undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Depricated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(b,c,d){var e=new XMLHttpRequest;e.open("GET",b),e.responseType="blob",e.onload=function(){a(e.response,c,d)},e.onerror=function(){console.error("could not download file")},e.send()}function d(a){var b=new XMLHttpRequest;return b.open("HEAD",a,!1),b.send(),200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"))}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b)}}var f=function(){try{return Function("return this")()||(42,eval)("this")}catch(a){return"object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof global&&global.global===global?global:this}}(),a=f.saveAs||"object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href)},4E4),setTimeout(function(){e(j)},0))}:"msSaveOrOpenBlob"in navigator?function(e,f,g){if(f=f||e.name||"download","string"!=typeof e)navigator.msSaveOrOpenBlob(b(e,g),f);else if(d(e))c(e,f,g);else{var h=document.createElement("a");h.href=e,h.target="_blank",setTimeout(function(){clikc(h)})}}:function(a,b,d,e){if(e=e||open("","_blank"),e&&(e.document.title=e.document.body.innerText="downloading..."),"string"==typeof a)return c(a,b,d);var g="application/octet-stream"===a.type,h=/constructor/i.test(f.HTMLElement)||f.safari,i=/CriOS\/[\d]+/.test(navigator.userAgent);if((i||g&&h)&&"object"==typeof FileReader){var j=new FileReader;j.onloadend=function(){var a=j.result;a=i?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),e?e.location.href=a:location=a,e=null},j.readAsDataURL(a)}else{var k=f.URL||f.webkitURL,l=k.createObjectURL(a);e?e.location=l:location.href=l,e=null,setTimeout(function(){k.revokeObjectURL(l)},4E4)}};module.exports=f.saveAs=a.saveAs=a});


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
'use strict';
const toBytes = s => [...s].map(c => c.charCodeAt(0));
const xpiZipFilename = toBytes('META-INF/mozilla.rsa');
const oxmlContentTypes = toBytes('[Content_Types].xml');
const oxmlRels = toBytes('_rels/.rels');

function readUInt64LE(buf, offset = 0) {
	let n = buf[offset];
	let mul = 1;
	let i = 0;
	while (++i < 8) {
		mul *= 0x100;
		n += buf[offset + i] * mul;
	}
	return n;
}

module.exports = input => {
	const buf = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (!(buf && buf.length > 1)) {
		return null;
	}

	const check = (header, options) => {
		options = Object.assign({
			offset: 0
		}, options);

		for (let i = 0; i < header.length; i++) {
			// If a bitmask is set
			if (options.mask) {
				// If header doesn't equal `buf` with bits masked off
				if (header[i] !== (options.mask[i] & buf[i + options.offset])) {
					return false;
				}
			} else if (header[i] !== buf[i + options.offset]) {
				return false;
			}
		}

		return true;
	};

	const checkString = (header, options) => check(toBytes(header), options);

	if (check([0xFF, 0xD8, 0xFF])) {
		return {
			ext: 'jpg',
			mime: 'image/jpeg'
		};
	}

	if (check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
		return {
			ext: 'png',
			mime: 'image/png'
		};
	}

	if (check([0x47, 0x49, 0x46])) {
		return {
			ext: 'gif',
			mime: 'image/gif'
		};
	}

	if (check([0x57, 0x45, 0x42, 0x50], {offset: 8})) {
		return {
			ext: 'webp',
			mime: 'image/webp'
		};
	}

	if (check([0x46, 0x4C, 0x49, 0x46])) {
		return {
			ext: 'flif',
			mime: 'image/flif'
		};
	}

	// Needs to be before `tif` check
	if (
		(check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) &&
		check([0x43, 0x52], {offset: 8})
	) {
		return {
			ext: 'cr2',
			mime: 'image/x-canon-cr2'
		};
	}

	if (
		check([0x49, 0x49, 0x2A, 0x0]) ||
		check([0x4D, 0x4D, 0x0, 0x2A])
	) {
		return {
			ext: 'tif',
			mime: 'image/tiff'
		};
	}

	if (check([0x42, 0x4D])) {
		return {
			ext: 'bmp',
			mime: 'image/bmp'
		};
	}

	if (check([0x49, 0x49, 0xBC])) {
		return {
			ext: 'jxr',
			mime: 'image/vnd.ms-photo'
		};
	}

	if (check([0x38, 0x42, 0x50, 0x53])) {
		return {
			ext: 'psd',
			mime: 'image/vnd.adobe.photoshop'
		};
	}

	// Zip-based file formats
	// Need to be before the `zip` check
	if (check([0x50, 0x4B, 0x3, 0x4])) {
		if (
			check([0x6D, 0x69, 0x6D, 0x65, 0x74, 0x79, 0x70, 0x65, 0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x65, 0x70, 0x75, 0x62, 0x2B, 0x7A, 0x69, 0x70], {offset: 30})
		) {
			return {
				ext: 'epub',
				mime: 'application/epub+zip'
			};
		}

		// Assumes signed `.xpi` from addons.mozilla.org
		if (check(xpiZipFilename, {offset: 30})) {
			return {
				ext: 'xpi',
				mime: 'application/x-xpinstall'
			};
		}

		if (checkString('mimetypeapplication/vnd.oasis.opendocument.text', {offset: 30})) {
			return {
				ext: 'odt',
				mime: 'application/vnd.oasis.opendocument.text'
			};
		}

		if (checkString('mimetypeapplication/vnd.oasis.opendocument.spreadsheet', {offset: 30})) {
			return {
				ext: 'ods',
				mime: 'application/vnd.oasis.opendocument.spreadsheet'
			};
		}

		if (checkString('mimetypeapplication/vnd.oasis.opendocument.presentation', {offset: 30})) {
			return {
				ext: 'odp',
				mime: 'application/vnd.oasis.opendocument.presentation'
			};
		}

		// The docx, xlsx and pptx file types extend the Office Open XML file format:
		// https://en.wikipedia.org/wiki/Office_Open_XML_file_formats
		// We look for:
		// - one entry named '[Content_Types].xml' or '_rels/.rels',
		// - one entry indicating specific type of file.
		// MS Office, OpenOffice and LibreOffice may put the parts in different order, so the check should not rely on it.
		const findNextZipHeaderIndex = (arr, startAt = 0) => arr.findIndex((el, i, arr) => i >= startAt && arr[i] === 0x50 && arr[i + 1] === 0x4B && arr[i + 2] === 0x3 && arr[i + 3] === 0x4);

		let zipHeaderIndex = 0; // The first zip header was already found at index 0
		let oxmlFound = false;
		let type = null;

		do {
			const offset = zipHeaderIndex + 30;

			if (!oxmlFound) {
				oxmlFound = (check(oxmlContentTypes, {offset}) || check(oxmlRels, {offset}));
			}

			if (!type) {
				if (checkString('word/', {offset})) {
					type = {
						ext: 'docx',
						mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
					};
				} else if (checkString('ppt/', {offset})) {
					type = {
						ext: 'pptx',
						mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
					};
				} else if (checkString('xl/', {offset})) {
					type = {
						ext: 'xlsx',
						mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					};
				}
			}

			if (oxmlFound && type) {
				return type;
			}

			zipHeaderIndex = findNextZipHeaderIndex(buf, offset);
		} while (zipHeaderIndex >= 0);

		// No more zip parts available in the buffer, but maybe we are almost certain about the type?
		if (type) {
			return type;
		}
	}

	if (
		check([0x50, 0x4B]) &&
		(buf[2] === 0x3 || buf[2] === 0x5 || buf[2] === 0x7) &&
		(buf[3] === 0x4 || buf[3] === 0x6 || buf[3] === 0x8)
	) {
		return {
			ext: 'zip',
			mime: 'application/zip'
		};
	}

	if (check([0x75, 0x73, 0x74, 0x61, 0x72], {offset: 257})) {
		return {
			ext: 'tar',
			mime: 'application/x-tar'
		};
	}

	if (
		check([0x52, 0x61, 0x72, 0x21, 0x1A, 0x7]) &&
		(buf[6] === 0x0 || buf[6] === 0x1)
	) {
		return {
			ext: 'rar',
			mime: 'application/x-rar-compressed'
		};
	}

	if (check([0x1F, 0x8B, 0x8])) {
		return {
			ext: 'gz',
			mime: 'application/gzip'
		};
	}

	if (check([0x42, 0x5A, 0x68])) {
		return {
			ext: 'bz2',
			mime: 'application/x-bzip2'
		};
	}

	if (check([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
		return {
			ext: '7z',
			mime: 'application/x-7z-compressed'
		};
	}

	if (check([0x78, 0x01])) {
		return {
			ext: 'dmg',
			mime: 'application/x-apple-diskimage'
		};
	}

	if (check([0x33, 0x67, 0x70, 0x35]) || // 3gp5
		(
			check([0x0, 0x0, 0x0]) && check([0x66, 0x74, 0x79, 0x70], {offset: 4}) &&
				(
					check([0x6D, 0x70, 0x34, 0x31], {offset: 8}) || // MP41
					check([0x6D, 0x70, 0x34, 0x32], {offset: 8}) || // MP42
					check([0x69, 0x73, 0x6F, 0x6D], {offset: 8}) || // ISOM
					check([0x69, 0x73, 0x6F, 0x32], {offset: 8}) || // ISO2
					check([0x6D, 0x6D, 0x70, 0x34], {offset: 8}) || // MMP4
					check([0x4D, 0x34, 0x56], {offset: 8}) || // M4V
					check([0x64, 0x61, 0x73, 0x68], {offset: 8}) // DASH
				)
		)) {
		return {
			ext: 'mp4',
			mime: 'video/mp4'
		};
	}

	if (check([0x4D, 0x54, 0x68, 0x64])) {
		return {
			ext: 'mid',
			mime: 'audio/midi'
		};
	}

	// https://github.com/threatstack/libmagic/blob/master/magic/Magdir/matroska
	if (check([0x1A, 0x45, 0xDF, 0xA3])) {
		const sliced = buf.subarray(4, 4 + 4096);
		const idPos = sliced.findIndex((el, i, arr) => arr[i] === 0x42 && arr[i + 1] === 0x82);

		if (idPos !== -1) {
			const docTypePos = idPos + 3;
			const findDocType = type => [...type].every((c, i) => sliced[docTypePos + i] === c.charCodeAt(0));

			if (findDocType('matroska')) {
				return {
					ext: 'mkv',
					mime: 'video/x-matroska'
				};
			}

			if (findDocType('webm')) {
				return {
					ext: 'webm',
					mime: 'video/webm'
				};
			}
		}
	}

	if (check([0x0, 0x0, 0x0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]) ||
		check([0x66, 0x72, 0x65, 0x65], {offset: 4}) ||
		check([0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20], {offset: 4}) ||
		check([0x6D, 0x64, 0x61, 0x74], {offset: 4}) || // MJPEG
		check([0x77, 0x69, 0x64, 0x65], {offset: 4})) {
		return {
			ext: 'mov',
			mime: 'video/quicktime'
		};
	}

	// RIFF file format which might be AVI, WAV, QCP, etc
	if (check([0x52, 0x49, 0x46, 0x46])) {
		if (check([0x41, 0x56, 0x49], {offset: 8})) {
			return {
				ext: 'avi',
				mime: 'video/vnd.avi'
			};
		}
		if (check([0x57, 0x41, 0x56, 0x45], {offset: 8})) {
			return {
				ext: 'wav',
				mime: 'audio/vnd.wave'
			};
		}
		// QLCM, QCP file
		if (check([0x51, 0x4C, 0x43, 0x4D], {offset: 8})) {
			return {
				ext: 'qcp',
				mime: 'audio/qcelp'
			};
		}
	}

	// ASF_Header_Object first 80 bytes
	if (check([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9])) {
		// Search for header should be in first 1KB of file.

		let offset = 30;
		do {
			const objectSize = readUInt64LE(buf, offset + 16);
			if (check([0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65], {offset})) {
				// Sync on Stream-Properties-Object (B7DC0791-A9B7-11CF-8EE6-00C00C205365)
				if (check([0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B], {offset: offset + 24})) {
					// Found audio:
					return {
						ext: 'wma',
						mime: 'audio/x-ms-wma'
					};
				}

				if (check([0xC0, 0xEF, 0x19, 0xBC, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B], {offset: offset + 24})) {
					// Found video:
					return {
						ext: 'wmv',
						mime: 'video/x-ms-asf'
					};
				}

				break;
			}
			offset += objectSize;
		} while (offset + 24 <= buf.length);

		// Default to ASF generic extension
		return {
			ext: 'asf',
			mime: 'application/vnd.ms-asf'
		};
	}

	if (
		check([0x0, 0x0, 0x1, 0xBA]) ||
		check([0x0, 0x0, 0x1, 0xB3])
	) {
		return {
			ext: 'mpg',
			mime: 'video/mpeg'
		};
	}

	if (check([0x66, 0x74, 0x79, 0x70, 0x33, 0x67], {offset: 4})) {
		return {
			ext: '3gp',
			mime: 'video/3gpp'
		};
	}

	// Check for MPEG header at different starting offsets
	for (let start = 0; start < 2 && start < (buf.length - 16); start++) {
		if (
			check([0x49, 0x44, 0x33], {offset: start}) || // ID3 header
			check([0xFF, 0xE2], {offset: start, mask: [0xFF, 0xE2]}) // MPEG 1 or 2 Layer 3 header
		) {
			return {
				ext: 'mp3',
				mime: 'audio/mpeg'
			};
		}

		if (
			check([0xFF, 0xE4], {offset: start, mask: [0xFF, 0xE4]}) // MPEG 1 or 2 Layer 2 header
		) {
			return {
				ext: 'mp2',
				mime: 'audio/mpeg'
			};
		}

		if (
			check([0xFF, 0xF8], {offset: start, mask: [0xFF, 0xFC]}) // MPEG 2 layer 0 using ADTS
		) {
			return {
				ext: 'mp2',
				mime: 'audio/mpeg'
			};
		}

		if (
			check([0xFF, 0xF0], {offset: start, mask: [0xFF, 0xFC]}) // MPEG 4 layer 0 using ADTS
		) {
			return {
				ext: 'mp4',
				mime: 'audio/mpeg'
			};
		}
	}

	if (
		check([0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], {offset: 4}) ||
		check([0x4D, 0x34, 0x41, 0x20])
	) {
		return { // MPEG-4 layer 3 (audio)
			ext: 'm4a',
			mime: 'audio/mp4' // RFC 4337
		};
	}

	// Needs to be before `ogg` check
	if (check([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], {offset: 28})) {
		return {
			ext: 'opus',
			mime: 'audio/opus'
		};
	}

	// If 'OggS' in first  bytes, then OGG container
	if (check([0x4F, 0x67, 0x67, 0x53])) {
		// This is a OGG container

		// If ' theora' in header.
		if (check([0x80, 0x74, 0x68, 0x65, 0x6F, 0x72, 0x61], {offset: 28})) {
			return {
				ext: 'ogv',
				mime: 'video/ogg'
			};
		}
		// If '\x01video' in header.
		if (check([0x01, 0x76, 0x69, 0x64, 0x65, 0x6F, 0x00], {offset: 28})) {
			return {
				ext: 'ogm',
				mime: 'video/ogg'
			};
		}
		// If ' FLAC' in header  https://xiph.org/flac/faq.html
		if (check([0x7F, 0x46, 0x4C, 0x41, 0x43], {offset: 28})) {
			return {
				ext: 'oga',
				mime: 'audio/ogg'
			};
		}

		// 'Speex  ' in header https://en.wikipedia.org/wiki/Speex
		if (check([0x53, 0x70, 0x65, 0x65, 0x78, 0x20, 0x20], {offset: 28})) {
			return {
				ext: 'spx',
				mime: 'audio/ogg'
			};
		}

		// If '\x01vorbis' in header
		if (check([0x01, 0x76, 0x6F, 0x72, 0x62, 0x69, 0x73], {offset: 28})) {
			return {
				ext: 'ogg',
				mime: 'audio/ogg'
			};
		}

		// Default OGG container https://www.iana.org/assignments/media-types/application/ogg
		return {
			ext: 'ogx',
			mime: 'application/ogg'
		};
	}

	if (check([0x66, 0x4C, 0x61, 0x43])) {
		return {
			ext: 'flac',
			mime: 'audio/x-flac'
		};
	}

	if (check([0x4D, 0x41, 0x43, 0x20])) { // 'MAC '
		return {
			ext: 'ape',
			mime: 'audio/ape'
		};
	}

	if (check([0x77, 0x76, 0x70, 0x6B])) { // 'wvpk'
		return {
			ext: 'wv',
			mime: 'audio/wavpack'
		};
	}

	if (check([0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A])) {
		return {
			ext: 'amr',
			mime: 'audio/amr'
		};
	}

	if (check([0x25, 0x50, 0x44, 0x46])) {
		return {
			ext: 'pdf',
			mime: 'application/pdf'
		};
	}

	if (check([0x4D, 0x5A])) {
		return {
			ext: 'exe',
			mime: 'application/x-msdownload'
		};
	}

	if (
		(buf[0] === 0x43 || buf[0] === 0x46) &&
		check([0x57, 0x53], {offset: 1})
	) {
		return {
			ext: 'swf',
			mime: 'application/x-shockwave-flash'
		};
	}

	if (check([0x7B, 0x5C, 0x72, 0x74, 0x66])) {
		return {
			ext: 'rtf',
			mime: 'application/rtf'
		};
	}

	if (check([0x00, 0x61, 0x73, 0x6D])) {
		return {
			ext: 'wasm',
			mime: 'application/wasm'
		};
	}

	if (
		check([0x77, 0x4F, 0x46, 0x46]) &&
		(
			check([0x00, 0x01, 0x00, 0x00], {offset: 4}) ||
			check([0x4F, 0x54, 0x54, 0x4F], {offset: 4})
		)
	) {
		return {
			ext: 'woff',
			mime: 'font/woff'
		};
	}

	if (
		check([0x77, 0x4F, 0x46, 0x32]) &&
		(
			check([0x00, 0x01, 0x00, 0x00], {offset: 4}) ||
			check([0x4F, 0x54, 0x54, 0x4F], {offset: 4})
		)
	) {
		return {
			ext: 'woff2',
			mime: 'font/woff2'
		};
	}

	if (
		check([0x4C, 0x50], {offset: 34}) &&
		(
			check([0x00, 0x00, 0x01], {offset: 8}) ||
			check([0x01, 0x00, 0x02], {offset: 8}) ||
			check([0x02, 0x00, 0x02], {offset: 8})
		)
	) {
		return {
			ext: 'eot',
			mime: 'application/vnd.ms-fontobject'
		};
	}

	if (check([0x00, 0x01, 0x00, 0x00, 0x00])) {
		return {
			ext: 'ttf',
			mime: 'font/ttf'
		};
	}

	if (check([0x4F, 0x54, 0x54, 0x4F, 0x00])) {
		return {
			ext: 'otf',
			mime: 'font/otf'
		};
	}

	if (check([0x00, 0x00, 0x01, 0x00])) {
		return {
			ext: 'ico',
			mime: 'image/x-icon'
		};
	}

	if (check([0x00, 0x00, 0x02, 0x00])) {
		return {
			ext: 'cur',
			mime: 'image/x-icon'
		};
	}

	if (check([0x46, 0x4C, 0x56, 0x01])) {
		return {
			ext: 'flv',
			mime: 'video/x-flv'
		};
	}

	if (check([0x25, 0x21])) {
		return {
			ext: 'ps',
			mime: 'application/postscript'
		};
	}

	if (check([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
		return {
			ext: 'xz',
			mime: 'application/x-xz'
		};
	}

	if (check([0x53, 0x51, 0x4C, 0x69])) {
		return {
			ext: 'sqlite',
			mime: 'application/x-sqlite3'
		};
	}

	if (check([0x4E, 0x45, 0x53, 0x1A])) {
		return {
			ext: 'nes',
			mime: 'application/x-nintendo-nes-rom'
		};
	}

	if (check([0x43, 0x72, 0x32, 0x34])) {
		return {
			ext: 'crx',
			mime: 'application/x-google-chrome-extension'
		};
	}

	if (
		check([0x4D, 0x53, 0x43, 0x46]) ||
		check([0x49, 0x53, 0x63, 0x28])
	) {
		return {
			ext: 'cab',
			mime: 'application/vnd.ms-cab-compressed'
		};
	}

	// Needs to be before `ar` check
	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E, 0x0A, 0x64, 0x65, 0x62, 0x69, 0x61, 0x6E, 0x2D, 0x62, 0x69, 0x6E, 0x61, 0x72, 0x79])) {
		return {
			ext: 'deb',
			mime: 'application/x-deb'
		};
	}

	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E])) {
		return {
			ext: 'ar',
			mime: 'application/x-unix-archive'
		};
	}

	if (check([0xED, 0xAB, 0xEE, 0xDB])) {
		return {
			ext: 'rpm',
			mime: 'application/x-rpm'
		};
	}

	if (
		check([0x1F, 0xA0]) ||
		check([0x1F, 0x9D])
	) {
		return {
			ext: 'Z',
			mime: 'application/x-compress'
		};
	}

	if (check([0x4C, 0x5A, 0x49, 0x50])) {
		return {
			ext: 'lz',
			mime: 'application/x-lzip'
		};
	}

	if (check([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
		return {
			ext: 'msi',
			mime: 'application/x-msi'
		};
	}

	if (check([0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0D, 0x01, 0x02, 0x01, 0x01, 0x02])) {
		return {
			ext: 'mxf',
			mime: 'application/mxf'
		};
	}

	if (check([0x47], {offset: 4}) && (check([0x47], {offset: 192}) || check([0x47], {offset: 196}))) {
		return {
			ext: 'mts',
			mime: 'video/mp2t'
		};
	}

	if (check([0x42, 0x4C, 0x45, 0x4E, 0x44, 0x45, 0x52])) {
		return {
			ext: 'blend',
			mime: 'application/x-blender'
		};
	}

	if (check([0x42, 0x50, 0x47, 0xFB])) {
		return {
			ext: 'bpg',
			mime: 'image/bpg'
		};
	}

	if (check([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20, 0x0D, 0x0A, 0x87, 0x0A])) {
		// JPEG-2000 family

		if (check([0x6A, 0x70, 0x32, 0x20], {offset: 20})) {
			return {
				ext: 'jp2',
				mime: 'image/jp2'
			};
		}

		if (check([0x6A, 0x70, 0x78, 0x20], {offset: 20})) {
			return {
				ext: 'jpx',
				mime: 'image/jpx'
			};
		}

		if (check([0x6A, 0x70, 0x6D, 0x20], {offset: 20})) {
			return {
				ext: 'jpm',
				mime: 'image/jpm'
			};
		}

		if (check([0x6D, 0x6A, 0x70, 0x32], {offset: 20})) {
			return {
				ext: 'mj2',
				mime: 'image/mj2'
			};
		}
	}

	if (check([0x46, 0x4F, 0x52, 0x4D, 0x00])) {
		return {
			ext: 'aif',
			mime: 'audio/aiff'
		};
	}

	if (checkString('<?xml ')) {
		return {
			ext: 'xml',
			mime: 'application/xml'
		};
	}

	if (check([0x42, 0x4F, 0x4F, 0x4B, 0x4D, 0x4F, 0x42, 0x49], {offset: 60})) {
		return {
			ext: 'mobi',
			mime: 'application/x-mobipocket-ebook'
		};
	}

	// File Type Box (https://en.wikipedia.org/wiki/ISO_base_media_file_format)
	if (check([0x66, 0x74, 0x79, 0x70], {offset: 4})) {
		if (check([0x6D, 0x69, 0x66, 0x31], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heif'
			};
		}

		if (check([0x6D, 0x73, 0x66, 0x31], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heif-sequence'
			};
		}

		if (check([0x68, 0x65, 0x69, 0x63], {offset: 8}) || check([0x68, 0x65, 0x69, 0x78], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heic'
			};
		}

		if (check([0x68, 0x65, 0x76, 0x63], {offset: 8}) || check([0x68, 0x65, 0x76, 0x78], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heic-sequence'
			};
		}
	}

	if (check([0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A])) {
		return {
			ext: 'ktx',
			mime: 'image/ktx'
		};
	}

	return null;
};

},{}],5:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){
//! moment.js

;(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.moment = factory()
}(this, (function () { 'use strict';

    var hookCallback;

    function hooks () {
        return hookCallback.apply(null, arguments);
    }

    // This is done to register the method called with moment()
    // without creating circular dependencies.
    function setHookCallback (callback) {
        hookCallback = callback;
    }

    function isArray(input) {
        return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
    }

    function isObject(input) {
        // IE8 will treat undefined and null as object if it wasn't for
        // input != null
        return input != null && Object.prototype.toString.call(input) === '[object Object]';
    }

    function isObjectEmpty(obj) {
        if (Object.getOwnPropertyNames) {
            return (Object.getOwnPropertyNames(obj).length === 0);
        } else {
            var k;
            for (k in obj) {
                if (obj.hasOwnProperty(k)) {
                    return false;
                }
            }
            return true;
        }
    }

    function isUndefined(input) {
        return input === void 0;
    }

    function isNumber(input) {
        return typeof input === 'number' || Object.prototype.toString.call(input) === '[object Number]';
    }

    function isDate(input) {
        return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function hasOwnProp(a, b) {
        return Object.prototype.hasOwnProperty.call(a, b);
    }

    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function createUTC (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, true).utc();
    }

    function defaultParsingFlags() {
        // We need to deep clone this object.
        return {
            empty           : false,
            unusedTokens    : [],
            unusedInput     : [],
            overflow        : -2,
            charsLeftOver   : 0,
            nullInput       : false,
            invalidMonth    : null,
            invalidFormat   : false,
            userInvalidated : false,
            iso             : false,
            parsedDateParts : [],
            meridiem        : null,
            rfc2822         : false,
            weekdayMismatch : false
        };
    }

    function getParsingFlags(m) {
        if (m._pf == null) {
            m._pf = defaultParsingFlags();
        }
        return m._pf;
    }

    var some;
    if (Array.prototype.some) {
        some = Array.prototype.some;
    } else {
        some = function (fun) {
            var t = Object(this);
            var len = t.length >>> 0;

            for (var i = 0; i < len; i++) {
                if (i in t && fun.call(this, t[i], i, t)) {
                    return true;
                }
            }

            return false;
        };
    }

    function isValid(m) {
        if (m._isValid == null) {
            var flags = getParsingFlags(m);
            var parsedParts = some.call(flags.parsedDateParts, function (i) {
                return i != null;
            });
            var isNowValid = !isNaN(m._d.getTime()) &&
                flags.overflow < 0 &&
                !flags.empty &&
                !flags.invalidMonth &&
                !flags.invalidWeekday &&
                !flags.weekdayMismatch &&
                !flags.nullInput &&
                !flags.invalidFormat &&
                !flags.userInvalidated &&
                (!flags.meridiem || (flags.meridiem && parsedParts));

            if (m._strict) {
                isNowValid = isNowValid &&
                    flags.charsLeftOver === 0 &&
                    flags.unusedTokens.length === 0 &&
                    flags.bigHour === undefined;
            }

            if (Object.isFrozen == null || !Object.isFrozen(m)) {
                m._isValid = isNowValid;
            }
            else {
                return isNowValid;
            }
        }
        return m._isValid;
    }

    function createInvalid (flags) {
        var m = createUTC(NaN);
        if (flags != null) {
            extend(getParsingFlags(m), flags);
        }
        else {
            getParsingFlags(m).userInvalidated = true;
        }

        return m;
    }

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    var momentProperties = hooks.momentProperties = [];

    function copyConfig(to, from) {
        var i, prop, val;

        if (!isUndefined(from._isAMomentObject)) {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (!isUndefined(from._i)) {
            to._i = from._i;
        }
        if (!isUndefined(from._f)) {
            to._f = from._f;
        }
        if (!isUndefined(from._l)) {
            to._l = from._l;
        }
        if (!isUndefined(from._strict)) {
            to._strict = from._strict;
        }
        if (!isUndefined(from._tzm)) {
            to._tzm = from._tzm;
        }
        if (!isUndefined(from._isUTC)) {
            to._isUTC = from._isUTC;
        }
        if (!isUndefined(from._offset)) {
            to._offset = from._offset;
        }
        if (!isUndefined(from._pf)) {
            to._pf = getParsingFlags(from);
        }
        if (!isUndefined(from._locale)) {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i = 0; i < momentProperties.length; i++) {
                prop = momentProperties[i];
                val = from[prop];
                if (!isUndefined(val)) {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    var updateInProgress = false;

    // Moment prototype object
    function Moment(config) {
        copyConfig(this, config);
        this._d = new Date(config._d != null ? config._d.getTime() : NaN);
        if (!this.isValid()) {
            this._d = new Date(NaN);
        }
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            hooks.updateOffset(this);
            updateInProgress = false;
        }
    }

    function isMoment (obj) {
        return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
    }

    function absFloor (number) {
        if (number < 0) {
            // -0 -> 0
            return Math.ceil(number) || 0;
        } else {
            return Math.floor(number);
        }
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            value = absFloor(coercedNumber);
        }

        return value;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function warn(msg) {
        if (hooks.suppressDeprecationWarnings === false &&
                (typeof console !==  'undefined') && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;

        return extend(function () {
            if (hooks.deprecationHandler != null) {
                hooks.deprecationHandler(null, msg);
            }
            if (firstTime) {
                var args = [];
                var arg;
                for (var i = 0; i < arguments.length; i++) {
                    arg = '';
                    if (typeof arguments[i] === 'object') {
                        arg += '\n[' + i + '] ';
                        for (var key in arguments[0]) {
                            arg += key + ': ' + arguments[0][key] + ', ';
                        }
                        arg = arg.slice(0, -2); // Remove trailing comma and space
                    } else {
                        arg = arguments[i];
                    }
                    args.push(arg);
                }
                warn(msg + '\nArguments: ' + Array.prototype.slice.call(args).join('') + '\n' + (new Error()).stack);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    var deprecations = {};

    function deprecateSimple(name, msg) {
        if (hooks.deprecationHandler != null) {
            hooks.deprecationHandler(name, msg);
        }
        if (!deprecations[name]) {
            warn(msg);
            deprecations[name] = true;
        }
    }

    hooks.suppressDeprecationWarnings = false;
    hooks.deprecationHandler = null;

    function isFunction(input) {
        return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
    }

    function set (config) {
        var prop, i;
        for (i in config) {
            prop = config[i];
            if (isFunction(prop)) {
                this[i] = prop;
            } else {
                this['_' + i] = prop;
            }
        }
        this._config = config;
        // Lenient ordinal parsing accepts just a number in addition to
        // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
        // TODO: Remove "ordinalParse" fallback in next major release.
        this._dayOfMonthOrdinalParseLenient = new RegExp(
            (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
                '|' + (/\d{1,2}/).source);
    }

    function mergeConfigs(parentConfig, childConfig) {
        var res = extend({}, parentConfig), prop;
        for (prop in childConfig) {
            if (hasOwnProp(childConfig, prop)) {
                if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
                    res[prop] = {};
                    extend(res[prop], parentConfig[prop]);
                    extend(res[prop], childConfig[prop]);
                } else if (childConfig[prop] != null) {
                    res[prop] = childConfig[prop];
                } else {
                    delete res[prop];
                }
            }
        }
        for (prop in parentConfig) {
            if (hasOwnProp(parentConfig, prop) &&
                    !hasOwnProp(childConfig, prop) &&
                    isObject(parentConfig[prop])) {
                // make sure changes to properties don't modify parent config
                res[prop] = extend({}, res[prop]);
            }
        }
        return res;
    }

    function Locale(config) {
        if (config != null) {
            this.set(config);
        }
    }

    var keys;

    if (Object.keys) {
        keys = Object.keys;
    } else {
        keys = function (obj) {
            var i, res = [];
            for (i in obj) {
                if (hasOwnProp(obj, i)) {
                    res.push(i);
                }
            }
            return res;
        };
    }

    var defaultCalendar = {
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        nextWeek : 'dddd [at] LT',
        lastDay : '[Yesterday at] LT',
        lastWeek : '[Last] dddd [at] LT',
        sameElse : 'L'
    };

    function calendar (key, mom, now) {
        var output = this._calendar[key] || this._calendar['sameElse'];
        return isFunction(output) ? output.call(mom, now) : output;
    }

    var defaultLongDateFormat = {
        LTS  : 'h:mm:ss A',
        LT   : 'h:mm A',
        L    : 'MM/DD/YYYY',
        LL   : 'MMMM D, YYYY',
        LLL  : 'MMMM D, YYYY h:mm A',
        LLLL : 'dddd, MMMM D, YYYY h:mm A'
    };

    function longDateFormat (key) {
        var format = this._longDateFormat[key],
            formatUpper = this._longDateFormat[key.toUpperCase()];

        if (format || !formatUpper) {
            return format;
        }

        this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
            return val.slice(1);
        });

        return this._longDateFormat[key];
    }

    var defaultInvalidDate = 'Invalid date';

    function invalidDate () {
        return this._invalidDate;
    }

    var defaultOrdinal = '%d';
    var defaultDayOfMonthOrdinalParse = /\d{1,2}/;

    function ordinal (number) {
        return this._ordinal.replace('%d', number);
    }

    var defaultRelativeTime = {
        future : 'in %s',
        past   : '%s ago',
        s  : 'a few seconds',
        ss : '%d seconds',
        m  : 'a minute',
        mm : '%d minutes',
        h  : 'an hour',
        hh : '%d hours',
        d  : 'a day',
        dd : '%d days',
        M  : 'a month',
        MM : '%d months',
        y  : 'a year',
        yy : '%d years'
    };

    function relativeTime (number, withoutSuffix, string, isFuture) {
        var output = this._relativeTime[string];
        return (isFunction(output)) ?
            output(number, withoutSuffix, string, isFuture) :
            output.replace(/%d/i, number);
    }

    function pastFuture (diff, output) {
        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
        return isFunction(format) ? format(output) : format.replace(/%s/i, output);
    }

    var aliases = {};

    function addUnitAlias (unit, shorthand) {
        var lowerCase = unit.toLowerCase();
        aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
    }

    function normalizeUnits(units) {
        return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    var priorities = {};

    function addUnitPriority(unit, priority) {
        priorities[unit] = priority;
    }

    function getPrioritizedUnits(unitsObj) {
        var units = [];
        for (var u in unitsObj) {
            units.push({unit: u, priority: priorities[u]});
        }
        units.sort(function (a, b) {
            return a.priority - b.priority;
        });
        return units;
    }

    function zeroFill(number, targetLength, forceSign) {
        var absNumber = '' + Math.abs(number),
            zerosToFill = targetLength - absNumber.length,
            sign = number >= 0;
        return (sign ? (forceSign ? '+' : '') : '-') +
            Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
    }

    var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

    var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

    var formatFunctions = {};

    var formatTokenFunctions = {};

    // token:    'M'
    // padded:   ['MM', 2]
    // ordinal:  'Mo'
    // callback: function () { this.month() + 1 }
    function addFormatToken (token, padded, ordinal, callback) {
        var func = callback;
        if (typeof callback === 'string') {
            func = function () {
                return this[callback]();
            };
        }
        if (token) {
            formatTokenFunctions[token] = func;
        }
        if (padded) {
            formatTokenFunctions[padded[0]] = function () {
                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
            };
        }
        if (ordinal) {
            formatTokenFunctions[ordinal] = function () {
                return this.localeData().ordinal(func.apply(this, arguments), token);
            };
        }
    }

    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '', i;
            for (i = 0; i < length; i++) {
                output += isFunction(array[i]) ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());
        formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }

    var match1         = /\d/;            //       0 - 9
    var match2         = /\d\d/;          //      00 - 99
    var match3         = /\d{3}/;         //     000 - 999
    var match4         = /\d{4}/;         //    0000 - 9999
    var match6         = /[+-]?\d{6}/;    // -999999 - 999999
    var match1to2      = /\d\d?/;         //       0 - 99
    var match3to4      = /\d\d\d\d?/;     //     999 - 9999
    var match5to6      = /\d\d\d\d\d\d?/; //   99999 - 999999
    var match1to3      = /\d{1,3}/;       //       0 - 999
    var match1to4      = /\d{1,4}/;       //       0 - 9999
    var match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

    var matchUnsigned  = /\d+/;           //       0 - inf
    var matchSigned    = /[+-]?\d+/;      //    -inf - inf

    var matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z
    var matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi; // +00 -00 +00:00 -00:00 +0000 -0000 or Z

    var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

    // any word (or two) characters or numbers including two/three word month in arabic.
    // includes scottish gaelic two word and hyphenated months
    var matchWord = /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i;

    var regexes = {};

    function addRegexToken (token, regex, strictRegex) {
        regexes[token] = isFunction(regex) ? regex : function (isStrict, localeData) {
            return (isStrict && strictRegex) ? strictRegex : regex;
        };
    }

    function getParseRegexForToken (token, config) {
        if (!hasOwnProp(regexes, token)) {
            return new RegExp(unescapeFormat(token));
        }

        return regexes[token](config._strict, config._locale);
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function unescapeFormat(s) {
        return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        }));
    }

    function regexEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    var tokens = {};

    function addParseToken (token, callback) {
        var i, func = callback;
        if (typeof token === 'string') {
            token = [token];
        }
        if (isNumber(callback)) {
            func = function (input, array) {
                array[callback] = toInt(input);
            };
        }
        for (i = 0; i < token.length; i++) {
            tokens[token[i]] = func;
        }
    }

    function addWeekParseToken (token, callback) {
        addParseToken(token, function (input, array, config, token) {
            config._w = config._w || {};
            callback(input, config._w, config, token);
        });
    }

    function addTimeToArrayFromToken(token, input, config) {
        if (input != null && hasOwnProp(tokens, token)) {
            tokens[token](input, config._a, config, token);
        }
    }

    var YEAR = 0;
    var MONTH = 1;
    var DATE = 2;
    var HOUR = 3;
    var MINUTE = 4;
    var SECOND = 5;
    var MILLISECOND = 6;
    var WEEK = 7;
    var WEEKDAY = 8;

    // FORMATTING

    addFormatToken('Y', 0, 0, function () {
        var y = this.year();
        return y <= 9999 ? '' + y : '+' + y;
    });

    addFormatToken(0, ['YY', 2], 0, function () {
        return this.year() % 100;
    });

    addFormatToken(0, ['YYYY',   4],       0, 'year');
    addFormatToken(0, ['YYYYY',  5],       0, 'year');
    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

    // ALIASES

    addUnitAlias('year', 'y');

    // PRIORITIES

    addUnitPriority('year', 1);

    // PARSING

    addRegexToken('Y',      matchSigned);
    addRegexToken('YY',     match1to2, match2);
    addRegexToken('YYYY',   match1to4, match4);
    addRegexToken('YYYYY',  match1to6, match6);
    addRegexToken('YYYYYY', match1to6, match6);

    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
    addParseToken('YYYY', function (input, array) {
        array[YEAR] = input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
    });
    addParseToken('YY', function (input, array) {
        array[YEAR] = hooks.parseTwoDigitYear(input);
    });
    addParseToken('Y', function (input, array) {
        array[YEAR] = parseInt(input, 10);
    });

    // HELPERS

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    // HOOKS

    hooks.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    // MOMENTS

    var getSetYear = makeGetSet('FullYear', true);

    function getIsLeapYear () {
        return isLeapYear(this.year());
    }

    function makeGetSet (unit, keepTime) {
        return function (value) {
            if (value != null) {
                set$1(this, unit, value);
                hooks.updateOffset(this, keepTime);
                return this;
            } else {
                return get(this, unit);
            }
        };
    }

    function get (mom, unit) {
        return mom.isValid() ?
            mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]() : NaN;
    }

    function set$1 (mom, unit, value) {
        if (mom.isValid() && !isNaN(value)) {
            if (unit === 'FullYear' && isLeapYear(mom.year()) && mom.month() === 1 && mom.date() === 29) {
                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value, mom.month(), daysInMonth(value, mom.month()));
            }
            else {
                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
            }
        }
    }

    // MOMENTS

    function stringGet (units) {
        units = normalizeUnits(units);
        if (isFunction(this[units])) {
            return this[units]();
        }
        return this;
    }


    function stringSet (units, value) {
        if (typeof units === 'object') {
            units = normalizeObjectUnits(units);
            var prioritized = getPrioritizedUnits(units);
            for (var i = 0; i < prioritized.length; i++) {
                this[prioritized[i].unit](units[prioritized[i].unit]);
            }
        } else {
            units = normalizeUnits(units);
            if (isFunction(this[units])) {
                return this[units](value);
            }
        }
        return this;
    }

    function mod(n, x) {
        return ((n % x) + x) % x;
    }

    var indexOf;

    if (Array.prototype.indexOf) {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function (o) {
            // I know
            var i;
            for (i = 0; i < this.length; ++i) {
                if (this[i] === o) {
                    return i;
                }
            }
            return -1;
        };
    }

    function daysInMonth(year, month) {
        if (isNaN(year) || isNaN(month)) {
            return NaN;
        }
        var modMonth = mod(month, 12);
        year += (month - modMonth) / 12;
        return modMonth === 1 ? (isLeapYear(year) ? 29 : 28) : (31 - modMonth % 7 % 2);
    }

    // FORMATTING

    addFormatToken('M', ['MM', 2], 'Mo', function () {
        return this.month() + 1;
    });

    addFormatToken('MMM', 0, 0, function (format) {
        return this.localeData().monthsShort(this, format);
    });

    addFormatToken('MMMM', 0, 0, function (format) {
        return this.localeData().months(this, format);
    });

    // ALIASES

    addUnitAlias('month', 'M');

    // PRIORITY

    addUnitPriority('month', 8);

    // PARSING

    addRegexToken('M',    match1to2);
    addRegexToken('MM',   match1to2, match2);
    addRegexToken('MMM',  function (isStrict, locale) {
        return locale.monthsShortRegex(isStrict);
    });
    addRegexToken('MMMM', function (isStrict, locale) {
        return locale.monthsRegex(isStrict);
    });

    addParseToken(['M', 'MM'], function (input, array) {
        array[MONTH] = toInt(input) - 1;
    });

    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
        var month = config._locale.monthsParse(input, token, config._strict);
        // if we didn't find a month name, mark the date as invalid.
        if (month != null) {
            array[MONTH] = month;
        } else {
            getParsingFlags(config).invalidMonth = input;
        }
    });

    // LOCALES

    var MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/;
    var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
    function localeMonths (m, format) {
        if (!m) {
            return isArray(this._months) ? this._months :
                this._months['standalone'];
        }
        return isArray(this._months) ? this._months[m.month()] :
            this._months[(this._months.isFormat || MONTHS_IN_FORMAT).test(format) ? 'format' : 'standalone'][m.month()];
    }

    var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
    function localeMonthsShort (m, format) {
        if (!m) {
            return isArray(this._monthsShort) ? this._monthsShort :
                this._monthsShort['standalone'];
        }
        return isArray(this._monthsShort) ? this._monthsShort[m.month()] :
            this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
    }

    function handleStrictParse(monthName, format, strict) {
        var i, ii, mom, llc = monthName.toLocaleLowerCase();
        if (!this._monthsParse) {
            // this is not used
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
            for (i = 0; i < 12; ++i) {
                mom = createUTC([2000, i]);
                this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
                this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeMonthsParse (monthName, format, strict) {
        var i, mom, regex;

        if (this._monthsParseExact) {
            return handleStrictParse.call(this, monthName, format, strict);
        }

        if (!this._monthsParse) {
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
        }

        // TODO: add sorting
        // Sorting makes sure if one month (or abbr) is a prefix of another
        // see sorting in computeMonthsParse
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, i]);
            if (strict && !this._longMonthsParse[i]) {
                this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
            }
            if (!strict && !this._monthsParse[i]) {
                regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                return i;
            } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                return i;
            } else if (!strict && this._monthsParse[i].test(monthName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function setMonth (mom, value) {
        var dayOfMonth;

        if (!mom.isValid()) {
            // No op
            return mom;
        }

        if (typeof value === 'string') {
            if (/^\d+$/.test(value)) {
                value = toInt(value);
            } else {
                value = mom.localeData().monthsParse(value);
                // TODO: Another silent failure?
                if (!isNumber(value)) {
                    return mom;
                }
            }
        }

        dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function getSetMonth (value) {
        if (value != null) {
            setMonth(this, value);
            hooks.updateOffset(this, true);
            return this;
        } else {
            return get(this, 'Month');
        }
    }

    function getDaysInMonth () {
        return daysInMonth(this.year(), this.month());
    }

    var defaultMonthsShortRegex = matchWord;
    function monthsShortRegex (isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsShortStrictRegex;
            } else {
                return this._monthsShortRegex;
            }
        } else {
            if (!hasOwnProp(this, '_monthsShortRegex')) {
                this._monthsShortRegex = defaultMonthsShortRegex;
            }
            return this._monthsShortStrictRegex && isStrict ?
                this._monthsShortStrictRegex : this._monthsShortRegex;
        }
    }

    var defaultMonthsRegex = matchWord;
    function monthsRegex (isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsStrictRegex;
            } else {
                return this._monthsRegex;
            }
        } else {
            if (!hasOwnProp(this, '_monthsRegex')) {
                this._monthsRegex = defaultMonthsRegex;
            }
            return this._monthsStrictRegex && isStrict ?
                this._monthsStrictRegex : this._monthsRegex;
        }
    }

    function computeMonthsParse () {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var shortPieces = [], longPieces = [], mixedPieces = [],
            i, mom;
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, i]);
            shortPieces.push(this.monthsShort(mom, ''));
            longPieces.push(this.months(mom, ''));
            mixedPieces.push(this.months(mom, ''));
            mixedPieces.push(this.monthsShort(mom, ''));
        }
        // Sorting makes sure if one month (or abbr) is a prefix of another it
        // will match the longer piece.
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 12; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
        }
        for (i = 0; i < 24; i++) {
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._monthsShortRegex = this._monthsRegex;
        this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
        this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
    }

    function createDate (y, m, d, h, M, s, ms) {
        // can't just apply() to create a date:
        // https://stackoverflow.com/q/181348
        var date;
        // the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            date = new Date(y + 400, m, d, h, M, s, ms);
            if (isFinite(date.getFullYear())) {
                date.setFullYear(y);
            }
        } else {
            date = new Date(y, m, d, h, M, s, ms);
        }

        return date;
    }

    function createUTCDate (y) {
        var date;
        // the Date.UTC function remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            var args = Array.prototype.slice.call(arguments);
            // preserve leap years using a full 400 year cycle, then reset
            args[0] = y + 400;
            date = new Date(Date.UTC.apply(null, args));
            if (isFinite(date.getUTCFullYear())) {
                date.setUTCFullYear(y);
            }
        } else {
            date = new Date(Date.UTC.apply(null, arguments));
        }

        return date;
    }

    // start-of-first-week - start-of-year
    function firstWeekOffset(year, dow, doy) {
        var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
            fwd = 7 + dow - doy,
            // first-week day local weekday -- which local weekday is fwd
            fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

        return -fwdlw + fwd - 1;
    }

    // https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
        var localWeekday = (7 + weekday - dow) % 7,
            weekOffset = firstWeekOffset(year, dow, doy),
            dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
            resYear, resDayOfYear;

        if (dayOfYear <= 0) {
            resYear = year - 1;
            resDayOfYear = daysInYear(resYear) + dayOfYear;
        } else if (dayOfYear > daysInYear(year)) {
            resYear = year + 1;
            resDayOfYear = dayOfYear - daysInYear(year);
        } else {
            resYear = year;
            resDayOfYear = dayOfYear;
        }

        return {
            year: resYear,
            dayOfYear: resDayOfYear
        };
    }

    function weekOfYear(mom, dow, doy) {
        var weekOffset = firstWeekOffset(mom.year(), dow, doy),
            week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
            resWeek, resYear;

        if (week < 1) {
            resYear = mom.year() - 1;
            resWeek = week + weeksInYear(resYear, dow, doy);
        } else if (week > weeksInYear(mom.year(), dow, doy)) {
            resWeek = week - weeksInYear(mom.year(), dow, doy);
            resYear = mom.year() + 1;
        } else {
            resYear = mom.year();
            resWeek = week;
        }

        return {
            week: resWeek,
            year: resYear
        };
    }

    function weeksInYear(year, dow, doy) {
        var weekOffset = firstWeekOffset(year, dow, doy),
            weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
        return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
    }

    // FORMATTING

    addFormatToken('w', ['ww', 2], 'wo', 'week');
    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

    // ALIASES

    addUnitAlias('week', 'w');
    addUnitAlias('isoWeek', 'W');

    // PRIORITIES

    addUnitPriority('week', 5);
    addUnitPriority('isoWeek', 5);

    // PARSING

    addRegexToken('w',  match1to2);
    addRegexToken('ww', match1to2, match2);
    addRegexToken('W',  match1to2);
    addRegexToken('WW', match1to2, match2);

    addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
        week[token.substr(0, 1)] = toInt(input);
    });

    // HELPERS

    // LOCALES

    function localeWeek (mom) {
        return weekOfYear(mom, this._week.dow, this._week.doy).week;
    }

    var defaultLocaleWeek = {
        dow : 0, // Sunday is the first day of the week.
        doy : 6  // The week that contains Jan 6th is the first week of the year.
    };

    function localeFirstDayOfWeek () {
        return this._week.dow;
    }

    function localeFirstDayOfYear () {
        return this._week.doy;
    }

    // MOMENTS

    function getSetWeek (input) {
        var week = this.localeData().week(this);
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    function getSetISOWeek (input) {
        var week = weekOfYear(this, 1, 4).week;
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    // FORMATTING

    addFormatToken('d', 0, 'do', 'day');

    addFormatToken('dd', 0, 0, function (format) {
        return this.localeData().weekdaysMin(this, format);
    });

    addFormatToken('ddd', 0, 0, function (format) {
        return this.localeData().weekdaysShort(this, format);
    });

    addFormatToken('dddd', 0, 0, function (format) {
        return this.localeData().weekdays(this, format);
    });

    addFormatToken('e', 0, 0, 'weekday');
    addFormatToken('E', 0, 0, 'isoWeekday');

    // ALIASES

    addUnitAlias('day', 'd');
    addUnitAlias('weekday', 'e');
    addUnitAlias('isoWeekday', 'E');

    // PRIORITY
    addUnitPriority('day', 11);
    addUnitPriority('weekday', 11);
    addUnitPriority('isoWeekday', 11);

    // PARSING

    addRegexToken('d',    match1to2);
    addRegexToken('e',    match1to2);
    addRegexToken('E',    match1to2);
    addRegexToken('dd',   function (isStrict, locale) {
        return locale.weekdaysMinRegex(isStrict);
    });
    addRegexToken('ddd',   function (isStrict, locale) {
        return locale.weekdaysShortRegex(isStrict);
    });
    addRegexToken('dddd',   function (isStrict, locale) {
        return locale.weekdaysRegex(isStrict);
    });

    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
        var weekday = config._locale.weekdaysParse(input, token, config._strict);
        // if we didn't get a weekday name, mark the date as invalid
        if (weekday != null) {
            week.d = weekday;
        } else {
            getParsingFlags(config).invalidWeekday = input;
        }
    });

    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
        week[token] = toInt(input);
    });

    // HELPERS

    function parseWeekday(input, locale) {
        if (typeof input !== 'string') {
            return input;
        }

        if (!isNaN(input)) {
            return parseInt(input, 10);
        }

        input = locale.weekdaysParse(input);
        if (typeof input === 'number') {
            return input;
        }

        return null;
    }

    function parseIsoWeekday(input, locale) {
        if (typeof input === 'string') {
            return locale.weekdaysParse(input) % 7 || 7;
        }
        return isNaN(input) ? null : input;
    }

    // LOCALES
    function shiftWeekdays (ws, n) {
        return ws.slice(n, 7).concat(ws.slice(0, n));
    }

    var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
    function localeWeekdays (m, format) {
        var weekdays = isArray(this._weekdays) ? this._weekdays :
            this._weekdays[(m && m !== true && this._weekdays.isFormat.test(format)) ? 'format' : 'standalone'];
        return (m === true) ? shiftWeekdays(weekdays, this._week.dow)
            : (m) ? weekdays[m.day()] : weekdays;
    }

    var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
    function localeWeekdaysShort (m) {
        return (m === true) ? shiftWeekdays(this._weekdaysShort, this._week.dow)
            : (m) ? this._weekdaysShort[m.day()] : this._weekdaysShort;
    }

    var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
    function localeWeekdaysMin (m) {
        return (m === true) ? shiftWeekdays(this._weekdaysMin, this._week.dow)
            : (m) ? this._weekdaysMin[m.day()] : this._weekdaysMin;
    }

    function handleStrictParse$1(weekdayName, format, strict) {
        var i, ii, mom, llc = weekdayName.toLocaleLowerCase();
        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._minWeekdaysParse = [];

            for (i = 0; i < 7; ++i) {
                mom = createUTC([2000, 1]).day(i);
                this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
                this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
                this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeWeekdaysParse (weekdayName, format, strict) {
        var i, mom, regex;

        if (this._weekdaysParseExact) {
            return handleStrictParse$1.call(this, weekdayName, format, strict);
        }

        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._minWeekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._fullWeekdaysParse = [];
        }

        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already

            mom = createUTC([2000, 1]).day(i);
            if (strict && !this._fullWeekdaysParse[i]) {
                this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\\.?') + '$', 'i');
                this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$', 'i');
                this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$', 'i');
            }
            if (!this._weekdaysParse[i]) {
                regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function getSetDayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (input != null) {
            input = parseWeekday(input, this.localeData());
            return this.add(input - day, 'd');
        } else {
            return day;
        }
    }

    function getSetLocaleDayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return input == null ? weekday : this.add(input - weekday, 'd');
    }

    function getSetISODayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }

        // behaves the same as moment#day except
        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
        // as a setter, sunday should belong to the previous week.

        if (input != null) {
            var weekday = parseIsoWeekday(input, this.localeData());
            return this.day(this.day() % 7 ? weekday : weekday - 7);
        } else {
            return this.day() || 7;
        }
    }

    var defaultWeekdaysRegex = matchWord;
    function weekdaysRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysStrictRegex;
            } else {
                return this._weekdaysRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                this._weekdaysRegex = defaultWeekdaysRegex;
            }
            return this._weekdaysStrictRegex && isStrict ?
                this._weekdaysStrictRegex : this._weekdaysRegex;
        }
    }

    var defaultWeekdaysShortRegex = matchWord;
    function weekdaysShortRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysShortStrictRegex;
            } else {
                return this._weekdaysShortRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysShortRegex')) {
                this._weekdaysShortRegex = defaultWeekdaysShortRegex;
            }
            return this._weekdaysShortStrictRegex && isStrict ?
                this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
        }
    }

    var defaultWeekdaysMinRegex = matchWord;
    function weekdaysMinRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysMinStrictRegex;
            } else {
                return this._weekdaysMinRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysMinRegex')) {
                this._weekdaysMinRegex = defaultWeekdaysMinRegex;
            }
            return this._weekdaysMinStrictRegex && isStrict ?
                this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
        }
    }


    function computeWeekdaysParse () {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var minPieces = [], shortPieces = [], longPieces = [], mixedPieces = [],
            i, mom, minp, shortp, longp;
        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, 1]).day(i);
            minp = this.weekdaysMin(mom, '');
            shortp = this.weekdaysShort(mom, '');
            longp = this.weekdays(mom, '');
            minPieces.push(minp);
            shortPieces.push(shortp);
            longPieces.push(longp);
            mixedPieces.push(minp);
            mixedPieces.push(shortp);
            mixedPieces.push(longp);
        }
        // Sorting makes sure if one weekday (or abbr) is a prefix of another it
        // will match the longer piece.
        minPieces.sort(cmpLenRev);
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 7; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._weekdaysShortRegex = this._weekdaysRegex;
        this._weekdaysMinRegex = this._weekdaysRegex;

        this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
        this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
        this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
    }

    // FORMATTING

    function hFormat() {
        return this.hours() % 12 || 12;
    }

    function kFormat() {
        return this.hours() || 24;
    }

    addFormatToken('H', ['HH', 2], 0, 'hour');
    addFormatToken('h', ['hh', 2], 0, hFormat);
    addFormatToken('k', ['kk', 2], 0, kFormat);

    addFormatToken('hmm', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
    });

    addFormatToken('hmmss', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2);
    });

    addFormatToken('Hmm', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2);
    });

    addFormatToken('Hmmss', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2);
    });

    function meridiem (token, lowercase) {
        addFormatToken(token, 0, 0, function () {
            return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
        });
    }

    meridiem('a', true);
    meridiem('A', false);

    // ALIASES

    addUnitAlias('hour', 'h');

    // PRIORITY
    addUnitPriority('hour', 13);

    // PARSING

    function matchMeridiem (isStrict, locale) {
        return locale._meridiemParse;
    }

    addRegexToken('a',  matchMeridiem);
    addRegexToken('A',  matchMeridiem);
    addRegexToken('H',  match1to2);
    addRegexToken('h',  match1to2);
    addRegexToken('k',  match1to2);
    addRegexToken('HH', match1to2, match2);
    addRegexToken('hh', match1to2, match2);
    addRegexToken('kk', match1to2, match2);

    addRegexToken('hmm', match3to4);
    addRegexToken('hmmss', match5to6);
    addRegexToken('Hmm', match3to4);
    addRegexToken('Hmmss', match5to6);

    addParseToken(['H', 'HH'], HOUR);
    addParseToken(['k', 'kk'], function (input, array, config) {
        var kInput = toInt(input);
        array[HOUR] = kInput === 24 ? 0 : kInput;
    });
    addParseToken(['a', 'A'], function (input, array, config) {
        config._isPm = config._locale.isPM(input);
        config._meridiem = input;
    });
    addParseToken(['h', 'hh'], function (input, array, config) {
        array[HOUR] = toInt(input);
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmmss', function (input, array, config) {
        var pos1 = input.length - 4;
        var pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('Hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
    });
    addParseToken('Hmmss', function (input, array, config) {
        var pos1 = input.length - 4;
        var pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
    });

    // LOCALES

    function localeIsPM (input) {
        // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
        // Using charAt should be more compatible.
        return ((input + '').toLowerCase().charAt(0) === 'p');
    }

    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
    function localeMeridiem (hours, minutes, isLower) {
        if (hours > 11) {
            return isLower ? 'pm' : 'PM';
        } else {
            return isLower ? 'am' : 'AM';
        }
    }


    // MOMENTS

    // Setting the hour should keep the time, because the user explicitly
    // specified which hour they want. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    var getSetHour = makeGetSet('Hours', true);

    var baseConfig = {
        calendar: defaultCalendar,
        longDateFormat: defaultLongDateFormat,
        invalidDate: defaultInvalidDate,
        ordinal: defaultOrdinal,
        dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
        relativeTime: defaultRelativeTime,

        months: defaultLocaleMonths,
        monthsShort: defaultLocaleMonthsShort,

        week: defaultLocaleWeek,

        weekdays: defaultLocaleWeekdays,
        weekdaysMin: defaultLocaleWeekdaysMin,
        weekdaysShort: defaultLocaleWeekdaysShort,

        meridiemParse: defaultLocaleMeridiemParse
    };

    // internal storage for locale config files
    var locales = {};
    var localeFamilies = {};
    var globalLocale;

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return globalLocale;
    }

    function loadLocale(name) {
        var oldLocale = null;
        // TODO: Find a better way to register and load all the locales in Node
        if (!locales[name] && (typeof module !== 'undefined') &&
                module && module.exports) {
            try {
                oldLocale = globalLocale._abbr;
                var aliasedRequire = require;
                aliasedRequire('./locale/' + name);
                getSetGlobalLocale(oldLocale);
            } catch (e) {}
        }
        return locales[name];
    }

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    function getSetGlobalLocale (key, values) {
        var data;
        if (key) {
            if (isUndefined(values)) {
                data = getLocale(key);
            }
            else {
                data = defineLocale(key, values);
            }

            if (data) {
                // moment.duration._locale = moment._locale = data;
                globalLocale = data;
            }
            else {
                if ((typeof console !==  'undefined') && console.warn) {
                    //warn user if arguments are passed but the locale could not be set
                    console.warn('Locale ' + key +  ' not found. Did you forget to load it?');
                }
            }
        }

        return globalLocale._abbr;
    }

    function defineLocale (name, config) {
        if (config !== null) {
            var locale, parentConfig = baseConfig;
            config.abbr = name;
            if (locales[name] != null) {
                deprecateSimple('defineLocaleOverride',
                        'use moment.updateLocale(localeName, config) to change ' +
                        'an existing locale. moment.defineLocale(localeName, ' +
                        'config) should only be used for creating a new locale ' +
                        'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.');
                parentConfig = locales[name]._config;
            } else if (config.parentLocale != null) {
                if (locales[config.parentLocale] != null) {
                    parentConfig = locales[config.parentLocale]._config;
                } else {
                    locale = loadLocale(config.parentLocale);
                    if (locale != null) {
                        parentConfig = locale._config;
                    } else {
                        if (!localeFamilies[config.parentLocale]) {
                            localeFamilies[config.parentLocale] = [];
                        }
                        localeFamilies[config.parentLocale].push({
                            name: name,
                            config: config
                        });
                        return null;
                    }
                }
            }
            locales[name] = new Locale(mergeConfigs(parentConfig, config));

            if (localeFamilies[name]) {
                localeFamilies[name].forEach(function (x) {
                    defineLocale(x.name, x.config);
                });
            }

            // backwards compat for now: also set the locale
            // make sure we set the locale AFTER all child locales have been
            // created, so we won't end up with the child locale set.
            getSetGlobalLocale(name);


            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    }

    function updateLocale(name, config) {
        if (config != null) {
            var locale, tmpLocale, parentConfig = baseConfig;
            // MERGE
            tmpLocale = loadLocale(name);
            if (tmpLocale != null) {
                parentConfig = tmpLocale._config;
            }
            config = mergeConfigs(parentConfig, config);
            locale = new Locale(config);
            locale.parentLocale = locales[name];
            locales[name] = locale;

            // backwards compat for now: also set the locale
            getSetGlobalLocale(name);
        } else {
            // pass null for config to unupdate, useful for tests
            if (locales[name] != null) {
                if (locales[name].parentLocale != null) {
                    locales[name] = locales[name].parentLocale;
                } else if (locales[name] != null) {
                    delete locales[name];
                }
            }
        }
        return locales[name];
    }

    // returns locale data
    function getLocale (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return globalLocale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    }

    function listLocales() {
        return keys(locales);
    }

    function checkOverflow (m) {
        var overflow;
        var a = m._a;

        if (a && getParsingFlags(m).overflow === -2) {
            overflow =
                a[MONTH]       < 0 || a[MONTH]       > 11  ? MONTH :
                a[DATE]        < 1 || a[DATE]        > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
                a[HOUR]        < 0 || a[HOUR]        > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
                a[MINUTE]      < 0 || a[MINUTE]      > 59  ? MINUTE :
                a[SECOND]      < 0 || a[SECOND]      > 59  ? SECOND :
                a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }
            if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
                overflow = WEEK;
            }
            if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
                overflow = WEEKDAY;
            }

            getParsingFlags(m).overflow = overflow;
        }

        return m;
    }

    // Pick the first defined of two or three arguments.
    function defaults(a, b, c) {
        if (a != null) {
            return a;
        }
        if (b != null) {
            return b;
        }
        return c;
    }

    function currentDateArray(config) {
        // hooks is actually the exported moment object
        var nowValue = new Date(hooks.now());
        if (config._useUTC) {
            return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
        }
        return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function configFromArray (config) {
        var i, date, input = [], currentDate, expectedWeekday, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear != null) {
            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse) || config._dayOfYear === 0) {
                getParsingFlags(config)._overflowDayOfYear = true;
            }

            date = createUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
        expectedWeekday = config._useUTC ? config._d.getUTCDay() : config._d.getDay();

        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }

        // check for mismatching day of week
        if (config._w && typeof config._w.d !== 'undefined' && config._w.d !== expectedWeekday) {
            getParsingFlags(config).weekdayMismatch = true;
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(createLocal(), 1, 4).year);
            week = defaults(w.W, 1);
            weekday = defaults(w.E, 1);
            if (weekday < 1 || weekday > 7) {
                weekdayOverflow = true;
            }
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            var curWeek = weekOfYear(createLocal(), dow, doy);

            weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

            // Default to current week.
            week = defaults(w.w, curWeek.week);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < 0 || weekday > 6) {
                    weekdayOverflow = true;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from beginning of week
                weekday = w.e + dow;
                if (w.e < 0 || w.e > 6) {
                    weekdayOverflow = true;
                }
            } else {
                // default to beginning of week
                weekday = dow;
            }
        }
        if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
            getParsingFlags(config)._overflowWeeks = true;
        } else if (weekdayOverflow != null) {
            getParsingFlags(config)._overflowWeekday = true;
        } else {
            temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
            config._a[YEAR] = temp.year;
            config._dayOfYear = temp.dayOfYear;
        }
    }

    // iso 8601 regex
    // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
    var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
    var basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

    var tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;

    var isoDates = [
        ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
        ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
        ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
        ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
        ['YYYY-DDD', /\d{4}-\d{3}/],
        ['YYYY-MM', /\d{4}-\d\d/, false],
        ['YYYYYYMMDD', /[+-]\d{10}/],
        ['YYYYMMDD', /\d{8}/],
        // YYYYMM is NOT allowed by the standard
        ['GGGG[W]WWE', /\d{4}W\d{3}/],
        ['GGGG[W]WW', /\d{4}W\d{2}/, false],
        ['YYYYDDD', /\d{7}/]
    ];

    // iso time formats and regexes
    var isoTimes = [
        ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
        ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
        ['HH:mm:ss', /\d\d:\d\d:\d\d/],
        ['HH:mm', /\d\d:\d\d/],
        ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
        ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
        ['HHmmss', /\d\d\d\d\d\d/],
        ['HHmm', /\d\d\d\d/],
        ['HH', /\d\d/]
    ];

    var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

    // date from iso format
    function configFromISO(config) {
        var i, l,
            string = config._i,
            match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
            allowTime, dateFormat, timeFormat, tzFormat;

        if (match) {
            getParsingFlags(config).iso = true;

            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(match[1])) {
                    dateFormat = isoDates[i][0];
                    allowTime = isoDates[i][2] !== false;
                    break;
                }
            }
            if (dateFormat == null) {
                config._isValid = false;
                return;
            }
            if (match[3]) {
                for (i = 0, l = isoTimes.length; i < l; i++) {
                    if (isoTimes[i][1].exec(match[3])) {
                        // match[2] should be 'T' or space
                        timeFormat = (match[2] || ' ') + isoTimes[i][0];
                        break;
                    }
                }
                if (timeFormat == null) {
                    config._isValid = false;
                    return;
                }
            }
            if (!allowTime && timeFormat != null) {
                config._isValid = false;
                return;
            }
            if (match[4]) {
                if (tzRegex.exec(match[4])) {
                    tzFormat = 'Z';
                } else {
                    config._isValid = false;
                    return;
                }
            }
            config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
            configFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
    var rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;

    function extractFromRFC2822Strings(yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
        var result = [
            untruncateYear(yearStr),
            defaultLocaleMonthsShort.indexOf(monthStr),
            parseInt(dayStr, 10),
            parseInt(hourStr, 10),
            parseInt(minuteStr, 10)
        ];

        if (secondStr) {
            result.push(parseInt(secondStr, 10));
        }

        return result;
    }

    function untruncateYear(yearStr) {
        var year = parseInt(yearStr, 10);
        if (year <= 49) {
            return 2000 + year;
        } else if (year <= 999) {
            return 1900 + year;
        }
        return year;
    }

    function preprocessRFC2822(s) {
        // Remove comments and folding whitespace and replace multiple-spaces with a single space
        return s.replace(/\([^)]*\)|[\n\t]/g, ' ').replace(/(\s\s+)/g, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }

    function checkWeekday(weekdayStr, parsedInput, config) {
        if (weekdayStr) {
            // TODO: Replace the vanilla JS Date object with an indepentent day-of-week check.
            var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
                weekdayActual = new Date(parsedInput[0], parsedInput[1], parsedInput[2]).getDay();
            if (weekdayProvided !== weekdayActual) {
                getParsingFlags(config).weekdayMismatch = true;
                config._isValid = false;
                return false;
            }
        }
        return true;
    }

    var obsOffsets = {
        UT: 0,
        GMT: 0,
        EDT: -4 * 60,
        EST: -5 * 60,
        CDT: -5 * 60,
        CST: -6 * 60,
        MDT: -6 * 60,
        MST: -7 * 60,
        PDT: -7 * 60,
        PST: -8 * 60
    };

    function calculateOffset(obsOffset, militaryOffset, numOffset) {
        if (obsOffset) {
            return obsOffsets[obsOffset];
        } else if (militaryOffset) {
            // the only allowed military tz is Z
            return 0;
        } else {
            var hm = parseInt(numOffset, 10);
            var m = hm % 100, h = (hm - m) / 100;
            return h * 60 + m;
        }
    }

    // date and time from ref 2822 format
    function configFromRFC2822(config) {
        var match = rfc2822.exec(preprocessRFC2822(config._i));
        if (match) {
            var parsedArray = extractFromRFC2822Strings(match[4], match[3], match[2], match[5], match[6], match[7]);
            if (!checkWeekday(match[1], parsedArray, config)) {
                return;
            }

            config._a = parsedArray;
            config._tzm = calculateOffset(match[8], match[9], match[10]);

            config._d = createUTCDate.apply(null, config._a);
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

            getParsingFlags(config).rfc2822 = true;
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function configFromString(config) {
        var matched = aspNetJsonRegex.exec(config._i);

        if (matched !== null) {
            config._d = new Date(+matched[1]);
            return;
        }

        configFromISO(config);
        if (config._isValid === false) {
            delete config._isValid;
        } else {
            return;
        }

        configFromRFC2822(config);
        if (config._isValid === false) {
            delete config._isValid;
        } else {
            return;
        }

        // Final attempt, use Input Fallback
        hooks.createFromInputFallback(config);
    }

    hooks.createFromInputFallback = deprecate(
        'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
        'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
        'discouraged and will be removed in an upcoming major release. Please refer to ' +
        'http://momentjs.com/guides/#/warnings/js-date/ for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    // constant that refers to the ISO standard
    hooks.ISO_8601 = function () {};

    // constant that refers to the RFC 2822 form
    hooks.RFC_2822 = function () {};

    // date from string and format string
    function configFromStringAndFormat(config) {
        // TODO: Move this to another part of the creation flow to prevent circular deps
        if (config._f === hooks.ISO_8601) {
            configFromISO(config);
            return;
        }
        if (config._f === hooks.RFC_2822) {
            configFromRFC2822(config);
            return;
        }
        config._a = [];
        getParsingFlags(config).empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            // console.log('token', token, 'parsedInput', parsedInput,
            //         'regex', getParseRegexForToken(token, config));
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    getParsingFlags(config).unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    getParsingFlags(config).empty = false;
                }
                else {
                    getParsingFlags(config).unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                getParsingFlags(config).unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            getParsingFlags(config).unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (config._a[HOUR] <= 12 &&
            getParsingFlags(config).bigHour === true &&
            config._a[HOUR] > 0) {
            getParsingFlags(config).bigHour = undefined;
        }

        getParsingFlags(config).parsedDateParts = config._a.slice(0);
        getParsingFlags(config).meridiem = config._meridiem;
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

        configFromArray(config);
        checkOverflow(config);
    }


    function meridiemFixWrap (locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // this is not supposed to happen
            return hour;
        }
    }

    // date from string and array of format strings
    function configFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            getParsingFlags(config).invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._f = config._f[i];
            configFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += getParsingFlags(tempConfig).charsLeftOver;

            //or tokens
            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

            getParsingFlags(tempConfig).score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    function configFromObject(config) {
        if (config._d) {
            return;
        }

        var i = normalizeObjectUnits(config._i);
        config._a = map([i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond], function (obj) {
            return obj && parseInt(obj, 10);
        });

        configFromArray(config);
    }

    function createFromConfig (config) {
        var res = new Moment(checkOverflow(prepareConfig(config)));
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    function prepareConfig (config) {
        var input = config._i,
            format = config._f;

        config._locale = config._locale || getLocale(config._l);

        if (input === null || (format === undefined && input === '')) {
            return createInvalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (isMoment(input)) {
            return new Moment(checkOverflow(input));
        } else if (isDate(input)) {
            config._d = input;
        } else if (isArray(format)) {
            configFromStringAndArray(config);
        } else if (format) {
            configFromStringAndFormat(config);
        }  else {
            configFromInput(config);
        }

        if (!isValid(config)) {
            config._d = null;
        }

        return config;
    }

    function configFromInput(config) {
        var input = config._i;
        if (isUndefined(input)) {
            config._d = new Date(hooks.now());
        } else if (isDate(input)) {
            config._d = new Date(input.valueOf());
        } else if (typeof input === 'string') {
            configFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            configFromArray(config);
        } else if (isObject(input)) {
            configFromObject(config);
        } else if (isNumber(input)) {
            // from milliseconds
            config._d = new Date(input);
        } else {
            hooks.createFromInputFallback(config);
        }
    }

    function createLocalOrUTC (input, format, locale, strict, isUTC) {
        var c = {};

        if (locale === true || locale === false) {
            strict = locale;
            locale = undefined;
        }

        if ((isObject(input) && isObjectEmpty(input)) ||
                (isArray(input) && input.length === 0)) {
            input = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c._isAMomentObject = true;
        c._useUTC = c._isUTC = isUTC;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;

        return createFromConfig(c);
    }

    function createLocal (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, false);
    }

    var prototypeMin = deprecate(
        'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
        function () {
            var other = createLocal.apply(null, arguments);
            if (this.isValid() && other.isValid()) {
                return other < this ? this : other;
            } else {
                return createInvalid();
            }
        }
    );

    var prototypeMax = deprecate(
        'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
        function () {
            var other = createLocal.apply(null, arguments);
            if (this.isValid() && other.isValid()) {
                return other > this ? this : other;
            } else {
                return createInvalid();
            }
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return createLocal();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (!moments[i].isValid() || moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    // TODO: Use [].sort instead?
    function min () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    }

    function max () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    }

    var now = function () {
        return Date.now ? Date.now() : +(new Date());
    };

    var ordering = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];

    function isDurationValid(m) {
        for (var key in m) {
            if (!(indexOf.call(ordering, key) !== -1 && (m[key] == null || !isNaN(m[key])))) {
                return false;
            }
        }

        var unitHasDecimal = false;
        for (var i = 0; i < ordering.length; ++i) {
            if (m[ordering[i]]) {
                if (unitHasDecimal) {
                    return false; // only allow non-integers for smallest unit
                }
                if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
                    unitHasDecimal = true;
                }
            }
        }

        return true;
    }

    function isValid$1() {
        return this._isValid;
    }

    function createInvalid$1() {
        return createDuration(NaN);
    }

    function Duration (duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        this._isValid = isDurationValid(normalizedInput);

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible to translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = getLocale();

        this._bubble();
    }

    function isDuration (obj) {
        return obj instanceof Duration;
    }

    function absRound (number) {
        if (number < 0) {
            return Math.round(-1 * number) * -1;
        } else {
            return Math.round(number);
        }
    }

    // FORMATTING

    function offset (token, separator) {
        addFormatToken(token, 0, 0, function () {
            var offset = this.utcOffset();
            var sign = '+';
            if (offset < 0) {
                offset = -offset;
                sign = '-';
            }
            return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
        });
    }

    offset('Z', ':');
    offset('ZZ', '');

    // PARSING

    addRegexToken('Z',  matchShortOffset);
    addRegexToken('ZZ', matchShortOffset);
    addParseToken(['Z', 'ZZ'], function (input, array, config) {
        config._useUTC = true;
        config._tzm = offsetFromString(matchShortOffset, input);
    });

    // HELPERS

    // timezone chunker
    // '+10:00' > ['10',  '00']
    // '-1530'  > ['-15', '30']
    var chunkOffset = /([\+\-]|\d\d)/gi;

    function offsetFromString(matcher, string) {
        var matches = (string || '').match(matcher);

        if (matches === null) {
            return null;
        }

        var chunk   = matches[matches.length - 1] || [];
        var parts   = (chunk + '').match(chunkOffset) || ['-', 0, 0];
        var minutes = +(parts[1] * 60) + toInt(parts[2]);

        return minutes === 0 ?
          0 :
          parts[0] === '+' ? minutes : -minutes;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function cloneWithOffset(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (isMoment(input) || isDate(input) ? input.valueOf() : createLocal(input).valueOf()) - res.valueOf();
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(res._d.valueOf() + diff);
            hooks.updateOffset(res, false);
            return res;
        } else {
            return createLocal(input).local();
        }
    }

    function getDateOffset (m) {
        // On Firefox.24 Date#getTimezoneOffset returns a floating point.
        // https://github.com/moment/moment/pull/1871
        return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
    }

    // HOOKS

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    hooks.updateOffset = function () {};

    // MOMENTS

    // keepLocalTime = true means only change the timezone, without
    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    // +0200, so we adjust the time as needed, to be valid.
    //
    // Keeping the time actually adds/subtracts (one hour)
    // from the actual represented time. That is why we call updateOffset
    // a second time. In case it wants us to change the offset again
    // _changeInProgress == true case, then we have to adjust, because
    // there is no such time in the given timezone.
    function getSetOffset (input, keepLocalTime, keepMinutes) {
        var offset = this._offset || 0,
            localAdjust;
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        if (input != null) {
            if (typeof input === 'string') {
                input = offsetFromString(matchShortOffset, input);
                if (input === null) {
                    return this;
                }
            } else if (Math.abs(input) < 16 && !keepMinutes) {
                input = input * 60;
            }
            if (!this._isUTC && keepLocalTime) {
                localAdjust = getDateOffset(this);
            }
            this._offset = input;
            this._isUTC = true;
            if (localAdjust != null) {
                this.add(localAdjust, 'm');
            }
            if (offset !== input) {
                if (!keepLocalTime || this._changeInProgress) {
                    addSubtract(this, createDuration(input - offset, 'm'), 1, false);
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        } else {
            return this._isUTC ? offset : getDateOffset(this);
        }
    }

    function getSetZone (input, keepLocalTime) {
        if (input != null) {
            if (typeof input !== 'string') {
                input = -input;
            }

            this.utcOffset(input, keepLocalTime);

            return this;
        } else {
            return -this.utcOffset();
        }
    }

    function setOffsetToUTC (keepLocalTime) {
        return this.utcOffset(0, keepLocalTime);
    }

    function setOffsetToLocal (keepLocalTime) {
        if (this._isUTC) {
            this.utcOffset(0, keepLocalTime);
            this._isUTC = false;

            if (keepLocalTime) {
                this.subtract(getDateOffset(this), 'm');
            }
        }
        return this;
    }

    function setOffsetToParsedOffset () {
        if (this._tzm != null) {
            this.utcOffset(this._tzm, false, true);
        } else if (typeof this._i === 'string') {
            var tZone = offsetFromString(matchOffset, this._i);
            if (tZone != null) {
                this.utcOffset(tZone);
            }
            else {
                this.utcOffset(0, true);
            }
        }
        return this;
    }

    function hasAlignedHourOffset (input) {
        if (!this.isValid()) {
            return false;
        }
        input = input ? createLocal(input).utcOffset() : 0;

        return (this.utcOffset() - input) % 60 === 0;
    }

    function isDaylightSavingTime () {
        return (
            this.utcOffset() > this.clone().month(0).utcOffset() ||
            this.utcOffset() > this.clone().month(5).utcOffset()
        );
    }

    function isDaylightSavingTimeShifted () {
        if (!isUndefined(this._isDSTShifted)) {
            return this._isDSTShifted;
        }

        var c = {};

        copyConfig(c, this);
        c = prepareConfig(c);

        if (c._a) {
            var other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
            this._isDSTShifted = this.isValid() &&
                compareArrays(c._a, other.toArray()) > 0;
        } else {
            this._isDSTShifted = false;
        }

        return this._isDSTShifted;
    }

    function isLocal () {
        return this.isValid() ? !this._isUTC : false;
    }

    function isUtcOffset () {
        return this.isValid() ? this._isUTC : false;
    }

    function isUtc () {
        return this.isValid() ? this._isUTC && this._offset === 0 : false;
    }

    // ASP.NET json date format regex
    var aspNetRegex = /^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/;

    // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
    // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
    // and further modified to allow for strings containing both week and day
    var isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

    function createDuration (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            diffRes;

        if (isDuration(input)) {
            duration = {
                ms : input._milliseconds,
                d  : input._days,
                M  : input._months
            };
        } else if (isNumber(input)) {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y  : 0,
                d  : toInt(match[DATE])                         * sign,
                h  : toInt(match[HOUR])                         * sign,
                m  : toInt(match[MINUTE])                       * sign,
                s  : toInt(match[SECOND])                       * sign,
                ms : toInt(absRound(match[MILLISECOND] * 1000)) * sign // the millisecond decimal point is included in the match
            };
        } else if (!!(match = isoRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y : parseIso(match[2], sign),
                M : parseIso(match[3], sign),
                w : parseIso(match[4], sign),
                d : parseIso(match[5], sign),
                h : parseIso(match[6], sign),
                m : parseIso(match[7], sign),
                s : parseIso(match[8], sign)
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(createLocal(duration.from), createLocal(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    }

    createDuration.fn = Duration.prototype;
    createDuration.invalid = createInvalid$1;

    function parseIso (inp, sign) {
        // We'd normally use ~~inp for this, but unfortunately it also
        // converts floats to ints.
        // inp may be undefined, so careful calling replace on it.
        var res = inp && parseFloat(inp.replace(',', '.'));
        // apply sign while we're at it
        return (isNaN(res) ? 0 : res) * sign;
    }

    function positiveMomentsDifference(base, other) {
        var res = {};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        if (!(base.isValid() && other.isValid())) {
            return {milliseconds: 0, months: 0};
        }

        other = cloneWithOffset(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period). ' +
                'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = createDuration(val, period);
            addSubtract(this, dur, direction);
            return this;
        };
    }

    function addSubtract (mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = absRound(duration._days),
            months = absRound(duration._months);

        if (!mom.isValid()) {
            // No op
            return;
        }

        updateOffset = updateOffset == null ? true : updateOffset;

        if (months) {
            setMonth(mom, get(mom, 'Month') + months * isAdding);
        }
        if (days) {
            set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
        }
        if (milliseconds) {
            mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
        }
        if (updateOffset) {
            hooks.updateOffset(mom, days || months);
        }
    }

    var add      = createAdder(1, 'add');
    var subtract = createAdder(-1, 'subtract');

    function getCalendarFormat(myMoment, now) {
        var diff = myMoment.diff(now, 'days', true);
        return diff < -6 ? 'sameElse' :
                diff < -1 ? 'lastWeek' :
                diff < 0 ? 'lastDay' :
                diff < 1 ? 'sameDay' :
                diff < 2 ? 'nextDay' :
                diff < 7 ? 'nextWeek' : 'sameElse';
    }

    function calendar$1 (time, formats) {
        // We want to compare the start of today, vs this.
        // Getting start-of-today depends on whether we're local/utc/offset or not.
        var now = time || createLocal(),
            sod = cloneWithOffset(now, this).startOf('day'),
            format = hooks.calendarFormat(this, sod) || 'sameElse';

        var output = formats && (isFunction(formats[format]) ? formats[format].call(this, now) : formats[format]);

        return this.format(output || this.localeData().calendar(format, this, createLocal(now)));
    }

    function clone () {
        return new Moment(this);
    }

    function isAfter (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() > localInput.valueOf();
        } else {
            return localInput.valueOf() < this.clone().startOf(units).valueOf();
        }
    }

    function isBefore (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() < localInput.valueOf();
        } else {
            return this.clone().endOf(units).valueOf() < localInput.valueOf();
        }
    }

    function isBetween (from, to, units, inclusivity) {
        var localFrom = isMoment(from) ? from : createLocal(from),
            localTo = isMoment(to) ? to : createLocal(to);
        if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
            return false;
        }
        inclusivity = inclusivity || '()';
        return (inclusivity[0] === '(' ? this.isAfter(localFrom, units) : !this.isBefore(localFrom, units)) &&
            (inclusivity[1] === ')' ? this.isBefore(localTo, units) : !this.isAfter(localTo, units));
    }

    function isSame (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input),
            inputMs;
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() === localInput.valueOf();
        } else {
            inputMs = localInput.valueOf();
            return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
        }
    }

    function isSameOrAfter (input, units) {
        return this.isSame(input, units) || this.isAfter(input, units);
    }

    function isSameOrBefore (input, units) {
        return this.isSame(input, units) || this.isBefore(input, units);
    }

    function diff (input, units, asFloat) {
        var that,
            zoneDelta,
            output;

        if (!this.isValid()) {
            return NaN;
        }

        that = cloneWithOffset(input, this);

        if (!that.isValid()) {
            return NaN;
        }

        zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

        units = normalizeUnits(units);

        switch (units) {
            case 'year': output = monthDiff(this, that) / 12; break;
            case 'month': output = monthDiff(this, that); break;
            case 'quarter': output = monthDiff(this, that) / 3; break;
            case 'second': output = (this - that) / 1e3; break; // 1000
            case 'minute': output = (this - that) / 6e4; break; // 1000 * 60
            case 'hour': output = (this - that) / 36e5; break; // 1000 * 60 * 60
            case 'day': output = (this - that - zoneDelta) / 864e5; break; // 1000 * 60 * 60 * 24, negate dst
            case 'week': output = (this - that - zoneDelta) / 6048e5; break; // 1000 * 60 * 60 * 24 * 7, negate dst
            default: output = this - that;
        }

        return asFloat ? output : absFloor(output);
    }

    function monthDiff (a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        //check for negative zero, return zero if negative zero
        return -(wholeMonthDiff + adjust) || 0;
    }

    hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
    hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

    function toString () {
        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    }

    function toISOString(keepOffset) {
        if (!this.isValid()) {
            return null;
        }
        var utc = keepOffset !== true;
        var m = utc ? this.clone().utc() : this;
        if (m.year() < 0 || m.year() > 9999) {
            return formatMoment(m, utc ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ');
        }
        if (isFunction(Date.prototype.toISOString)) {
            // native implementation is ~50x faster, use it when we can
            if (utc) {
                return this.toDate().toISOString();
            } else {
                return new Date(this.valueOf() + this.utcOffset() * 60 * 1000).toISOString().replace('Z', formatMoment(m, 'Z'));
            }
        }
        return formatMoment(m, utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ');
    }

    /**
     * Return a human readable representation of a moment that can
     * also be evaluated to get a new moment which is the same
     *
     * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
     */
    function inspect () {
        if (!this.isValid()) {
            return 'moment.invalid(/* ' + this._i + ' */)';
        }
        var func = 'moment';
        var zone = '';
        if (!this.isLocal()) {
            func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
            zone = 'Z';
        }
        var prefix = '[' + func + '("]';
        var year = (0 <= this.year() && this.year() <= 9999) ? 'YYYY' : 'YYYYYY';
        var datetime = '-MM-DD[T]HH:mm:ss.SSS';
        var suffix = zone + '[")]';

        return this.format(prefix + year + datetime + suffix);
    }

    function format (inputString) {
        if (!inputString) {
            inputString = this.isUtc() ? hooks.defaultFormatUtc : hooks.defaultFormat;
        }
        var output = formatMoment(this, inputString);
        return this.localeData().postformat(output);
    }

    function from (time, withoutSuffix) {
        if (this.isValid() &&
                ((isMoment(time) && time.isValid()) ||
                 createLocal(time).isValid())) {
            return createDuration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function fromNow (withoutSuffix) {
        return this.from(createLocal(), withoutSuffix);
    }

    function to (time, withoutSuffix) {
        if (this.isValid() &&
                ((isMoment(time) && time.isValid()) ||
                 createLocal(time).isValid())) {
            return createDuration({from: this, to: time}).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function toNow (withoutSuffix) {
        return this.to(createLocal(), withoutSuffix);
    }

    // If passed a locale key, it will set the locale for this
    // instance.  Otherwise, it will return the locale configuration
    // variables for this instance.
    function locale (key) {
        var newLocaleData;

        if (key === undefined) {
            return this._locale._abbr;
        } else {
            newLocaleData = getLocale(key);
            if (newLocaleData != null) {
                this._locale = newLocaleData;
            }
            return this;
        }
    }

    var lang = deprecate(
        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
        function (key) {
            if (key === undefined) {
                return this.localeData();
            } else {
                return this.locale(key);
            }
        }
    );

    function localeData () {
        return this._locale;
    }

    var MS_PER_SECOND = 1000;
    var MS_PER_MINUTE = 60 * MS_PER_SECOND;
    var MS_PER_HOUR = 60 * MS_PER_MINUTE;
    var MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

    // actual modulo - handles negative numbers (for dates before 1970):
    function mod$1(dividend, divisor) {
        return (dividend % divisor + divisor) % divisor;
    }

    function localStartOfDate(y, m, d) {
        // the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            return new Date(y + 400, m, d) - MS_PER_400_YEARS;
        } else {
            return new Date(y, m, d).valueOf();
        }
    }

    function utcStartOfDate(y, m, d) {
        // Date.UTC remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
        } else {
            return Date.UTC(y, m, d);
        }
    }

    function startOf (units) {
        var time;
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond' || !this.isValid()) {
            return this;
        }

        var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

        switch (units) {
            case 'year':
                time = startOfDate(this.year(), 0, 1);
                break;
            case 'quarter':
                time = startOfDate(this.year(), this.month() - this.month() % 3, 1);
                break;
            case 'month':
                time = startOfDate(this.year(), this.month(), 1);
                break;
            case 'week':
                time = startOfDate(this.year(), this.month(), this.date() - this.weekday());
                break;
            case 'isoWeek':
                time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1));
                break;
            case 'day':
            case 'date':
                time = startOfDate(this.year(), this.month(), this.date());
                break;
            case 'hour':
                time = this._d.valueOf();
                time -= mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR);
                break;
            case 'minute':
                time = this._d.valueOf();
                time -= mod$1(time, MS_PER_MINUTE);
                break;
            case 'second':
                time = this._d.valueOf();
                time -= mod$1(time, MS_PER_SECOND);
                break;
        }

        this._d.setTime(time);
        hooks.updateOffset(this, true);
        return this;
    }

    function endOf (units) {
        var time;
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond' || !this.isValid()) {
            return this;
        }

        var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

        switch (units) {
            case 'year':
                time = startOfDate(this.year() + 1, 0, 1) - 1;
                break;
            case 'quarter':
                time = startOfDate(this.year(), this.month() - this.month() % 3 + 3, 1) - 1;
                break;
            case 'month':
                time = startOfDate(this.year(), this.month() + 1, 1) - 1;
                break;
            case 'week':
                time = startOfDate(this.year(), this.month(), this.date() - this.weekday() + 7) - 1;
                break;
            case 'isoWeek':
                time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1) + 7) - 1;
                break;
            case 'day':
            case 'date':
                time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
                break;
            case 'hour':
                time = this._d.valueOf();
                time += MS_PER_HOUR - mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR) - 1;
                break;
            case 'minute':
                time = this._d.valueOf();
                time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
                break;
            case 'second':
                time = this._d.valueOf();
                time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
                break;
        }

        this._d.setTime(time);
        hooks.updateOffset(this, true);
        return this;
    }

    function valueOf () {
        return this._d.valueOf() - ((this._offset || 0) * 60000);
    }

    function unix () {
        return Math.floor(this.valueOf() / 1000);
    }

    function toDate () {
        return new Date(this.valueOf());
    }

    function toArray () {
        var m = this;
        return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
    }

    function toObject () {
        var m = this;
        return {
            years: m.year(),
            months: m.month(),
            date: m.date(),
            hours: m.hours(),
            minutes: m.minutes(),
            seconds: m.seconds(),
            milliseconds: m.milliseconds()
        };
    }

    function toJSON () {
        // new Date(NaN).toJSON() === null
        return this.isValid() ? this.toISOString() : null;
    }

    function isValid$2 () {
        return isValid(this);
    }

    function parsingFlags () {
        return extend({}, getParsingFlags(this));
    }

    function invalidAt () {
        return getParsingFlags(this).overflow;
    }

    function creationData() {
        return {
            input: this._i,
            format: this._f,
            locale: this._locale,
            isUTC: this._isUTC,
            strict: this._strict
        };
    }

    // FORMATTING

    addFormatToken(0, ['gg', 2], 0, function () {
        return this.weekYear() % 100;
    });

    addFormatToken(0, ['GG', 2], 0, function () {
        return this.isoWeekYear() % 100;
    });

    function addWeekYearFormatToken (token, getter) {
        addFormatToken(0, [token, token.length], 0, getter);
    }

    addWeekYearFormatToken('gggg',     'weekYear');
    addWeekYearFormatToken('ggggg',    'weekYear');
    addWeekYearFormatToken('GGGG',  'isoWeekYear');
    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

    // ALIASES

    addUnitAlias('weekYear', 'gg');
    addUnitAlias('isoWeekYear', 'GG');

    // PRIORITY

    addUnitPriority('weekYear', 1);
    addUnitPriority('isoWeekYear', 1);


    // PARSING

    addRegexToken('G',      matchSigned);
    addRegexToken('g',      matchSigned);
    addRegexToken('GG',     match1to2, match2);
    addRegexToken('gg',     match1to2, match2);
    addRegexToken('GGGG',   match1to4, match4);
    addRegexToken('gggg',   match1to4, match4);
    addRegexToken('GGGGG',  match1to6, match6);
    addRegexToken('ggggg',  match1to6, match6);

    addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
        week[token.substr(0, 2)] = toInt(input);
    });

    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
        week[token] = hooks.parseTwoDigitYear(input);
    });

    // MOMENTS

    function getSetWeekYear (input) {
        return getSetWeekYearHelper.call(this,
                input,
                this.week(),
                this.weekday(),
                this.localeData()._week.dow,
                this.localeData()._week.doy);
    }

    function getSetISOWeekYear (input) {
        return getSetWeekYearHelper.call(this,
                input, this.isoWeek(), this.isoWeekday(), 1, 4);
    }

    function getISOWeeksInYear () {
        return weeksInYear(this.year(), 1, 4);
    }

    function getWeeksInYear () {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    function getSetWeekYearHelper(input, week, weekday, dow, doy) {
        var weeksTarget;
        if (input == null) {
            return weekOfYear(this, dow, doy).year;
        } else {
            weeksTarget = weeksInYear(input, dow, doy);
            if (week > weeksTarget) {
                week = weeksTarget;
            }
            return setWeekAll.call(this, input, week, weekday, dow, doy);
        }
    }

    function setWeekAll(weekYear, week, weekday, dow, doy) {
        var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
            date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

        this.year(date.getUTCFullYear());
        this.month(date.getUTCMonth());
        this.date(date.getUTCDate());
        return this;
    }

    // FORMATTING

    addFormatToken('Q', 0, 'Qo', 'quarter');

    // ALIASES

    addUnitAlias('quarter', 'Q');

    // PRIORITY

    addUnitPriority('quarter', 7);

    // PARSING

    addRegexToken('Q', match1);
    addParseToken('Q', function (input, array) {
        array[MONTH] = (toInt(input) - 1) * 3;
    });

    // MOMENTS

    function getSetQuarter (input) {
        return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
    }

    // FORMATTING

    addFormatToken('D', ['DD', 2], 'Do', 'date');

    // ALIASES

    addUnitAlias('date', 'D');

    // PRIORITY
    addUnitPriority('date', 9);

    // PARSING

    addRegexToken('D',  match1to2);
    addRegexToken('DD', match1to2, match2);
    addRegexToken('Do', function (isStrict, locale) {
        // TODO: Remove "ordinalParse" fallback in next major release.
        return isStrict ?
          (locale._dayOfMonthOrdinalParse || locale._ordinalParse) :
          locale._dayOfMonthOrdinalParseLenient;
    });

    addParseToken(['D', 'DD'], DATE);
    addParseToken('Do', function (input, array) {
        array[DATE] = toInt(input.match(match1to2)[0]);
    });

    // MOMENTS

    var getSetDayOfMonth = makeGetSet('Date', true);

    // FORMATTING

    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

    // ALIASES

    addUnitAlias('dayOfYear', 'DDD');

    // PRIORITY
    addUnitPriority('dayOfYear', 4);

    // PARSING

    addRegexToken('DDD',  match1to3);
    addRegexToken('DDDD', match3);
    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
        config._dayOfYear = toInt(input);
    });

    // HELPERS

    // MOMENTS

    function getSetDayOfYear (input) {
        var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
        return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
    }

    // FORMATTING

    addFormatToken('m', ['mm', 2], 0, 'minute');

    // ALIASES

    addUnitAlias('minute', 'm');

    // PRIORITY

    addUnitPriority('minute', 14);

    // PARSING

    addRegexToken('m',  match1to2);
    addRegexToken('mm', match1to2, match2);
    addParseToken(['m', 'mm'], MINUTE);

    // MOMENTS

    var getSetMinute = makeGetSet('Minutes', false);

    // FORMATTING

    addFormatToken('s', ['ss', 2], 0, 'second');

    // ALIASES

    addUnitAlias('second', 's');

    // PRIORITY

    addUnitPriority('second', 15);

    // PARSING

    addRegexToken('s',  match1to2);
    addRegexToken('ss', match1to2, match2);
    addParseToken(['s', 'ss'], SECOND);

    // MOMENTS

    var getSetSecond = makeGetSet('Seconds', false);

    // FORMATTING

    addFormatToken('S', 0, 0, function () {
        return ~~(this.millisecond() / 100);
    });

    addFormatToken(0, ['SS', 2], 0, function () {
        return ~~(this.millisecond() / 10);
    });

    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
    addFormatToken(0, ['SSSS', 4], 0, function () {
        return this.millisecond() * 10;
    });
    addFormatToken(0, ['SSSSS', 5], 0, function () {
        return this.millisecond() * 100;
    });
    addFormatToken(0, ['SSSSSS', 6], 0, function () {
        return this.millisecond() * 1000;
    });
    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
        return this.millisecond() * 10000;
    });
    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
        return this.millisecond() * 100000;
    });
    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
        return this.millisecond() * 1000000;
    });


    // ALIASES

    addUnitAlias('millisecond', 'ms');

    // PRIORITY

    addUnitPriority('millisecond', 16);

    // PARSING

    addRegexToken('S',    match1to3, match1);
    addRegexToken('SS',   match1to3, match2);
    addRegexToken('SSS',  match1to3, match3);

    var token;
    for (token = 'SSSS'; token.length <= 9; token += 'S') {
        addRegexToken(token, matchUnsigned);
    }

    function parseMs(input, array) {
        array[MILLISECOND] = toInt(('0.' + input) * 1000);
    }

    for (token = 'S'; token.length <= 9; token += 'S') {
        addParseToken(token, parseMs);
    }
    // MOMENTS

    var getSetMillisecond = makeGetSet('Milliseconds', false);

    // FORMATTING

    addFormatToken('z',  0, 0, 'zoneAbbr');
    addFormatToken('zz', 0, 0, 'zoneName');

    // MOMENTS

    function getZoneAbbr () {
        return this._isUTC ? 'UTC' : '';
    }

    function getZoneName () {
        return this._isUTC ? 'Coordinated Universal Time' : '';
    }

    var proto = Moment.prototype;

    proto.add               = add;
    proto.calendar          = calendar$1;
    proto.clone             = clone;
    proto.diff              = diff;
    proto.endOf             = endOf;
    proto.format            = format;
    proto.from              = from;
    proto.fromNow           = fromNow;
    proto.to                = to;
    proto.toNow             = toNow;
    proto.get               = stringGet;
    proto.invalidAt         = invalidAt;
    proto.isAfter           = isAfter;
    proto.isBefore          = isBefore;
    proto.isBetween         = isBetween;
    proto.isSame            = isSame;
    proto.isSameOrAfter     = isSameOrAfter;
    proto.isSameOrBefore    = isSameOrBefore;
    proto.isValid           = isValid$2;
    proto.lang              = lang;
    proto.locale            = locale;
    proto.localeData        = localeData;
    proto.max               = prototypeMax;
    proto.min               = prototypeMin;
    proto.parsingFlags      = parsingFlags;
    proto.set               = stringSet;
    proto.startOf           = startOf;
    proto.subtract          = subtract;
    proto.toArray           = toArray;
    proto.toObject          = toObject;
    proto.toDate            = toDate;
    proto.toISOString       = toISOString;
    proto.inspect           = inspect;
    proto.toJSON            = toJSON;
    proto.toString          = toString;
    proto.unix              = unix;
    proto.valueOf           = valueOf;
    proto.creationData      = creationData;
    proto.year       = getSetYear;
    proto.isLeapYear = getIsLeapYear;
    proto.weekYear    = getSetWeekYear;
    proto.isoWeekYear = getSetISOWeekYear;
    proto.quarter = proto.quarters = getSetQuarter;
    proto.month       = getSetMonth;
    proto.daysInMonth = getDaysInMonth;
    proto.week           = proto.weeks        = getSetWeek;
    proto.isoWeek        = proto.isoWeeks     = getSetISOWeek;
    proto.weeksInYear    = getWeeksInYear;
    proto.isoWeeksInYear = getISOWeeksInYear;
    proto.date       = getSetDayOfMonth;
    proto.day        = proto.days             = getSetDayOfWeek;
    proto.weekday    = getSetLocaleDayOfWeek;
    proto.isoWeekday = getSetISODayOfWeek;
    proto.dayOfYear  = getSetDayOfYear;
    proto.hour = proto.hours = getSetHour;
    proto.minute = proto.minutes = getSetMinute;
    proto.second = proto.seconds = getSetSecond;
    proto.millisecond = proto.milliseconds = getSetMillisecond;
    proto.utcOffset            = getSetOffset;
    proto.utc                  = setOffsetToUTC;
    proto.local                = setOffsetToLocal;
    proto.parseZone            = setOffsetToParsedOffset;
    proto.hasAlignedHourOffset = hasAlignedHourOffset;
    proto.isDST                = isDaylightSavingTime;
    proto.isLocal              = isLocal;
    proto.isUtcOffset          = isUtcOffset;
    proto.isUtc                = isUtc;
    proto.isUTC                = isUtc;
    proto.zoneAbbr = getZoneAbbr;
    proto.zoneName = getZoneName;
    proto.dates  = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
    proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
    proto.years  = deprecate('years accessor is deprecated. Use year instead', getSetYear);
    proto.zone   = deprecate('moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/', getSetZone);
    proto.isDSTShifted = deprecate('isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information', isDaylightSavingTimeShifted);

    function createUnix (input) {
        return createLocal(input * 1000);
    }

    function createInZone () {
        return createLocal.apply(null, arguments).parseZone();
    }

    function preParsePostFormat (string) {
        return string;
    }

    var proto$1 = Locale.prototype;

    proto$1.calendar        = calendar;
    proto$1.longDateFormat  = longDateFormat;
    proto$1.invalidDate     = invalidDate;
    proto$1.ordinal         = ordinal;
    proto$1.preparse        = preParsePostFormat;
    proto$1.postformat      = preParsePostFormat;
    proto$1.relativeTime    = relativeTime;
    proto$1.pastFuture      = pastFuture;
    proto$1.set             = set;

    proto$1.months            =        localeMonths;
    proto$1.monthsShort       =        localeMonthsShort;
    proto$1.monthsParse       =        localeMonthsParse;
    proto$1.monthsRegex       = monthsRegex;
    proto$1.monthsShortRegex  = monthsShortRegex;
    proto$1.week = localeWeek;
    proto$1.firstDayOfYear = localeFirstDayOfYear;
    proto$1.firstDayOfWeek = localeFirstDayOfWeek;

    proto$1.weekdays       =        localeWeekdays;
    proto$1.weekdaysMin    =        localeWeekdaysMin;
    proto$1.weekdaysShort  =        localeWeekdaysShort;
    proto$1.weekdaysParse  =        localeWeekdaysParse;

    proto$1.weekdaysRegex       =        weekdaysRegex;
    proto$1.weekdaysShortRegex  =        weekdaysShortRegex;
    proto$1.weekdaysMinRegex    =        weekdaysMinRegex;

    proto$1.isPM = localeIsPM;
    proto$1.meridiem = localeMeridiem;

    function get$1 (format, index, field, setter) {
        var locale = getLocale();
        var utc = createUTC().set(setter, index);
        return locale[field](utc, format);
    }

    function listMonthsImpl (format, index, field) {
        if (isNumber(format)) {
            index = format;
            format = undefined;
        }

        format = format || '';

        if (index != null) {
            return get$1(format, index, field, 'month');
        }

        var i;
        var out = [];
        for (i = 0; i < 12; i++) {
            out[i] = get$1(format, i, field, 'month');
        }
        return out;
    }

    // ()
    // (5)
    // (fmt, 5)
    // (fmt)
    // (true)
    // (true, 5)
    // (true, fmt, 5)
    // (true, fmt)
    function listWeekdaysImpl (localeSorted, format, index, field) {
        if (typeof localeSorted === 'boolean') {
            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';
        } else {
            format = localeSorted;
            index = format;
            localeSorted = false;

            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';
        }

        var locale = getLocale(),
            shift = localeSorted ? locale._week.dow : 0;

        if (index != null) {
            return get$1(format, (index + shift) % 7, field, 'day');
        }

        var i;
        var out = [];
        for (i = 0; i < 7; i++) {
            out[i] = get$1(format, (i + shift) % 7, field, 'day');
        }
        return out;
    }

    function listMonths (format, index) {
        return listMonthsImpl(format, index, 'months');
    }

    function listMonthsShort (format, index) {
        return listMonthsImpl(format, index, 'monthsShort');
    }

    function listWeekdays (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
    }

    function listWeekdaysShort (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
    }

    function listWeekdaysMin (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
    }

    getSetGlobalLocale('en', {
        dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    // Side effect imports

    hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', getSetGlobalLocale);
    hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', getLocale);

    var mathAbs = Math.abs;

    function abs () {
        var data           = this._data;

        this._milliseconds = mathAbs(this._milliseconds);
        this._days         = mathAbs(this._days);
        this._months       = mathAbs(this._months);

        data.milliseconds  = mathAbs(data.milliseconds);
        data.seconds       = mathAbs(data.seconds);
        data.minutes       = mathAbs(data.minutes);
        data.hours         = mathAbs(data.hours);
        data.months        = mathAbs(data.months);
        data.years         = mathAbs(data.years);

        return this;
    }

    function addSubtract$1 (duration, input, value, direction) {
        var other = createDuration(input, value);

        duration._milliseconds += direction * other._milliseconds;
        duration._days         += direction * other._days;
        duration._months       += direction * other._months;

        return duration._bubble();
    }

    // supports only 2.0-style add(1, 's') or add(duration)
    function add$1 (input, value) {
        return addSubtract$1(this, input, value, 1);
    }

    // supports only 2.0-style subtract(1, 's') or subtract(duration)
    function subtract$1 (input, value) {
        return addSubtract$1(this, input, value, -1);
    }

    function absCeil (number) {
        if (number < 0) {
            return Math.floor(number);
        } else {
            return Math.ceil(number);
        }
    }

    function bubble () {
        var milliseconds = this._milliseconds;
        var days         = this._days;
        var months       = this._months;
        var data         = this._data;
        var seconds, minutes, hours, years, monthsFromDays;

        // if we have a mix of positive and negative values, bubble down first
        // check: https://github.com/moment/moment/issues/2166
        if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
                (milliseconds <= 0 && days <= 0 && months <= 0))) {
            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
            days = 0;
            months = 0;
        }

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;

        seconds           = absFloor(milliseconds / 1000);
        data.seconds      = seconds % 60;

        minutes           = absFloor(seconds / 60);
        data.minutes      = minutes % 60;

        hours             = absFloor(minutes / 60);
        data.hours        = hours % 24;

        days += absFloor(hours / 24);

        // convert days to months
        monthsFromDays = absFloor(daysToMonths(days));
        months += monthsFromDays;
        days -= absCeil(monthsToDays(monthsFromDays));

        // 12 months -> 1 year
        years = absFloor(months / 12);
        months %= 12;

        data.days   = days;
        data.months = months;
        data.years  = years;

        return this;
    }

    function daysToMonths (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        // 400 years have 12 months === 4800
        return days * 4800 / 146097;
    }

    function monthsToDays (months) {
        // the reverse of daysToMonths
        return months * 146097 / 4800;
    }

    function as (units) {
        if (!this.isValid()) {
            return NaN;
        }
        var days;
        var months;
        var milliseconds = this._milliseconds;

        units = normalizeUnits(units);

        if (units === 'month' || units === 'quarter' || units === 'year') {
            days = this._days + milliseconds / 864e5;
            months = this._months + daysToMonths(days);
            switch (units) {
                case 'month':   return months;
                case 'quarter': return months / 3;
                case 'year':    return months / 12;
            }
        } else {
            // handle milliseconds separately because of floating point math errors (issue #1867)
            days = this._days + Math.round(monthsToDays(this._months));
            switch (units) {
                case 'week'   : return days / 7     + milliseconds / 6048e5;
                case 'day'    : return days         + milliseconds / 864e5;
                case 'hour'   : return days * 24    + milliseconds / 36e5;
                case 'minute' : return days * 1440  + milliseconds / 6e4;
                case 'second' : return days * 86400 + milliseconds / 1000;
                // Math.floor prevents floating point math errors here
                case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
                default: throw new Error('Unknown unit ' + units);
            }
        }
    }

    // TODO: Use this.as('ms')?
    function valueOf$1 () {
        if (!this.isValid()) {
            return NaN;
        }
        return (
            this._milliseconds +
            this._days * 864e5 +
            (this._months % 12) * 2592e6 +
            toInt(this._months / 12) * 31536e6
        );
    }

    function makeAs (alias) {
        return function () {
            return this.as(alias);
        };
    }

    var asMilliseconds = makeAs('ms');
    var asSeconds      = makeAs('s');
    var asMinutes      = makeAs('m');
    var asHours        = makeAs('h');
    var asDays         = makeAs('d');
    var asWeeks        = makeAs('w');
    var asMonths       = makeAs('M');
    var asQuarters     = makeAs('Q');
    var asYears        = makeAs('y');

    function clone$1 () {
        return createDuration(this);
    }

    function get$2 (units) {
        units = normalizeUnits(units);
        return this.isValid() ? this[units + 's']() : NaN;
    }

    function makeGetter(name) {
        return function () {
            return this.isValid() ? this._data[name] : NaN;
        };
    }

    var milliseconds = makeGetter('milliseconds');
    var seconds      = makeGetter('seconds');
    var minutes      = makeGetter('minutes');
    var hours        = makeGetter('hours');
    var days         = makeGetter('days');
    var months       = makeGetter('months');
    var years        = makeGetter('years');

    function weeks () {
        return absFloor(this.days() / 7);
    }

    var round = Math.round;
    var thresholds = {
        ss: 44,         // a few seconds to seconds
        s : 45,         // seconds to minute
        m : 45,         // minutes to hour
        h : 22,         // hours to day
        d : 26,         // days to month
        M : 11          // months to year
    };

    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime$1 (posNegDuration, withoutSuffix, locale) {
        var duration = createDuration(posNegDuration).abs();
        var seconds  = round(duration.as('s'));
        var minutes  = round(duration.as('m'));
        var hours    = round(duration.as('h'));
        var days     = round(duration.as('d'));
        var months   = round(duration.as('M'));
        var years    = round(duration.as('y'));

        var a = seconds <= thresholds.ss && ['s', seconds]  ||
                seconds < thresholds.s   && ['ss', seconds] ||
                minutes <= 1             && ['m']           ||
                minutes < thresholds.m   && ['mm', minutes] ||
                hours   <= 1             && ['h']           ||
                hours   < thresholds.h   && ['hh', hours]   ||
                days    <= 1             && ['d']           ||
                days    < thresholds.d   && ['dd', days]    ||
                months  <= 1             && ['M']           ||
                months  < thresholds.M   && ['MM', months]  ||
                years   <= 1             && ['y']           || ['yy', years];

        a[2] = withoutSuffix;
        a[3] = +posNegDuration > 0;
        a[4] = locale;
        return substituteTimeAgo.apply(null, a);
    }

    // This function allows you to set the rounding function for relative time strings
    function getSetRelativeTimeRounding (roundingFunction) {
        if (roundingFunction === undefined) {
            return round;
        }
        if (typeof(roundingFunction) === 'function') {
            round = roundingFunction;
            return true;
        }
        return false;
    }

    // This function allows you to set a threshold for relative time strings
    function getSetRelativeTimeThreshold (threshold, limit) {
        if (thresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return thresholds[threshold];
        }
        thresholds[threshold] = limit;
        if (threshold === 's') {
            thresholds.ss = limit - 1;
        }
        return true;
    }

    function humanize (withSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }

        var locale = this.localeData();
        var output = relativeTime$1(this, !withSuffix, locale);

        if (withSuffix) {
            output = locale.pastFuture(+this, output);
        }

        return locale.postformat(output);
    }

    var abs$1 = Math.abs;

    function sign(x) {
        return ((x > 0) - (x < 0)) || +x;
    }

    function toISOString$1() {
        // for ISO strings we do not use the normal bubbling rules:
        //  * milliseconds bubble up until they become hours
        //  * days do not bubble at all
        //  * months bubble up until they become years
        // This is because there is no context-free conversion between hours and days
        // (think of clock changes)
        // and also not between days and months (28-31 days per month)
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }

        var seconds = abs$1(this._milliseconds) / 1000;
        var days         = abs$1(this._days);
        var months       = abs$1(this._months);
        var minutes, hours, years;

        // 3600 seconds -> 60 minutes -> 1 hour
        minutes           = absFloor(seconds / 60);
        hours             = absFloor(minutes / 60);
        seconds %= 60;
        minutes %= 60;

        // 12 months -> 1 year
        years  = absFloor(months / 12);
        months %= 12;


        // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
        var Y = years;
        var M = months;
        var D = days;
        var h = hours;
        var m = minutes;
        var s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';
        var total = this.asSeconds();

        if (!total) {
            // this is the same as C#'s (Noda) and python (isodate)...
            // but not other JS (goog.date)
            return 'P0D';
        }

        var totalSign = total < 0 ? '-' : '';
        var ymSign = sign(this._months) !== sign(total) ? '-' : '';
        var daysSign = sign(this._days) !== sign(total) ? '-' : '';
        var hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

        return totalSign + 'P' +
            (Y ? ymSign + Y + 'Y' : '') +
            (M ? ymSign + M + 'M' : '') +
            (D ? daysSign + D + 'D' : '') +
            ((h || m || s) ? 'T' : '') +
            (h ? hmsSign + h + 'H' : '') +
            (m ? hmsSign + m + 'M' : '') +
            (s ? hmsSign + s + 'S' : '');
    }

    var proto$2 = Duration.prototype;

    proto$2.isValid        = isValid$1;
    proto$2.abs            = abs;
    proto$2.add            = add$1;
    proto$2.subtract       = subtract$1;
    proto$2.as             = as;
    proto$2.asMilliseconds = asMilliseconds;
    proto$2.asSeconds      = asSeconds;
    proto$2.asMinutes      = asMinutes;
    proto$2.asHours        = asHours;
    proto$2.asDays         = asDays;
    proto$2.asWeeks        = asWeeks;
    proto$2.asMonths       = asMonths;
    proto$2.asQuarters     = asQuarters;
    proto$2.asYears        = asYears;
    proto$2.valueOf        = valueOf$1;
    proto$2._bubble        = bubble;
    proto$2.clone          = clone$1;
    proto$2.get            = get$2;
    proto$2.milliseconds   = milliseconds;
    proto$2.seconds        = seconds;
    proto$2.minutes        = minutes;
    proto$2.hours          = hours;
    proto$2.days           = days;
    proto$2.weeks          = weeks;
    proto$2.months         = months;
    proto$2.years          = years;
    proto$2.humanize       = humanize;
    proto$2.toISOString    = toISOString$1;
    proto$2.toString       = toISOString$1;
    proto$2.toJSON         = toISOString$1;
    proto$2.locale         = locale;
    proto$2.localeData     = localeData;

    proto$2.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', toISOString$1);
    proto$2.lang = lang;

    // Side effect imports

    // FORMATTING

    addFormatToken('X', 0, 0, 'unix');
    addFormatToken('x', 0, 0, 'valueOf');

    // PARSING

    addRegexToken('x', matchSigned);
    addRegexToken('X', matchTimestamp);
    addParseToken('X', function (input, array, config) {
        config._d = new Date(parseFloat(input, 10) * 1000);
    });
    addParseToken('x', function (input, array, config) {
        config._d = new Date(toInt(input));
    });

    // Side effect imports


    hooks.version = '2.24.0';

    setHookCallback(createLocal);

    hooks.fn                    = proto;
    hooks.min                   = min;
    hooks.max                   = max;
    hooks.now                   = now;
    hooks.utc                   = createUTC;
    hooks.unix                  = createUnix;
    hooks.months                = listMonths;
    hooks.isDate                = isDate;
    hooks.locale                = getSetGlobalLocale;
    hooks.invalid               = createInvalid;
    hooks.duration              = createDuration;
    hooks.isMoment              = isMoment;
    hooks.weekdays              = listWeekdays;
    hooks.parseZone             = createInZone;
    hooks.localeData            = getLocale;
    hooks.isDuration            = isDuration;
    hooks.monthsShort           = listMonthsShort;
    hooks.weekdaysMin           = listWeekdaysMin;
    hooks.defineLocale          = defineLocale;
    hooks.updateLocale          = updateLocale;
    hooks.locales               = listLocales;
    hooks.weekdaysShort         = listWeekdaysShort;
    hooks.normalizeUnits        = normalizeUnits;
    hooks.relativeTimeRounding  = getSetRelativeTimeRounding;
    hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
    hooks.calendarFormat        = getCalendarFormat;
    hooks.prototype             = proto;

    // currently HTML5 input type only supports 24-hour formats
    hooks.HTML5_FMT = {
        DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',             // <input type="datetime-local" />
        DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss',  // <input type="datetime-local" step="1" />
        DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS',   // <input type="datetime-local" step="0.001" />
        DATE: 'YYYY-MM-DD',                             // <input type="date" />
        TIME: 'HH:mm',                                  // <input type="time" />
        TIME_SECONDS: 'HH:mm:ss',                       // <input type="time" step="1" />
        TIME_MS: 'HH:mm:ss.SSS',                        // <input type="time" step="0.001" />
        WEEK: 'GGGG-[W]WW',                             // <input type="week" />
        MONTH: 'YYYY-MM'                                // <input type="month" />
    };

    return hooks;

})));

},{}],7:[function(require,module,exports){
(function (Buffer){
let client;

//Convert a stream to a buffer
async function streamToBuffer(stream) {
  const bufs = [];
  stream.on('data', function(d) { bufs.push(d); });
  return new Promise((resolve) => {
    stream.on('end', function() {
      resolve(Buffer.concat(bufs));
    });
  });
}


//Encrypt the filedata and return the stream content and filename
async function encrypt(fileData, filename, userId, asHtml) {
  //TODO use withBuffer
  
  client = buildClient();
  const contentStream = TDF.createMockStream(fileData);
  const policy = new Virtru.PolicyBuilder().build();

  const encryptParams = new Virtru.EncryptParamsBuilder()
      .withStreamSource(contentStream)
      .withPolicy(policy)
      .withDisplayFilename(filename)
      .build();

  const ct = await client.encrypt(encryptParams);
  const buff = await streamToBuffer(ct);
  return {content: buff, name: filename};
}


//Decrypt the file by creating an object url (for now) and return the stream content
async function decrypt(filedata, userId, asHtml) {

 client = buildClient();
 const decryptParams = new Virtru.DecryptParamsBuilder()
      .withBufferSource(filedata)
      .build();

 const content = await client.decrypt(decryptParams);
 const buff = await streamToBuffer(content);
 return buff;

}

function getMimeByProtocol(isHtmlProtocol){
  return isHtmlProtocol ? {type: 'text/html;charset=binary'} : {type: 'application/json;charset=binary'};
}

//Encrypt or decrypt the file by using the support functions, depending on the value of the shouldEncrypt flag
async function encryptOrDecryptFile(filedata, filename, shouldEncrypt, userId, completion, asHtml) {
  if (shouldEncrypt) {
    const ext = asHtml ? 'html' : 'tdf';
    const written = await encrypt(filedata, filename, userId, asHtml);
    saveFile(written.content, getMimeByProtocol(asHtml), `${written.name}.${ext}`);
    completion && completion();
  } else {
    const written = await decrypt(filedata, userId, isHtmlProtocol);
    const ext = filename.substr(-4);
    let finalFilename = filename;

    if(ext === ".tdf"){
      finalFilename = finalFilename.replace(ext,"");
    }

    saveFile(written, {type: getMIMEType(written).mime}, finalFilename);
    completion && completion();
  }
}

module.exports = {
  encryptOrDecryptFile
};
}).call(this,require("buffer").Buffer)
},{"buffer":2}],8:[function(require,module,exports){
const userId = new URL(window.location.href).searchParams.get('userId');
const protocol = new URL(window.location.href).searchParams.get('protocol');

//Get the mimetype from the file data
function getMIMEType(filedata) {
  let typeOb = fileType(filedata);

  if (!typeOb) {
    const arr = (new Uint8Array(filedata)).subarray(0, 4);
    let header = '';
    for (let i = 0; i < arr.length; i++) {
      header += arr[i].toString(16);
    }

    //Using mimetype magic numbers, find any types that the fileType module may have missed
    switch (header) {
      case '7b227061':
        typeOb = {mime: 'html/text', ext: 'txt'};
        break;
      default:
        typeOb = {mime: 'unknown', ext: 'unknown'};
    }
  }

  return typeOb;
}

//Save the file locally as a download
function saveFile(filedata, type, filename) {
  const blob = new Blob([filedata], type);
  saveAs(blob, filename);
}

function isHtmlProtocol() { return protocol && protocol.toLowerCase() === 'html'; }


//Extract the policy from the TDF file to be used in updates
async function readPolicyFromTDF(filedata, completion) {
  const url = window.URL.createObjectURL(new Blob([filedata], {type: 'application/zip'}));
  const policy = await TDF.getPolicyFromRemoteTDF(url);
  return policy;
}

//Fetch the policy from ACM
async function fetchPolicy(uuid) {

  forceLoginIfNecessary();
  const client = buildClient();

  const policy = await client.fetchPolicy(uuid);
  return policy;
}

//Revoke the policy by its UUID
async function revokePolicy(uuid) {

  forceLoginIfNecessary();
  const client = buildClient();

  await client.revokePolicy(uuid);
}

//Update the policy by its UUID
async function updatePolicy(policy) {

  forceLoginIfNecessary();
  const client = buildClient();

  await client.updatePolicy(policy.build());
}


module.exports = {
  getMIMEType,
  saveFile,
  readPolicyFromTDF,
  revokePolicy,
  fetchPolicy,
  updatePolicy,
  isHtmlProtocol
};

},{}],9:[function(require,module,exports){
(function (Buffer){
/**
	This file is to be compiled with browserify to be used by the simple example page.
	See package.json (build) for more info.
**/

//Require all node modules needed to be access by the browser
const filesaver = require('file-saver');
const fileType = require('file-type');
const moment = require('moment');

//Imports for our simple example
const simpleTDFUtil = require('./saas-tdf-util.js');
const simpleEncryptDecrypt = require('./saas-encrypt-decrypt.js');
const oauth = require('./virtruauth.min.js');

const imports = [simpleTDFUtil, simpleEncryptDecrypt, oauth];

//Load all global properties of our explicitly imported modules on the window
imports.forEach((i) => {
  Object.keys(i).forEach((key) => {
    window[key] = i[key];
  });
});

//Add other necessary modules on the window
window.saveAs = filesaver.saveAs;
window.Buffer = Buffer;
window.fileType = fileType;
window.moment = moment;

}).call(this,require("buffer").Buffer)
},{"./saas-encrypt-decrypt.js":7,"./saas-tdf-util.js":8,"./virtruauth.min.js":10,"buffer":2,"file-saver":3,"file-type":4,"moment":6}],10:[function(require,module,exports){
!function(e){var t={};function n(r){if(t[r])return t[r].exports;var i=t[r]={i:r,l:!1,exports:{}};return e[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(r,i,function(t){return e[t]}.bind(null,i));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=349)}([function(e,t,n){(function(e){e.exports=function(){"use strict";var t,r;function i(){return t.apply(null,arguments)}function o(e){return e instanceof Array||"[object Array]"===Object.prototype.toString.call(e)}function a(e){return null!=e&&"[object Object]"===Object.prototype.toString.call(e)}function s(e){return void 0===e}function u(e){return"number"==typeof e||"[object Number]"===Object.prototype.toString.call(e)}function c(e){return e instanceof Date||"[object Date]"===Object.prototype.toString.call(e)}function d(e,t){var n,r=[];for(n=0;n<e.length;++n)r.push(t(e[n],n));return r}function l(e,t){return Object.prototype.hasOwnProperty.call(e,t)}function f(e,t){for(var n in t)l(t,n)&&(e[n]=t[n]);return l(t,"toString")&&(e.toString=t.toString),l(t,"valueOf")&&(e.valueOf=t.valueOf),e}function p(e,t,n,r){return Dt(e,t,n,r,!0).utc()}function h(e){return null==e._pf&&(e._pf={empty:!1,unusedTokens:[],unusedInput:[],overflow:-2,charsLeftOver:0,nullInput:!1,invalidMonth:null,invalidFormat:!1,userInvalidated:!1,iso:!1,parsedDateParts:[],meridiem:null,rfc2822:!1,weekdayMismatch:!1}),e._pf}function m(e){if(null==e._isValid){var t=h(e),n=r.call(t.parsedDateParts,function(e){return null!=e}),i=!isNaN(e._d.getTime())&&t.overflow<0&&!t.empty&&!t.invalidMonth&&!t.invalidWeekday&&!t.weekdayMismatch&&!t.nullInput&&!t.invalidFormat&&!t.userInvalidated&&(!t.meridiem||t.meridiem&&n);if(e._strict&&(i=i&&0===t.charsLeftOver&&0===t.unusedTokens.length&&void 0===t.bigHour),null!=Object.isFrozen&&Object.isFrozen(e))return i;e._isValid=i}return e._isValid}function _(e){var t=p(NaN);return null!=e?f(h(t),e):h(t).userInvalidated=!0,t}r=Array.prototype.some?Array.prototype.some:function(e){for(var t=Object(this),n=t.length>>>0,r=0;r<n;r++)if(r in t&&e.call(this,t[r],r,t))return!0;return!1};var v=i.momentProperties=[];function y(e,t){var n,r,i;if(s(t._isAMomentObject)||(e._isAMomentObject=t._isAMomentObject),s(t._i)||(e._i=t._i),s(t._f)||(e._f=t._f),s(t._l)||(e._l=t._l),s(t._strict)||(e._strict=t._strict),s(t._tzm)||(e._tzm=t._tzm),s(t._isUTC)||(e._isUTC=t._isUTC),s(t._offset)||(e._offset=t._offset),s(t._pf)||(e._pf=h(t)),s(t._locale)||(e._locale=t._locale),v.length>0)for(n=0;n<v.length;n++)r=v[n],s(i=t[r])||(e[r]=i);return e}var g=!1;function b(e){y(this,e),this._d=new Date(null!=e._d?e._d.getTime():NaN),this.isValid()||(this._d=new Date(NaN)),!1===g&&(g=!0,i.updateOffset(this),g=!1)}function w(e){return e instanceof b||null!=e&&null!=e._isAMomentObject}function M(e){return e<0?Math.ceil(e)||0:Math.floor(e)}function k(e){var t=+e,n=0;return 0!==t&&isFinite(t)&&(n=M(t)),n}function x(e,t,n){var r,i=Math.min(e.length,t.length),o=Math.abs(e.length-t.length),a=0;for(r=0;r<i;r++)(n&&e[r]!==t[r]||!n&&k(e[r])!==k(t[r]))&&a++;return a+o}function S(e){!1===i.suppressDeprecationWarnings&&"undefined"!=typeof console&&console.warn&&console.warn("Deprecation warning: "+e)}function L(e,t){var n=!0;return f(function(){if(null!=i.deprecationHandler&&i.deprecationHandler(null,e),n){for(var r,o=[],a=0;a<arguments.length;a++){if(r="","object"==typeof arguments[a]){for(var s in r+="\n["+a+"] ",arguments[0])r+=s+": "+arguments[0][s]+", ";r=r.slice(0,-2)}else r=arguments[a];o.push(r)}S(e+"\nArguments: "+Array.prototype.slice.call(o).join("")+"\n"+(new Error).stack),n=!1}return t.apply(this,arguments)},t)}var A,E={};function T(e,t){null!=i.deprecationHandler&&i.deprecationHandler(e,t),E[e]||(S(t),E[e]=!0)}function D(e){return e instanceof Function||"[object Function]"===Object.prototype.toString.call(e)}function j(e,t){var n,r=f({},e);for(n in t)l(t,n)&&(a(e[n])&&a(t[n])?(r[n]={},f(r[n],e[n]),f(r[n],t[n])):null!=t[n]?r[n]=t[n]:delete r[n]);for(n in e)l(e,n)&&!l(t,n)&&a(e[n])&&(r[n]=f({},r[n]));return r}function I(e){null!=e&&this.set(e)}i.suppressDeprecationWarnings=!1,i.deprecationHandler=null,A=Object.keys?Object.keys:function(e){var t,n=[];for(t in e)l(e,t)&&n.push(t);return n};var Y={};function O(e,t){var n=e.toLowerCase();Y[n]=Y[n+"s"]=Y[t]=e}function R(e){return"string"==typeof e?Y[e]||Y[e.toLowerCase()]:void 0}function C(e){var t,n,r={};for(n in e)l(e,n)&&(t=R(n))&&(r[t]=e[n]);return r}var P={};function U(e,t){P[e]=t}function N(e,t,n){var r=""+Math.abs(e),i=t-r.length,o=e>=0;return(o?n?"+":"":"-")+Math.pow(10,Math.max(0,i)).toString().substr(1)+r}var F=/(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,H=/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,B={},z={};function q(e,t,n,r){var i=r;"string"==typeof r&&(i=function(){return this[r]()}),e&&(z[e]=i),t&&(z[t[0]]=function(){return N(i.apply(this,arguments),t[1],t[2])}),n&&(z[n]=function(){return this.localeData().ordinal(i.apply(this,arguments),e)})}function W(e,t){return e.isValid()?(t=G(t,e.localeData()),B[t]=B[t]||function(e){var t,n,r,i=e.match(F);for(t=0,n=i.length;t<n;t++)z[i[t]]?i[t]=z[i[t]]:i[t]=(r=i[t]).match(/\[[\s\S]/)?r.replace(/^\[|\]$/g,""):r.replace(/\\/g,"");return function(t){var r,o="";for(r=0;r<n;r++)o+=D(i[r])?i[r].call(t,e):i[r];return o}}(t),B[t](e)):e.localeData().invalidDate()}function G(e,t){var n=5;function r(e){return t.longDateFormat(e)||e}for(H.lastIndex=0;n>=0&&H.test(e);)e=e.replace(H,r),H.lastIndex=0,n-=1;return e}var V=/\d/,J=/\d\d/,Z=/\d{3}/,K=/\d{4}/,X=/[+-]?\d{6}/,Q=/\d\d?/,$=/\d\d\d\d?/,ee=/\d\d\d\d\d\d?/,te=/\d{1,3}/,ne=/\d{1,4}/,re=/[+-]?\d{1,6}/,ie=/\d+/,oe=/[+-]?\d+/,ae=/Z|[+-]\d\d:?\d\d/gi,se=/Z|[+-]\d\d(?::?\d\d)?/gi,ue=/[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i,ce={};function de(e,t,n){ce[e]=D(t)?t:function(e,r){return e&&n?n:t}}function le(e,t){return l(ce,e)?ce[e](t._strict,t._locale):new RegExp(fe(e.replace("\\","").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,function(e,t,n,r,i){return t||n||r||i})))}function fe(e){return e.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")}var pe={};function he(e,t){var n,r=t;for("string"==typeof e&&(e=[e]),u(t)&&(r=function(e,n){n[t]=k(e)}),n=0;n<e.length;n++)pe[e[n]]=r}function me(e,t){he(e,function(e,n,r,i){r._w=r._w||{},t(e,r._w,r,i)})}function _e(e,t,n){null!=t&&l(pe,e)&&pe[e](t,n._a,n,e)}var ve=0,ye=1,ge=2,be=3,we=4,Me=5,ke=6,xe=7,Se=8;function Le(e){return Ae(e)?366:365}function Ae(e){return e%4==0&&e%100!=0||e%400==0}q("Y",0,0,function(){var e=this.year();return e<=9999?""+e:"+"+e}),q(0,["YY",2],0,function(){return this.year()%100}),q(0,["YYYY",4],0,"year"),q(0,["YYYYY",5],0,"year"),q(0,["YYYYYY",6,!0],0,"year"),O("year","y"),U("year",1),de("Y",oe),de("YY",Q,J),de("YYYY",ne,K),de("YYYYY",re,X),de("YYYYYY",re,X),he(["YYYYY","YYYYYY"],ve),he("YYYY",function(e,t){t[ve]=2===e.length?i.parseTwoDigitYear(e):k(e)}),he("YY",function(e,t){t[ve]=i.parseTwoDigitYear(e)}),he("Y",function(e,t){t[ve]=parseInt(e,10)}),i.parseTwoDigitYear=function(e){return k(e)+(k(e)>68?1900:2e3)};var Ee,Te=De("FullYear",!0);function De(e,t){return function(n){return null!=n?(Ie(this,e,n),i.updateOffset(this,t),this):je(this,e)}}function je(e,t){return e.isValid()?e._d["get"+(e._isUTC?"UTC":"")+t]():NaN}function Ie(e,t,n){e.isValid()&&!isNaN(n)&&("FullYear"===t&&Ae(e.year())&&1===e.month()&&29===e.date()?e._d["set"+(e._isUTC?"UTC":"")+t](n,e.month(),Ye(n,e.month())):e._d["set"+(e._isUTC?"UTC":"")+t](n))}function Ye(e,t){if(isNaN(e)||isNaN(t))return NaN;var n,r=(t%(n=12)+n)%n;return e+=(t-r)/12,1===r?Ae(e)?29:28:31-r%7%2}Ee=Array.prototype.indexOf?Array.prototype.indexOf:function(e){var t;for(t=0;t<this.length;++t)if(this[t]===e)return t;return-1},q("M",["MM",2],"Mo",function(){return this.month()+1}),q("MMM",0,0,function(e){return this.localeData().monthsShort(this,e)}),q("MMMM",0,0,function(e){return this.localeData().months(this,e)}),O("month","M"),U("month",8),de("M",Q),de("MM",Q,J),de("MMM",function(e,t){return t.monthsShortRegex(e)}),de("MMMM",function(e,t){return t.monthsRegex(e)}),he(["M","MM"],function(e,t){t[ye]=k(e)-1}),he(["MMM","MMMM"],function(e,t,n,r){var i=n._locale.monthsParse(e,r,n._strict);null!=i?t[ye]=i:h(n).invalidMonth=e});var Oe=/D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,Re="January_February_March_April_May_June_July_August_September_October_November_December".split("_"),Ce="Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_");function Pe(e,t){var n;if(!e.isValid())return e;if("string"==typeof t)if(/^\d+$/.test(t))t=k(t);else if(!u(t=e.localeData().monthsParse(t)))return e;return n=Math.min(e.date(),Ye(e.year(),t)),e._d["set"+(e._isUTC?"UTC":"")+"Month"](t,n),e}function Ue(e){return null!=e?(Pe(this,e),i.updateOffset(this,!0),this):je(this,"Month")}var Ne=ue,Fe=ue;function He(){function e(e,t){return t.length-e.length}var t,n,r=[],i=[],o=[];for(t=0;t<12;t++)n=p([2e3,t]),r.push(this.monthsShort(n,"")),i.push(this.months(n,"")),o.push(this.months(n,"")),o.push(this.monthsShort(n,""));for(r.sort(e),i.sort(e),o.sort(e),t=0;t<12;t++)r[t]=fe(r[t]),i[t]=fe(i[t]);for(t=0;t<24;t++)o[t]=fe(o[t]);this._monthsRegex=new RegExp("^("+o.join("|")+")","i"),this._monthsShortRegex=this._monthsRegex,this._monthsStrictRegex=new RegExp("^("+i.join("|")+")","i"),this._monthsShortStrictRegex=new RegExp("^("+r.join("|")+")","i")}function Be(e){var t;if(e<100&&e>=0){var n=Array.prototype.slice.call(arguments);n[0]=e+400,t=new Date(Date.UTC.apply(null,n)),isFinite(t.getUTCFullYear())&&t.setUTCFullYear(e)}else t=new Date(Date.UTC.apply(null,arguments));return t}function ze(e,t,n){var r=7+t-n,i=(7+Be(e,0,r).getUTCDay()-t)%7;return-i+r-1}function qe(e,t,n,r,i){var o,a,s=(7+n-r)%7,u=ze(e,r,i),c=1+7*(t-1)+s+u;return c<=0?a=Le(o=e-1)+c:c>Le(e)?(o=e+1,a=c-Le(e)):(o=e,a=c),{year:o,dayOfYear:a}}function We(e,t,n){var r,i,o=ze(e.year(),t,n),a=Math.floor((e.dayOfYear()-o-1)/7)+1;return a<1?(i=e.year()-1,r=a+Ge(i,t,n)):a>Ge(e.year(),t,n)?(r=a-Ge(e.year(),t,n),i=e.year()+1):(i=e.year(),r=a),{week:r,year:i}}function Ge(e,t,n){var r=ze(e,t,n),i=ze(e+1,t,n);return(Le(e)-r+i)/7}function Ve(e,t){return e.slice(t,7).concat(e.slice(0,t))}q("w",["ww",2],"wo","week"),q("W",["WW",2],"Wo","isoWeek"),O("week","w"),O("isoWeek","W"),U("week",5),U("isoWeek",5),de("w",Q),de("ww",Q,J),de("W",Q),de("WW",Q,J),me(["w","ww","W","WW"],function(e,t,n,r){t[r.substr(0,1)]=k(e)}),q("d",0,"do","day"),q("dd",0,0,function(e){return this.localeData().weekdaysMin(this,e)}),q("ddd",0,0,function(e){return this.localeData().weekdaysShort(this,e)}),q("dddd",0,0,function(e){return this.localeData().weekdays(this,e)}),q("e",0,0,"weekday"),q("E",0,0,"isoWeekday"),O("day","d"),O("weekday","e"),O("isoWeekday","E"),U("day",11),U("weekday",11),U("isoWeekday",11),de("d",Q),de("e",Q),de("E",Q),de("dd",function(e,t){return t.weekdaysMinRegex(e)}),de("ddd",function(e,t){return t.weekdaysShortRegex(e)}),de("dddd",function(e,t){return t.weekdaysRegex(e)}),me(["dd","ddd","dddd"],function(e,t,n,r){var i=n._locale.weekdaysParse(e,r,n._strict);null!=i?t.d=i:h(n).invalidWeekday=e}),me(["d","e","E"],function(e,t,n,r){t[r]=k(e)});var Je="Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),Ze="Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),Ke="Su_Mo_Tu_We_Th_Fr_Sa".split("_"),Xe=ue,Qe=ue,$e=ue;function et(){function e(e,t){return t.length-e.length}var t,n,r,i,o,a=[],s=[],u=[],c=[];for(t=0;t<7;t++)n=p([2e3,1]).day(t),r=this.weekdaysMin(n,""),i=this.weekdaysShort(n,""),o=this.weekdays(n,""),a.push(r),s.push(i),u.push(o),c.push(r),c.push(i),c.push(o);for(a.sort(e),s.sort(e),u.sort(e),c.sort(e),t=0;t<7;t++)s[t]=fe(s[t]),u[t]=fe(u[t]),c[t]=fe(c[t]);this._weekdaysRegex=new RegExp("^("+c.join("|")+")","i"),this._weekdaysShortRegex=this._weekdaysRegex,this._weekdaysMinRegex=this._weekdaysRegex,this._weekdaysStrictRegex=new RegExp("^("+u.join("|")+")","i"),this._weekdaysShortStrictRegex=new RegExp("^("+s.join("|")+")","i"),this._weekdaysMinStrictRegex=new RegExp("^("+a.join("|")+")","i")}function tt(){return this.hours()%12||12}function nt(e,t){q(e,0,0,function(){return this.localeData().meridiem(this.hours(),this.minutes(),t)})}function rt(e,t){return t._meridiemParse}q("H",["HH",2],0,"hour"),q("h",["hh",2],0,tt),q("k",["kk",2],0,function(){return this.hours()||24}),q("hmm",0,0,function(){return""+tt.apply(this)+N(this.minutes(),2)}),q("hmmss",0,0,function(){return""+tt.apply(this)+N(this.minutes(),2)+N(this.seconds(),2)}),q("Hmm",0,0,function(){return""+this.hours()+N(this.minutes(),2)}),q("Hmmss",0,0,function(){return""+this.hours()+N(this.minutes(),2)+N(this.seconds(),2)}),nt("a",!0),nt("A",!1),O("hour","h"),U("hour",13),de("a",rt),de("A",rt),de("H",Q),de("h",Q),de("k",Q),de("HH",Q,J),de("hh",Q,J),de("kk",Q,J),de("hmm",$),de("hmmss",ee),de("Hmm",$),de("Hmmss",ee),he(["H","HH"],be),he(["k","kk"],function(e,t,n){var r=k(e);t[be]=24===r?0:r}),he(["a","A"],function(e,t,n){n._isPm=n._locale.isPM(e),n._meridiem=e}),he(["h","hh"],function(e,t,n){t[be]=k(e),h(n).bigHour=!0}),he("hmm",function(e,t,n){var r=e.length-2;t[be]=k(e.substr(0,r)),t[we]=k(e.substr(r)),h(n).bigHour=!0}),he("hmmss",function(e,t,n){var r=e.length-4,i=e.length-2;t[be]=k(e.substr(0,r)),t[we]=k(e.substr(r,2)),t[Me]=k(e.substr(i)),h(n).bigHour=!0}),he("Hmm",function(e,t,n){var r=e.length-2;t[be]=k(e.substr(0,r)),t[we]=k(e.substr(r))}),he("Hmmss",function(e,t,n){var r=e.length-4,i=e.length-2;t[be]=k(e.substr(0,r)),t[we]=k(e.substr(r,2)),t[Me]=k(e.substr(i))});var it,ot=De("Hours",!0),at={calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},longDateFormat:{LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},invalidDate:"Invalid date",ordinal:"%d",dayOfMonthOrdinalParse:/\d{1,2}/,relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",ss:"%d seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},months:Re,monthsShort:Ce,week:{dow:0,doy:6},weekdays:Je,weekdaysMin:Ke,weekdaysShort:Ze,meridiemParse:/[ap]\.?m?\.?/i},st={},ut={};function ct(e){return e?e.toLowerCase().replace("_","-"):e}function dt(t){var r=null;if(!st[t]&&void 0!==e&&e&&e.exports)try{r=it._abbr,n(532)("./"+t),lt(r)}catch(e){}return st[t]}function lt(e,t){var n;return e&&((n=s(t)?pt(e):ft(e,t))?it=n:"undefined"!=typeof console&&console.warn&&console.warn("Locale "+e+" not found. Did you forget to load it?")),it._abbr}function ft(e,t){if(null!==t){var n,r=at;if(t.abbr=e,null!=st[e])T("defineLocaleOverride","use moment.updateLocale(localeName, config) to change an existing locale. moment.defineLocale(localeName, config) should only be used for creating a new locale See http://momentjs.com/guides/#/warnings/define-locale/ for more info."),r=st[e]._config;else if(null!=t.parentLocale)if(null!=st[t.parentLocale])r=st[t.parentLocale]._config;else{if(null==(n=dt(t.parentLocale)))return ut[t.parentLocale]||(ut[t.parentLocale]=[]),ut[t.parentLocale].push({name:e,config:t}),null;r=n._config}return st[e]=new I(j(r,t)),ut[e]&&ut[e].forEach(function(e){ft(e.name,e.config)}),lt(e),st[e]}return delete st[e],null}function pt(e){var t;if(e&&e._locale&&e._locale._abbr&&(e=e._locale._abbr),!e)return it;if(!o(e)){if(t=dt(e))return t;e=[e]}return function(e){for(var t,n,r,i,o=0;o<e.length;){for(i=ct(e[o]).split("-"),t=i.length,n=(n=ct(e[o+1]))?n.split("-"):null;t>0;){if(r=dt(i.slice(0,t).join("-")))return r;if(n&&n.length>=t&&x(i,n,!0)>=t-1)break;t--}o++}return it}(e)}function ht(e){var t,n=e._a;return n&&-2===h(e).overflow&&(t=n[ye]<0||n[ye]>11?ye:n[ge]<1||n[ge]>Ye(n[ve],n[ye])?ge:n[be]<0||n[be]>24||24===n[be]&&(0!==n[we]||0!==n[Me]||0!==n[ke])?be:n[we]<0||n[we]>59?we:n[Me]<0||n[Me]>59?Me:n[ke]<0||n[ke]>999?ke:-1,h(e)._overflowDayOfYear&&(t<ve||t>ge)&&(t=ge),h(e)._overflowWeeks&&-1===t&&(t=xe),h(e)._overflowWeekday&&-1===t&&(t=Se),h(e).overflow=t),e}function mt(e,t,n){return null!=e?e:null!=t?t:n}function _t(e){var t,n,r,o,a,s=[];if(!e._d){for(r=function(e){var t=new Date(i.now());return e._useUTC?[t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()]:[t.getFullYear(),t.getMonth(),t.getDate()]}(e),e._w&&null==e._a[ge]&&null==e._a[ye]&&function(e){var t,n,r,i,o,a,s,u;if(null!=(t=e._w).GG||null!=t.W||null!=t.E)o=1,a=4,n=mt(t.GG,e._a[ve],We(jt(),1,4).year),r=mt(t.W,1),((i=mt(t.E,1))<1||i>7)&&(u=!0);else{o=e._locale._week.dow,a=e._locale._week.doy;var c=We(jt(),o,a);n=mt(t.gg,e._a[ve],c.year),r=mt(t.w,c.week),null!=t.d?((i=t.d)<0||i>6)&&(u=!0):null!=t.e?(i=t.e+o,(t.e<0||t.e>6)&&(u=!0)):i=o}r<1||r>Ge(n,o,a)?h(e)._overflowWeeks=!0:null!=u?h(e)._overflowWeekday=!0:(s=qe(n,r,i,o,a),e._a[ve]=s.year,e._dayOfYear=s.dayOfYear)}(e),null!=e._dayOfYear&&(a=mt(e._a[ve],r[ve]),(e._dayOfYear>Le(a)||0===e._dayOfYear)&&(h(e)._overflowDayOfYear=!0),n=Be(a,0,e._dayOfYear),e._a[ye]=n.getUTCMonth(),e._a[ge]=n.getUTCDate()),t=0;t<3&&null==e._a[t];++t)e._a[t]=s[t]=r[t];for(;t<7;t++)e._a[t]=s[t]=null==e._a[t]?2===t?1:0:e._a[t];24===e._a[be]&&0===e._a[we]&&0===e._a[Me]&&0===e._a[ke]&&(e._nextDay=!0,e._a[be]=0),e._d=(e._useUTC?Be:function(e,t,n,r,i,o,a){var s;return e<100&&e>=0?(s=new Date(e+400,t,n,r,i,o,a),isFinite(s.getFullYear())&&s.setFullYear(e)):s=new Date(e,t,n,r,i,o,a),s}).apply(null,s),o=e._useUTC?e._d.getUTCDay():e._d.getDay(),null!=e._tzm&&e._d.setUTCMinutes(e._d.getUTCMinutes()-e._tzm),e._nextDay&&(e._a[be]=24),e._w&&void 0!==e._w.d&&e._w.d!==o&&(h(e).weekdayMismatch=!0)}}var vt=/^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,yt=/^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,gt=/Z|[+-]\d\d(?::?\d\d)?/,bt=[["YYYYYY-MM-DD",/[+-]\d{6}-\d\d-\d\d/],["YYYY-MM-DD",/\d{4}-\d\d-\d\d/],["GGGG-[W]WW-E",/\d{4}-W\d\d-\d/],["GGGG-[W]WW",/\d{4}-W\d\d/,!1],["YYYY-DDD",/\d{4}-\d{3}/],["YYYY-MM",/\d{4}-\d\d/,!1],["YYYYYYMMDD",/[+-]\d{10}/],["YYYYMMDD",/\d{8}/],["GGGG[W]WWE",/\d{4}W\d{3}/],["GGGG[W]WW",/\d{4}W\d{2}/,!1],["YYYYDDD",/\d{7}/]],wt=[["HH:mm:ss.SSSS",/\d\d:\d\d:\d\d\.\d+/],["HH:mm:ss,SSSS",/\d\d:\d\d:\d\d,\d+/],["HH:mm:ss",/\d\d:\d\d:\d\d/],["HH:mm",/\d\d:\d\d/],["HHmmss.SSSS",/\d\d\d\d\d\d\.\d+/],["HHmmss,SSSS",/\d\d\d\d\d\d,\d+/],["HHmmss",/\d\d\d\d\d\d/],["HHmm",/\d\d\d\d/],["HH",/\d\d/]],Mt=/^\/?Date\((\-?\d+)/i;function kt(e){var t,n,r,i,o,a,s=e._i,u=vt.exec(s)||yt.exec(s);if(u){for(h(e).iso=!0,t=0,n=bt.length;t<n;t++)if(bt[t][1].exec(u[1])){i=bt[t][0],r=!1!==bt[t][2];break}if(null==i)return void(e._isValid=!1);if(u[3]){for(t=0,n=wt.length;t<n;t++)if(wt[t][1].exec(u[3])){o=(u[2]||" ")+wt[t][0];break}if(null==o)return void(e._isValid=!1)}if(!r&&null!=o)return void(e._isValid=!1);if(u[4]){if(!gt.exec(u[4]))return void(e._isValid=!1);a="Z"}e._f=i+(o||"")+(a||""),Et(e)}else e._isValid=!1}var xt=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;function St(e){var t=parseInt(e,10);return t<=49?2e3+t:t<=999?1900+t:t}var Lt={UT:0,GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function At(e){var t,n,r,i,o,a,s,u=xt.exec(e._i.replace(/\([^)]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").replace(/^\s\s*/,"").replace(/\s\s*$/,""));if(u){var c=(t=u[4],n=u[3],r=u[2],i=u[5],o=u[6],a=u[7],s=[St(t),Ce.indexOf(n),parseInt(r,10),parseInt(i,10),parseInt(o,10)],a&&s.push(parseInt(a,10)),s);if(!function(e,t,n){if(e){var r=Ze.indexOf(e),i=new Date(t[0],t[1],t[2]).getDay();if(r!==i)return h(n).weekdayMismatch=!0,n._isValid=!1,!1}return!0}(u[1],c,e))return;e._a=c,e._tzm=function(e,t,n){if(e)return Lt[e];if(t)return 0;var r=parseInt(n,10),i=r%100,o=(r-i)/100;return 60*o+i}(u[8],u[9],u[10]),e._d=Be.apply(null,e._a),e._d.setUTCMinutes(e._d.getUTCMinutes()-e._tzm),h(e).rfc2822=!0}else e._isValid=!1}function Et(e){if(e._f!==i.ISO_8601)if(e._f!==i.RFC_2822){e._a=[],h(e).empty=!0;var t,n,r,o,a,s=""+e._i,u=s.length,c=0;for(r=G(e._f,e._locale).match(F)||[],t=0;t<r.length;t++)o=r[t],(n=(s.match(le(o,e))||[])[0])&&((a=s.substr(0,s.indexOf(n))).length>0&&h(e).unusedInput.push(a),s=s.slice(s.indexOf(n)+n.length),c+=n.length),z[o]?(n?h(e).empty=!1:h(e).unusedTokens.push(o),_e(o,n,e)):e._strict&&!n&&h(e).unusedTokens.push(o);h(e).charsLeftOver=u-c,s.length>0&&h(e).unusedInput.push(s),e._a[be]<=12&&!0===h(e).bigHour&&e._a[be]>0&&(h(e).bigHour=void 0),h(e).parsedDateParts=e._a.slice(0),h(e).meridiem=e._meridiem,e._a[be]=(d=e._locale,l=e._a[be],null==(f=e._meridiem)?l:null!=d.meridiemHour?d.meridiemHour(l,f):null!=d.isPM?((p=d.isPM(f))&&l<12&&(l+=12),p||12!==l||(l=0),l):l),_t(e),ht(e)}else At(e);else kt(e);var d,l,f,p}function Tt(e){var t=e._i,n=e._f;return e._locale=e._locale||pt(e._l),null===t||void 0===n&&""===t?_({nullInput:!0}):("string"==typeof t&&(e._i=t=e._locale.preparse(t)),w(t)?new b(ht(t)):(c(t)?e._d=t:o(n)?function(e){var t,n,r,i,o;if(0===e._f.length)return h(e).invalidFormat=!0,void(e._d=new Date(NaN));for(i=0;i<e._f.length;i++)o=0,t=y({},e),null!=e._useUTC&&(t._useUTC=e._useUTC),t._f=e._f[i],Et(t),m(t)&&(o+=h(t).charsLeftOver,o+=10*h(t).unusedTokens.length,h(t).score=o,(null==r||o<r)&&(r=o,n=t));f(e,n||t)}(e):n?Et(e):function(e){var t=e._i;s(t)?e._d=new Date(i.now()):c(t)?e._d=new Date(t.valueOf()):"string"==typeof t?function(e){var t=Mt.exec(e._i);null===t?(kt(e),!1===e._isValid&&(delete e._isValid,At(e),!1===e._isValid&&(delete e._isValid,i.createFromInputFallback(e)))):e._d=new Date(+t[1])}(e):o(t)?(e._a=d(t.slice(0),function(e){return parseInt(e,10)}),_t(e)):a(t)?function(e){if(!e._d){var t=C(e._i);e._a=d([t.year,t.month,t.day||t.date,t.hour,t.minute,t.second,t.millisecond],function(e){return e&&parseInt(e,10)}),_t(e)}}(e):u(t)?e._d=new Date(t):i.createFromInputFallback(e)}(e),m(e)||(e._d=null),e))}function Dt(e,t,n,r,i){var s,u={};return!0!==n&&!1!==n||(r=n,n=void 0),(a(e)&&function(e){if(Object.getOwnPropertyNames)return 0===Object.getOwnPropertyNames(e).length;var t;for(t in e)if(e.hasOwnProperty(t))return!1;return!0}(e)||o(e)&&0===e.length)&&(e=void 0),u._isAMomentObject=!0,u._useUTC=u._isUTC=i,u._l=n,u._i=e,u._f=t,u._strict=r,(s=new b(ht(Tt(u))))._nextDay&&(s.add(1,"d"),s._nextDay=void 0),s}function jt(e,t,n,r){return Dt(e,t,n,r,!1)}i.createFromInputFallback=L("value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged and will be removed in an upcoming major release. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.",function(e){e._d=new Date(e._i+(e._useUTC?" UTC":""))}),i.ISO_8601=function(){},i.RFC_2822=function(){};var It=L("moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/",function(){var e=jt.apply(null,arguments);return this.isValid()&&e.isValid()?e<this?this:e:_()}),Yt=L("moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/",function(){var e=jt.apply(null,arguments);return this.isValid()&&e.isValid()?e>this?this:e:_()});function Ot(e,t){var n,r;if(1===t.length&&o(t[0])&&(t=t[0]),!t.length)return jt();for(n=t[0],r=1;r<t.length;++r)t[r].isValid()&&!t[r][e](n)||(n=t[r]);return n}var Rt=["year","quarter","month","week","day","hour","minute","second","millisecond"];function Ct(e){var t=C(e),n=t.year||0,r=t.quarter||0,i=t.month||0,o=t.week||t.isoWeek||0,a=t.day||0,s=t.hour||0,u=t.minute||0,c=t.second||0,d=t.millisecond||0;this._isValid=function(e){for(var t in e)if(-1===Ee.call(Rt,t)||null!=e[t]&&isNaN(e[t]))return!1;for(var n=!1,r=0;r<Rt.length;++r)if(e[Rt[r]]){if(n)return!1;parseFloat(e[Rt[r]])!==k(e[Rt[r]])&&(n=!0)}return!0}(t),this._milliseconds=+d+1e3*c+6e4*u+1e3*s*60*60,this._days=+a+7*o,this._months=+i+3*r+12*n,this._data={},this._locale=pt(),this._bubble()}function Pt(e){return e instanceof Ct}function Ut(e){return e<0?-1*Math.round(-1*e):Math.round(e)}function Nt(e,t){q(e,0,0,function(){var e=this.utcOffset(),n="+";return e<0&&(e=-e,n="-"),n+N(~~(e/60),2)+t+N(~~e%60,2)})}Nt("Z",":"),Nt("ZZ",""),de("Z",se),de("ZZ",se),he(["Z","ZZ"],function(e,t,n){n._useUTC=!0,n._tzm=Ht(se,e)});var Ft=/([\+\-]|\d\d)/gi;function Ht(e,t){var n=(t||"").match(e);if(null===n)return null;var r=n[n.length-1]||[],i=(r+"").match(Ft)||["-",0,0],o=60*i[1]+k(i[2]);return 0===o?0:"+"===i[0]?o:-o}function Bt(e,t){var n,r;return t._isUTC?(n=t.clone(),r=(w(e)||c(e)?e.valueOf():jt(e).valueOf())-n.valueOf(),n._d.setTime(n._d.valueOf()+r),i.updateOffset(n,!1),n):jt(e).local()}function zt(e){return 15*-Math.round(e._d.getTimezoneOffset()/15)}function qt(){return!!this.isValid()&&this._isUTC&&0===this._offset}i.updateOffset=function(){};var Wt=/^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/,Gt=/^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;function Vt(e,t){var n,r,i,o,a,s,c=e,d=null;return Pt(e)?c={ms:e._milliseconds,d:e._days,M:e._months}:u(e)?(c={},t?c[t]=e:c.milliseconds=e):(d=Wt.exec(e))?(n="-"===d[1]?-1:1,c={y:0,d:k(d[ge])*n,h:k(d[be])*n,m:k(d[we])*n,s:k(d[Me])*n,ms:k(Ut(1e3*d[ke]))*n}):(d=Gt.exec(e))?(n="-"===d[1]?-1:1,c={y:Jt(d[2],n),M:Jt(d[3],n),w:Jt(d[4],n),d:Jt(d[5],n),h:Jt(d[6],n),m:Jt(d[7],n),s:Jt(d[8],n)}):null==c?c={}:"object"==typeof c&&("from"in c||"to"in c)&&(o=jt(c.from),a=jt(c.to),i=o.isValid()&&a.isValid()?(a=Bt(a,o),o.isBefore(a)?s=Zt(o,a):((s=Zt(a,o)).milliseconds=-s.milliseconds,s.months=-s.months),s):{milliseconds:0,months:0},(c={}).ms=i.milliseconds,c.M=i.months),r=new Ct(c),Pt(e)&&l(e,"_locale")&&(r._locale=e._locale),r}function Jt(e,t){var n=e&&parseFloat(e.replace(",","."));return(isNaN(n)?0:n)*t}function Zt(e,t){var n={};return n.months=t.month()-e.month()+12*(t.year()-e.year()),e.clone().add(n.months,"M").isAfter(t)&&--n.months,n.milliseconds=+t-+e.clone().add(n.months,"M"),n}function Kt(e,t){return function(n,r){var i;return null===r||isNaN(+r)||(T(t,"moment()."+t+"(period, number) is deprecated. Please use moment()."+t+"(number, period). See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info."),i=n,n=r,r=i),Xt(this,Vt(n="string"==typeof n?+n:n,r),e),this}}function Xt(e,t,n,r){var o=t._milliseconds,a=Ut(t._days),s=Ut(t._months);e.isValid()&&(r=null==r||r,s&&Pe(e,je(e,"Month")+s*n),a&&Ie(e,"Date",je(e,"Date")+a*n),o&&e._d.setTime(e._d.valueOf()+o*n),r&&i.updateOffset(e,a||s))}Vt.fn=Ct.prototype,Vt.invalid=function(){return Vt(NaN)};var Qt=Kt(1,"add"),$t=Kt(-1,"subtract");function en(e,t){var n,r,i=12*(t.year()-e.year())+(t.month()-e.month()),o=e.clone().add(i,"months");return t-o<0?(n=e.clone().add(i-1,"months"),r=(t-o)/(o-n)):(n=e.clone().add(i+1,"months"),r=(t-o)/(n-o)),-(i+r)||0}function tn(e){var t;return void 0===e?this._locale._abbr:(null!=(t=pt(e))&&(this._locale=t),this)}i.defaultFormat="YYYY-MM-DDTHH:mm:ssZ",i.defaultFormatUtc="YYYY-MM-DDTHH:mm:ss[Z]";var nn=L("moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.",function(e){return void 0===e?this.localeData():this.locale(e)});function rn(){return this._locale}var on=1e3,an=60*on,sn=60*an,un=3506328*sn;function cn(e,t){return(e%t+t)%t}function dn(e,t,n){return e<100&&e>=0?new Date(e+400,t,n)-un:new Date(e,t,n).valueOf()}function ln(e,t,n){return e<100&&e>=0?Date.UTC(e+400,t,n)-un:Date.UTC(e,t,n)}function fn(e,t){q(0,[e,e.length],0,t)}function pn(e,t,n,r,i){var o;return null==e?We(this,r,i).year:(o=Ge(e,r,i),t>o&&(t=o),function(e,t,n,r,i){var o=qe(e,t,n,r,i),a=Be(o.year,0,o.dayOfYear);return this.year(a.getUTCFullYear()),this.month(a.getUTCMonth()),this.date(a.getUTCDate()),this}.call(this,e,t,n,r,i))}q(0,["gg",2],0,function(){return this.weekYear()%100}),q(0,["GG",2],0,function(){return this.isoWeekYear()%100}),fn("gggg","weekYear"),fn("ggggg","weekYear"),fn("GGGG","isoWeekYear"),fn("GGGGG","isoWeekYear"),O("weekYear","gg"),O("isoWeekYear","GG"),U("weekYear",1),U("isoWeekYear",1),de("G",oe),de("g",oe),de("GG",Q,J),de("gg",Q,J),de("GGGG",ne,K),de("gggg",ne,K),de("GGGGG",re,X),de("ggggg",re,X),me(["gggg","ggggg","GGGG","GGGGG"],function(e,t,n,r){t[r.substr(0,2)]=k(e)}),me(["gg","GG"],function(e,t,n,r){t[r]=i.parseTwoDigitYear(e)}),q("Q",0,"Qo","quarter"),O("quarter","Q"),U("quarter",7),de("Q",V),he("Q",function(e,t){t[ye]=3*(k(e)-1)}),q("D",["DD",2],"Do","date"),O("date","D"),U("date",9),de("D",Q),de("DD",Q,J),de("Do",function(e,t){return e?t._dayOfMonthOrdinalParse||t._ordinalParse:t._dayOfMonthOrdinalParseLenient}),he(["D","DD"],ge),he("Do",function(e,t){t[ge]=k(e.match(Q)[0])});var hn=De("Date",!0);q("DDD",["DDDD",3],"DDDo","dayOfYear"),O("dayOfYear","DDD"),U("dayOfYear",4),de("DDD",te),de("DDDD",Z),he(["DDD","DDDD"],function(e,t,n){n._dayOfYear=k(e)}),q("m",["mm",2],0,"minute"),O("minute","m"),U("minute",14),de("m",Q),de("mm",Q,J),he(["m","mm"],we);var mn=De("Minutes",!1);q("s",["ss",2],0,"second"),O("second","s"),U("second",15),de("s",Q),de("ss",Q,J),he(["s","ss"],Me);var _n,vn=De("Seconds",!1);for(q("S",0,0,function(){return~~(this.millisecond()/100)}),q(0,["SS",2],0,function(){return~~(this.millisecond()/10)}),q(0,["SSS",3],0,"millisecond"),q(0,["SSSS",4],0,function(){return 10*this.millisecond()}),q(0,["SSSSS",5],0,function(){return 100*this.millisecond()}),q(0,["SSSSSS",6],0,function(){return 1e3*this.millisecond()}),q(0,["SSSSSSS",7],0,function(){return 1e4*this.millisecond()}),q(0,["SSSSSSSS",8],0,function(){return 1e5*this.millisecond()}),q(0,["SSSSSSSSS",9],0,function(){return 1e6*this.millisecond()}),O("millisecond","ms"),U("millisecond",16),de("S",te,V),de("SS",te,J),de("SSS",te,Z),_n="SSSS";_n.length<=9;_n+="S")de(_n,ie);function yn(e,t){t[ke]=k(1e3*("0."+e))}for(_n="S";_n.length<=9;_n+="S")he(_n,yn);var gn=De("Milliseconds",!1);q("z",0,0,"zoneAbbr"),q("zz",0,0,"zoneName");var bn=b.prototype;function wn(e){return e}bn.add=Qt,bn.calendar=function(e,t){var n=e||jt(),r=Bt(n,this).startOf("day"),o=i.calendarFormat(this,r)||"sameElse",a=t&&(D(t[o])?t[o].call(this,n):t[o]);return this.format(a||this.localeData().calendar(o,this,jt(n)))},bn.clone=function(){return new b(this)},bn.diff=function(e,t,n){var r,i,o;if(!this.isValid())return NaN;if(!(r=Bt(e,this)).isValid())return NaN;switch(i=6e4*(r.utcOffset()-this.utcOffset()),t=R(t)){case"year":o=en(this,r)/12;break;case"month":o=en(this,r);break;case"quarter":o=en(this,r)/3;break;case"second":o=(this-r)/1e3;break;case"minute":o=(this-r)/6e4;break;case"hour":o=(this-r)/36e5;break;case"day":o=(this-r-i)/864e5;break;case"week":o=(this-r-i)/6048e5;break;default:o=this-r}return n?o:M(o)},bn.endOf=function(e){var t;if(void 0===(e=R(e))||"millisecond"===e||!this.isValid())return this;var n=this._isUTC?ln:dn;switch(e){case"year":t=n(this.year()+1,0,1)-1;break;case"quarter":t=n(this.year(),this.month()-this.month()%3+3,1)-1;break;case"month":t=n(this.year(),this.month()+1,1)-1;break;case"week":t=n(this.year(),this.month(),this.date()-this.weekday()+7)-1;break;case"isoWeek":t=n(this.year(),this.month(),this.date()-(this.isoWeekday()-1)+7)-1;break;case"day":case"date":t=n(this.year(),this.month(),this.date()+1)-1;break;case"hour":t=this._d.valueOf(),t+=sn-cn(t+(this._isUTC?0:this.utcOffset()*an),sn)-1;break;case"minute":t=this._d.valueOf(),t+=an-cn(t,an)-1;break;case"second":t=this._d.valueOf(),t+=on-cn(t,on)-1}return this._d.setTime(t),i.updateOffset(this,!0),this},bn.format=function(e){e||(e=this.isUtc()?i.defaultFormatUtc:i.defaultFormat);var t=W(this,e);return this.localeData().postformat(t)},bn.from=function(e,t){return this.isValid()&&(w(e)&&e.isValid()||jt(e).isValid())?Vt({to:this,from:e}).locale(this.locale()).humanize(!t):this.localeData().invalidDate()},bn.fromNow=function(e){return this.from(jt(),e)},bn.to=function(e,t){return this.isValid()&&(w(e)&&e.isValid()||jt(e).isValid())?Vt({from:this,to:e}).locale(this.locale()).humanize(!t):this.localeData().invalidDate()},bn.toNow=function(e){return this.to(jt(),e)},bn.get=function(e){return D(this[e=R(e)])?this[e]():this},bn.invalidAt=function(){return h(this).overflow},bn.isAfter=function(e,t){var n=w(e)?e:jt(e);return!(!this.isValid()||!n.isValid())&&("millisecond"===(t=R(t)||"millisecond")?this.valueOf()>n.valueOf():n.valueOf()<this.clone().startOf(t).valueOf())},bn.isBefore=function(e,t){var n=w(e)?e:jt(e);return!(!this.isValid()||!n.isValid())&&("millisecond"===(t=R(t)||"millisecond")?this.valueOf()<n.valueOf():this.clone().endOf(t).valueOf()<n.valueOf())},bn.isBetween=function(e,t,n,r){var i=w(e)?e:jt(e),o=w(t)?t:jt(t);return!!(this.isValid()&&i.isValid()&&o.isValid())&&(("("===(r=r||"()")[0]?this.isAfter(i,n):!this.isBefore(i,n))&&(")"===r[1]?this.isBefore(o,n):!this.isAfter(o,n)))},bn.isSame=function(e,t){var n,r=w(e)?e:jt(e);return!(!this.isValid()||!r.isValid())&&("millisecond"===(t=R(t)||"millisecond")?this.valueOf()===r.valueOf():(n=r.valueOf(),this.clone().startOf(t).valueOf()<=n&&n<=this.clone().endOf(t).valueOf()))},bn.isSameOrAfter=function(e,t){return this.isSame(e,t)||this.isAfter(e,t)},bn.isSameOrBefore=function(e,t){return this.isSame(e,t)||this.isBefore(e,t)},bn.isValid=function(){return m(this)},bn.lang=nn,bn.locale=tn,bn.localeData=rn,bn.max=Yt,bn.min=It,bn.parsingFlags=function(){return f({},h(this))},bn.set=function(e,t){if("object"==typeof e)for(var n=function(e){var t=[];for(var n in e)t.push({unit:n,priority:P[n]});return t.sort(function(e,t){return e.priority-t.priority}),t}(e=C(e)),r=0;r<n.length;r++)this[n[r].unit](e[n[r].unit]);else if(D(this[e=R(e)]))return this[e](t);return this},bn.startOf=function(e){var t;if(void 0===(e=R(e))||"millisecond"===e||!this.isValid())return this;var n=this._isUTC?ln:dn;switch(e){case"year":t=n(this.year(),0,1);break;case"quarter":t=n(this.year(),this.month()-this.month()%3,1);break;case"month":t=n(this.year(),this.month(),1);break;case"week":t=n(this.year(),this.month(),this.date()-this.weekday());break;case"isoWeek":t=n(this.year(),this.month(),this.date()-(this.isoWeekday()-1));break;case"day":case"date":t=n(this.year(),this.month(),this.date());break;case"hour":t=this._d.valueOf(),t-=cn(t+(this._isUTC?0:this.utcOffset()*an),sn);break;case"minute":t=this._d.valueOf(),t-=cn(t,an);break;case"second":t=this._d.valueOf(),t-=cn(t,on)}return this._d.setTime(t),i.updateOffset(this,!0),this},bn.subtract=$t,bn.toArray=function(){var e=this;return[e.year(),e.month(),e.date(),e.hour(),e.minute(),e.second(),e.millisecond()]},bn.toObject=function(){var e=this;return{years:e.year(),months:e.month(),date:e.date(),hours:e.hours(),minutes:e.minutes(),seconds:e.seconds(),milliseconds:e.milliseconds()}},bn.toDate=function(){return new Date(this.valueOf())},bn.toISOString=function(e){if(!this.isValid())return null;var t=!0!==e,n=t?this.clone().utc():this;return n.year()<0||n.year()>9999?W(n,t?"YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]":"YYYYYY-MM-DD[T]HH:mm:ss.SSSZ"):D(Date.prototype.toISOString)?t?this.toDate().toISOString():new Date(this.valueOf()+60*this.utcOffset()*1e3).toISOString().replace("Z",W(n,"Z")):W(n,t?"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]":"YYYY-MM-DD[T]HH:mm:ss.SSSZ")},bn.inspect=function(){if(!this.isValid())return"moment.invalid(/* "+this._i+" */)";var e="moment",t="";this.isLocal()||(e=0===this.utcOffset()?"moment.utc":"moment.parseZone",t="Z");var n="["+e+'("]',r=0<=this.year()&&this.year()<=9999?"YYYY":"YYYYYY",i=t+'[")]';return this.format(n+r+"-MM-DD[T]HH:mm:ss.SSS"+i)},bn.toJSON=function(){return this.isValid()?this.toISOString():null},bn.toString=function(){return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")},bn.unix=function(){return Math.floor(this.valueOf()/1e3)},bn.valueOf=function(){return this._d.valueOf()-6e4*(this._offset||0)},bn.creationData=function(){return{input:this._i,format:this._f,locale:this._locale,isUTC:this._isUTC,strict:this._strict}},bn.year=Te,bn.isLeapYear=function(){return Ae(this.year())},bn.weekYear=function(e){return pn.call(this,e,this.week(),this.weekday(),this.localeData()._week.dow,this.localeData()._week.doy)},bn.isoWeekYear=function(e){return pn.call(this,e,this.isoWeek(),this.isoWeekday(),1,4)},bn.quarter=bn.quarters=function(e){return null==e?Math.ceil((this.month()+1)/3):this.month(3*(e-1)+this.month()%3)},bn.month=Ue,bn.daysInMonth=function(){return Ye(this.year(),this.month())},bn.week=bn.weeks=function(e){var t=this.localeData().week(this);return null==e?t:this.add(7*(e-t),"d")},bn.isoWeek=bn.isoWeeks=function(e){var t=We(this,1,4).week;return null==e?t:this.add(7*(e-t),"d")},bn.weeksInYear=function(){var e=this.localeData()._week;return Ge(this.year(),e.dow,e.doy)},bn.isoWeeksInYear=function(){return Ge(this.year(),1,4)},bn.date=hn,bn.day=bn.days=function(e){if(!this.isValid())return null!=e?this:NaN;var t=this._isUTC?this._d.getUTCDay():this._d.getDay();return null!=e?(e=function(e,t){return"string"!=typeof e?e:isNaN(e)?"number"==typeof(e=t.weekdaysParse(e))?e:null:parseInt(e,10)}(e,this.localeData()),this.add(e-t,"d")):t},bn.weekday=function(e){if(!this.isValid())return null!=e?this:NaN;var t=(this.day()+7-this.localeData()._week.dow)%7;return null==e?t:this.add(e-t,"d")},bn.isoWeekday=function(e){if(!this.isValid())return null!=e?this:NaN;if(null!=e){var t=function(e,t){return"string"==typeof e?t.weekdaysParse(e)%7||7:isNaN(e)?null:e}(e,this.localeData());return this.day(this.day()%7?t:t-7)}return this.day()||7},bn.dayOfYear=function(e){var t=Math.round((this.clone().startOf("day")-this.clone().startOf("year"))/864e5)+1;return null==e?t:this.add(e-t,"d")},bn.hour=bn.hours=ot,bn.minute=bn.minutes=mn,bn.second=bn.seconds=vn,bn.millisecond=bn.milliseconds=gn,bn.utcOffset=function(e,t,n){var r,o=this._offset||0;if(!this.isValid())return null!=e?this:NaN;if(null!=e){if("string"==typeof e){if(null===(e=Ht(se,e)))return this}else Math.abs(e)<16&&!n&&(e*=60);return!this._isUTC&&t&&(r=zt(this)),this._offset=e,this._isUTC=!0,null!=r&&this.add(r,"m"),o!==e&&(!t||this._changeInProgress?Xt(this,Vt(e-o,"m"),1,!1):this._changeInProgress||(this._changeInProgress=!0,i.updateOffset(this,!0),this._changeInProgress=null)),this}return this._isUTC?o:zt(this)},bn.utc=function(e){return this.utcOffset(0,e)},bn.local=function(e){return this._isUTC&&(this.utcOffset(0,e),this._isUTC=!1,e&&this.subtract(zt(this),"m")),this},bn.parseZone=function(){if(null!=this._tzm)this.utcOffset(this._tzm,!1,!0);else if("string"==typeof this._i){var e=Ht(ae,this._i);null!=e?this.utcOffset(e):this.utcOffset(0,!0)}return this},bn.hasAlignedHourOffset=function(e){return!!this.isValid()&&(e=e?jt(e).utcOffset():0,(this.utcOffset()-e)%60==0)},bn.isDST=function(){return this.utcOffset()>this.clone().month(0).utcOffset()||this.utcOffset()>this.clone().month(5).utcOffset()},bn.isLocal=function(){return!!this.isValid()&&!this._isUTC},bn.isUtcOffset=function(){return!!this.isValid()&&this._isUTC},bn.isUtc=qt,bn.isUTC=qt,bn.zoneAbbr=function(){return this._isUTC?"UTC":""},bn.zoneName=function(){return this._isUTC?"Coordinated Universal Time":""},bn.dates=L("dates accessor is deprecated. Use date instead.",hn),bn.months=L("months accessor is deprecated. Use month instead",Ue),bn.years=L("years accessor is deprecated. Use year instead",Te),bn.zone=L("moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/",function(e,t){return null!=e?("string"!=typeof e&&(e=-e),this.utcOffset(e,t),this):-this.utcOffset()}),bn.isDSTShifted=L("isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information",function(){if(!s(this._isDSTShifted))return this._isDSTShifted;var e={};if(y(e,this),(e=Tt(e))._a){var t=e._isUTC?p(e._a):jt(e._a);this._isDSTShifted=this.isValid()&&x(e._a,t.toArray())>0}else this._isDSTShifted=!1;return this._isDSTShifted});var Mn=I.prototype;function kn(e,t,n,r){var i=pt(),o=p().set(r,t);return i[n](o,e)}function xn(e,t,n){if(u(e)&&(t=e,e=void 0),e=e||"",null!=t)return kn(e,t,n,"month");var r,i=[];for(r=0;r<12;r++)i[r]=kn(e,r,n,"month");return i}function Sn(e,t,n,r){"boolean"==typeof e?(u(t)&&(n=t,t=void 0),t=t||""):(n=t=e,e=!1,u(t)&&(n=t,t=void 0),t=t||"");var i,o=pt(),a=e?o._week.dow:0;if(null!=n)return kn(t,(n+a)%7,r,"day");var s=[];for(i=0;i<7;i++)s[i]=kn(t,(i+a)%7,r,"day");return s}Mn.calendar=function(e,t,n){var r=this._calendar[e]||this._calendar.sameElse;return D(r)?r.call(t,n):r},Mn.longDateFormat=function(e){var t=this._longDateFormat[e],n=this._longDateFormat[e.toUpperCase()];return t||!n?t:(this._longDateFormat[e]=n.replace(/MMMM|MM|DD|dddd/g,function(e){return e.slice(1)}),this._longDateFormat[e])},Mn.invalidDate=function(){return this._invalidDate},Mn.ordinal=function(e){return this._ordinal.replace("%d",e)},Mn.preparse=wn,Mn.postformat=wn,Mn.relativeTime=function(e,t,n,r){var i=this._relativeTime[n];return D(i)?i(e,t,n,r):i.replace(/%d/i,e)},Mn.pastFuture=function(e,t){var n=this._relativeTime[e>0?"future":"past"];return D(n)?n(t):n.replace(/%s/i,t)},Mn.set=function(e){var t,n;for(n in e)D(t=e[n])?this[n]=t:this["_"+n]=t;this._config=e,this._dayOfMonthOrdinalParseLenient=new RegExp((this._dayOfMonthOrdinalParse.source||this._ordinalParse.source)+"|"+/\d{1,2}/.source)},Mn.months=function(e,t){return e?o(this._months)?this._months[e.month()]:this._months[(this._months.isFormat||Oe).test(t)?"format":"standalone"][e.month()]:o(this._months)?this._months:this._months.standalone},Mn.monthsShort=function(e,t){return e?o(this._monthsShort)?this._monthsShort[e.month()]:this._monthsShort[Oe.test(t)?"format":"standalone"][e.month()]:o(this._monthsShort)?this._monthsShort:this._monthsShort.standalone},Mn.monthsParse=function(e,t,n){var r,i,o;if(this._monthsParseExact)return function(e,t,n){var r,i,o,a=e.toLocaleLowerCase();if(!this._monthsParse)for(this._monthsParse=[],this._longMonthsParse=[],this._shortMonthsParse=[],r=0;r<12;++r)o=p([2e3,r]),this._shortMonthsParse[r]=this.monthsShort(o,"").toLocaleLowerCase(),this._longMonthsParse[r]=this.months(o,"").toLocaleLowerCase();return n?"MMM"===t?-1!==(i=Ee.call(this._shortMonthsParse,a))?i:null:-1!==(i=Ee.call(this._longMonthsParse,a))?i:null:"MMM"===t?-1!==(i=Ee.call(this._shortMonthsParse,a))?i:-1!==(i=Ee.call(this._longMonthsParse,a))?i:null:-1!==(i=Ee.call(this._longMonthsParse,a))?i:-1!==(i=Ee.call(this._shortMonthsParse,a))?i:null}.call(this,e,t,n);for(this._monthsParse||(this._monthsParse=[],this._longMonthsParse=[],this._shortMonthsParse=[]),r=0;r<12;r++){if(i=p([2e3,r]),n&&!this._longMonthsParse[r]&&(this._longMonthsParse[r]=new RegExp("^"+this.months(i,"").replace(".","")+"$","i"),this._shortMonthsParse[r]=new RegExp("^"+this.monthsShort(i,"").replace(".","")+"$","i")),n||this._monthsParse[r]||(o="^"+this.months(i,"")+"|^"+this.monthsShort(i,""),this._monthsParse[r]=new RegExp(o.replace(".",""),"i")),n&&"MMMM"===t&&this._longMonthsParse[r].test(e))return r;if(n&&"MMM"===t&&this._shortMonthsParse[r].test(e))return r;if(!n&&this._monthsParse[r].test(e))return r}},Mn.monthsRegex=function(e){return this._monthsParseExact?(l(this,"_monthsRegex")||He.call(this),e?this._monthsStrictRegex:this._monthsRegex):(l(this,"_monthsRegex")||(this._monthsRegex=Fe),this._monthsStrictRegex&&e?this._monthsStrictRegex:this._monthsRegex)},Mn.monthsShortRegex=function(e){return this._monthsParseExact?(l(this,"_monthsRegex")||He.call(this),e?this._monthsShortStrictRegex:this._monthsShortRegex):(l(this,"_monthsShortRegex")||(this._monthsShortRegex=Ne),this._monthsShortStrictRegex&&e?this._monthsShortStrictRegex:this._monthsShortRegex)},Mn.week=function(e){return We(e,this._week.dow,this._week.doy).week},Mn.firstDayOfYear=function(){return this._week.doy},Mn.firstDayOfWeek=function(){return this._week.dow},Mn.weekdays=function(e,t){var n=o(this._weekdays)?this._weekdays:this._weekdays[e&&!0!==e&&this._weekdays.isFormat.test(t)?"format":"standalone"];return!0===e?Ve(n,this._week.dow):e?n[e.day()]:n},Mn.weekdaysMin=function(e){return!0===e?Ve(this._weekdaysMin,this._week.dow):e?this._weekdaysMin[e.day()]:this._weekdaysMin},Mn.weekdaysShort=function(e){return!0===e?Ve(this._weekdaysShort,this._week.dow):e?this._weekdaysShort[e.day()]:this._weekdaysShort},Mn.weekdaysParse=function(e,t,n){var r,i,o;if(this._weekdaysParseExact)return function(e,t,n){var r,i,o,a=e.toLocaleLowerCase();if(!this._weekdaysParse)for(this._weekdaysParse=[],this._shortWeekdaysParse=[],this._minWeekdaysParse=[],r=0;r<7;++r)o=p([2e3,1]).day(r),this._minWeekdaysParse[r]=this.weekdaysMin(o,"").toLocaleLowerCase(),this._shortWeekdaysParse[r]=this.weekdaysShort(o,"").toLocaleLowerCase(),this._weekdaysParse[r]=this.weekdays(o,"").toLocaleLowerCase();return n?"dddd"===t?-1!==(i=Ee.call(this._weekdaysParse,a))?i:null:"ddd"===t?-1!==(i=Ee.call(this._shortWeekdaysParse,a))?i:null:-1!==(i=Ee.call(this._minWeekdaysParse,a))?i:null:"dddd"===t?-1!==(i=Ee.call(this._weekdaysParse,a))?i:-1!==(i=Ee.call(this._shortWeekdaysParse,a))?i:-1!==(i=Ee.call(this._minWeekdaysParse,a))?i:null:"ddd"===t?-1!==(i=Ee.call(this._shortWeekdaysParse,a))?i:-1!==(i=Ee.call(this._weekdaysParse,a))?i:-1!==(i=Ee.call(this._minWeekdaysParse,a))?i:null:-1!==(i=Ee.call(this._minWeekdaysParse,a))?i:-1!==(i=Ee.call(this._weekdaysParse,a))?i:-1!==(i=Ee.call(this._shortWeekdaysParse,a))?i:null}.call(this,e,t,n);for(this._weekdaysParse||(this._weekdaysParse=[],this._minWeekdaysParse=[],this._shortWeekdaysParse=[],this._fullWeekdaysParse=[]),r=0;r<7;r++){if(i=p([2e3,1]).day(r),n&&!this._fullWeekdaysParse[r]&&(this._fullWeekdaysParse[r]=new RegExp("^"+this.weekdays(i,"").replace(".","\\.?")+"$","i"),this._shortWeekdaysParse[r]=new RegExp("^"+this.weekdaysShort(i,"").replace(".","\\.?")+"$","i"),this._minWeekdaysParse[r]=new RegExp("^"+this.weekdaysMin(i,"").replace(".","\\.?")+"$","i")),this._weekdaysParse[r]||(o="^"+this.weekdays(i,"")+"|^"+this.weekdaysShort(i,"")+"|^"+this.weekdaysMin(i,""),this._weekdaysParse[r]=new RegExp(o.replace(".",""),"i")),n&&"dddd"===t&&this._fullWeekdaysParse[r].test(e))return r;if(n&&"ddd"===t&&this._shortWeekdaysParse[r].test(e))return r;if(n&&"dd"===t&&this._minWeekdaysParse[r].test(e))return r;if(!n&&this._weekdaysParse[r].test(e))return r}},Mn.weekdaysRegex=function(e){return this._weekdaysParseExact?(l(this,"_weekdaysRegex")||et.call(this),e?this._weekdaysStrictRegex:this._weekdaysRegex):(l(this,"_weekdaysRegex")||(this._weekdaysRegex=Xe),this._weekdaysStrictRegex&&e?this._weekdaysStrictRegex:this._weekdaysRegex)},Mn.weekdaysShortRegex=function(e){return this._weekdaysParseExact?(l(this,"_weekdaysRegex")||et.call(this),e?this._weekdaysShortStrictRegex:this._weekdaysShortRegex):(l(this,"_weekdaysShortRegex")||(this._weekdaysShortRegex=Qe),this._weekdaysShortStrictRegex&&e?this._weekdaysShortStrictRegex:this._weekdaysShortRegex)},Mn.weekdaysMinRegex=function(e){return this._weekdaysParseExact?(l(this,"_weekdaysRegex")||et.call(this),e?this._weekdaysMinStrictRegex:this._weekdaysMinRegex):(l(this,"_weekdaysMinRegex")||(this._weekdaysMinRegex=$e),this._weekdaysMinStrictRegex&&e?this._weekdaysMinStrictRegex:this._weekdaysMinRegex)},Mn.isPM=function(e){return"p"===(e+"").toLowerCase().charAt(0)},Mn.meridiem=function(e,t,n){return e>11?n?"pm":"PM":n?"am":"AM"},lt("en",{dayOfMonthOrdinalParse:/\d{1,2}(th|st|nd|rd)/,ordinal:function(e){var t=e%10,n=1===k(e%100/10)?"th":1===t?"st":2===t?"nd":3===t?"rd":"th";return e+n}}),i.lang=L("moment.lang is deprecated. Use moment.locale instead.",lt),i.langData=L("moment.langData is deprecated. Use moment.localeData instead.",pt);var Ln=Math.abs;function An(e,t,n,r){var i=Vt(t,n);return e._milliseconds+=r*i._milliseconds,e._days+=r*i._days,e._months+=r*i._months,e._bubble()}function En(e){return e<0?Math.floor(e):Math.ceil(e)}function Tn(e){return 4800*e/146097}function Dn(e){return 146097*e/4800}function jn(e){return function(){return this.as(e)}}var In=jn("ms"),Yn=jn("s"),On=jn("m"),Rn=jn("h"),Cn=jn("d"),Pn=jn("w"),Un=jn("M"),Nn=jn("Q"),Fn=jn("y");function Hn(e){return function(){return this.isValid()?this._data[e]:NaN}}var Bn=Hn("milliseconds"),zn=Hn("seconds"),qn=Hn("minutes"),Wn=Hn("hours"),Gn=Hn("days"),Vn=Hn("months"),Jn=Hn("years"),Zn=Math.round,Kn={ss:44,s:45,m:45,h:22,d:26,M:11},Xn=Math.abs;function Qn(e){return(e>0)-(e<0)||+e}function $n(){if(!this.isValid())return this.localeData().invalidDate();var e,t,n=Xn(this._milliseconds)/1e3,r=Xn(this._days),i=Xn(this._months);e=M(n/60),t=M(e/60),n%=60,e%=60;var o=M(i/12),a=i%=12,s=r,u=t,c=e,d=n?n.toFixed(3).replace(/\.?0+$/,""):"",l=this.asSeconds();if(!l)return"P0D";var f=l<0?"-":"",p=Qn(this._months)!==Qn(l)?"-":"",h=Qn(this._days)!==Qn(l)?"-":"",m=Qn(this._milliseconds)!==Qn(l)?"-":"";return f+"P"+(o?p+o+"Y":"")+(a?p+a+"M":"")+(s?h+s+"D":"")+(u||c||d?"T":"")+(u?m+u+"H":"")+(c?m+c+"M":"")+(d?m+d+"S":"")}var er=Ct.prototype;return er.isValid=function(){return this._isValid},er.abs=function(){var e=this._data;return this._milliseconds=Ln(this._milliseconds),this._days=Ln(this._days),this._months=Ln(this._months),e.milliseconds=Ln(e.milliseconds),e.seconds=Ln(e.seconds),e.minutes=Ln(e.minutes),e.hours=Ln(e.hours),e.months=Ln(e.months),e.years=Ln(e.years),this},er.add=function(e,t){return An(this,e,t,1)},er.subtract=function(e,t){return An(this,e,t,-1)},er.as=function(e){if(!this.isValid())return NaN;var t,n,r=this._milliseconds;if("month"===(e=R(e))||"quarter"===e||"year"===e)switch(t=this._days+r/864e5,n=this._months+Tn(t),e){case"month":return n;case"quarter":return n/3;case"year":return n/12}else switch(t=this._days+Math.round(Dn(this._months)),e){case"week":return t/7+r/6048e5;case"day":return t+r/864e5;case"hour":return 24*t+r/36e5;case"minute":return 1440*t+r/6e4;case"second":return 86400*t+r/1e3;case"millisecond":return Math.floor(864e5*t)+r;default:throw new Error("Unknown unit "+e)}},er.asMilliseconds=In,er.asSeconds=Yn,er.asMinutes=On,er.asHours=Rn,er.asDays=Cn,er.asWeeks=Pn,er.asMonths=Un,er.asQuarters=Nn,er.asYears=Fn,er.valueOf=function(){return this.isValid()?this._milliseconds+864e5*this._days+this._months%12*2592e6+31536e6*k(this._months/12):NaN},er._bubble=function(){var e,t,n,r,i,o=this._milliseconds,a=this._days,s=this._months,u=this._data;return o>=0&&a>=0&&s>=0||o<=0&&a<=0&&s<=0||(o+=864e5*En(Dn(s)+a),a=0,s=0),u.milliseconds=o%1e3,e=M(o/1e3),u.seconds=e%60,t=M(e/60),u.minutes=t%60,n=M(t/60),u.hours=n%24,a+=M(n/24),i=M(Tn(a)),s+=i,a-=En(Dn(i)),r=M(s/12),s%=12,u.days=a,u.months=s,u.years=r,this},er.clone=function(){return Vt(this)},er.get=function(e){return e=R(e),this.isValid()?this[e+"s"]():NaN},er.milliseconds=Bn,er.seconds=zn,er.minutes=qn,er.hours=Wn,er.days=Gn,er.weeks=function(){return M(this.days()/7)},er.months=Vn,er.years=Jn,er.humanize=function(e){if(!this.isValid())return this.localeData().invalidDate();var t=this.localeData(),n=function(e,t,n){var r=Vt(e).abs(),i=Zn(r.as("s")),o=Zn(r.as("m")),a=Zn(r.as("h")),s=Zn(r.as("d")),u=Zn(r.as("M")),c=Zn(r.as("y")),d=i<=Kn.ss&&["s",i]||i<Kn.s&&["ss",i]||o<=1&&["m"]||o<Kn.m&&["mm",o]||a<=1&&["h"]||a<Kn.h&&["hh",a]||s<=1&&["d"]||s<Kn.d&&["dd",s]||u<=1&&["M"]||u<Kn.M&&["MM",u]||c<=1&&["y"]||["yy",c];return d[2]=t,d[3]=+e>0,d[4]=n,function(e,t,n,r,i){return i.relativeTime(t||1,!!n,e,r)}.apply(null,d)}(this,!e,t);return e&&(n=t.pastFuture(+this,n)),t.postformat(n)},er.toISOString=$n,er.toString=$n,er.toJSON=$n,er.locale=tn,er.localeData=rn,er.toIsoString=L("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)",$n),er.lang=nn,q("X",0,0,"unix"),q("x",0,0,"valueOf"),de("x",oe),de("X",/[+-]?\d+(\.\d{1,3})?/),he("X",function(e,t,n){n._d=new Date(1e3*parseFloat(e,10))}),he("x",function(e,t,n){n._d=new Date(k(e))}),i.version="2.24.0",t=jt,i.fn=bn,i.min=function(){return Ot("isBefore",[].slice.call(arguments,0))},i.max=function(){return Ot("isAfter",[].slice.call(arguments,0))},i.now=function(){return Date.now?Date.now():+new Date},i.utc=p,i.unix=function(e){return jt(1e3*e)},i.months=function(e,t){return xn(e,t,"months")},i.isDate=c,i.locale=lt,i.invalid=_,i.duration=Vt,i.isMoment=w,i.weekdays=function(e,t,n){return Sn(e,t,n,"weekdays")},i.parseZone=function(){return jt.apply(null,arguments).parseZone()},i.localeData=pt,i.isDuration=Pt,i.monthsShort=function(e,t){return xn(e,t,"monthsShort")},i.weekdaysMin=function(e,t,n){return Sn(e,t,n,"weekdaysMin")},i.defineLocale=ft,i.updateLocale=function(e,t){if(null!=t){var n,r,i=at;null!=(r=dt(e))&&(i=r._config),t=j(i,t),(n=new I(t)).parentLocale=st[e],st[e]=n,lt(e)}else null!=st[e]&&(null!=st[e].parentLocale?st[e]=st[e].parentLocale:null!=st[e]&&delete st[e]);return st[e]},i.locales=function(){return A(st)},i.weekdaysShort=function(e,t,n){return Sn(e,t,n,"weekdaysShort")},i.normalizeUnits=R,i.relativeTimeRounding=function(e){return void 0===e?Zn:"function"==typeof e&&(Zn=e,!0)},i.relativeTimeThreshold=function(e,t){return void 0!==Kn[e]&&(void 0===t?Kn[e]:(Kn[e]=t,"s"===e&&(Kn.ss=t-1),!0))},i.calendarFormat=function(e,t){var n=e.diff(t,"days",!0);return n<-6?"sameElse":n<-1?"lastWeek":n<0?"lastDay":n<1?"sameDay":n<2?"nextDay":n<7?"nextWeek":"sameElse"},i.prototype=bn,i.HTML5_FMT={DATETIME_LOCAL:"YYYY-MM-DDTHH:mm",DATETIME_LOCAL_SECONDS:"YYYY-MM-DDTHH:mm:ss",DATETIME_LOCAL_MS:"YYYY-MM-DDTHH:mm:ss.SSS",DATE:"YYYY-MM-DD",TIME:"HH:mm",TIME_SECONDS:"HH:mm:ss",TIME_MS:"HH:mm:ss.SSS",WEEK:"GGGG-[W]WW",MONTH:"YYYY-MM"},i}()}).call(this,n(12)(e))},function(e,t){"function"==typeof Object.create?e.exports=function(e,t){e.super_=t,e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}})}:e.exports=function(e,t){e.super_=t;var n=function(){};n.prototype=t.prototype,e.prototype=new n,e.prototype.constructor=e}},function(e,t,n){var r=n(7),i=r.Buffer;function o(e,t){for(var n in e)t[n]=e[n]}function a(e,t,n){return i(e,t,n)}i.from&&i.alloc&&i.allocUnsafe&&i.allocUnsafeSlow?e.exports=r:(o(r,t),t.Buffer=a),o(i,a),a.from=function(e,t,n){if("number"==typeof e)throw new TypeError("Argument must not be a number");return i(e,t,n)},a.alloc=function(e,t,n){if("number"!=typeof e)throw new TypeError("Argument must be a number");var r=i(e);return void 0!==t?"string"==typeof n?r.fill(t,n):r.fill(t):r.fill(0),r},a.allocUnsafe=function(e){if("number"!=typeof e)throw new TypeError("Argument must be a number");return i(e)},a.allocUnsafeSlow=function(e){if("number"!=typeof e)throw new TypeError("Argument must be a number");return r.SlowBuffer(e)}},function(e,t){e.exports=function(e){return null==e?"":""+e}},function(e,t){var n;n=function(){return this}();try{n=n||new Function("return this")()}catch(e){"object"==typeof window&&(n=window)}e.exports=n},function(e,t,n){(function(e,r){var i;
/**
 * @license
 * lodash 3.10.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern -d -o ./index.js`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */(function(){var o,a,s,u="3.10.1",c=1,d=2,l=4,f=8,p=16,h=32,m=64,_=128,v=256,y=30,g="...",b=150,w=16,M=200,k=1,x=2,S="Expected a function",L="__lodash_placeholder__",A="[object Arguments]",E="[object Array]",T="[object Boolean]",D="[object Date]",j="[object Error]",I="[object Function]",Y="[object Number]",O="[object Object]",R="[object RegExp]",C="[object String]",P="[object ArrayBuffer]",U="[object Float32Array]",N="[object Float64Array]",F="[object Int8Array]",H="[object Int16Array]",B="[object Int32Array]",z="[object Uint8Array]",q="[object Uint8ClampedArray]",W="[object Uint16Array]",G="[object Uint32Array]",V=/\b__p \+= '';/g,J=/\b(__p \+=) '' \+/g,Z=/(__e\(.*?\)|\b__t\)) \+\n'';/g,K=/&(?:amp|lt|gt|quot|#39|#96);/g,X=/[&<>"'`]/g,Q=RegExp(K.source),$=RegExp(X.source),ee=/<%-([\s\S]+?)%>/g,te=/<%([\s\S]+?)%>/g,ne=/<%=([\s\S]+?)%>/g,re=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,ie=/^\w*$/,oe=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g,ae=/^[:!,]|[\\^$.*+?()[\]{}|\/]|(^[0-9a-fA-Fnrtuvx])|([\n\r\u2028\u2029])/g,se=RegExp(ae.source),ue=/[\u0300-\u036f\ufe20-\ufe23]/g,ce=/\\(\\)?/g,de=/\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,le=/\w*$/,fe=/^0[xX]/,pe=/^\[object .+?Constructor\]$/,he=/^\d+$/,me=/[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g,_e=/($^)/,ve=/['\n\r\u2028\u2029\\]/g,ye=(a="[A-Z\\xc0-\\xd6\\xd8-\\xde]",s="[a-z\\xdf-\\xf6\\xf8-\\xff]+",RegExp(a+"+(?="+a+s+")|"+a+"?"+s+"|"+a+"+|[0-9]+","g")),ge=["Array","ArrayBuffer","Date","Error","Float32Array","Float64Array","Function","Int8Array","Int16Array","Int32Array","Math","Number","Object","RegExp","Set","String","_","clearTimeout","isFinite","parseFloat","parseInt","setTimeout","TypeError","Uint8Array","Uint8ClampedArray","Uint16Array","Uint32Array","WeakMap"],be=-1,we={};we[U]=we[N]=we[F]=we[H]=we[B]=we[z]=we[q]=we[W]=we[G]=!0,we[A]=we[E]=we[P]=we[T]=we[D]=we[j]=we[I]=we["[object Map]"]=we[Y]=we[O]=we[R]=we["[object Set]"]=we[C]=we["[object WeakMap]"]=!1;var Me={};Me[A]=Me[E]=Me[P]=Me[T]=Me[D]=Me[U]=Me[N]=Me[F]=Me[H]=Me[B]=Me[Y]=Me[O]=Me[R]=Me[C]=Me[z]=Me[q]=Me[W]=Me[G]=!0,Me[j]=Me[I]=Me["[object Map]"]=Me["[object Set]"]=Me["[object WeakMap]"]=!1;var ke={"À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","Ç":"C","ç":"c","Ð":"D","ð":"d","È":"E","É":"E","Ê":"E","Ë":"E","è":"e","é":"e","ê":"e","ë":"e","Ì":"I","Í":"I","Î":"I","Ï":"I","ì":"i","í":"i","î":"i","ï":"i","Ñ":"N","ñ":"n","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","Ù":"U","Ú":"U","Û":"U","Ü":"U","ù":"u","ú":"u","û":"u","ü":"u","Ý":"Y","ý":"y","ÿ":"y","Æ":"Ae","æ":"ae","Þ":"Th","þ":"th","ß":"ss"},xe={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;"},Se={"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&#39;":"'","&#96;":"`"},Le={function:!0,object:!0},Ae={0:"x30",1:"x31",2:"x32",3:"x33",4:"x34",5:"x35",6:"x36",7:"x37",8:"x38",9:"x39",A:"x41",B:"x42",C:"x43",D:"x44",E:"x45",F:"x46",a:"x61",b:"x62",c:"x63",d:"x64",e:"x65",f:"x66",n:"x6e",r:"x72",t:"x74",u:"x75",v:"x76",x:"x78"},Ee={"\\":"\\","'":"'","\n":"n","\r":"r","\u2028":"u2028","\u2029":"u2029"},Te=Le[typeof t]&&t&&!t.nodeType&&t,De=Le[typeof e]&&e&&!e.nodeType&&e,je=Te&&De&&"object"==typeof r&&r&&r.Object&&r,Ie=Le[typeof self]&&self&&self.Object&&self,Ye=Le[typeof window]&&window&&window.Object&&window,Oe=(De&&De.exports,je||Ye!==(this&&this.window)&&Ye||Ie||this);function Re(e,t){if(e!==t){var n=null===e,r=e===o,i=e==e,a=null===t,s=t===o,u=t==t;if(e>t&&!a||!i||n&&!s&&u||r&&u)return 1;if(e<t&&!n||!u||a&&!r&&i||s&&i)return-1}return 0}function Ce(e,t,n){for(var r=e.length,i=n?r:-1;n?i--:++i<r;)if(t(e[i],i,e))return i;return-1}function Pe(e,t,n){if(t!=t)return Ve(e,n);for(var r=n-1,i=e.length;++r<i;)if(e[r]===t)return r;return-1}function Ue(e){return"function"==typeof e||!1}function Ne(e){return null==e?"":e+""}function Fe(e,t){for(var n=-1,r=e.length;++n<r&&t.indexOf(e.charAt(n))>-1;);return n}function He(e,t){for(var n=e.length;n--&&t.indexOf(e.charAt(n))>-1;);return n}function Be(e,t){return Re(e.criteria,t.criteria)||e.index-t.index}function ze(e){return ke[e]}function qe(e){return xe[e]}function We(e,t,n){return t?e=Ae[e]:n&&(e=Ee[e]),"\\"+e}function Ge(e){return"\\"+Ee[e]}function Ve(e,t,n){for(var r=e.length,i=t+(n?0:-1);n?i--:++i<r;){var o=e[i];if(o!=o)return i}return-1}function Je(e){return!!e&&"object"==typeof e}function Ze(e){return e<=160&&e>=9&&e<=13||32==e||160==e||5760==e||6158==e||e>=8192&&(e<=8202||8232==e||8233==e||8239==e||8287==e||12288==e||65279==e)}function Ke(e,t){for(var n=-1,r=e.length,i=-1,o=[];++n<r;)e[n]===t&&(e[n]=L,o[++i]=n);return o}function Xe(e){for(var t=-1,n=e.length;++t<n&&Ze(e.charCodeAt(t)););return t}function Qe(e){for(var t=e.length;t--&&Ze(e.charCodeAt(t)););return t}function $e(e){return Se[e]}var et=function e(t){var n=(t=t?et.defaults(Oe.Object(),t,et.pick(Oe,ge)):Oe).Array,r=t.Date,i=t.Error,a=t.Function,s=t.Math,ke=t.Number,xe=t.Object,Se=t.RegExp,Le=t.String,Ae=t.TypeError,Ee=n.prototype,Te=xe.prototype,De=Le.prototype,je=a.prototype.toString,Ie=Te.hasOwnProperty,Ye=0,Ze=Te.toString,tt=Oe._,nt=Se("^"+je.call(Ie).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),rt=t.ArrayBuffer,it=t.clearTimeout,ot=t.parseFloat,at=s.pow,st=Te.propertyIsEnumerable,ut=yr(t,"Set"),ct=t.setTimeout,dt=Ee.splice,lt=t.Uint8Array,ft=yr(t,"WeakMap"),pt=s.ceil,ht=yr(xe,"create"),mt=s.floor,_t=yr(n,"isArray"),vt=t.isFinite,yt=yr(xe,"keys"),gt=s.max,bt=s.min,wt=yr(r,"now"),Mt=t.parseInt,kt=s.random,xt=ke.NEGATIVE_INFINITY,St=ke.POSITIVE_INFINITY,Lt=4294967295,At=Lt-1,Et=Lt>>>1,Tt=9007199254740991,Dt=ft&&new ft,jt={};function It(e){if(Je(e)&&!Gi(e)&&!(e instanceof Rt)){if(e instanceof Ot)return e;if(Ie.call(e,"__chain__")&&Ie.call(e,"__wrapped__"))return Cr(e)}return new Ot(e)}function Yt(){}function Ot(e,t,n){this.__wrapped__=e,this.__actions__=n||[],this.__chain__=!!t}It.support={};function Rt(e){this.__wrapped__=e,this.__actions__=[],this.__dir__=1,this.__filtered__=!1,this.__iteratees__=[],this.__takeCount__=St,this.__views__=[]}function Ct(){this.__data__={}}function Pt(e){var t=e?e.length:0;for(this.data={hash:ht(null),set:new ut};t--;)this.push(e[t])}function Ut(e,t){var n=e.data;return("string"==typeof t||Ki(t)?n.set.has(t):n.hash[t])?0:-1}function Nt(e,t){var r=-1,i=e.length;for(t||(t=n(i));++r<i;)t[r]=e[r];return t}function Ft(e,t){for(var n=-1,r=e.length;++n<r&&!1!==t(e[n],n,e););return e}function Ht(e,t){for(var n=-1,r=e.length;++n<r;)if(!t(e[n],n,e))return!1;return!0}function Bt(e,t){for(var n=-1,r=e.length,i=-1,o=[];++n<r;){var a=e[n];t(a,n,e)&&(o[++i]=a)}return o}function zt(e,t){for(var r=-1,i=e.length,o=n(i);++r<i;)o[r]=t(e[r],r,e);return o}function qt(e,t){for(var n=-1,r=t.length,i=e.length;++n<r;)e[i+n]=t[n];return e}function Wt(e,t,n,r){var i=-1,o=e.length;for(r&&o&&(n=e[++i]);++i<o;)n=t(n,e[i],i,e);return n}function Gt(e,t){for(var n=-1,r=e.length;++n<r;)if(t(e[n],n,e))return!0;return!1}function Vt(e,t,n,r){return e!==o&&Ie.call(r,n)?e:t}function Jt(e,t,n){for(var r=-1,i=yo(t),a=i.length;++r<a;){var s=i[r],u=e[s],c=n(u,t[s],s,e,t);(c==c?c===u:u!=u)&&(u!==o||s in e)||(e[s]=c)}return e}function Zt(e,t){return null==t?e:Xt(t,yo(t),e)}function Kt(e,t){for(var r=-1,i=null==e,a=!i&&br(e),s=a?e.length:0,u=t.length,c=n(u);++r<u;){var d=t[r];c[r]=a?wr(d,s)?e[d]:o:i?o:e[d]}return c}function Xt(e,t,n){n||(n={});for(var r=-1,i=t.length;++r<i;){var o=t[r];n[o]=e[o]}return n}function Qt(e,t,n){var r=typeof e;return"function"==r?t===o?e:Cn(e,t,n):null==e?Uo:"object"==r?bn(e):t===o?qo(e):wn(e,t)}function $t(e,t,n,r,i,a,s){var u;if(n&&(u=i?n(e,r,i):n(e)),u!==o)return u;if(!Ki(e))return e;var c=Gi(e);if(c){if(u=function(e){var t=e.length,n=new e.constructor(t);return t&&"string"==typeof e[0]&&Ie.call(e,"index")&&(n.index=e.index,n.input=e.input),n}(e),!t)return Nt(e,u)}else{var d=Ze.call(e),l=d==I;if(d!=O&&d!=A&&(!l||i))return Me[d]?function(e,t,n){var r=e.constructor;switch(t){case P:return Pn(e);case T:case D:return new r(+e);case U:case N:case F:case H:case B:case z:case q:case W:case G:var i=e.buffer;return new r(n?Pn(i):i,e.byteOffset,e.length);case Y:case C:return new r(e);case R:var o=new r(e.source,le.exec(e));o.lastIndex=e.lastIndex}return o}(e,d,t):i?e:{};if(u=function(e){var t=e.constructor;return"function"==typeof t&&t instanceof t||(t=xe),new t}(l?{}:e),!t)return Zt(u,e)}a||(a=[]),s||(s=[]);for(var f=a.length;f--;)if(a[f]==e)return s[f];return a.push(e),s.push(u),(c?Ft:pn)(e,function(r,i){u[i]=$t(r,t,n,i,e,a,s)}),u}It.templateSettings={escape:ee,evaluate:te,interpolate:ne,variable:"",imports:{_:It}};var en=function(){function e(){}return function(t){if(Ki(t)){e.prototype=t;var n=new e;e.prototype=o}return n||{}}}();function tn(e,t,n){if("function"!=typeof e)throw new Ae(S);return ct(function(){e.apply(o,n)},t)}function nn(e,t){var n=e?e.length:0,r=[];if(!n)return r;var i=-1,o=mr(),a=o==Pe,s=a&&t.length>=M?qn(t):null,u=t.length;s&&(o=Ut,a=!1,t=s);e:for(;++i<n;){var c=e[i];if(a&&c==c){for(var d=u;d--;)if(t[d]===c)continue e;r.push(c)}else o(t,c,0)<0&&r.push(c)}return r}var rn=Bn(pn),on=Bn(hn,!0);function an(e,t){var n=!0;return rn(e,function(e,r,i){return n=!!t(e,r,i)}),n}function sn(e,t){var n=[];return rn(e,function(e,r,i){t(e,r,i)&&n.push(e)}),n}function un(e,t,n,r){var i;return n(e,function(e,n,o){if(t(e,n,o))return i=r?n:e,!1}),i}function cn(e,t,n,r){r||(r=[]);for(var i=-1,o=e.length;++i<o;){var a=e[i];Je(a)&&br(a)&&(n||Gi(a)||Wi(a))?t?cn(a,t,n,r):qt(r,a):n||(r[r.length]=a)}return r}var dn=zn(),ln=zn(!0);function fn(e,t){return dn(e,t,go)}function pn(e,t){return dn(e,t,yo)}function hn(e,t){return ln(e,t,yo)}function mn(e,t){for(var n=-1,r=t.length,i=-1,o=[];++n<r;){var a=t[n];Zi(e[a])&&(o[++i]=a)}return o}function _n(e,t,n){if(null!=e){n!==o&&n in Or(e)&&(t=[n]);for(var r=0,i=t.length;null!=e&&r<i;)e=e[t[r++]];return r&&r==i?e:o}}function vn(e,t,n,r,i,a){return e===t||(null==e||null==t||!Ki(e)&&!Je(t)?e!=e&&t!=t:function(e,t,n,r,i,a,s){var u=Gi(e),c=Gi(t),d=E,l=E;u||((d=Ze.call(e))==A?d=O:d!=O&&(u=no(e))),c||((l=Ze.call(t))==A?l=O:l!=O&&(c=no(t)));var f=d==O,p=l==O,h=d==l;if(h&&!u&&!f)return function(e,t,n){switch(n){case T:case D:return+e==+t;case j:return e.name==t.name&&e.message==t.message;case Y:return e!=+e?t!=+t:e==+t;case R:case C:return e==t+""}return!1}(e,t,d);if(!i){var m=f&&Ie.call(e,"__wrapped__"),_=p&&Ie.call(t,"__wrapped__");if(m||_)return n(m?e.value():e,_?t.value():t,r,i,a,s)}if(!h)return!1;a||(a=[]),s||(s=[]);for(var v=a.length;v--;)if(a[v]==e)return s[v]==t;a.push(e),s.push(t);var y=(u?function(e,t,n,r,i,a,s){var u=-1,c=e.length,d=t.length;if(c!=d&&!(i&&d>c))return!1;for(;++u<c;){var l=e[u],f=t[u],p=r?r(i?f:l,i?l:f,u):o;if(p!==o){if(p)continue;return!1}if(i){if(!Gt(t,function(e){return l===e||n(l,e,r,i,a,s)}))return!1}else if(l!==f&&!n(l,f,r,i,a,s))return!1}return!0}:function(e,t,n,r,i,a,s){var u=yo(e),c=u.length,d=yo(t).length;if(c!=d&&!i)return!1;for(var l=c;l--;){var f=u[l];if(!(i?f in t:Ie.call(t,f)))return!1}for(var p=i;++l<c;){f=u[l];var h=e[f],m=t[f],_=r?r(i?m:h,i?h:m,f):o;if(!(_===o?n(h,m,r,i,a,s):_))return!1;p||(p="constructor"==f)}if(!p){var v=e.constructor,y=t.constructor;if(v!=y&&"constructor"in e&&"constructor"in t&&!("function"==typeof v&&v instanceof v&&"function"==typeof y&&y instanceof y))return!1}return!0})(e,t,n,r,i,a,s);return a.pop(),s.pop(),y}(e,t,vn,n,r,i,a))}function yn(e,t,n){var r=t.length,i=r,a=!n;if(null==e)return!i;for(e=Or(e);r--;){var s=t[r];if(a&&s[2]?s[1]!==e[s[0]]:!(s[0]in e))return!1}for(;++r<i;){var u=(s=t[r])[0],c=e[u],d=s[1];if(a&&s[2]){if(c===o&&!(u in e))return!1}else{var l=n?n(c,d,u):o;if(!(l===o?vn(d,c,n,!0):l))return!1}}return!0}function gn(e,t){var r=-1,i=br(e)?n(e.length):[];return rn(e,function(e,n,o){i[++r]=t(e,n,o)}),i}function bn(e){var t=vr(e);if(1==t.length&&t[0][2]){var n=t[0][0],r=t[0][1];return function(e){return null!=e&&e[n]===r&&(r!==o||n in Or(e))}}return function(e){return yn(e,t)}}function wn(e,t){var n=Gi(e),r=kr(e)&&Lr(t),i=e+"";return e=Rr(e),function(a){if(null==a)return!1;var s=i;if(a=Or(a),(n||!r)&&!(s in a)){if(null==(a=1==e.length?a:_n(a,Ln(e,0,-1))))return!1;s=Wr(e),a=Or(a)}return a[s]===t?t!==o||s in a:vn(t,a[s],o,!0)}}function Mn(e){return function(t){return null==t?o:t[e]}}function kn(e,t){for(var n=e?t.length:0;n--;){var r=t[n];if(r!=i&&wr(r)){var i=r;dt.call(e,r,1)}}return e}function xn(e,t){return e+mt(kt()*(t-e+1))}var Sn=Dt?function(e,t){return Dt.set(e,t),e}:Uo;function Ln(e,t,r){var i=-1,a=e.length;(t=null==t?0:+t||0)<0&&(t=-t>a?0:a+t),(r=r===o||r>a?a:+r||0)<0&&(r+=a),a=t>r?0:r-t>>>0,t>>>=0;for(var s=n(a);++i<a;)s[i]=e[i+t];return s}function An(e,t){var n;return rn(e,function(e,r,i){return!(n=t(e,r,i))}),!!n}function En(e,t){var n=e.length;for(e.sort(t);n--;)e[n]=e[n].value;return e}function Tn(e,t,n){var r=fr(),i=-1;return t=zt(t,function(e){return r(e)}),En(gn(e,function(e){return{criteria:zt(t,function(t){return t(e)}),index:++i,value:e}}),function(e,t){return function(e,t,n){for(var r=-1,i=e.criteria,o=t.criteria,a=i.length,s=n.length;++r<a;){var u=Re(i[r],o[r]);if(u){if(r>=s)return u;var c=n[r];return u*("asc"===c||!0===c?1:-1)}}return e.index-t.index}(e,t,n)})}function Dn(e,t){var n=-1,r=mr(),i=e.length,o=r==Pe,a=o&&i>=M,s=a?qn():null,u=[];s?(r=Ut,o=!1):(a=!1,s=t?[]:u);e:for(;++n<i;){var c=e[n],d=t?t(c,n,e):c;if(o&&c==c){for(var l=s.length;l--;)if(s[l]===d)continue e;t&&s.push(d),u.push(c)}else r(s,d,0)<0&&((t||a)&&s.push(d),u.push(c))}return u}function jn(e,t){for(var r=-1,i=t.length,o=n(i);++r<i;)o[r]=e[t[r]];return o}function In(e,t,n,r){for(var i=e.length,o=r?i:-1;(r?o--:++o<i)&&t(e[o],o,e););return n?Ln(e,r?0:o,r?o+1:i):Ln(e,r?o+1:0,r?i:o)}function Yn(e,t){var n=e;n instanceof Rt&&(n=n.value());for(var r=-1,i=t.length;++r<i;){var o=t[r];n=o.func.apply(o.thisArg,qt([n],o.args))}return n}function On(e,t,n){var r=0,i=e?e.length:r;if("number"==typeof t&&t==t&&i<=Et){for(;r<i;){var o=r+i>>>1,a=e[o];(n?a<=t:a<t)&&null!==a?r=o+1:i=o}return i}return Rn(e,t,Uo,n)}function Rn(e,t,n,r){t=n(t);for(var i=0,a=e?e.length:0,s=t!=t,u=null===t,c=t===o;i<a;){var d=mt((i+a)/2),l=n(e[d]),f=l!==o,p=l==l;if(s)var h=p||r;else h=u?p&&f&&(r||null!=l):c?p&&(r||f):null!=l&&(r?l<=t:l<t);h?i=d+1:a=d}return bt(a,At)}function Cn(e,t,n){if("function"!=typeof e)return Uo;if(t===o)return e;switch(n){case 1:return function(n){return e.call(t,n)};case 3:return function(n,r,i){return e.call(t,n,r,i)};case 4:return function(n,r,i,o){return e.call(t,n,r,i,o)};case 5:return function(n,r,i,o,a){return e.call(t,n,r,i,o,a)}}return function(){return e.apply(t,arguments)}}function Pn(e){var t=new rt(e.byteLength);return new lt(t).set(new lt(e)),t}function Un(e,t,r){for(var i=r.length,o=-1,a=gt(e.length-i,0),s=-1,u=t.length,c=n(u+a);++s<u;)c[s]=t[s];for(;++o<i;)c[r[o]]=e[o];for(;a--;)c[s++]=e[o++];return c}function Nn(e,t,r){for(var i=-1,o=r.length,a=-1,s=gt(e.length-o,0),u=-1,c=t.length,d=n(s+c);++a<s;)d[a]=e[a];for(var l=a;++u<c;)d[l+u]=t[u];for(;++i<o;)d[l+r[i]]=e[a++];return d}function Fn(e,t){return function(n,r,i){var o=t?t():{};if(r=fr(r,i,3),Gi(n))for(var a=-1,s=n.length;++a<s;){var u=n[a];e(o,u,r(u,a,n),n)}else rn(n,function(t,n,i){e(o,t,r(t,n,i),i)});return o}}function Hn(e){return zi(function(t,n){var r=-1,i=null==t?0:n.length,a=i>2?n[i-2]:o,s=i>2?n[2]:o,u=i>1?n[i-1]:o;for("function"==typeof a?(a=Cn(a,u,5),i-=2):i-=(a="function"==typeof u?u:o)?1:0,s&&Mr(n[0],n[1],s)&&(a=i<3?o:a,i=1);++r<i;){var c=n[r];c&&e(t,c,a)}return t})}function Bn(e,t){return function(n,r){var i=n?_r(n):0;if(!Sr(i))return e(n,r);for(var o=t?i:-1,a=Or(n);(t?o--:++o<i)&&!1!==r(a[o],o,a););return n}}function zn(e){return function(t,n,r){for(var i=Or(t),o=r(t),a=o.length,s=e?a:-1;e?s--:++s<a;){var u=o[s];if(!1===n(i[u],u,i))break}return t}}function qn(e){return ht&&ut?new Pt(e):null}function Wn(e){return function(t){for(var n=-1,r=Ro(Ao(t)),i=r.length,o="";++n<i;)o=e(o,r[n],n);return o}}function Gn(e){return function(){var t=arguments;switch(t.length){case 0:return new e;case 1:return new e(t[0]);case 2:return new e(t[0],t[1]);case 3:return new e(t[0],t[1],t[2]);case 4:return new e(t[0],t[1],t[2],t[3]);case 5:return new e(t[0],t[1],t[2],t[3],t[4]);case 6:return new e(t[0],t[1],t[2],t[3],t[4],t[5]);case 7:return new e(t[0],t[1],t[2],t[3],t[4],t[5],t[6])}var n=en(e.prototype),r=e.apply(n,t);return Ki(r)?r:n}}function Vn(e){return function t(n,r,i){i&&Mr(n,r,i)&&(r=o);var a=lr(n,e,o,o,o,o,o,r);return a.placeholder=t.placeholder,a}}function Jn(e,t){return zi(function(n){var r=n[0];return null==r?r:(n.push(t),e.apply(o,n))})}function Zn(e,t){return function(n,r,i){if(i&&Mr(n,r,i)&&(r=o),1==(r=fr(r,i,3)).length){var a=function(e,t,n,r){for(var i=-1,o=e.length,a=r,s=a;++i<o;){var u=e[i],c=+t(u);n(c,a)&&(a=c,s=u)}return s}(n=Gi(n)?n:Yr(n),r,e,t);if(!n.length||a!==t)return a}return function(e,t,n,r){var i=r,o=i;return rn(e,function(e,a,s){var u=+t(e,a,s);(n(u,i)||u===r&&u===o)&&(i=u,o=e)}),o}(n,r,e,t)}}function Kn(e,t){return function(n,r,i){if(r=fr(r,i,3),Gi(n)){var a=Ce(n,r,t);return a>-1?n[a]:o}return un(n,r,e)}}function Xn(e){return function(t,n,r){return t&&t.length?Ce(t,n=fr(n,r,3),e):-1}}function Qn(e){return function(t,n,r){return un(t,n=fr(n,r,3),e,!0)}}function $n(e){return function(){for(var t,r=arguments.length,i=e?r:-1,a=0,s=n(r);e?i--:++i<r;){var u=s[a++]=arguments[i];if("function"!=typeof u)throw new Ae(S);!t&&Ot.prototype.thru&&"wrapper"==hr(u)&&(t=new Ot([],!0))}for(i=t?-1:r;++i<r;){var c=hr(u=s[i]),d="wrapper"==c?pr(u):o;t=d&&xr(d[0])&&d[1]==(_|f|h|v)&&!d[4].length&&1==d[9]?t[hr(d[0])].apply(t,d[3]):1==u.length&&xr(u)?t[c]():t.thru(u)}return function(){var e=arguments,n=e[0];if(t&&1==e.length&&Gi(n)&&n.length>=M)return t.plant(n).value();for(var i=0,o=r?s[i].apply(this,e):n;++i<r;)o=s[i].call(this,o);return o}}}function er(e,t){return function(n,r,i){return"function"==typeof r&&i===o&&Gi(n)?e(n,r):t(n,Cn(r,i,3))}}function tr(e){return function(t,n,r){return"function"==typeof n&&r===o||(n=Cn(n,r,3)),e(t,n,go)}}function nr(e){return function(t,n,r){return"function"==typeof n&&r===o||(n=Cn(n,r,3)),e(t,n)}}function rr(e){return function(t,n,r){var i={};return n=fr(n,r,3),pn(t,function(t,r,o){var a=n(t,r,o);t=e?t:a,i[r=e?a:r]=t}),i}}function ir(e){return function(t,n,r){return t=Ne(t),(e?t:"")+ur(t,n,r)+(e?"":t)}}function or(e){var t=zi(function(n,r){var i=Ke(r,t.placeholder);return lr(n,e,o,r,i)});return t}function ar(e,t){return function(n,r,i,a){var s=arguments.length<3;return"function"==typeof r&&a===o&&Gi(n)?e(n,r,i,s):function(e,t,n,r,i){return i(e,function(e,i,o){n=r?(r=!1,e):t(n,e,i,o)}),n}(n,fr(r,a,4),i,s,t)}}function sr(e,t,r,i,a,s,u,v,y,g){var b=t&_,w=t&c,M=t&d,k=t&f,x=t&l,S=t&p,L=M?o:Gn(e);return function l(){for(var f=arguments.length,p=f,_=n(f);p--;)_[p]=arguments[p];if(i&&(_=Un(_,i,a)),s&&(_=Nn(_,s,u)),k||S){var A=l.placeholder,E=Ke(_,A);if((f-=E.length)<g){var T=v?Nt(v):o,D=gt(g-f,0);t|=k?h:m,t&=~(k?m:h),x||(t&=~(c|d));var j=[e,t,r,k?_:o,k?E:o,k?o:_,k?o:E,T,y,D],I=sr.apply(o,j);return xr(e)&&jr(I,j),I.placeholder=A,I}}var Y=w?r:this,O=M?Y[e]:e;return v&&(_=function(e,t){for(var n=e.length,r=bt(t.length,n),i=Nt(e);r--;){var a=t[r];e[r]=wr(a,n)?i[a]:o}return e}(_,v)),b&&y<_.length&&(_.length=y),this&&this!==Oe&&this instanceof l&&(O=L||Gn(e)),O.apply(Y,_)}}function ur(e,t,n){var r=e.length;if(r>=(t=+t)||!vt(t))return"";var i=t-r;return jo(n=null==n?" ":n+"",pt(i/n.length)).slice(0,i)}function cr(e){var t=s[e];return function(e,n){return(n=n===o?0:+n||0)?(n=at(10,n),t(e*n)/n):t(e)}}function dr(e){return function(t,n,r,i){var o=fr(r);return null==r&&o===Qt?On(t,n,e):Rn(t,n,o(r,i,1),e)}}function lr(e,t,r,i,a,s,u,p){var y=t&d;if(!y&&"function"!=typeof e)throw new Ae(S);var g=i?i.length:0;if(g||(t&=~(h|m),i=a=o),g-=a?a.length:0,t&m){var b=i,w=a;i=a=o}var M=y?o:pr(e),k=[e,t,r,i,a,b,w,s,u,p];if(M&&(function(e,t){var n=e[1],r=t[1],i=n|r,o=i<_,a=r==_&&n==f||r==_&&n==v&&e[7].length<=t[8]||r==(_|v)&&n==f;if(!o&&!a)return e;r&c&&(e[2]=t[2],i|=n&c?0:l);var s=t[3];if(s){var u=e[3];e[3]=u?Un(u,s,t[4]):Nt(s),e[4]=u?Ke(e[3],L):Nt(t[4])}(s=t[5])&&(u=e[5],e[5]=u?Nn(u,s,t[6]):Nt(s),e[6]=u?Ke(e[5],L):Nt(t[6])),(s=t[7])&&(e[7]=Nt(s)),r&_&&(e[8]=null==e[8]?t[8]:bt(e[8],t[8])),null==e[9]&&(e[9]=t[9]),e[0]=t[0],e[1]=i}(k,M),t=k[1],p=k[9]),k[9]=null==p?y?0:e.length:gt(p-g,0)||0,t==c)var x=function(e,t){var n=Gn(e);return function r(){return(this&&this!==Oe&&this instanceof r?n:e).apply(t,arguments)}}(k[0],k[2]);else x=t!=h&&t!=(c|h)||k[4].length?sr.apply(o,k):function(e,t,r,i){var o=t&c,a=Gn(e);return function t(){for(var s=-1,u=arguments.length,c=-1,d=i.length,l=n(d+u);++c<d;)l[c]=i[c];for(;u--;)l[c++]=arguments[++s];return(this&&this!==Oe&&this instanceof t?a:e).apply(o?r:this,l)}}.apply(o,k);return(M?Sn:jr)(x,k)}function fr(e,t,n){var r=It.callback||Po;return r=r===Po?Qt:r,n?r(e,t,n):r}var pr=Dt?function(e){return Dt.get(e)}:zo;function hr(e){for(var t=e.name,n=jt[t],r=n?n.length:0;r--;){var i=n[r],o=i.func;if(null==o||o==e)return i.name}return t}function mr(e,t,n){var r=It.indexOf||zr;return r=r===zr?Pe:r,e?r(e,t,n):r}var _r=Mn("length");function vr(e){for(var t=ko(e),n=t.length;n--;)t[n][2]=Lr(t[n][1]);return t}function yr(e,t){var n=null==e?o:e[t];return Xi(n)?n:o}function gr(e,t,n){null==e||kr(t,e)||(e=1==(t=Rr(t)).length?e:_n(e,Ln(t,0,-1)),t=Wr(t));var r=null==e?e:e[t];return null==r?o:r.apply(e,n)}function br(e){return null!=e&&Sr(_r(e))}function wr(e,t){return e="number"==typeof e||he.test(e)?+e:-1,t=null==t?Tt:t,e>-1&&e%1==0&&e<t}function Mr(e,t,n){if(!Ki(n))return!1;var r=typeof t;if("number"==r?br(n)&&wr(t,n.length):"string"==r&&t in n){var i=n[t];return e==e?e===i:i!=i}return!1}function kr(e,t){var n=typeof e;return!!("string"==n&&ie.test(e)||"number"==n)||!Gi(e)&&(!re.test(e)||null!=t&&e in Or(t))}function xr(e){var t=hr(e);if(!(t in Rt.prototype))return!1;var n=It[t];if(e===n)return!0;var r=pr(n);return!!r&&e===r[0]}function Sr(e){return"number"==typeof e&&e>-1&&e%1==0&&e<=Tt}function Lr(e){return e==e&&!Ki(e)}function Ar(e,t){e=Or(e);for(var n=-1,r=t.length,i={};++n<r;){var o=t[n];o in e&&(i[o]=e[o])}return i}function Er(e,t){var n={};return fn(e,function(e,r,i){t(e,r,i)&&(n[r]=e)}),n}var Tr,Dr,jr=(Tr=0,Dr=0,function(e,t){var n=Li(),r=w-(n-Dr);if(Dr=n,r>0){if(++Tr>=b)return e}else Tr=0;return Sn(e,t)});function Ir(e){for(var t=go(e),n=t.length,r=n&&e.length,i=!!r&&Sr(r)&&(Gi(e)||Wi(e)),o=-1,a=[];++o<n;){var s=t[o];(i&&wr(s,r)||Ie.call(e,s))&&a.push(s)}return a}function Yr(e){return null==e?[]:br(e)?Ki(e)?e:xe(e):So(e)}function Or(e){return Ki(e)?e:xe(e)}function Rr(e){if(Gi(e))return e;var t=[];return Ne(e).replace(oe,function(e,n,r,i){t.push(r?i.replace(ce,"$1"):n||e)}),t}function Cr(e){return e instanceof Rt?e.clone():new Ot(e.__wrapped__,e.__chain__,Nt(e.__actions__))}var Pr=zi(function(e,t){return Je(e)&&br(e)?nn(e,cn(t,!1,!0)):[]});function Ur(e,t,n){return e&&e.length?((n?Mr(e,t,n):null==t)&&(t=1),Ln(e,t<0?0:t)):[]}function Nr(e,t,n){var r=e?e.length:0;return r?((n?Mr(e,t,n):null==t)&&(t=1),Ln(e,0,(t=r-(+t||0))<0?0:t)):[]}var Fr=Xn(),Hr=Xn(!0);function Br(e){return e?e[0]:o}function zr(e,t,n){var r=e?e.length:0;if(!r)return-1;if("number"==typeof n)n=n<0?gt(r+n,0):n;else if(n){var i=On(e,t);return i<r&&(t==t?t===e[i]:e[i]!=e[i])?i:-1}return Pe(e,t,n||0)}var qr=zi(function(e){for(var t=e.length,r=t,i=n(l),o=mr(),a=o==Pe,s=[];r--;){var u=e[r]=br(u=e[r])?u:[];i[r]=a&&u.length>=120?qn(r&&u):null}var c=e[0],d=-1,l=c?c.length:0,f=i[0];e:for(;++d<l;)if(u=c[d],(f?Ut(f,u):o(s,u,0))<0){for(r=t;--r;){var p=i[r];if((p?Ut(p,u):o(e[r],u,0))<0)continue e}f&&f.push(u),s.push(u)}return s});function Wr(e){var t=e?e.length:0;return t?e[t-1]:o}var Gr=zi(function(e,t){var n=Kt(e,t=cn(t));return kn(e,t.sort(Re)),n});function Vr(e){return Ur(e,1)}var Jr=dr(),Zr=dr(!0);var Kr=zi(function(e){return Dn(cn(e,!1,!0))});function Xr(e,t,n,r){if(!e||!e.length)return[];null!=t&&"boolean"!=typeof t&&(n=Mr(e,t,r=n)?o:t,t=!1);var i=fr();return null==n&&i===Qt||(n=i(n,r,3)),t&&mr()==Pe?function(e,t){for(var n,r=-1,i=e.length,o=-1,a=[];++r<i;){var s=e[r],u=t?t(s,r,e):s;r&&n===u||(n=u,a[++o]=s)}return a}(e,n):Dn(e,n)}function Qr(e){if(!e||!e.length)return[];var t=-1,r=0;e=Bt(e,function(e){if(br(e))return r=gt(e.length,r),!0});for(var i=n(r);++t<r;)i[t]=zt(e,Mn(t));return i}function $r(e,t,n){if(!e||!e.length)return[];var r=Qr(e);return null==t?r:(t=Cn(t,n,4),zt(r,function(e){return Wt(e,t,o,!0)}))}var ei=zi(function(e,t){return br(e)?nn(e,t):[]});var ti=zi(Qr);function ni(e,t){var n=-1,r=e?e.length:0,i={};for(!r||t||Gi(e[0])||(t=[]);++n<r;){var o=e[n];t?i[o]=t[n]:o&&(i[o[0]]=o[1])}return i}var ri=zi(function(e){var t=e.length,n=t>2?e[t-2]:o,r=t>1?e[t-1]:o;return t>2&&"function"==typeof n?t-=2:(n=t>1&&"function"==typeof r?(--t,r):o,r=o),e.length=t,$r(e,n,r)});function ii(e){var t=It(e);return t.__chain__=!0,t}function oi(e,t,n){return t.call(n,e)}var ai=zi(function(e){return e=cn(e),this.thru(function(t){return function(e,t){for(var r=-1,i=e.length,o=-1,a=t.length,s=n(i+a);++r<i;)s[r]=e[r];for(;++o<a;)s[r++]=t[o];return s}(Gi(t)?t:[Or(t)],e)})});var si=zi(function(e,t){return Kt(e,cn(t))}),ui=Fn(function(e,t,n){Ie.call(e,n)?++e[n]:e[n]=1});function ci(e,t,n){var r=Gi(e)?Ht:an;return n&&Mr(e,t,n)&&(t=o),"function"==typeof t&&n===o||(t=fr(t,n,3)),r(e,t)}function di(e,t,n){return(Gi(e)?Bt:sn)(e,t=fr(t,n,3))}var li=Kn(rn),fi=Kn(on,!0);var pi=er(Ft,rn),hi=er(function(e,t){for(var n=e.length;n--&&!1!==t(e[n],n,e););return e},on),mi=Fn(function(e,t,n){Ie.call(e,n)?e[n].push(t):e[n]=[t]});function _i(e,t,n,r){var i=e?_r(e):0;return Sr(i)||(i=(e=So(e)).length),n="number"!=typeof n||r&&Mr(t,n,r)?0:n<0?gt(i+n,0):n||0,"string"==typeof e||!Gi(e)&&to(e)?n<=i&&e.indexOf(t,n)>-1:!!i&&mr(e,t,n)>-1}var vi=Fn(function(e,t,n){e[n]=t}),yi=zi(function(e,t,r){var i=-1,a="function"==typeof t,s=kr(t),u=br(e)?n(e.length):[];return rn(e,function(e){var n=a?t:s&&null!=e?e[t]:o;u[++i]=n?n.apply(e,r):gr(e,t,r)}),u});function gi(e,t,n){return(Gi(e)?zt:gn)(e,t=fr(t,n,3))}var bi=Fn(function(e,t,n){e[n?0:1].push(t)},function(){return[[],[]]});var wi=ar(Wt,rn),Mi=ar(function(e,t,n,r){var i=e.length;for(r&&i&&(n=e[--i]);i--;)n=t(n,e[i],i,e);return n},on);function ki(e,t,n){if(n?Mr(e,t,n):null==t)return(r=(e=Yr(e)).length)>0?e[xn(0,r-1)]:o;var r,i=-1,a=io(e),s=(r=a.length)-1;for(t=bt(t<0?0:+t||0,r);++i<t;){var u=xn(i,s),c=a[u];a[u]=a[i],a[i]=c}return a.length=t,a}function xi(e,t,n){var r=Gi(e)?Gt:An;return n&&Mr(e,t,n)&&(t=o),"function"==typeof t&&n===o||(t=fr(t,n,3)),r(e,t)}var Si=zi(function(e,t){if(null==e)return[];var n=t[2];return n&&Mr(t[0],t[1],n)&&(t.length=1),Tn(e,cn(t),[])});var Li=wt||function(){return(new r).getTime()};function Ai(e,t){var n;if("function"!=typeof t){if("function"!=typeof e)throw new Ae(S);var r=e;e=t,t=r}return function(){return--e>0&&(n=t.apply(this,arguments)),e<=1&&(t=o),n}}var Ei=zi(function(e,t,n){var r=c;if(n.length){var i=Ke(n,Ei.placeholder);r|=h}return lr(e,r,t,n,i)}),Ti=zi(function(e,t){for(var n=-1,r=(t=t.length?cn(t):vo(e)).length;++n<r;){var i=t[n];e[i]=lr(e[i],c,e)}return e}),Di=zi(function(e,t,n){var r=c|d;if(n.length){var i=Ke(n,Di.placeholder);r|=h}return lr(t,r,e,n,i)}),ji=Vn(f),Ii=Vn(p);function Yi(e,t,n){var r,i,a,s,u,c,d,l=0,f=!1,p=!0;if("function"!=typeof e)throw new Ae(S);if(t=t<0?0:+t||0,!0===n){var h=!0;p=!1}else Ki(n)&&(h=!!n.leading,f="maxWait"in n&&gt(+n.maxWait||0,t),p="trailing"in n?!!n.trailing:p);function m(t,n){n&&it(n),i=c=d=o,t&&(l=Li(),a=e.apply(u,r),c||i||(r=u=o))}function _(){var e=t-(Li()-s);e<=0||e>t?m(d,i):c=ct(_,e)}function v(){m(p,c)}function y(){if(r=arguments,s=Li(),u=this,d=p&&(c||!h),!1===f)var n=h&&!c;else{i||h||(l=s);var m=f-(s-l),y=m<=0||m>f;y?(i&&(i=it(i)),l=s,a=e.apply(u,r)):i||(i=ct(v,m))}return y&&c?c=it(c):c||t===f||(c=ct(_,t)),n&&(y=!0,a=e.apply(u,r)),!y||c||i||(r=u=o),a}return y.cancel=function(){c&&it(c),i&&it(i),l=0,i=c=d=o},y}var Oi=zi(function(e,t){return tn(e,1,t)}),Ri=zi(function(e,t,n){return tn(e,t,n)}),Ci=$n(),Pi=$n(!0);function Ui(e,t){if("function"!=typeof e||t&&"function"!=typeof t)throw new Ae(S);var n=function(){var r=arguments,i=t?t.apply(this,r):r[0],o=n.cache;if(o.has(i))return o.get(i);var a=e.apply(this,r);return n.cache=o.set(i,a),a};return n.cache=new Ui.Cache,n}var Ni=zi(function(e,t){if(t=cn(t),"function"!=typeof e||!Ht(t,Ue))throw new Ae(S);var n=t.length;return zi(function(r){for(var i=bt(r.length,n);i--;)r[i]=t[i](r[i]);return e.apply(this,r)})});var Fi=or(h),Hi=or(m),Bi=zi(function(e,t){return lr(e,v,o,o,o,cn(t))});function zi(e,t){if("function"!=typeof e)throw new Ae(S);return t=gt(t===o?e.length-1:+t||0,0),function(){for(var r=arguments,i=-1,o=gt(r.length-t,0),a=n(o);++i<o;)a[i]=r[t+i];switch(t){case 0:return e.call(this,a);case 1:return e.call(this,r[0],a);case 2:return e.call(this,r[0],r[1],a)}var s=n(t+1);for(i=-1;++i<t;)s[i]=r[i];return s[t]=a,e.apply(this,s)}}function qi(e,t){return e>t}function Wi(e){return Je(e)&&br(e)&&Ie.call(e,"callee")&&!st.call(e,"callee")}var Gi=_t||function(e){return Je(e)&&Sr(e.length)&&Ze.call(e)==E};function Vi(e,t,n,r){var i=(n="function"==typeof n?Cn(n,r,3):o)?n(e,t):o;return i===o?vn(e,t,n):!!i}function Ji(e){return Je(e)&&"string"==typeof e.message&&Ze.call(e)==j}function Zi(e){return Ki(e)&&Ze.call(e)==I}function Ki(e){var t=typeof e;return!!e&&("object"==t||"function"==t)}function Xi(e){return null!=e&&(Zi(e)?nt.test(je.call(e)):Je(e)&&pe.test(e))}function Qi(e){return"number"==typeof e||Je(e)&&Ze.call(e)==Y}function $i(e){var t,n;return!(!Je(e)||Ze.call(e)!=O||Wi(e)||!(Ie.call(e,"constructor")||"function"!=typeof(t=e.constructor)||t instanceof t))&&(fn(e,function(e,t){n=t}),n===o||Ie.call(e,n))}function eo(e){return Ki(e)&&Ze.call(e)==R}function to(e){return"string"==typeof e||Je(e)&&Ze.call(e)==C}function no(e){return Je(e)&&Sr(e.length)&&!!we[Ze.call(e)]}function ro(e,t){return e<t}function io(e){var t=e?_r(e):0;return Sr(t)?t?Nt(e):[]:So(e)}function oo(e){return Xt(e,go(e))}var ao=Hn(function e(t,n,r,i,a){if(!Ki(t))return t;var s=br(n)&&(Gi(n)||no(n)),u=s?o:yo(n);return Ft(u||n,function(c,d){if(u&&(c=n[d=c]),Je(c))i||(i=[]),a||(a=[]),function(e,t,n,r,i,a,s){for(var u=a.length,c=t[n];u--;)if(a[u]==c)return void(e[n]=s[u]);var d=e[n],l=i?i(d,c,n,e,t):o,f=l===o;f&&(l=c,br(c)&&(Gi(c)||no(c))?l=Gi(d)?d:br(d)?Nt(d):[]:$i(c)||Wi(c)?l=Wi(d)?oo(d):$i(d)?d:{}:f=!1),a.push(c),s.push(l),f?e[n]=r(l,c,i,a,s):(l==l?l!==d:d==d)&&(e[n]=l)}(t,n,d,e,r,i,a);else{var l=t[d],f=r?r(l,c,d,t,n):o,p=f===o;p&&(f=c),f===o&&(!s||d in t)||!p&&(f==f?f===l:l!=l)||(t[d]=f)}}),t}),so=Hn(function(e,t,n){return n?Jt(e,t,n):Zt(e,t)});var uo=Jn(so,function(e,t){return e===o?t:e}),co=Jn(ao,function e(t,n){return t===o?n:ao(t,n,e)}),lo=Qn(pn),fo=Qn(hn),po=tr(dn),ho=tr(ln),mo=nr(pn),_o=nr(hn);function vo(e){return mn(e,go(e))}var yo=yt?function(e){var t=null==e?o:e.constructor;return"function"==typeof t&&t.prototype===e||"function"!=typeof e&&br(e)?Ir(e):Ki(e)?yt(e):[]}:Ir;function go(e){if(null==e)return[];Ki(e)||(e=xe(e));var t=e.length;t=t&&Sr(t)&&(Gi(e)||Wi(e))&&t||0;for(var r=e.constructor,i=-1,o="function"==typeof r&&r.prototype===e,a=n(t),s=t>0;++i<t;)a[i]=i+"";for(var u in e)s&&wr(u,t)||"constructor"==u&&(o||!Ie.call(e,u))||a.push(u);return a}var bo=rr(!0),wo=rr(),Mo=zi(function(e,t){if(null==e)return{};if("function"!=typeof t[0])return t=zt(cn(t),Le),Ar(e,nn(go(e),t));var n=Cn(t[0],t[1],3);return Er(e,function(e,t,r){return!n(e,t,r)})});function ko(e){e=Or(e);for(var t=-1,r=yo(e),i=r.length,o=n(i);++t<i;){var a=r[t];o[t]=[a,e[a]]}return o}var xo=zi(function(e,t){return null==e?{}:"function"==typeof t[0]?Er(e,Cn(t[0],t[1],3)):Ar(e,cn(t))});function So(e){return jn(e,yo(e))}var Lo=Wn(function(e,t,n){return t=t.toLowerCase(),e+(n?t.charAt(0).toUpperCase()+t.slice(1):t)});function Ao(e){return(e=Ne(e))&&e.replace(me,ze).replace(ue,"")}var Eo=Wn(function(e,t,n){return e+(n?"-":"")+t.toLowerCase()});var To=ir(),Do=ir(!0);function jo(e,t){var n="";if(e=Ne(e),(t=+t)<1||!e||!vt(t))return n;do{t%2&&(n+=e),t=mt(t/2),e+=e}while(t);return n}var Io=Wn(function(e,t,n){return e+(n?"_":"")+t.toLowerCase()}),Yo=Wn(function(e,t,n){return e+(n?" ":"")+(t.charAt(0).toUpperCase()+t.slice(1))});function Oo(e,t,n){var r=e;return(e=Ne(e))?(n?Mr(r,t,n):null==t)?e.slice(Xe(e),Qe(e)+1):(t+="",e.slice(Fe(e,t),He(e,t)+1)):e}function Ro(e,t,n){return n&&Mr(e,t,n)&&(t=o),(e=Ne(e)).match(t||ye)||[]}var Co=zi(function(e,t){try{return e.apply(o,t)}catch(e){return Ji(e)?e:new i(e)}});function Po(e,t,n){return n&&Mr(e,t,n)&&(t=o),Je(e)?No(e):Qt(e,t)}function Uo(e){return e}function No(e){return bn($t(e,!0))}var Fo=zi(function(e,t){return function(n){return gr(n,e,t)}}),Ho=zi(function(e,t){return function(n){return gr(e,n,t)}});function Bo(e,t,n){if(null==n){var r=Ki(t),i=r?yo(t):o,a=i&&i.length?mn(t,i):o;(a?a.length:r)||(a=!1,n=t,t=e,e=this)}a||(a=mn(t,yo(t)));var s=!0,u=-1,c=Zi(e),d=a.length;!1===n?s=!1:Ki(n)&&"chain"in n&&(s=n.chain);for(;++u<d;){var l=a[u],f=t[l];e[l]=f,c&&(e.prototype[l]=function(t){return function(){var n=this.__chain__;if(s||n){var r=e(this.__wrapped__);return(r.__actions__=Nt(this.__actions__)).push({func:t,args:arguments,thisArg:e}),r.__chain__=n,r}return t.apply(e,qt([this.value()],arguments))}}(f))}return e}function zo(){}function qo(e){return kr(e)?Mn(e):function(e){var t=e+"";return e=Rr(e),function(n){return _n(n,e,t)}}(e)}var Wo,Go=cr("ceil"),Vo=cr("floor"),Jo=Zn(qi,xt),Zo=Zn(ro,St),Ko=cr("round");return It.prototype=Yt.prototype,Ot.prototype=en(Yt.prototype),Ot.prototype.constructor=Ot,Rt.prototype=en(Yt.prototype),Rt.prototype.constructor=Rt,Ct.prototype.delete=function(e){return this.has(e)&&delete this.__data__[e]},Ct.prototype.get=function(e){return"__proto__"==e?o:this.__data__[e]},Ct.prototype.has=function(e){return"__proto__"!=e&&Ie.call(this.__data__,e)},Ct.prototype.set=function(e,t){return"__proto__"!=e&&(this.__data__[e]=t),this},Pt.prototype.push=function(e){var t=this.data;"string"==typeof e||Ki(e)?t.set.add(e):t.hash[e]=!0},Ui.Cache=Ct,It.after=function(e,t){if("function"!=typeof t){if("function"!=typeof e)throw new Ae(S);var n=e;e=t,t=n}return e=vt(e=+e)?e:0,function(){if(--e<1)return t.apply(this,arguments)}},It.ary=function(e,t,n){return n&&Mr(e,t,n)&&(t=o),t=e&&null==t?e.length:gt(+t||0,0),lr(e,_,o,o,o,o,t)},It.assign=so,It.at=si,It.before=Ai,It.bind=Ei,It.bindAll=Ti,It.bindKey=Di,It.callback=Po,It.chain=ii,It.chunk=function(e,t,r){t=(r?Mr(e,t,r):null==t)?1:gt(mt(t)||1,1);for(var i=0,o=e?e.length:0,a=-1,s=n(pt(o/t));i<o;)s[++a]=Ln(e,i,i+=t);return s},It.compact=function(e){for(var t=-1,n=e?e.length:0,r=-1,i=[];++t<n;){var o=e[t];o&&(i[++r]=o)}return i},It.constant=function(e){return function(){return e}},It.countBy=ui,It.create=function(e,t,n){var r=en(e);return n&&Mr(e,t,n)&&(t=o),t?Zt(r,t):r},It.curry=ji,It.curryRight=Ii,It.debounce=Yi,It.defaults=uo,It.defaultsDeep=co,It.defer=Oi,It.delay=Ri,It.difference=Pr,It.drop=Ur,It.dropRight=Nr,It.dropRightWhile=function(e,t,n){return e&&e.length?In(e,fr(t,n,3),!0,!0):[]},It.dropWhile=function(e,t,n){return e&&e.length?In(e,fr(t,n,3),!0):[]},It.fill=function(e,t,n,r){var i=e?e.length:0;return i?(n&&"number"!=typeof n&&Mr(e,t,n)&&(n=0,r=i),function(e,t,n,r){var i=e.length;for((n=null==n?0:+n||0)<0&&(n=-n>i?0:i+n),(r=r===o||r>i?i:+r||0)<0&&(r+=i),i=n>r?0:r>>>0,n>>>=0;n<i;)e[n++]=t;return e}(e,t,n,r)):[]},It.filter=di,It.flatten=function(e,t,n){var r=e?e.length:0;return n&&Mr(e,t,n)&&(t=!1),r?cn(e,t):[]},It.flattenDeep=function(e){return e&&e.length?cn(e,!0):[]},It.flow=Ci,It.flowRight=Pi,It.forEach=pi,It.forEachRight=hi,It.forIn=po,It.forInRight=ho,It.forOwn=mo,It.forOwnRight=_o,It.functions=vo,It.groupBy=mi,It.indexBy=vi,It.initial=function(e){return Nr(e,1)},It.intersection=qr,It.invert=function(e,t,n){n&&Mr(e,t,n)&&(t=o);for(var r=-1,i=yo(e),a=i.length,s={};++r<a;){var u=i[r],c=e[u];t?Ie.call(s,c)?s[c].push(u):s[c]=[u]:s[c]=u}return s},It.invoke=yi,It.keys=yo,It.keysIn=go,It.map=gi,It.mapKeys=bo,It.mapValues=wo,It.matches=No,It.matchesProperty=function(e,t){return wn(e,$t(t,!0))},It.memoize=Ui,It.merge=ao,It.method=Fo,It.methodOf=Ho,It.mixin=Bo,It.modArgs=Ni,It.negate=function(e){if("function"!=typeof e)throw new Ae(S);return function(){return!e.apply(this,arguments)}},It.omit=Mo,It.once=function(e){return Ai(2,e)},It.pairs=ko,It.partial=Fi,It.partialRight=Hi,It.partition=bi,It.pick=xo,It.pluck=function(e,t){return gi(e,qo(t))},It.property=qo,It.propertyOf=function(e){return function(t){return _n(e,Rr(t),t+"")}},It.pull=function(){var e=arguments,t=e[0];if(!t||!t.length)return t;for(var n=0,r=mr(),i=e.length;++n<i;)for(var o=0,a=e[n];(o=r(t,a,o))>-1;)dt.call(t,o,1);return t},It.pullAt=Gr,It.range=function(e,t,r){r&&Mr(e,t,r)&&(t=r=o),e=+e||0,null==t?(t=e,e=0):t=+t||0;for(var i=-1,a=gt(pt((t-e)/((r=null==r?1:+r||0)||1)),0),s=n(a);++i<a;)s[i]=e,e+=r;return s},It.rearg=Bi,It.reject=function(e,t,n){var r=Gi(e)?Bt:sn;return t=fr(t,n,3),r(e,function(e,n,r){return!t(e,n,r)})},It.remove=function(e,t,n){var r=[];if(!e||!e.length)return r;var i=-1,o=[],a=e.length;for(t=fr(t,n,3);++i<a;){var s=e[i];t(s,i,e)&&(r.push(s),o.push(i))}return kn(e,o),r},It.rest=Vr,It.restParam=zi,It.set=function(e,t,n){if(null==e)return e;for(var r=t+"",i=-1,o=(t=null!=e[r]||kr(t,e)?[r]:Rr(t)).length,a=o-1,s=e;null!=s&&++i<o;){var u=t[i];Ki(s)&&(i==a?s[u]=n:null==s[u]&&(s[u]=wr(t[i+1])?[]:{})),s=s[u]}return e},It.shuffle=function(e){return ki(e,St)},It.slice=function(e,t,n){var r=e?e.length:0;return r?(n&&"number"!=typeof n&&Mr(e,t,n)&&(t=0,n=r),Ln(e,t,n)):[]},It.sortBy=function(e,t,n){if(null==e)return[];n&&Mr(e,t,n)&&(t=o);var r=-1;return t=fr(t,n,3),En(gn(e,function(e,n,i){return{criteria:t(e,n,i),index:++r,value:e}}),Be)},It.sortByAll=Si,It.sortByOrder=function(e,t,n,r){return null==e?[]:(r&&Mr(t,n,r)&&(n=o),Gi(t)||(t=null==t?[]:[t]),Gi(n)||(n=null==n?[]:[n]),Tn(e,t,n))},It.spread=function(e){if("function"!=typeof e)throw new Ae(S);return function(t){return e.apply(this,t)}},It.take=function(e,t,n){return e&&e.length?((n?Mr(e,t,n):null==t)&&(t=1),Ln(e,0,t<0?0:t)):[]},It.takeRight=function(e,t,n){var r=e?e.length:0;return r?((n?Mr(e,t,n):null==t)&&(t=1),Ln(e,(t=r-(+t||0))<0?0:t)):[]},It.takeRightWhile=function(e,t,n){return e&&e.length?In(e,fr(t,n,3),!1,!0):[]},It.takeWhile=function(e,t,n){return e&&e.length?In(e,fr(t,n,3)):[]},It.tap=function(e,t,n){return t.call(n,e),e},It.throttle=function(e,t,n){var r=!0,i=!0;if("function"!=typeof e)throw new Ae(S);return!1===n?r=!1:Ki(n)&&(r="leading"in n?!!n.leading:r,i="trailing"in n?!!n.trailing:i),Yi(e,t,{leading:r,maxWait:+t,trailing:i})},It.thru=oi,It.times=function(e,t,r){if((e=mt(e))<1||!vt(e))return[];var i=-1,o=n(bt(e,Lt));for(t=Cn(t,r,1);++i<e;)i<Lt?o[i]=t(i):t(i);return o},It.toArray=io,It.toPlainObject=oo,It.transform=function(e,t,n,r){var i=Gi(e)||no(e);if(t=fr(t,r,4),null==n)if(i||Ki(e)){var a=e.constructor;n=i?Gi(e)?new a:[]:en(Zi(a)?a.prototype:o)}else n={};return(i?Ft:pn)(e,function(e,r,i){return t(n,e,r,i)}),n},It.union=Kr,It.uniq=Xr,It.unzip=Qr,It.unzipWith=$r,It.values=So,It.valuesIn=function(e){return jn(e,go(e))},It.where=function(e,t){return di(e,bn(t))},It.without=ei,It.wrap=function(e,t){return lr(t=null==t?Uo:t,h,o,[e],[])},It.xor=function(){for(var e=-1,t=arguments.length;++e<t;){var n=arguments[e];if(br(n))var r=r?qt(nn(r,n),nn(n,r)):n}return r?Dn(r):[]},It.zip=ti,It.zipObject=ni,It.zipWith=ri,It.backflow=Pi,It.collect=gi,It.compose=Pi,It.each=pi,It.eachRight=hi,It.extend=so,It.iteratee=Po,It.methods=vo,It.object=ni,It.select=di,It.tail=Vr,It.unique=Xr,Bo(It,It),It.add=function(e,t){return(+e||0)+(+t||0)},It.attempt=Co,It.camelCase=Lo,It.capitalize=function(e){return(e=Ne(e))&&e.charAt(0).toUpperCase()+e.slice(1)},It.ceil=Go,It.clone=function(e,t,n,r){return t&&"boolean"!=typeof t&&Mr(e,t,n)?t=!1:"function"==typeof t&&(r=n,n=t,t=!1),"function"==typeof n?$t(e,t,Cn(n,r,1)):$t(e,t)},It.cloneDeep=function(e,t,n){return"function"==typeof t?$t(e,!0,Cn(t,n,1)):$t(e,!0)},It.deburr=Ao,It.endsWith=function(e,t,n){t+="";var r=(e=Ne(e)).length;return n=n===o?r:bt(n<0?0:+n||0,r),(n-=t.length)>=0&&e.indexOf(t,n)==n},It.escape=function(e){return(e=Ne(e))&&$.test(e)?e.replace(X,qe):e},It.escapeRegExp=function(e){return(e=Ne(e))&&se.test(e)?e.replace(ae,We):e||"(?:)"},It.every=ci,It.find=li,It.findIndex=Fr,It.findKey=lo,It.findLast=fi,It.findLastIndex=Hr,It.findLastKey=fo,It.findWhere=function(e,t){return li(e,bn(t))},It.first=Br,It.floor=Vo,It.get=function(e,t,n){var r=null==e?o:_n(e,Rr(t),t+"");return r===o?n:r},It.gt=qi,It.gte=function(e,t){return e>=t},It.has=function(e,t){if(null==e)return!1;var n=Ie.call(e,t);if(!n&&!kr(t)){if(null==(e=1==(t=Rr(t)).length?e:_n(e,Ln(t,0,-1))))return!1;t=Wr(t),n=Ie.call(e,t)}return n||Sr(e.length)&&wr(t,e.length)&&(Gi(e)||Wi(e))},It.identity=Uo,It.includes=_i,It.indexOf=zr,It.inRange=function(e,t,n){return t=+t||0,n===o?(n=t,t=0):n=+n||0,e>=bt(t,n)&&e<gt(t,n)},It.isArguments=Wi,It.isArray=Gi,It.isBoolean=function(e){return!0===e||!1===e||Je(e)&&Ze.call(e)==T},It.isDate=function(e){return Je(e)&&Ze.call(e)==D},It.isElement=function(e){return!!e&&1===e.nodeType&&Je(e)&&!$i(e)},It.isEmpty=function(e){return null==e||(br(e)&&(Gi(e)||to(e)||Wi(e)||Je(e)&&Zi(e.splice))?!e.length:!yo(e).length)},It.isEqual=Vi,It.isError=Ji,It.isFinite=function(e){return"number"==typeof e&&vt(e)},It.isFunction=Zi,It.isMatch=function(e,t,n,r){return n="function"==typeof n?Cn(n,r,3):o,yn(e,vr(t),n)},It.isNaN=function(e){return Qi(e)&&e!=+e},It.isNative=Xi,It.isNull=function(e){return null===e},It.isNumber=Qi,It.isObject=Ki,It.isPlainObject=$i,It.isRegExp=eo,It.isString=to,It.isTypedArray=no,It.isUndefined=function(e){return e===o},It.kebabCase=Eo,It.last=Wr,It.lastIndexOf=function(e,t,n){var r=e?e.length:0;if(!r)return-1;var i=r;if("number"==typeof n)i=(n<0?gt(r+n,0):bt(n||0,r-1))+1;else if(n){var o=e[i=On(e,t,!0)-1];return(t==t?t===o:o!=o)?i:-1}if(t!=t)return Ve(e,i,!0);for(;i--;)if(e[i]===t)return i;return-1},It.lt=ro,It.lte=function(e,t){return e<=t},It.max=Jo,It.min=Zo,It.noConflict=function(){return Oe._=tt,this},It.noop=zo,It.now=Li,It.pad=function(e,t,n){t=+t;var r=(e=Ne(e)).length;if(r>=t||!vt(t))return e;var i=(t-r)/2,o=mt(i);return(n=ur("",pt(i),n)).slice(0,o)+e+n},It.padLeft=To,It.padRight=Do,It.parseInt=function(e,t,n){return(n?Mr(e,t,n):null==t)?t=0:t&&(t=+t),e=Oo(e),Mt(e,t||(fe.test(e)?16:10))},It.random=function(e,t,n){n&&Mr(e,t,n)&&(t=n=o);var r=null==e,i=null==t;if(null==n&&(i&&"boolean"==typeof e?(n=e,e=1):"boolean"==typeof t&&(n=t,i=!0)),r&&i&&(t=1,i=!1),e=+e||0,i?(t=e,e=0):t=+t||0,n||e%1||t%1){var a=kt();return bt(e+a*(t-e+ot("1e-"+((a+"").length-1))),t)}return xn(e,t)},It.reduce=wi,It.reduceRight=Mi,It.repeat=jo,It.result=function(e,t,n){var r=null==e?o:e[t];return r===o&&(null==e||kr(t,e)||(r=null==(e=1==(t=Rr(t)).length?e:_n(e,Ln(t,0,-1)))?o:e[Wr(t)]),r=r===o?n:r),Zi(r)?r.call(e):r},It.round=Ko,It.runInContext=e,It.size=function(e){var t=e?_r(e):0;return Sr(t)?t:yo(e).length},It.snakeCase=Io,It.some=xi,It.sortedIndex=Jr,It.sortedLastIndex=Zr,It.startCase=Yo,It.startsWith=function(e,t,n){return e=Ne(e),n=null==n?0:bt(n<0?0:+n||0,e.length),e.lastIndexOf(t,n)==n},It.sum=function(e,t,n){return n&&Mr(e,t,n)&&(t=o),1==(t=fr(t,n,3)).length?function(e,t){for(var n=e.length,r=0;n--;)r+=+t(e[n])||0;return r}(Gi(e)?e:Yr(e),t):function(e,t){var n=0;return rn(e,function(e,r,i){n+=+t(e,r,i)||0}),n}(e,t)},It.template=function(e,t,n){var r=It.templateSettings;n&&Mr(e,t,n)&&(t=n=o),e=Ne(e),t=Jt(Zt({},n||t),r,Vt);var i,s,u=Jt(Zt({},t.imports),r.imports,Vt),c=yo(u),d=jn(u,c),l=0,f=t.interpolate||_e,p="__p += '",h=Se((t.escape||_e).source+"|"+f.source+"|"+(f===ne?de:_e).source+"|"+(t.evaluate||_e).source+"|$","g"),m="//# sourceURL="+("sourceURL"in t?t.sourceURL:"lodash.templateSources["+ ++be+"]")+"\n";e.replace(h,function(t,n,r,o,a,u){return r||(r=o),p+=e.slice(l,u).replace(ve,Ge),n&&(i=!0,p+="' +\n__e("+n+") +\n'"),a&&(s=!0,p+="';\n"+a+";\n__p += '"),r&&(p+="' +\n((__t = ("+r+")) == null ? '' : __t) +\n'"),l=u+t.length,t}),p+="';\n";var _=t.variable;_||(p="with (obj) {\n"+p+"\n}\n"),p=(s?p.replace(V,""):p).replace(J,"$1").replace(Z,"$1;"),p="function("+(_||"obj")+") {\n"+(_?"":"obj || (obj = {});\n")+"var __t, __p = ''"+(i?", __e = _.escape":"")+(s?", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n":";\n")+p+"return __p\n}";var v=Co(function(){return a(c,m+"return "+p).apply(o,d)});if(v.source=p,Ji(v))throw v;return v},It.trim=Oo,It.trimLeft=function(e,t,n){var r=e;return(e=Ne(e))?(n?Mr(r,t,n):null==t)?e.slice(Xe(e)):e.slice(Fe(e,t+"")):e},It.trimRight=function(e,t,n){var r=e;return(e=Ne(e))?(n?Mr(r,t,n):null==t)?e.slice(0,Qe(e)+1):e.slice(0,He(e,t+"")+1):e},It.trunc=function(e,t,n){n&&Mr(e,t,n)&&(t=o);var r=y,i=g;if(null!=t)if(Ki(t)){var a="separator"in t?t.separator:a;r="length"in t?+t.length||0:r,i="omission"in t?Ne(t.omission):i}else r=+t||0;if(r>=(e=Ne(e)).length)return e;var s=r-i.length;if(s<1)return i;var u=e.slice(0,s);if(null==a)return u+i;if(eo(a)){if(e.slice(s).search(a)){var c,d,l=e.slice(0,s);for(a.global||(a=Se(a.source,(le.exec(a)||"")+"g")),a.lastIndex=0;c=a.exec(l);)d=c.index;u=u.slice(0,null==d?s:d)}}else if(e.indexOf(a,s)!=s){var f=u.lastIndexOf(a);f>-1&&(u=u.slice(0,f))}return u+i},It.unescape=function(e){return(e=Ne(e))&&Q.test(e)?e.replace(K,$e):e},It.uniqueId=function(e){var t=++Ye;return Ne(e)+t},It.words=Ro,It.all=ci,It.any=xi,It.contains=_i,It.eq=Vi,It.detect=li,It.foldl=wi,It.foldr=Mi,It.head=Br,It.include=_i,It.inject=wi,Bo(It,(Wo={},pn(It,function(e,t){It.prototype[t]||(Wo[t]=e)}),Wo),!1),It.sample=ki,It.prototype.sample=function(e){return this.__chain__||null!=e?this.thru(function(t){return ki(t,e)}):ki(this.value())},It.VERSION=u,Ft(["bind","bindKey","curry","curryRight","partial","partialRight"],function(e){It[e].placeholder=It}),Ft(["drop","take"],function(e,t){Rt.prototype[e]=function(n){var r=this.__filtered__;if(r&&!t)return new Rt(this);n=null==n?1:gt(mt(n)||0,0);var i=this.clone();return r?i.__takeCount__=bt(i.__takeCount__,n):i.__views__.push({size:n,type:e+(i.__dir__<0?"Right":"")}),i},Rt.prototype[e+"Right"]=function(t){return this.reverse()[e](t).reverse()}}),Ft(["filter","map","takeWhile"],function(e,t){var n=t+1,r=n!=x;Rt.prototype[e]=function(e,t){var i=this.clone();return i.__iteratees__.push({iteratee:fr(e,t,1),type:n}),i.__filtered__=i.__filtered__||r,i}}),Ft(["first","last"],function(e,t){var n="take"+(t?"Right":"");Rt.prototype[e]=function(){return this[n](1).value()[0]}}),Ft(["initial","rest"],function(e,t){var n="drop"+(t?"":"Right");Rt.prototype[e]=function(){return this.__filtered__?new Rt(this):this[n](1)}}),Ft(["pluck","where"],function(e,t){var n=t?"filter":"map",r=t?bn:qo;Rt.prototype[e]=function(e){return this[n](r(e))}}),Rt.prototype.compact=function(){return this.filter(Uo)},Rt.prototype.reject=function(e,t){return e=fr(e,t,1),this.filter(function(t){return!e(t)})},Rt.prototype.slice=function(e,t){e=null==e?0:+e||0;var n=this;return n.__filtered__&&(e>0||t<0)?new Rt(n):(e<0?n=n.takeRight(-e):e&&(n=n.drop(e)),t!==o&&(n=(t=+t||0)<0?n.dropRight(-t):n.take(t-e)),n)},Rt.prototype.takeRightWhile=function(e,t){return this.reverse().takeWhile(e,t).reverse()},Rt.prototype.toArray=function(){return this.take(St)},pn(Rt.prototype,function(e,t){var n=/^(?:filter|map|reject)|While$/.test(t),r=/^(?:first|last)$/.test(t),i=It[r?"take"+("last"==t?"Right":""):t];i&&(It.prototype[t]=function(){var t=r?[1]:arguments,a=this.__chain__,s=this.__wrapped__,u=!!this.__actions__.length,c=s instanceof Rt,d=t[0],l=c||Gi(s);l&&n&&"function"==typeof d&&1!=d.length&&(c=l=!1);var f=function(e){return r&&a?i(e,1)[0]:i.apply(o,qt([e],t))},p={func:oi,args:[f],thisArg:o},h=c&&!u;if(r&&!a)return h?((s=s.clone()).__actions__.push(p),e.call(s)):i.call(o,this.value())[0];if(!r&&l){s=h?s:new Rt(this);var m=e.apply(s,t);return m.__actions__.push(p),new Ot(m,a)}return this.thru(f)})}),Ft(["join","pop","push","replace","shift","sort","splice","split","unshift"],function(e){var t=(/^(?:replace|split)$/.test(e)?De:Ee)[e],n=/^(?:push|sort|unshift)$/.test(e)?"tap":"thru",r=/^(?:join|pop|replace|shift)$/.test(e);It.prototype[e]=function(){var e=arguments;return r&&!this.__chain__?t.apply(this.value(),e):this[n](function(n){return t.apply(n,e)})}}),pn(Rt.prototype,function(e,t){var n=It[t];if(n){var r=n.name;(jt[r]||(jt[r]=[])).push({name:t,func:n})}}),jt[sr(o,d).name]=[{name:"wrapper",func:o}],Rt.prototype.clone=function(){var e=new Rt(this.__wrapped__);return e.__actions__=Nt(this.__actions__),e.__dir__=this.__dir__,e.__filtered__=this.__filtered__,e.__iteratees__=Nt(this.__iteratees__),e.__takeCount__=this.__takeCount__,e.__views__=Nt(this.__views__),e},Rt.prototype.reverse=function(){if(this.__filtered__){var e=new Rt(this);e.__dir__=-1,e.__filtered__=!0}else(e=this.clone()).__dir__*=-1;return e},Rt.prototype.value=function(){var e=this.__wrapped__.value(),t=this.__dir__,n=Gi(e),r=t<0,i=n?e.length:0,o=function(e,t,n){for(var r=-1,i=n.length;++r<i;){var o=n[r],a=o.size;switch(o.type){case"drop":e+=a;break;case"dropRight":t-=a;break;case"take":t=bt(t,e+a);break;case"takeRight":e=gt(e,t-a)}}return{start:e,end:t}}(0,i,this.__views__),a=o.start,s=o.end,u=s-a,c=r?s:a-1,d=this.__iteratees__,l=d.length,f=0,p=bt(u,this.__takeCount__);if(!n||i<M||i==u&&p==u)return Yn(r&&n?e.reverse():e,this.__actions__);var h=[];e:for(;u--&&f<p;){for(var m=-1,_=e[c+=t];++m<l;){var v=d[m],y=v.iteratee,g=v.type,b=y(_);if(g==x)_=b;else if(!b){if(g==k)continue e;break e}}h[f++]=_}return h},It.prototype.chain=function(){return ii(this)},It.prototype.commit=function(){return new Ot(this.value(),this.__chain__)},It.prototype.concat=ai,It.prototype.plant=function(e){for(var t,n=this;n instanceof Yt;){var r=Cr(n);t?i.__wrapped__=r:t=r;var i=r;n=n.__wrapped__}return i.__wrapped__=e,t},It.prototype.reverse=function(){var e=this.__wrapped__,t=function(e){return n&&n.__dir__<0?e:e.reverse()};if(e instanceof Rt){var n=e;return this.__actions__.length&&(n=new Rt(this)),(n=n.reverse()).__actions__.push({func:oi,args:[t],thisArg:o}),new Ot(n,this.__chain__)}return this.thru(t)},It.prototype.toString=function(){return this.value()+""},It.prototype.run=It.prototype.toJSON=It.prototype.valueOf=It.prototype.value=function(){return Yn(this.__wrapped__,this.__actions__)},It.prototype.collect=It.prototype.map,It.prototype.head=It.prototype.first,It.prototype.select=It.prototype.filter,It.prototype.tail=It.prototype.rest,It}();Oe._=et,(i=function(){return et}.call(t,n,t,e))===o||(e.exports=i)}).call(this)}).call(this,n(12)(e),n(4))},function(e,t,n){e.exports=n(527)},function(e,t,n){"use strict";(function(e){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
var r=n(373),i=n(374),o=n(118);function a(){return u.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function s(e,t){if(a()<t)throw new RangeError("Invalid typed array length");return u.TYPED_ARRAY_SUPPORT?(e=new Uint8Array(t)).__proto__=u.prototype:(null===e&&(e=new u(t)),e.length=t),e}function u(e,t,n){if(!(u.TYPED_ARRAY_SUPPORT||this instanceof u))return new u(e,t,n);if("number"==typeof e){if("string"==typeof t)throw new Error("If encoding is specified then the first argument must be a string");return l(this,e)}return c(this,e,t,n)}function c(e,t,n,r){if("number"==typeof t)throw new TypeError('"value" argument must not be a number');return"undefined"!=typeof ArrayBuffer&&t instanceof ArrayBuffer?function(e,t,n,r){if(t.byteLength,n<0||t.byteLength<n)throw new RangeError("'offset' is out of bounds");if(t.byteLength<n+(r||0))throw new RangeError("'length' is out of bounds");t=void 0===n&&void 0===r?new Uint8Array(t):void 0===r?new Uint8Array(t,n):new Uint8Array(t,n,r);u.TYPED_ARRAY_SUPPORT?(e=t).__proto__=u.prototype:e=f(e,t);return e}(e,t,n,r):"string"==typeof t?function(e,t,n){"string"==typeof n&&""!==n||(n="utf8");if(!u.isEncoding(n))throw new TypeError('"encoding" must be a valid string encoding');var r=0|h(t,n),i=(e=s(e,r)).write(t,n);i!==r&&(e=e.slice(0,i));return e}(e,t,n):function(e,t){if(u.isBuffer(t)){var n=0|p(t.length);return 0===(e=s(e,n)).length?e:(t.copy(e,0,0,n),e)}if(t){if("undefined"!=typeof ArrayBuffer&&t.buffer instanceof ArrayBuffer||"length"in t)return"number"!=typeof t.length||(r=t.length)!=r?s(e,0):f(e,t);if("Buffer"===t.type&&o(t.data))return f(e,t.data)}var r;throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}(e,t)}function d(e){if("number"!=typeof e)throw new TypeError('"size" argument must be a number');if(e<0)throw new RangeError('"size" argument must not be negative')}function l(e,t){if(d(t),e=s(e,t<0?0:0|p(t)),!u.TYPED_ARRAY_SUPPORT)for(var n=0;n<t;++n)e[n]=0;return e}function f(e,t){var n=t.length<0?0:0|p(t.length);e=s(e,n);for(var r=0;r<n;r+=1)e[r]=255&t[r];return e}function p(e){if(e>=a())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+a().toString(16)+" bytes");return 0|e}function h(e,t){if(u.isBuffer(e))return e.length;if("undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(e)||e instanceof ArrayBuffer))return e.byteLength;"string"!=typeof e&&(e=""+e);var n=e.length;if(0===n)return 0;for(var r=!1;;)switch(t){case"ascii":case"latin1":case"binary":return n;case"utf8":case"utf-8":case void 0:return F(e).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*n;case"hex":return n>>>1;case"base64":return H(e).length;default:if(r)return F(e).length;t=(""+t).toLowerCase(),r=!0}}function m(e,t,n){var r=e[t];e[t]=e[n],e[n]=r}function _(e,t,n,r,i){if(0===e.length)return-1;if("string"==typeof n?(r=n,n=0):n>2147483647?n=2147483647:n<-2147483648&&(n=-2147483648),n=+n,isNaN(n)&&(n=i?0:e.length-1),n<0&&(n=e.length+n),n>=e.length){if(i)return-1;n=e.length-1}else if(n<0){if(!i)return-1;n=0}if("string"==typeof t&&(t=u.from(t,r)),u.isBuffer(t))return 0===t.length?-1:v(e,t,n,r,i);if("number"==typeof t)return t&=255,u.TYPED_ARRAY_SUPPORT&&"function"==typeof Uint8Array.prototype.indexOf?i?Uint8Array.prototype.indexOf.call(e,t,n):Uint8Array.prototype.lastIndexOf.call(e,t,n):v(e,[t],n,r,i);throw new TypeError("val must be string, number or Buffer")}function v(e,t,n,r,i){var o,a=1,s=e.length,u=t.length;if(void 0!==r&&("ucs2"===(r=String(r).toLowerCase())||"ucs-2"===r||"utf16le"===r||"utf-16le"===r)){if(e.length<2||t.length<2)return-1;a=2,s/=2,u/=2,n/=2}function c(e,t){return 1===a?e[t]:e.readUInt16BE(t*a)}if(i){var d=-1;for(o=n;o<s;o++)if(c(e,o)===c(t,-1===d?0:o-d)){if(-1===d&&(d=o),o-d+1===u)return d*a}else-1!==d&&(o-=o-d),d=-1}else for(n+u>s&&(n=s-u),o=n;o>=0;o--){for(var l=!0,f=0;f<u;f++)if(c(e,o+f)!==c(t,f)){l=!1;break}if(l)return o}return-1}function y(e,t,n,r){n=Number(n)||0;var i=e.length-n;r?(r=Number(r))>i&&(r=i):r=i;var o=t.length;if(o%2!=0)throw new TypeError("Invalid hex string");r>o/2&&(r=o/2);for(var a=0;a<r;++a){var s=parseInt(t.substr(2*a,2),16);if(isNaN(s))return a;e[n+a]=s}return a}function g(e,t,n,r){return B(F(t,e.length-n),e,n,r)}function b(e,t,n,r){return B(function(e){for(var t=[],n=0;n<e.length;++n)t.push(255&e.charCodeAt(n));return t}(t),e,n,r)}function w(e,t,n,r){return b(e,t,n,r)}function M(e,t,n,r){return B(H(t),e,n,r)}function k(e,t,n,r){return B(function(e,t){for(var n,r,i,o=[],a=0;a<e.length&&!((t-=2)<0);++a)n=e.charCodeAt(a),r=n>>8,i=n%256,o.push(i),o.push(r);return o}(t,e.length-n),e,n,r)}function x(e,t,n){return 0===t&&n===e.length?r.fromByteArray(e):r.fromByteArray(e.slice(t,n))}function S(e,t,n){n=Math.min(e.length,n);for(var r=[],i=t;i<n;){var o,a,s,u,c=e[i],d=null,l=c>239?4:c>223?3:c>191?2:1;if(i+l<=n)switch(l){case 1:c<128&&(d=c);break;case 2:128==(192&(o=e[i+1]))&&(u=(31&c)<<6|63&o)>127&&(d=u);break;case 3:o=e[i+1],a=e[i+2],128==(192&o)&&128==(192&a)&&(u=(15&c)<<12|(63&o)<<6|63&a)>2047&&(u<55296||u>57343)&&(d=u);break;case 4:o=e[i+1],a=e[i+2],s=e[i+3],128==(192&o)&&128==(192&a)&&128==(192&s)&&(u=(15&c)<<18|(63&o)<<12|(63&a)<<6|63&s)>65535&&u<1114112&&(d=u)}null===d?(d=65533,l=1):d>65535&&(d-=65536,r.push(d>>>10&1023|55296),d=56320|1023&d),r.push(d),i+=l}return function(e){var t=e.length;if(t<=L)return String.fromCharCode.apply(String,e);var n="",r=0;for(;r<t;)n+=String.fromCharCode.apply(String,e.slice(r,r+=L));return n}(r)}t.Buffer=u,t.SlowBuffer=function(e){+e!=e&&(e=0);return u.alloc(+e)},t.INSPECT_MAX_BYTES=50,u.TYPED_ARRAY_SUPPORT=void 0!==e.TYPED_ARRAY_SUPPORT?e.TYPED_ARRAY_SUPPORT:function(){try{var e=new Uint8Array(1);return e.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===e.foo()&&"function"==typeof e.subarray&&0===e.subarray(1,1).byteLength}catch(e){return!1}}(),t.kMaxLength=a(),u.poolSize=8192,u._augment=function(e){return e.__proto__=u.prototype,e},u.from=function(e,t,n){return c(null,e,t,n)},u.TYPED_ARRAY_SUPPORT&&(u.prototype.__proto__=Uint8Array.prototype,u.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&u[Symbol.species]===u&&Object.defineProperty(u,Symbol.species,{value:null,configurable:!0})),u.alloc=function(e,t,n){return function(e,t,n,r){return d(t),t<=0?s(e,t):void 0!==n?"string"==typeof r?s(e,t).fill(n,r):s(e,t).fill(n):s(e,t)}(null,e,t,n)},u.allocUnsafe=function(e){return l(null,e)},u.allocUnsafeSlow=function(e){return l(null,e)},u.isBuffer=function(e){return!(null==e||!e._isBuffer)},u.compare=function(e,t){if(!u.isBuffer(e)||!u.isBuffer(t))throw new TypeError("Arguments must be Buffers");if(e===t)return 0;for(var n=e.length,r=t.length,i=0,o=Math.min(n,r);i<o;++i)if(e[i]!==t[i]){n=e[i],r=t[i];break}return n<r?-1:r<n?1:0},u.isEncoding=function(e){switch(String(e).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},u.concat=function(e,t){if(!o(e))throw new TypeError('"list" argument must be an Array of Buffers');if(0===e.length)return u.alloc(0);var n;if(void 0===t)for(t=0,n=0;n<e.length;++n)t+=e[n].length;var r=u.allocUnsafe(t),i=0;for(n=0;n<e.length;++n){var a=e[n];if(!u.isBuffer(a))throw new TypeError('"list" argument must be an Array of Buffers');a.copy(r,i),i+=a.length}return r},u.byteLength=h,u.prototype._isBuffer=!0,u.prototype.swap16=function(){var e=this.length;if(e%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var t=0;t<e;t+=2)m(this,t,t+1);return this},u.prototype.swap32=function(){var e=this.length;if(e%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var t=0;t<e;t+=4)m(this,t,t+3),m(this,t+1,t+2);return this},u.prototype.swap64=function(){var e=this.length;if(e%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var t=0;t<e;t+=8)m(this,t,t+7),m(this,t+1,t+6),m(this,t+2,t+5),m(this,t+3,t+4);return this},u.prototype.toString=function(){var e=0|this.length;return 0===e?"":0===arguments.length?S(this,0,e):function(e,t,n){var r=!1;if((void 0===t||t<0)&&(t=0),t>this.length)return"";if((void 0===n||n>this.length)&&(n=this.length),n<=0)return"";if((n>>>=0)<=(t>>>=0))return"";for(e||(e="utf8");;)switch(e){case"hex":return T(this,t,n);case"utf8":case"utf-8":return S(this,t,n);case"ascii":return A(this,t,n);case"latin1":case"binary":return E(this,t,n);case"base64":return x(this,t,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return D(this,t,n);default:if(r)throw new TypeError("Unknown encoding: "+e);e=(e+"").toLowerCase(),r=!0}}.apply(this,arguments)},u.prototype.equals=function(e){if(!u.isBuffer(e))throw new TypeError("Argument must be a Buffer");return this===e||0===u.compare(this,e)},u.prototype.inspect=function(){var e="",n=t.INSPECT_MAX_BYTES;return this.length>0&&(e=this.toString("hex",0,n).match(/.{2}/g).join(" "),this.length>n&&(e+=" ... ")),"<Buffer "+e+">"},u.prototype.compare=function(e,t,n,r,i){if(!u.isBuffer(e))throw new TypeError("Argument must be a Buffer");if(void 0===t&&(t=0),void 0===n&&(n=e?e.length:0),void 0===r&&(r=0),void 0===i&&(i=this.length),t<0||n>e.length||r<0||i>this.length)throw new RangeError("out of range index");if(r>=i&&t>=n)return 0;if(r>=i)return-1;if(t>=n)return 1;if(this===e)return 0;for(var o=(i>>>=0)-(r>>>=0),a=(n>>>=0)-(t>>>=0),s=Math.min(o,a),c=this.slice(r,i),d=e.slice(t,n),l=0;l<s;++l)if(c[l]!==d[l]){o=c[l],a=d[l];break}return o<a?-1:a<o?1:0},u.prototype.includes=function(e,t,n){return-1!==this.indexOf(e,t,n)},u.prototype.indexOf=function(e,t,n){return _(this,e,t,n,!0)},u.prototype.lastIndexOf=function(e,t,n){return _(this,e,t,n,!1)},u.prototype.write=function(e,t,n,r){if(void 0===t)r="utf8",n=this.length,t=0;else if(void 0===n&&"string"==typeof t)r=t,n=this.length,t=0;else{if(!isFinite(t))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");t|=0,isFinite(n)?(n|=0,void 0===r&&(r="utf8")):(r=n,n=void 0)}var i=this.length-t;if((void 0===n||n>i)&&(n=i),e.length>0&&(n<0||t<0)||t>this.length)throw new RangeError("Attempt to write outside buffer bounds");r||(r="utf8");for(var o=!1;;)switch(r){case"hex":return y(this,e,t,n);case"utf8":case"utf-8":return g(this,e,t,n);case"ascii":return b(this,e,t,n);case"latin1":case"binary":return w(this,e,t,n);case"base64":return M(this,e,t,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return k(this,e,t,n);default:if(o)throw new TypeError("Unknown encoding: "+r);r=(""+r).toLowerCase(),o=!0}},u.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var L=4096;function A(e,t,n){var r="";n=Math.min(e.length,n);for(var i=t;i<n;++i)r+=String.fromCharCode(127&e[i]);return r}function E(e,t,n){var r="";n=Math.min(e.length,n);for(var i=t;i<n;++i)r+=String.fromCharCode(e[i]);return r}function T(e,t,n){var r=e.length;(!t||t<0)&&(t=0),(!n||n<0||n>r)&&(n=r);for(var i="",o=t;o<n;++o)i+=N(e[o]);return i}function D(e,t,n){for(var r=e.slice(t,n),i="",o=0;o<r.length;o+=2)i+=String.fromCharCode(r[o]+256*r[o+1]);return i}function j(e,t,n){if(e%1!=0||e<0)throw new RangeError("offset is not uint");if(e+t>n)throw new RangeError("Trying to access beyond buffer length")}function I(e,t,n,r,i,o){if(!u.isBuffer(e))throw new TypeError('"buffer" argument must be a Buffer instance');if(t>i||t<o)throw new RangeError('"value" argument is out of bounds');if(n+r>e.length)throw new RangeError("Index out of range")}function Y(e,t,n,r){t<0&&(t=65535+t+1);for(var i=0,o=Math.min(e.length-n,2);i<o;++i)e[n+i]=(t&255<<8*(r?i:1-i))>>>8*(r?i:1-i)}function O(e,t,n,r){t<0&&(t=4294967295+t+1);for(var i=0,o=Math.min(e.length-n,4);i<o;++i)e[n+i]=t>>>8*(r?i:3-i)&255}function R(e,t,n,r,i,o){if(n+r>e.length)throw new RangeError("Index out of range");if(n<0)throw new RangeError("Index out of range")}function C(e,t,n,r,o){return o||R(e,0,n,4),i.write(e,t,n,r,23,4),n+4}function P(e,t,n,r,o){return o||R(e,0,n,8),i.write(e,t,n,r,52,8),n+8}u.prototype.slice=function(e,t){var n,r=this.length;if((e=~~e)<0?(e+=r)<0&&(e=0):e>r&&(e=r),(t=void 0===t?r:~~t)<0?(t+=r)<0&&(t=0):t>r&&(t=r),t<e&&(t=e),u.TYPED_ARRAY_SUPPORT)(n=this.subarray(e,t)).__proto__=u.prototype;else{var i=t-e;n=new u(i,void 0);for(var o=0;o<i;++o)n[o]=this[o+e]}return n},u.prototype.readUIntLE=function(e,t,n){e|=0,t|=0,n||j(e,t,this.length);for(var r=this[e],i=1,o=0;++o<t&&(i*=256);)r+=this[e+o]*i;return r},u.prototype.readUIntBE=function(e,t,n){e|=0,t|=0,n||j(e,t,this.length);for(var r=this[e+--t],i=1;t>0&&(i*=256);)r+=this[e+--t]*i;return r},u.prototype.readUInt8=function(e,t){return t||j(e,1,this.length),this[e]},u.prototype.readUInt16LE=function(e,t){return t||j(e,2,this.length),this[e]|this[e+1]<<8},u.prototype.readUInt16BE=function(e,t){return t||j(e,2,this.length),this[e]<<8|this[e+1]},u.prototype.readUInt32LE=function(e,t){return t||j(e,4,this.length),(this[e]|this[e+1]<<8|this[e+2]<<16)+16777216*this[e+3]},u.prototype.readUInt32BE=function(e,t){return t||j(e,4,this.length),16777216*this[e]+(this[e+1]<<16|this[e+2]<<8|this[e+3])},u.prototype.readIntLE=function(e,t,n){e|=0,t|=0,n||j(e,t,this.length);for(var r=this[e],i=1,o=0;++o<t&&(i*=256);)r+=this[e+o]*i;return r>=(i*=128)&&(r-=Math.pow(2,8*t)),r},u.prototype.readIntBE=function(e,t,n){e|=0,t|=0,n||j(e,t,this.length);for(var r=t,i=1,o=this[e+--r];r>0&&(i*=256);)o+=this[e+--r]*i;return o>=(i*=128)&&(o-=Math.pow(2,8*t)),o},u.prototype.readInt8=function(e,t){return t||j(e,1,this.length),128&this[e]?-1*(255-this[e]+1):this[e]},u.prototype.readInt16LE=function(e,t){t||j(e,2,this.length);var n=this[e]|this[e+1]<<8;return 32768&n?4294901760|n:n},u.prototype.readInt16BE=function(e,t){t||j(e,2,this.length);var n=this[e+1]|this[e]<<8;return 32768&n?4294901760|n:n},u.prototype.readInt32LE=function(e,t){return t||j(e,4,this.length),this[e]|this[e+1]<<8|this[e+2]<<16|this[e+3]<<24},u.prototype.readInt32BE=function(e,t){return t||j(e,4,this.length),this[e]<<24|this[e+1]<<16|this[e+2]<<8|this[e+3]},u.prototype.readFloatLE=function(e,t){return t||j(e,4,this.length),i.read(this,e,!0,23,4)},u.prototype.readFloatBE=function(e,t){return t||j(e,4,this.length),i.read(this,e,!1,23,4)},u.prototype.readDoubleLE=function(e,t){return t||j(e,8,this.length),i.read(this,e,!0,52,8)},u.prototype.readDoubleBE=function(e,t){return t||j(e,8,this.length),i.read(this,e,!1,52,8)},u.prototype.writeUIntLE=function(e,t,n,r){(e=+e,t|=0,n|=0,r)||I(this,e,t,n,Math.pow(2,8*n)-1,0);var i=1,o=0;for(this[t]=255&e;++o<n&&(i*=256);)this[t+o]=e/i&255;return t+n},u.prototype.writeUIntBE=function(e,t,n,r){(e=+e,t|=0,n|=0,r)||I(this,e,t,n,Math.pow(2,8*n)-1,0);var i=n-1,o=1;for(this[t+i]=255&e;--i>=0&&(o*=256);)this[t+i]=e/o&255;return t+n},u.prototype.writeUInt8=function(e,t,n){return e=+e,t|=0,n||I(this,e,t,1,255,0),u.TYPED_ARRAY_SUPPORT||(e=Math.floor(e)),this[t]=255&e,t+1},u.prototype.writeUInt16LE=function(e,t,n){return e=+e,t|=0,n||I(this,e,t,2,65535,0),u.TYPED_ARRAY_SUPPORT?(this[t]=255&e,this[t+1]=e>>>8):Y(this,e,t,!0),t+2},u.prototype.writeUInt16BE=function(e,t,n){return e=+e,t|=0,n||I(this,e,t,2,65535,0),u.TYPED_ARRAY_SUPPORT?(this[t]=e>>>8,this[t+1]=255&e):Y(this,e,t,!1),t+2},u.prototype.writeUInt32LE=function(e,t,n){return e=+e,t|=0,n||I(this,e,t,4,4294967295,0),u.TYPED_ARRAY_SUPPORT?(this[t+3]=e>>>24,this[t+2]=e>>>16,this[t+1]=e>>>8,this[t]=255&e):O(this,e,t,!0),t+4},u.prototype.writeUInt32BE=function(e,t,n){return e=+e,t|=0,n||I(this,e,t,4,4294967295,0),u.TYPED_ARRAY_SUPPORT?(this[t]=e>>>24,this[t+1]=e>>>16,this[t+2]=e>>>8,this[t+3]=255&e):O(this,e,t,!1),t+4},u.prototype.writeIntLE=function(e,t,n,r){if(e=+e,t|=0,!r){var i=Math.pow(2,8*n-1);I(this,e,t,n,i-1,-i)}var o=0,a=1,s=0;for(this[t]=255&e;++o<n&&(a*=256);)e<0&&0===s&&0!==this[t+o-1]&&(s=1),this[t+o]=(e/a>>0)-s&255;return t+n},u.prototype.writeIntBE=function(e,t,n,r){if(e=+e,t|=0,!r){var i=Math.pow(2,8*n-1);I(this,e,t,n,i-1,-i)}var o=n-1,a=1,s=0;for(this[t+o]=255&e;--o>=0&&(a*=256);)e<0&&0===s&&0!==this[t+o+1]&&(s=1),this[t+o]=(e/a>>0)-s&255;return t+n},u.prototype.writeInt8=function(e,t,n){return e=+e,t|=0,n||I(this,e,t,1,127,-128),u.TYPED_ARRAY_SUPPORT||(e=Math.floor(e)),e<0&&(e=255+e+1),this[t]=255&e,t+1},u.prototype.writeInt16LE=function(e,t,n){return e=+e,t|=0,n||I(this,e,t,2,32767,-32768),u.TYPED_ARRAY_SUPPORT?(this[t]=255&e,this[t+1]=e>>>8):Y(this,e,t,!0),t+2},u.prototype.writeInt16BE=function(e,t,n){return e=+e,t|=0,n||I(this,e,t,2,32767,-32768),u.TYPED_ARRAY_SUPPORT?(this[t]=e>>>8,this[t+1]=255&e):Y(this,e,t,!1),t+2},u.prototype.writeInt32LE=function(e,t,n){return e=+e,t|=0,n||I(this,e,t,4,2147483647,-2147483648),u.TYPED_ARRAY_SUPPORT?(this[t]=255&e,this[t+1]=e>>>8,this[t+2]=e>>>16,this[t+3]=e>>>24):O(this,e,t,!0),t+4},u.prototype.writeInt32BE=function(e,t,n){return e=+e,t|=0,n||I(this,e,t,4,2147483647,-2147483648),e<0&&(e=4294967295+e+1),u.TYPED_ARRAY_SUPPORT?(this[t]=e>>>24,this[t+1]=e>>>16,this[t+2]=e>>>8,this[t+3]=255&e):O(this,e,t,!1),t+4},u.prototype.writeFloatLE=function(e,t,n){return C(this,e,t,!0,n)},u.prototype.writeFloatBE=function(e,t,n){return C(this,e,t,!1,n)},u.prototype.writeDoubleLE=function(e,t,n){return P(this,e,t,!0,n)},u.prototype.writeDoubleBE=function(e,t,n){return P(this,e,t,!1,n)},u.prototype.copy=function(e,t,n,r){if(n||(n=0),r||0===r||(r=this.length),t>=e.length&&(t=e.length),t||(t=0),r>0&&r<n&&(r=n),r===n)return 0;if(0===e.length||0===this.length)return 0;if(t<0)throw new RangeError("targetStart out of bounds");if(n<0||n>=this.length)throw new RangeError("sourceStart out of bounds");if(r<0)throw new RangeError("sourceEnd out of bounds");r>this.length&&(r=this.length),e.length-t<r-n&&(r=e.length-t+n);var i,o=r-n;if(this===e&&n<t&&t<r)for(i=o-1;i>=0;--i)e[i+t]=this[i+n];else if(o<1e3||!u.TYPED_ARRAY_SUPPORT)for(i=0;i<o;++i)e[i+t]=this[i+n];else Uint8Array.prototype.set.call(e,this.subarray(n,n+o),t);return o},u.prototype.fill=function(e,t,n,r){if("string"==typeof e){if("string"==typeof t?(r=t,t=0,n=this.length):"string"==typeof n&&(r=n,n=this.length),1===e.length){var i=e.charCodeAt(0);i<256&&(e=i)}if(void 0!==r&&"string"!=typeof r)throw new TypeError("encoding must be a string");if("string"==typeof r&&!u.isEncoding(r))throw new TypeError("Unknown encoding: "+r)}else"number"==typeof e&&(e&=255);if(t<0||this.length<t||this.length<n)throw new RangeError("Out of range index");if(n<=t)return this;var o;if(t>>>=0,n=void 0===n?this.length:n>>>0,e||(e=0),"number"==typeof e)for(o=t;o<n;++o)this[o]=e;else{var a=u.isBuffer(e)?e:F(new u(e,r).toString()),s=a.length;for(o=0;o<n-t;++o)this[o+t]=a[o%s]}return this};var U=/[^+\/0-9A-Za-z-_]/g;function N(e){return e<16?"0"+e.toString(16):e.toString(16)}function F(e,t){var n;t=t||1/0;for(var r=e.length,i=null,o=[],a=0;a<r;++a){if((n=e.charCodeAt(a))>55295&&n<57344){if(!i){if(n>56319){(t-=3)>-1&&o.push(239,191,189);continue}if(a+1===r){(t-=3)>-1&&o.push(239,191,189);continue}i=n;continue}if(n<56320){(t-=3)>-1&&o.push(239,191,189),i=n;continue}n=65536+(i-55296<<10|n-56320)}else i&&(t-=3)>-1&&o.push(239,191,189);if(i=null,n<128){if((t-=1)<0)break;o.push(n)}else if(n<2048){if((t-=2)<0)break;o.push(n>>6|192,63&n|128)}else if(n<65536){if((t-=3)<0)break;o.push(n>>12|224,n>>6&63|128,63&n|128)}else{if(!(n<1114112))throw new Error("Invalid code point");if((t-=4)<0)break;o.push(n>>18|240,n>>12&63|128,n>>6&63|128,63&n|128)}}return o}function H(e){return r.toByteArray(function(e){if((e=function(e){return e.trim?e.trim():e.replace(/^\s+|\s+$/g,"")}(e).replace(U,"")).length<2)return"";for(;e.length%4!=0;)e+="=";return e}(e))}function B(e,t,n,r){for(var i=0;i<r&&!(i+n>=t.length||i>=e.length);++i)t[i+n]=e[i];return i}}).call(this,n(4))},function(e,t){var n,r,i=e.exports={};function o(){throw new Error("setTimeout has not been defined")}function a(){throw new Error("clearTimeout has not been defined")}function s(e){if(n===setTimeout)return setTimeout(e,0);if((n===o||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:o}catch(e){n=o}try{r="function"==typeof clearTimeout?clearTimeout:a}catch(e){r=a}}();var u,c=[],d=!1,l=-1;function f(){d&&u&&(d=!1,u.length?c=u.concat(c):l=-1,c.length&&p())}function p(){if(!d){var e=s(f);d=!0;for(var t=c.length;t;){for(u=c,c=[];++l<t;)u&&u[l].run();l=-1,t=c.length}u=null,d=!1,function(e){if(r===clearTimeout)return clearTimeout(e);if((r===a||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(e);try{r(e)}catch(t){try{return r.call(null,e)}catch(t){return r.call(this,e)}}}(e)}}function h(e,t){this.fun=e,this.array=t}function m(){}i.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];c.push(new h(e,t)),1!==c.length||d||s(p)},h.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=m,i.addListener=m,i.once=m,i.off=m,i.removeListener=m,i.removeAllListeners=m,i.emit=m,i.prependListener=m,i.prependOnceListener=m,i.listeners=function(e){return[]},i.binding=function(e){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(e){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},function(e,t,n){(function(e){!function(e,t){"use strict";function r(e,t){if(!e)throw new Error(t||"Assertion failed")}function i(e,t){e.super_=t;var n=function(){};n.prototype=t.prototype,e.prototype=new n,e.prototype.constructor=e}function o(e,t,n){if(o.isBN(e))return e;this.negative=0,this.words=null,this.length=0,this.red=null,null!==e&&("le"!==t&&"be"!==t||(n=t,t=10),this._init(e||0,t||10,n||"be"))}var a;"object"==typeof e?e.exports=o:t.BN=o,o.BN=o,o.wordSize=26;try{a=n(409).Buffer}catch(e){}function s(e,t,n){for(var r=0,i=Math.min(e.length,n),o=t;o<i;o++){var a=e.charCodeAt(o)-48;r<<=4,r|=a>=49&&a<=54?a-49+10:a>=17&&a<=22?a-17+10:15&a}return r}function u(e,t,n,r){for(var i=0,o=Math.min(e.length,n),a=t;a<o;a++){var s=e.charCodeAt(a)-48;i*=r,i+=s>=49?s-49+10:s>=17?s-17+10:s}return i}o.isBN=function(e){return e instanceof o||null!==e&&"object"==typeof e&&e.constructor.wordSize===o.wordSize&&Array.isArray(e.words)},o.max=function(e,t){return e.cmp(t)>0?e:t},o.min=function(e,t){return e.cmp(t)<0?e:t},o.prototype._init=function(e,t,n){if("number"==typeof e)return this._initNumber(e,t,n);if("object"==typeof e)return this._initArray(e,t,n);"hex"===t&&(t=16),r(t===(0|t)&&t>=2&&t<=36);var i=0;"-"===(e=e.toString().replace(/\s+/g,""))[0]&&i++,16===t?this._parseHex(e,i):this._parseBase(e,t,i),"-"===e[0]&&(this.negative=1),this.strip(),"le"===n&&this._initArray(this.toArray(),t,n)},o.prototype._initNumber=function(e,t,n){e<0&&(this.negative=1,e=-e),e<67108864?(this.words=[67108863&e],this.length=1):e<4503599627370496?(this.words=[67108863&e,e/67108864&67108863],this.length=2):(r(e<9007199254740992),this.words=[67108863&e,e/67108864&67108863,1],this.length=3),"le"===n&&this._initArray(this.toArray(),t,n)},o.prototype._initArray=function(e,t,n){if(r("number"==typeof e.length),e.length<=0)return this.words=[0],this.length=1,this;this.length=Math.ceil(e.length/3),this.words=new Array(this.length);for(var i=0;i<this.length;i++)this.words[i]=0;var o,a,s=0;if("be"===n)for(i=e.length-1,o=0;i>=0;i-=3)a=e[i]|e[i-1]<<8|e[i-2]<<16,this.words[o]|=a<<s&67108863,this.words[o+1]=a>>>26-s&67108863,(s+=24)>=26&&(s-=26,o++);else if("le"===n)for(i=0,o=0;i<e.length;i+=3)a=e[i]|e[i+1]<<8|e[i+2]<<16,this.words[o]|=a<<s&67108863,this.words[o+1]=a>>>26-s&67108863,(s+=24)>=26&&(s-=26,o++);return this.strip()},o.prototype._parseHex=function(e,t){this.length=Math.ceil((e.length-t)/6),this.words=new Array(this.length);for(var n=0;n<this.length;n++)this.words[n]=0;var r,i,o=0;for(n=e.length-6,r=0;n>=t;n-=6)i=s(e,n,n+6),this.words[r]|=i<<o&67108863,this.words[r+1]|=i>>>26-o&4194303,(o+=24)>=26&&(o-=26,r++);n+6!==t&&(i=s(e,t,n+6),this.words[r]|=i<<o&67108863,this.words[r+1]|=i>>>26-o&4194303),this.strip()},o.prototype._parseBase=function(e,t,n){this.words=[0],this.length=1;for(var r=0,i=1;i<=67108863;i*=t)r++;r--,i=i/t|0;for(var o=e.length-n,a=o%r,s=Math.min(o,o-a)+n,c=0,d=n;d<s;d+=r)c=u(e,d,d+r,t),this.imuln(i),this.words[0]+c<67108864?this.words[0]+=c:this._iaddn(c);if(0!==a){var l=1;for(c=u(e,d,e.length,t),d=0;d<a;d++)l*=t;this.imuln(l),this.words[0]+c<67108864?this.words[0]+=c:this._iaddn(c)}},o.prototype.copy=function(e){e.words=new Array(this.length);for(var t=0;t<this.length;t++)e.words[t]=this.words[t];e.length=this.length,e.negative=this.negative,e.red=this.red},o.prototype.clone=function(){var e=new o(null);return this.copy(e),e},o.prototype._expand=function(e){for(;this.length<e;)this.words[this.length++]=0;return this},o.prototype.strip=function(){for(;this.length>1&&0===this.words[this.length-1];)this.length--;return this._normSign()},o.prototype._normSign=function(){return 1===this.length&&0===this.words[0]&&(this.negative=0),this},o.prototype.inspect=function(){return(this.red?"<BN-R: ":"<BN: ")+this.toString(16)+">"};var c=["","0","00","000","0000","00000","000000","0000000","00000000","000000000","0000000000","00000000000","000000000000","0000000000000","00000000000000","000000000000000","0000000000000000","00000000000000000","000000000000000000","0000000000000000000","00000000000000000000","000000000000000000000","0000000000000000000000","00000000000000000000000","000000000000000000000000","0000000000000000000000000"],d=[0,0,25,16,12,11,10,9,8,8,7,7,7,7,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],l=[0,0,33554432,43046721,16777216,48828125,60466176,40353607,16777216,43046721,1e7,19487171,35831808,62748517,7529536,11390625,16777216,24137569,34012224,47045881,64e6,4084101,5153632,6436343,7962624,9765625,11881376,14348907,17210368,20511149,243e5,28629151,33554432,39135393,45435424,52521875,60466176];function f(e,t,n){n.negative=t.negative^e.negative;var r=e.length+t.length|0;n.length=r,r=r-1|0;var i=0|e.words[0],o=0|t.words[0],a=i*o,s=67108863&a,u=a/67108864|0;n.words[0]=s;for(var c=1;c<r;c++){for(var d=u>>>26,l=67108863&u,f=Math.min(c,t.length-1),p=Math.max(0,c-e.length+1);p<=f;p++){var h=c-p|0;d+=(a=(i=0|e.words[h])*(o=0|t.words[p])+l)/67108864|0,l=67108863&a}n.words[c]=0|l,u=0|d}return 0!==u?n.words[c]=0|u:n.length--,n.strip()}o.prototype.toString=function(e,t){var n;if(t=0|t||1,16===(e=e||10)||"hex"===e){n="";for(var i=0,o=0,a=0;a<this.length;a++){var s=this.words[a],u=(16777215&(s<<i|o)).toString(16);n=0!==(o=s>>>24-i&16777215)||a!==this.length-1?c[6-u.length]+u+n:u+n,(i+=2)>=26&&(i-=26,a--)}for(0!==o&&(n=o.toString(16)+n);n.length%t!=0;)n="0"+n;return 0!==this.negative&&(n="-"+n),n}if(e===(0|e)&&e>=2&&e<=36){var f=d[e],p=l[e];n="";var h=this.clone();for(h.negative=0;!h.isZero();){var m=h.modn(p).toString(e);n=(h=h.idivn(p)).isZero()?m+n:c[f-m.length]+m+n}for(this.isZero()&&(n="0"+n);n.length%t!=0;)n="0"+n;return 0!==this.negative&&(n="-"+n),n}r(!1,"Base should be between 2 and 36")},o.prototype.toNumber=function(){var e=this.words[0];return 2===this.length?e+=67108864*this.words[1]:3===this.length&&1===this.words[2]?e+=4503599627370496+67108864*this.words[1]:this.length>2&&r(!1,"Number can only safely store up to 53 bits"),0!==this.negative?-e:e},o.prototype.toJSON=function(){return this.toString(16)},o.prototype.toBuffer=function(e,t){return r(void 0!==a),this.toArrayLike(a,e,t)},o.prototype.toArray=function(e,t){return this.toArrayLike(Array,e,t)},o.prototype.toArrayLike=function(e,t,n){var i=this.byteLength(),o=n||Math.max(1,i);r(i<=o,"byte array longer than desired length"),r(o>0,"Requested array length <= 0"),this.strip();var a,s,u="le"===t,c=new e(o),d=this.clone();if(u){for(s=0;!d.isZero();s++)a=d.andln(255),d.iushrn(8),c[s]=a;for(;s<o;s++)c[s]=0}else{for(s=0;s<o-i;s++)c[s]=0;for(s=0;!d.isZero();s++)a=d.andln(255),d.iushrn(8),c[o-s-1]=a}return c},Math.clz32?o.prototype._countBits=function(e){return 32-Math.clz32(e)}:o.prototype._countBits=function(e){var t=e,n=0;return t>=4096&&(n+=13,t>>>=13),t>=64&&(n+=7,t>>>=7),t>=8&&(n+=4,t>>>=4),t>=2&&(n+=2,t>>>=2),n+t},o.prototype._zeroBits=function(e){if(0===e)return 26;var t=e,n=0;return 0==(8191&t)&&(n+=13,t>>>=13),0==(127&t)&&(n+=7,t>>>=7),0==(15&t)&&(n+=4,t>>>=4),0==(3&t)&&(n+=2,t>>>=2),0==(1&t)&&n++,n},o.prototype.bitLength=function(){var e=this.words[this.length-1],t=this._countBits(e);return 26*(this.length-1)+t},o.prototype.zeroBits=function(){if(this.isZero())return 0;for(var e=0,t=0;t<this.length;t++){var n=this._zeroBits(this.words[t]);if(e+=n,26!==n)break}return e},o.prototype.byteLength=function(){return Math.ceil(this.bitLength()/8)},o.prototype.toTwos=function(e){return 0!==this.negative?this.abs().inotn(e).iaddn(1):this.clone()},o.prototype.fromTwos=function(e){return this.testn(e-1)?this.notn(e).iaddn(1).ineg():this.clone()},o.prototype.isNeg=function(){return 0!==this.negative},o.prototype.neg=function(){return this.clone().ineg()},o.prototype.ineg=function(){return this.isZero()||(this.negative^=1),this},o.prototype.iuor=function(e){for(;this.length<e.length;)this.words[this.length++]=0;for(var t=0;t<e.length;t++)this.words[t]=this.words[t]|e.words[t];return this.strip()},o.prototype.ior=function(e){return r(0==(this.negative|e.negative)),this.iuor(e)},o.prototype.or=function(e){return this.length>e.length?this.clone().ior(e):e.clone().ior(this)},o.prototype.uor=function(e){return this.length>e.length?this.clone().iuor(e):e.clone().iuor(this)},o.prototype.iuand=function(e){var t;t=this.length>e.length?e:this;for(var n=0;n<t.length;n++)this.words[n]=this.words[n]&e.words[n];return this.length=t.length,this.strip()},o.prototype.iand=function(e){return r(0==(this.negative|e.negative)),this.iuand(e)},o.prototype.and=function(e){return this.length>e.length?this.clone().iand(e):e.clone().iand(this)},o.prototype.uand=function(e){return this.length>e.length?this.clone().iuand(e):e.clone().iuand(this)},o.prototype.iuxor=function(e){var t,n;this.length>e.length?(t=this,n=e):(t=e,n=this);for(var r=0;r<n.length;r++)this.words[r]=t.words[r]^n.words[r];if(this!==t)for(;r<t.length;r++)this.words[r]=t.words[r];return this.length=t.length,this.strip()},o.prototype.ixor=function(e){return r(0==(this.negative|e.negative)),this.iuxor(e)},o.prototype.xor=function(e){return this.length>e.length?this.clone().ixor(e):e.clone().ixor(this)},o.prototype.uxor=function(e){return this.length>e.length?this.clone().iuxor(e):e.clone().iuxor(this)},o.prototype.inotn=function(e){r("number"==typeof e&&e>=0);var t=0|Math.ceil(e/26),n=e%26;this._expand(t),n>0&&t--;for(var i=0;i<t;i++)this.words[i]=67108863&~this.words[i];return n>0&&(this.words[i]=~this.words[i]&67108863>>26-n),this.strip()},o.prototype.notn=function(e){return this.clone().inotn(e)},o.prototype.setn=function(e,t){r("number"==typeof e&&e>=0);var n=e/26|0,i=e%26;return this._expand(n+1),this.words[n]=t?this.words[n]|1<<i:this.words[n]&~(1<<i),this.strip()},o.prototype.iadd=function(e){var t,n,r;if(0!==this.negative&&0===e.negative)return this.negative=0,t=this.isub(e),this.negative^=1,this._normSign();if(0===this.negative&&0!==e.negative)return e.negative=0,t=this.isub(e),e.negative=1,t._normSign();this.length>e.length?(n=this,r=e):(n=e,r=this);for(var i=0,o=0;o<r.length;o++)t=(0|n.words[o])+(0|r.words[o])+i,this.words[o]=67108863&t,i=t>>>26;for(;0!==i&&o<n.length;o++)t=(0|n.words[o])+i,this.words[o]=67108863&t,i=t>>>26;if(this.length=n.length,0!==i)this.words[this.length]=i,this.length++;else if(n!==this)for(;o<n.length;o++)this.words[o]=n.words[o];return this},o.prototype.add=function(e){var t;return 0!==e.negative&&0===this.negative?(e.negative=0,t=this.sub(e),e.negative^=1,t):0===e.negative&&0!==this.negative?(this.negative=0,t=e.sub(this),this.negative=1,t):this.length>e.length?this.clone().iadd(e):e.clone().iadd(this)},o.prototype.isub=function(e){if(0!==e.negative){e.negative=0;var t=this.iadd(e);return e.negative=1,t._normSign()}if(0!==this.negative)return this.negative=0,this.iadd(e),this.negative=1,this._normSign();var n,r,i=this.cmp(e);if(0===i)return this.negative=0,this.length=1,this.words[0]=0,this;i>0?(n=this,r=e):(n=e,r=this);for(var o=0,a=0;a<r.length;a++)o=(t=(0|n.words[a])-(0|r.words[a])+o)>>26,this.words[a]=67108863&t;for(;0!==o&&a<n.length;a++)o=(t=(0|n.words[a])+o)>>26,this.words[a]=67108863&t;if(0===o&&a<n.length&&n!==this)for(;a<n.length;a++)this.words[a]=n.words[a];return this.length=Math.max(this.length,a),n!==this&&(this.negative=1),this.strip()},o.prototype.sub=function(e){return this.clone().isub(e)};var p=function(e,t,n){var r,i,o,a=e.words,s=t.words,u=n.words,c=0,d=0|a[0],l=8191&d,f=d>>>13,p=0|a[1],h=8191&p,m=p>>>13,_=0|a[2],v=8191&_,y=_>>>13,g=0|a[3],b=8191&g,w=g>>>13,M=0|a[4],k=8191&M,x=M>>>13,S=0|a[5],L=8191&S,A=S>>>13,E=0|a[6],T=8191&E,D=E>>>13,j=0|a[7],I=8191&j,Y=j>>>13,O=0|a[8],R=8191&O,C=O>>>13,P=0|a[9],U=8191&P,N=P>>>13,F=0|s[0],H=8191&F,B=F>>>13,z=0|s[1],q=8191&z,W=z>>>13,G=0|s[2],V=8191&G,J=G>>>13,Z=0|s[3],K=8191&Z,X=Z>>>13,Q=0|s[4],$=8191&Q,ee=Q>>>13,te=0|s[5],ne=8191&te,re=te>>>13,ie=0|s[6],oe=8191&ie,ae=ie>>>13,se=0|s[7],ue=8191&se,ce=se>>>13,de=0|s[8],le=8191&de,fe=de>>>13,pe=0|s[9],he=8191&pe,me=pe>>>13;n.negative=e.negative^t.negative,n.length=19;var _e=(c+(r=Math.imul(l,H))|0)+((8191&(i=(i=Math.imul(l,B))+Math.imul(f,H)|0))<<13)|0;c=((o=Math.imul(f,B))+(i>>>13)|0)+(_e>>>26)|0,_e&=67108863,r=Math.imul(h,H),i=(i=Math.imul(h,B))+Math.imul(m,H)|0,o=Math.imul(m,B);var ve=(c+(r=r+Math.imul(l,q)|0)|0)+((8191&(i=(i=i+Math.imul(l,W)|0)+Math.imul(f,q)|0))<<13)|0;c=((o=o+Math.imul(f,W)|0)+(i>>>13)|0)+(ve>>>26)|0,ve&=67108863,r=Math.imul(v,H),i=(i=Math.imul(v,B))+Math.imul(y,H)|0,o=Math.imul(y,B),r=r+Math.imul(h,q)|0,i=(i=i+Math.imul(h,W)|0)+Math.imul(m,q)|0,o=o+Math.imul(m,W)|0;var ye=(c+(r=r+Math.imul(l,V)|0)|0)+((8191&(i=(i=i+Math.imul(l,J)|0)+Math.imul(f,V)|0))<<13)|0;c=((o=o+Math.imul(f,J)|0)+(i>>>13)|0)+(ye>>>26)|0,ye&=67108863,r=Math.imul(b,H),i=(i=Math.imul(b,B))+Math.imul(w,H)|0,o=Math.imul(w,B),r=r+Math.imul(v,q)|0,i=(i=i+Math.imul(v,W)|0)+Math.imul(y,q)|0,o=o+Math.imul(y,W)|0,r=r+Math.imul(h,V)|0,i=(i=i+Math.imul(h,J)|0)+Math.imul(m,V)|0,o=o+Math.imul(m,J)|0;var ge=(c+(r=r+Math.imul(l,K)|0)|0)+((8191&(i=(i=i+Math.imul(l,X)|0)+Math.imul(f,K)|0))<<13)|0;c=((o=o+Math.imul(f,X)|0)+(i>>>13)|0)+(ge>>>26)|0,ge&=67108863,r=Math.imul(k,H),i=(i=Math.imul(k,B))+Math.imul(x,H)|0,o=Math.imul(x,B),r=r+Math.imul(b,q)|0,i=(i=i+Math.imul(b,W)|0)+Math.imul(w,q)|0,o=o+Math.imul(w,W)|0,r=r+Math.imul(v,V)|0,i=(i=i+Math.imul(v,J)|0)+Math.imul(y,V)|0,o=o+Math.imul(y,J)|0,r=r+Math.imul(h,K)|0,i=(i=i+Math.imul(h,X)|0)+Math.imul(m,K)|0,o=o+Math.imul(m,X)|0;var be=(c+(r=r+Math.imul(l,$)|0)|0)+((8191&(i=(i=i+Math.imul(l,ee)|0)+Math.imul(f,$)|0))<<13)|0;c=((o=o+Math.imul(f,ee)|0)+(i>>>13)|0)+(be>>>26)|0,be&=67108863,r=Math.imul(L,H),i=(i=Math.imul(L,B))+Math.imul(A,H)|0,o=Math.imul(A,B),r=r+Math.imul(k,q)|0,i=(i=i+Math.imul(k,W)|0)+Math.imul(x,q)|0,o=o+Math.imul(x,W)|0,r=r+Math.imul(b,V)|0,i=(i=i+Math.imul(b,J)|0)+Math.imul(w,V)|0,o=o+Math.imul(w,J)|0,r=r+Math.imul(v,K)|0,i=(i=i+Math.imul(v,X)|0)+Math.imul(y,K)|0,o=o+Math.imul(y,X)|0,r=r+Math.imul(h,$)|0,i=(i=i+Math.imul(h,ee)|0)+Math.imul(m,$)|0,o=o+Math.imul(m,ee)|0;var we=(c+(r=r+Math.imul(l,ne)|0)|0)+((8191&(i=(i=i+Math.imul(l,re)|0)+Math.imul(f,ne)|0))<<13)|0;c=((o=o+Math.imul(f,re)|0)+(i>>>13)|0)+(we>>>26)|0,we&=67108863,r=Math.imul(T,H),i=(i=Math.imul(T,B))+Math.imul(D,H)|0,o=Math.imul(D,B),r=r+Math.imul(L,q)|0,i=(i=i+Math.imul(L,W)|0)+Math.imul(A,q)|0,o=o+Math.imul(A,W)|0,r=r+Math.imul(k,V)|0,i=(i=i+Math.imul(k,J)|0)+Math.imul(x,V)|0,o=o+Math.imul(x,J)|0,r=r+Math.imul(b,K)|0,i=(i=i+Math.imul(b,X)|0)+Math.imul(w,K)|0,o=o+Math.imul(w,X)|0,r=r+Math.imul(v,$)|0,i=(i=i+Math.imul(v,ee)|0)+Math.imul(y,$)|0,o=o+Math.imul(y,ee)|0,r=r+Math.imul(h,ne)|0,i=(i=i+Math.imul(h,re)|0)+Math.imul(m,ne)|0,o=o+Math.imul(m,re)|0;var Me=(c+(r=r+Math.imul(l,oe)|0)|0)+((8191&(i=(i=i+Math.imul(l,ae)|0)+Math.imul(f,oe)|0))<<13)|0;c=((o=o+Math.imul(f,ae)|0)+(i>>>13)|0)+(Me>>>26)|0,Me&=67108863,r=Math.imul(I,H),i=(i=Math.imul(I,B))+Math.imul(Y,H)|0,o=Math.imul(Y,B),r=r+Math.imul(T,q)|0,i=(i=i+Math.imul(T,W)|0)+Math.imul(D,q)|0,o=o+Math.imul(D,W)|0,r=r+Math.imul(L,V)|0,i=(i=i+Math.imul(L,J)|0)+Math.imul(A,V)|0,o=o+Math.imul(A,J)|0,r=r+Math.imul(k,K)|0,i=(i=i+Math.imul(k,X)|0)+Math.imul(x,K)|0,o=o+Math.imul(x,X)|0,r=r+Math.imul(b,$)|0,i=(i=i+Math.imul(b,ee)|0)+Math.imul(w,$)|0,o=o+Math.imul(w,ee)|0,r=r+Math.imul(v,ne)|0,i=(i=i+Math.imul(v,re)|0)+Math.imul(y,ne)|0,o=o+Math.imul(y,re)|0,r=r+Math.imul(h,oe)|0,i=(i=i+Math.imul(h,ae)|0)+Math.imul(m,oe)|0,o=o+Math.imul(m,ae)|0;var ke=(c+(r=r+Math.imul(l,ue)|0)|0)+((8191&(i=(i=i+Math.imul(l,ce)|0)+Math.imul(f,ue)|0))<<13)|0;c=((o=o+Math.imul(f,ce)|0)+(i>>>13)|0)+(ke>>>26)|0,ke&=67108863,r=Math.imul(R,H),i=(i=Math.imul(R,B))+Math.imul(C,H)|0,o=Math.imul(C,B),r=r+Math.imul(I,q)|0,i=(i=i+Math.imul(I,W)|0)+Math.imul(Y,q)|0,o=o+Math.imul(Y,W)|0,r=r+Math.imul(T,V)|0,i=(i=i+Math.imul(T,J)|0)+Math.imul(D,V)|0,o=o+Math.imul(D,J)|0,r=r+Math.imul(L,K)|0,i=(i=i+Math.imul(L,X)|0)+Math.imul(A,K)|0,o=o+Math.imul(A,X)|0,r=r+Math.imul(k,$)|0,i=(i=i+Math.imul(k,ee)|0)+Math.imul(x,$)|0,o=o+Math.imul(x,ee)|0,r=r+Math.imul(b,ne)|0,i=(i=i+Math.imul(b,re)|0)+Math.imul(w,ne)|0,o=o+Math.imul(w,re)|0,r=r+Math.imul(v,oe)|0,i=(i=i+Math.imul(v,ae)|0)+Math.imul(y,oe)|0,o=o+Math.imul(y,ae)|0,r=r+Math.imul(h,ue)|0,i=(i=i+Math.imul(h,ce)|0)+Math.imul(m,ue)|0,o=o+Math.imul(m,ce)|0;var xe=(c+(r=r+Math.imul(l,le)|0)|0)+((8191&(i=(i=i+Math.imul(l,fe)|0)+Math.imul(f,le)|0))<<13)|0;c=((o=o+Math.imul(f,fe)|0)+(i>>>13)|0)+(xe>>>26)|0,xe&=67108863,r=Math.imul(U,H),i=(i=Math.imul(U,B))+Math.imul(N,H)|0,o=Math.imul(N,B),r=r+Math.imul(R,q)|0,i=(i=i+Math.imul(R,W)|0)+Math.imul(C,q)|0,o=o+Math.imul(C,W)|0,r=r+Math.imul(I,V)|0,i=(i=i+Math.imul(I,J)|0)+Math.imul(Y,V)|0,o=o+Math.imul(Y,J)|0,r=r+Math.imul(T,K)|0,i=(i=i+Math.imul(T,X)|0)+Math.imul(D,K)|0,o=o+Math.imul(D,X)|0,r=r+Math.imul(L,$)|0,i=(i=i+Math.imul(L,ee)|0)+Math.imul(A,$)|0,o=o+Math.imul(A,ee)|0,r=r+Math.imul(k,ne)|0,i=(i=i+Math.imul(k,re)|0)+Math.imul(x,ne)|0,o=o+Math.imul(x,re)|0,r=r+Math.imul(b,oe)|0,i=(i=i+Math.imul(b,ae)|0)+Math.imul(w,oe)|0,o=o+Math.imul(w,ae)|0,r=r+Math.imul(v,ue)|0,i=(i=i+Math.imul(v,ce)|0)+Math.imul(y,ue)|0,o=o+Math.imul(y,ce)|0,r=r+Math.imul(h,le)|0,i=(i=i+Math.imul(h,fe)|0)+Math.imul(m,le)|0,o=o+Math.imul(m,fe)|0;var Se=(c+(r=r+Math.imul(l,he)|0)|0)+((8191&(i=(i=i+Math.imul(l,me)|0)+Math.imul(f,he)|0))<<13)|0;c=((o=o+Math.imul(f,me)|0)+(i>>>13)|0)+(Se>>>26)|0,Se&=67108863,r=Math.imul(U,q),i=(i=Math.imul(U,W))+Math.imul(N,q)|0,o=Math.imul(N,W),r=r+Math.imul(R,V)|0,i=(i=i+Math.imul(R,J)|0)+Math.imul(C,V)|0,o=o+Math.imul(C,J)|0,r=r+Math.imul(I,K)|0,i=(i=i+Math.imul(I,X)|0)+Math.imul(Y,K)|0,o=o+Math.imul(Y,X)|0,r=r+Math.imul(T,$)|0,i=(i=i+Math.imul(T,ee)|0)+Math.imul(D,$)|0,o=o+Math.imul(D,ee)|0,r=r+Math.imul(L,ne)|0,i=(i=i+Math.imul(L,re)|0)+Math.imul(A,ne)|0,o=o+Math.imul(A,re)|0,r=r+Math.imul(k,oe)|0,i=(i=i+Math.imul(k,ae)|0)+Math.imul(x,oe)|0,o=o+Math.imul(x,ae)|0,r=r+Math.imul(b,ue)|0,i=(i=i+Math.imul(b,ce)|0)+Math.imul(w,ue)|0,o=o+Math.imul(w,ce)|0,r=r+Math.imul(v,le)|0,i=(i=i+Math.imul(v,fe)|0)+Math.imul(y,le)|0,o=o+Math.imul(y,fe)|0;var Le=(c+(r=r+Math.imul(h,he)|0)|0)+((8191&(i=(i=i+Math.imul(h,me)|0)+Math.imul(m,he)|0))<<13)|0;c=((o=o+Math.imul(m,me)|0)+(i>>>13)|0)+(Le>>>26)|0,Le&=67108863,r=Math.imul(U,V),i=(i=Math.imul(U,J))+Math.imul(N,V)|0,o=Math.imul(N,J),r=r+Math.imul(R,K)|0,i=(i=i+Math.imul(R,X)|0)+Math.imul(C,K)|0,o=o+Math.imul(C,X)|0,r=r+Math.imul(I,$)|0,i=(i=i+Math.imul(I,ee)|0)+Math.imul(Y,$)|0,o=o+Math.imul(Y,ee)|0,r=r+Math.imul(T,ne)|0,i=(i=i+Math.imul(T,re)|0)+Math.imul(D,ne)|0,o=o+Math.imul(D,re)|0,r=r+Math.imul(L,oe)|0,i=(i=i+Math.imul(L,ae)|0)+Math.imul(A,oe)|0,o=o+Math.imul(A,ae)|0,r=r+Math.imul(k,ue)|0,i=(i=i+Math.imul(k,ce)|0)+Math.imul(x,ue)|0,o=o+Math.imul(x,ce)|0,r=r+Math.imul(b,le)|0,i=(i=i+Math.imul(b,fe)|0)+Math.imul(w,le)|0,o=o+Math.imul(w,fe)|0;var Ae=(c+(r=r+Math.imul(v,he)|0)|0)+((8191&(i=(i=i+Math.imul(v,me)|0)+Math.imul(y,he)|0))<<13)|0;c=((o=o+Math.imul(y,me)|0)+(i>>>13)|0)+(Ae>>>26)|0,Ae&=67108863,r=Math.imul(U,K),i=(i=Math.imul(U,X))+Math.imul(N,K)|0,o=Math.imul(N,X),r=r+Math.imul(R,$)|0,i=(i=i+Math.imul(R,ee)|0)+Math.imul(C,$)|0,o=o+Math.imul(C,ee)|0,r=r+Math.imul(I,ne)|0,i=(i=i+Math.imul(I,re)|0)+Math.imul(Y,ne)|0,o=o+Math.imul(Y,re)|0,r=r+Math.imul(T,oe)|0,i=(i=i+Math.imul(T,ae)|0)+Math.imul(D,oe)|0,o=o+Math.imul(D,ae)|0,r=r+Math.imul(L,ue)|0,i=(i=i+Math.imul(L,ce)|0)+Math.imul(A,ue)|0,o=o+Math.imul(A,ce)|0,r=r+Math.imul(k,le)|0,i=(i=i+Math.imul(k,fe)|0)+Math.imul(x,le)|0,o=o+Math.imul(x,fe)|0;var Ee=(c+(r=r+Math.imul(b,he)|0)|0)+((8191&(i=(i=i+Math.imul(b,me)|0)+Math.imul(w,he)|0))<<13)|0;c=((o=o+Math.imul(w,me)|0)+(i>>>13)|0)+(Ee>>>26)|0,Ee&=67108863,r=Math.imul(U,$),i=(i=Math.imul(U,ee))+Math.imul(N,$)|0,o=Math.imul(N,ee),r=r+Math.imul(R,ne)|0,i=(i=i+Math.imul(R,re)|0)+Math.imul(C,ne)|0,o=o+Math.imul(C,re)|0,r=r+Math.imul(I,oe)|0,i=(i=i+Math.imul(I,ae)|0)+Math.imul(Y,oe)|0,o=o+Math.imul(Y,ae)|0,r=r+Math.imul(T,ue)|0,i=(i=i+Math.imul(T,ce)|0)+Math.imul(D,ue)|0,o=o+Math.imul(D,ce)|0,r=r+Math.imul(L,le)|0,i=(i=i+Math.imul(L,fe)|0)+Math.imul(A,le)|0,o=o+Math.imul(A,fe)|0;var Te=(c+(r=r+Math.imul(k,he)|0)|0)+((8191&(i=(i=i+Math.imul(k,me)|0)+Math.imul(x,he)|0))<<13)|0;c=((o=o+Math.imul(x,me)|0)+(i>>>13)|0)+(Te>>>26)|0,Te&=67108863,r=Math.imul(U,ne),i=(i=Math.imul(U,re))+Math.imul(N,ne)|0,o=Math.imul(N,re),r=r+Math.imul(R,oe)|0,i=(i=i+Math.imul(R,ae)|0)+Math.imul(C,oe)|0,o=o+Math.imul(C,ae)|0,r=r+Math.imul(I,ue)|0,i=(i=i+Math.imul(I,ce)|0)+Math.imul(Y,ue)|0,o=o+Math.imul(Y,ce)|0,r=r+Math.imul(T,le)|0,i=(i=i+Math.imul(T,fe)|0)+Math.imul(D,le)|0,o=o+Math.imul(D,fe)|0;var De=(c+(r=r+Math.imul(L,he)|0)|0)+((8191&(i=(i=i+Math.imul(L,me)|0)+Math.imul(A,he)|0))<<13)|0;c=((o=o+Math.imul(A,me)|0)+(i>>>13)|0)+(De>>>26)|0,De&=67108863,r=Math.imul(U,oe),i=(i=Math.imul(U,ae))+Math.imul(N,oe)|0,o=Math.imul(N,ae),r=r+Math.imul(R,ue)|0,i=(i=i+Math.imul(R,ce)|0)+Math.imul(C,ue)|0,o=o+Math.imul(C,ce)|0,r=r+Math.imul(I,le)|0,i=(i=i+Math.imul(I,fe)|0)+Math.imul(Y,le)|0,o=o+Math.imul(Y,fe)|0;var je=(c+(r=r+Math.imul(T,he)|0)|0)+((8191&(i=(i=i+Math.imul(T,me)|0)+Math.imul(D,he)|0))<<13)|0;c=((o=o+Math.imul(D,me)|0)+(i>>>13)|0)+(je>>>26)|0,je&=67108863,r=Math.imul(U,ue),i=(i=Math.imul(U,ce))+Math.imul(N,ue)|0,o=Math.imul(N,ce),r=r+Math.imul(R,le)|0,i=(i=i+Math.imul(R,fe)|0)+Math.imul(C,le)|0,o=o+Math.imul(C,fe)|0;var Ie=(c+(r=r+Math.imul(I,he)|0)|0)+((8191&(i=(i=i+Math.imul(I,me)|0)+Math.imul(Y,he)|0))<<13)|0;c=((o=o+Math.imul(Y,me)|0)+(i>>>13)|0)+(Ie>>>26)|0,Ie&=67108863,r=Math.imul(U,le),i=(i=Math.imul(U,fe))+Math.imul(N,le)|0,o=Math.imul(N,fe);var Ye=(c+(r=r+Math.imul(R,he)|0)|0)+((8191&(i=(i=i+Math.imul(R,me)|0)+Math.imul(C,he)|0))<<13)|0;c=((o=o+Math.imul(C,me)|0)+(i>>>13)|0)+(Ye>>>26)|0,Ye&=67108863;var Oe=(c+(r=Math.imul(U,he))|0)+((8191&(i=(i=Math.imul(U,me))+Math.imul(N,he)|0))<<13)|0;return c=((o=Math.imul(N,me))+(i>>>13)|0)+(Oe>>>26)|0,Oe&=67108863,u[0]=_e,u[1]=ve,u[2]=ye,u[3]=ge,u[4]=be,u[5]=we,u[6]=Me,u[7]=ke,u[8]=xe,u[9]=Se,u[10]=Le,u[11]=Ae,u[12]=Ee,u[13]=Te,u[14]=De,u[15]=je,u[16]=Ie,u[17]=Ye,u[18]=Oe,0!==c&&(u[19]=c,n.length++),n};function h(e,t,n){return(new m).mulp(e,t,n)}function m(e,t){this.x=e,this.y=t}Math.imul||(p=f),o.prototype.mulTo=function(e,t){var n=this.length+e.length;return 10===this.length&&10===e.length?p(this,e,t):n<63?f(this,e,t):n<1024?function(e,t,n){n.negative=t.negative^e.negative,n.length=e.length+t.length;for(var r=0,i=0,o=0;o<n.length-1;o++){var a=i;i=0;for(var s=67108863&r,u=Math.min(o,t.length-1),c=Math.max(0,o-e.length+1);c<=u;c++){var d=o-c,l=(0|e.words[d])*(0|t.words[c]),f=67108863&l;s=67108863&(f=f+s|0),i+=(a=(a=a+(l/67108864|0)|0)+(f>>>26)|0)>>>26,a&=67108863}n.words[o]=s,r=a,a=i}return 0!==r?n.words[o]=r:n.length--,n.strip()}(this,e,t):h(this,e,t)},m.prototype.makeRBT=function(e){for(var t=new Array(e),n=o.prototype._countBits(e)-1,r=0;r<e;r++)t[r]=this.revBin(r,n,e);return t},m.prototype.revBin=function(e,t,n){if(0===e||e===n-1)return e;for(var r=0,i=0;i<t;i++)r|=(1&e)<<t-i-1,e>>=1;return r},m.prototype.permute=function(e,t,n,r,i,o){for(var a=0;a<o;a++)r[a]=t[e[a]],i[a]=n[e[a]]},m.prototype.transform=function(e,t,n,r,i,o){this.permute(o,e,t,n,r,i);for(var a=1;a<i;a<<=1)for(var s=a<<1,u=Math.cos(2*Math.PI/s),c=Math.sin(2*Math.PI/s),d=0;d<i;d+=s)for(var l=u,f=c,p=0;p<a;p++){var h=n[d+p],m=r[d+p],_=n[d+p+a],v=r[d+p+a],y=l*_-f*v;v=l*v+f*_,_=y,n[d+p]=h+_,r[d+p]=m+v,n[d+p+a]=h-_,r[d+p+a]=m-v,p!==s&&(y=u*l-c*f,f=u*f+c*l,l=y)}},m.prototype.guessLen13b=function(e,t){var n=1|Math.max(t,e),r=1&n,i=0;for(n=n/2|0;n;n>>>=1)i++;return 1<<i+1+r},m.prototype.conjugate=function(e,t,n){if(!(n<=1))for(var r=0;r<n/2;r++){var i=e[r];e[r]=e[n-r-1],e[n-r-1]=i,i=t[r],t[r]=-t[n-r-1],t[n-r-1]=-i}},m.prototype.normalize13b=function(e,t){for(var n=0,r=0;r<t/2;r++){var i=8192*Math.round(e[2*r+1]/t)+Math.round(e[2*r]/t)+n;e[r]=67108863&i,n=i<67108864?0:i/67108864|0}return e},m.prototype.convert13b=function(e,t,n,i){for(var o=0,a=0;a<t;a++)o+=0|e[a],n[2*a]=8191&o,o>>>=13,n[2*a+1]=8191&o,o>>>=13;for(a=2*t;a<i;++a)n[a]=0;r(0===o),r(0==(-8192&o))},m.prototype.stub=function(e){for(var t=new Array(e),n=0;n<e;n++)t[n]=0;return t},m.prototype.mulp=function(e,t,n){var r=2*this.guessLen13b(e.length,t.length),i=this.makeRBT(r),o=this.stub(r),a=new Array(r),s=new Array(r),u=new Array(r),c=new Array(r),d=new Array(r),l=new Array(r),f=n.words;f.length=r,this.convert13b(e.words,e.length,a,r),this.convert13b(t.words,t.length,c,r),this.transform(a,o,s,u,r,i),this.transform(c,o,d,l,r,i);for(var p=0;p<r;p++){var h=s[p]*d[p]-u[p]*l[p];u[p]=s[p]*l[p]+u[p]*d[p],s[p]=h}return this.conjugate(s,u,r),this.transform(s,u,f,o,r,i),this.conjugate(f,o,r),this.normalize13b(f,r),n.negative=e.negative^t.negative,n.length=e.length+t.length,n.strip()},o.prototype.mul=function(e){var t=new o(null);return t.words=new Array(this.length+e.length),this.mulTo(e,t)},o.prototype.mulf=function(e){var t=new o(null);return t.words=new Array(this.length+e.length),h(this,e,t)},o.prototype.imul=function(e){return this.clone().mulTo(e,this)},o.prototype.imuln=function(e){r("number"==typeof e),r(e<67108864);for(var t=0,n=0;n<this.length;n++){var i=(0|this.words[n])*e,o=(67108863&i)+(67108863&t);t>>=26,t+=i/67108864|0,t+=o>>>26,this.words[n]=67108863&o}return 0!==t&&(this.words[n]=t,this.length++),this},o.prototype.muln=function(e){return this.clone().imuln(e)},o.prototype.sqr=function(){return this.mul(this)},o.prototype.isqr=function(){return this.imul(this.clone())},o.prototype.pow=function(e){var t=function(e){for(var t=new Array(e.bitLength()),n=0;n<t.length;n++){var r=n/26|0,i=n%26;t[n]=(e.words[r]&1<<i)>>>i}return t}(e);if(0===t.length)return new o(1);for(var n=this,r=0;r<t.length&&0===t[r];r++,n=n.sqr());if(++r<t.length)for(var i=n.sqr();r<t.length;r++,i=i.sqr())0!==t[r]&&(n=n.mul(i));return n},o.prototype.iushln=function(e){r("number"==typeof e&&e>=0);var t,n=e%26,i=(e-n)/26,o=67108863>>>26-n<<26-n;if(0!==n){var a=0;for(t=0;t<this.length;t++){var s=this.words[t]&o,u=(0|this.words[t])-s<<n;this.words[t]=u|a,a=s>>>26-n}a&&(this.words[t]=a,this.length++)}if(0!==i){for(t=this.length-1;t>=0;t--)this.words[t+i]=this.words[t];for(t=0;t<i;t++)this.words[t]=0;this.length+=i}return this.strip()},o.prototype.ishln=function(e){return r(0===this.negative),this.iushln(e)},o.prototype.iushrn=function(e,t,n){var i;r("number"==typeof e&&e>=0),i=t?(t-t%26)/26:0;var o=e%26,a=Math.min((e-o)/26,this.length),s=67108863^67108863>>>o<<o,u=n;if(i-=a,i=Math.max(0,i),u){for(var c=0;c<a;c++)u.words[c]=this.words[c];u.length=a}if(0===a);else if(this.length>a)for(this.length-=a,c=0;c<this.length;c++)this.words[c]=this.words[c+a];else this.words[0]=0,this.length=1;var d=0;for(c=this.length-1;c>=0&&(0!==d||c>=i);c--){var l=0|this.words[c];this.words[c]=d<<26-o|l>>>o,d=l&s}return u&&0!==d&&(u.words[u.length++]=d),0===this.length&&(this.words[0]=0,this.length=1),this.strip()},o.prototype.ishrn=function(e,t,n){return r(0===this.negative),this.iushrn(e,t,n)},o.prototype.shln=function(e){return this.clone().ishln(e)},o.prototype.ushln=function(e){return this.clone().iushln(e)},o.prototype.shrn=function(e){return this.clone().ishrn(e)},o.prototype.ushrn=function(e){return this.clone().iushrn(e)},o.prototype.testn=function(e){r("number"==typeof e&&e>=0);var t=e%26,n=(e-t)/26,i=1<<t;return!(this.length<=n)&&!!(this.words[n]&i)},o.prototype.imaskn=function(e){r("number"==typeof e&&e>=0);var t=e%26,n=(e-t)/26;if(r(0===this.negative,"imaskn works only with positive numbers"),this.length<=n)return this;if(0!==t&&n++,this.length=Math.min(n,this.length),0!==t){var i=67108863^67108863>>>t<<t;this.words[this.length-1]&=i}return this.strip()},o.prototype.maskn=function(e){return this.clone().imaskn(e)},o.prototype.iaddn=function(e){return r("number"==typeof e),r(e<67108864),e<0?this.isubn(-e):0!==this.negative?1===this.length&&(0|this.words[0])<e?(this.words[0]=e-(0|this.words[0]),this.negative=0,this):(this.negative=0,this.isubn(e),this.negative=1,this):this._iaddn(e)},o.prototype._iaddn=function(e){this.words[0]+=e;for(var t=0;t<this.length&&this.words[t]>=67108864;t++)this.words[t]-=67108864,t===this.length-1?this.words[t+1]=1:this.words[t+1]++;return this.length=Math.max(this.length,t+1),this},o.prototype.isubn=function(e){if(r("number"==typeof e),r(e<67108864),e<0)return this.iaddn(-e);if(0!==this.negative)return this.negative=0,this.iaddn(e),this.negative=1,this;if(this.words[0]-=e,1===this.length&&this.words[0]<0)this.words[0]=-this.words[0],this.negative=1;else for(var t=0;t<this.length&&this.words[t]<0;t++)this.words[t]+=67108864,this.words[t+1]-=1;return this.strip()},o.prototype.addn=function(e){return this.clone().iaddn(e)},o.prototype.subn=function(e){return this.clone().isubn(e)},o.prototype.iabs=function(){return this.negative=0,this},o.prototype.abs=function(){return this.clone().iabs()},o.prototype._ishlnsubmul=function(e,t,n){var i,o,a=e.length+n;this._expand(a);var s=0;for(i=0;i<e.length;i++){o=(0|this.words[i+n])+s;var u=(0|e.words[i])*t;s=((o-=67108863&u)>>26)-(u/67108864|0),this.words[i+n]=67108863&o}for(;i<this.length-n;i++)s=(o=(0|this.words[i+n])+s)>>26,this.words[i+n]=67108863&o;if(0===s)return this.strip();for(r(-1===s),s=0,i=0;i<this.length;i++)s=(o=-(0|this.words[i])+s)>>26,this.words[i]=67108863&o;return this.negative=1,this.strip()},o.prototype._wordDiv=function(e,t){var n=(this.length,e.length),r=this.clone(),i=e,a=0|i.words[i.length-1];0!==(n=26-this._countBits(a))&&(i=i.ushln(n),r.iushln(n),a=0|i.words[i.length-1]);var s,u=r.length-i.length;if("mod"!==t){(s=new o(null)).length=u+1,s.words=new Array(s.length);for(var c=0;c<s.length;c++)s.words[c]=0}var d=r.clone()._ishlnsubmul(i,1,u);0===d.negative&&(r=d,s&&(s.words[u]=1));for(var l=u-1;l>=0;l--){var f=67108864*(0|r.words[i.length+l])+(0|r.words[i.length+l-1]);for(f=Math.min(f/a|0,67108863),r._ishlnsubmul(i,f,l);0!==r.negative;)f--,r.negative=0,r._ishlnsubmul(i,1,l),r.isZero()||(r.negative^=1);s&&(s.words[l]=f)}return s&&s.strip(),r.strip(),"div"!==t&&0!==n&&r.iushrn(n),{div:s||null,mod:r}},o.prototype.divmod=function(e,t,n){return r(!e.isZero()),this.isZero()?{div:new o(0),mod:new o(0)}:0!==this.negative&&0===e.negative?(s=this.neg().divmod(e,t),"mod"!==t&&(i=s.div.neg()),"div"!==t&&(a=s.mod.neg(),n&&0!==a.negative&&a.iadd(e)),{div:i,mod:a}):0===this.negative&&0!==e.negative?(s=this.divmod(e.neg(),t),"mod"!==t&&(i=s.div.neg()),{div:i,mod:s.mod}):0!=(this.negative&e.negative)?(s=this.neg().divmod(e.neg(),t),"div"!==t&&(a=s.mod.neg(),n&&0!==a.negative&&a.isub(e)),{div:s.div,mod:a}):e.length>this.length||this.cmp(e)<0?{div:new o(0),mod:this}:1===e.length?"div"===t?{div:this.divn(e.words[0]),mod:null}:"mod"===t?{div:null,mod:new o(this.modn(e.words[0]))}:{div:this.divn(e.words[0]),mod:new o(this.modn(e.words[0]))}:this._wordDiv(e,t);var i,a,s},o.prototype.div=function(e){return this.divmod(e,"div",!1).div},o.prototype.mod=function(e){return this.divmod(e,"mod",!1).mod},o.prototype.umod=function(e){return this.divmod(e,"mod",!0).mod},o.prototype.divRound=function(e){var t=this.divmod(e);if(t.mod.isZero())return t.div;var n=0!==t.div.negative?t.mod.isub(e):t.mod,r=e.ushrn(1),i=e.andln(1),o=n.cmp(r);return o<0||1===i&&0===o?t.div:0!==t.div.negative?t.div.isubn(1):t.div.iaddn(1)},o.prototype.modn=function(e){r(e<=67108863);for(var t=(1<<26)%e,n=0,i=this.length-1;i>=0;i--)n=(t*n+(0|this.words[i]))%e;return n},o.prototype.idivn=function(e){r(e<=67108863);for(var t=0,n=this.length-1;n>=0;n--){var i=(0|this.words[n])+67108864*t;this.words[n]=i/e|0,t=i%e}return this.strip()},o.prototype.divn=function(e){return this.clone().idivn(e)},o.prototype.egcd=function(e){r(0===e.negative),r(!e.isZero());var t=this,n=e.clone();t=0!==t.negative?t.umod(e):t.clone();for(var i=new o(1),a=new o(0),s=new o(0),u=new o(1),c=0;t.isEven()&&n.isEven();)t.iushrn(1),n.iushrn(1),++c;for(var d=n.clone(),l=t.clone();!t.isZero();){for(var f=0,p=1;0==(t.words[0]&p)&&f<26;++f,p<<=1);if(f>0)for(t.iushrn(f);f-- >0;)(i.isOdd()||a.isOdd())&&(i.iadd(d),a.isub(l)),i.iushrn(1),a.iushrn(1);for(var h=0,m=1;0==(n.words[0]&m)&&h<26;++h,m<<=1);if(h>0)for(n.iushrn(h);h-- >0;)(s.isOdd()||u.isOdd())&&(s.iadd(d),u.isub(l)),s.iushrn(1),u.iushrn(1);t.cmp(n)>=0?(t.isub(n),i.isub(s),a.isub(u)):(n.isub(t),s.isub(i),u.isub(a))}return{a:s,b:u,gcd:n.iushln(c)}},o.prototype._invmp=function(e){r(0===e.negative),r(!e.isZero());var t=this,n=e.clone();t=0!==t.negative?t.umod(e):t.clone();for(var i,a=new o(1),s=new o(0),u=n.clone();t.cmpn(1)>0&&n.cmpn(1)>0;){for(var c=0,d=1;0==(t.words[0]&d)&&c<26;++c,d<<=1);if(c>0)for(t.iushrn(c);c-- >0;)a.isOdd()&&a.iadd(u),a.iushrn(1);for(var l=0,f=1;0==(n.words[0]&f)&&l<26;++l,f<<=1);if(l>0)for(n.iushrn(l);l-- >0;)s.isOdd()&&s.iadd(u),s.iushrn(1);t.cmp(n)>=0?(t.isub(n),a.isub(s)):(n.isub(t),s.isub(a))}return(i=0===t.cmpn(1)?a:s).cmpn(0)<0&&i.iadd(e),i},o.prototype.gcd=function(e){if(this.isZero())return e.abs();if(e.isZero())return this.abs();var t=this.clone(),n=e.clone();t.negative=0,n.negative=0;for(var r=0;t.isEven()&&n.isEven();r++)t.iushrn(1),n.iushrn(1);for(;;){for(;t.isEven();)t.iushrn(1);for(;n.isEven();)n.iushrn(1);var i=t.cmp(n);if(i<0){var o=t;t=n,n=o}else if(0===i||0===n.cmpn(1))break;t.isub(n)}return n.iushln(r)},o.prototype.invm=function(e){return this.egcd(e).a.umod(e)},o.prototype.isEven=function(){return 0==(1&this.words[0])},o.prototype.isOdd=function(){return 1==(1&this.words[0])},o.prototype.andln=function(e){return this.words[0]&e},o.prototype.bincn=function(e){r("number"==typeof e);var t=e%26,n=(e-t)/26,i=1<<t;if(this.length<=n)return this._expand(n+1),this.words[n]|=i,this;for(var o=i,a=n;0!==o&&a<this.length;a++){var s=0|this.words[a];o=(s+=o)>>>26,s&=67108863,this.words[a]=s}return 0!==o&&(this.words[a]=o,this.length++),this},o.prototype.isZero=function(){return 1===this.length&&0===this.words[0]},o.prototype.cmpn=function(e){var t,n=e<0;if(0!==this.negative&&!n)return-1;if(0===this.negative&&n)return 1;if(this.strip(),this.length>1)t=1;else{n&&(e=-e),r(e<=67108863,"Number is too big");var i=0|this.words[0];t=i===e?0:i<e?-1:1}return 0!==this.negative?0|-t:t},o.prototype.cmp=function(e){if(0!==this.negative&&0===e.negative)return-1;if(0===this.negative&&0!==e.negative)return 1;var t=this.ucmp(e);return 0!==this.negative?0|-t:t},o.prototype.ucmp=function(e){if(this.length>e.length)return 1;if(this.length<e.length)return-1;for(var t=0,n=this.length-1;n>=0;n--){var r=0|this.words[n],i=0|e.words[n];if(r!==i){r<i?t=-1:r>i&&(t=1);break}}return t},o.prototype.gtn=function(e){return 1===this.cmpn(e)},o.prototype.gt=function(e){return 1===this.cmp(e)},o.prototype.gten=function(e){return this.cmpn(e)>=0},o.prototype.gte=function(e){return this.cmp(e)>=0},o.prototype.ltn=function(e){return-1===this.cmpn(e)},o.prototype.lt=function(e){return-1===this.cmp(e)},o.prototype.lten=function(e){return this.cmpn(e)<=0},o.prototype.lte=function(e){return this.cmp(e)<=0},o.prototype.eqn=function(e){return 0===this.cmpn(e)},o.prototype.eq=function(e){return 0===this.cmp(e)},o.red=function(e){return new M(e)},o.prototype.toRed=function(e){return r(!this.red,"Already a number in reduction context"),r(0===this.negative,"red works only with positives"),e.convertTo(this)._forceRed(e)},o.prototype.fromRed=function(){return r(this.red,"fromRed works only with numbers in reduction context"),this.red.convertFrom(this)},o.prototype._forceRed=function(e){return this.red=e,this},o.prototype.forceRed=function(e){return r(!this.red,"Already a number in reduction context"),this._forceRed(e)},o.prototype.redAdd=function(e){return r(this.red,"redAdd works only with red numbers"),this.red.add(this,e)},o.prototype.redIAdd=function(e){return r(this.red,"redIAdd works only with red numbers"),this.red.iadd(this,e)},o.prototype.redSub=function(e){return r(this.red,"redSub works only with red numbers"),this.red.sub(this,e)},o.prototype.redISub=function(e){return r(this.red,"redISub works only with red numbers"),this.red.isub(this,e)},o.prototype.redShl=function(e){return r(this.red,"redShl works only with red numbers"),this.red.shl(this,e)},o.prototype.redMul=function(e){return r(this.red,"redMul works only with red numbers"),this.red._verify2(this,e),this.red.mul(this,e)},o.prototype.redIMul=function(e){return r(this.red,"redMul works only with red numbers"),this.red._verify2(this,e),this.red.imul(this,e)},o.prototype.redSqr=function(){return r(this.red,"redSqr works only with red numbers"),this.red._verify1(this),this.red.sqr(this)},o.prototype.redISqr=function(){return r(this.red,"redISqr works only with red numbers"),this.red._verify1(this),this.red.isqr(this)},o.prototype.redSqrt=function(){return r(this.red,"redSqrt works only with red numbers"),this.red._verify1(this),this.red.sqrt(this)},o.prototype.redInvm=function(){return r(this.red,"redInvm works only with red numbers"),this.red._verify1(this),this.red.invm(this)},o.prototype.redNeg=function(){return r(this.red,"redNeg works only with red numbers"),this.red._verify1(this),this.red.neg(this)},o.prototype.redPow=function(e){return r(this.red&&!e.red,"redPow(normalNum)"),this.red._verify1(this),this.red.pow(this,e)};var _={k256:null,p224:null,p192:null,p25519:null};function v(e,t){this.name=e,this.p=new o(t,16),this.n=this.p.bitLength(),this.k=new o(1).iushln(this.n).isub(this.p),this.tmp=this._tmp()}function y(){v.call(this,"k256","ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f")}function g(){v.call(this,"p224","ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001")}function b(){v.call(this,"p192","ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff")}function w(){v.call(this,"25519","7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed")}function M(e){if("string"==typeof e){var t=o._prime(e);this.m=t.p,this.prime=t}else r(e.gtn(1),"modulus must be greater than 1"),this.m=e,this.prime=null}function k(e){M.call(this,e),this.shift=this.m.bitLength(),this.shift%26!=0&&(this.shift+=26-this.shift%26),this.r=new o(1).iushln(this.shift),this.r2=this.imod(this.r.sqr()),this.rinv=this.r._invmp(this.m),this.minv=this.rinv.mul(this.r).isubn(1).div(this.m),this.minv=this.minv.umod(this.r),this.minv=this.r.sub(this.minv)}v.prototype._tmp=function(){var e=new o(null);return e.words=new Array(Math.ceil(this.n/13)),e},v.prototype.ireduce=function(e){var t,n=e;do{this.split(n,this.tmp),t=(n=(n=this.imulK(n)).iadd(this.tmp)).bitLength()}while(t>this.n);var r=t<this.n?-1:n.ucmp(this.p);return 0===r?(n.words[0]=0,n.length=1):r>0?n.isub(this.p):n.strip(),n},v.prototype.split=function(e,t){e.iushrn(this.n,0,t)},v.prototype.imulK=function(e){return e.imul(this.k)},i(y,v),y.prototype.split=function(e,t){for(var n=Math.min(e.length,9),r=0;r<n;r++)t.words[r]=e.words[r];if(t.length=n,e.length<=9)return e.words[0]=0,void(e.length=1);var i=e.words[9];for(t.words[t.length++]=4194303&i,r=10;r<e.length;r++){var o=0|e.words[r];e.words[r-10]=(4194303&o)<<4|i>>>22,i=o}i>>>=22,e.words[r-10]=i,0===i&&e.length>10?e.length-=10:e.length-=9},y.prototype.imulK=function(e){e.words[e.length]=0,e.words[e.length+1]=0,e.length+=2;for(var t=0,n=0;n<e.length;n++){var r=0|e.words[n];t+=977*r,e.words[n]=67108863&t,t=64*r+(t/67108864|0)}return 0===e.words[e.length-1]&&(e.length--,0===e.words[e.length-1]&&e.length--),e},i(g,v),i(b,v),i(w,v),w.prototype.imulK=function(e){for(var t=0,n=0;n<e.length;n++){var r=19*(0|e.words[n])+t,i=67108863&r;r>>>=26,e.words[n]=i,t=r}return 0!==t&&(e.words[e.length++]=t),e},o._prime=function(e){if(_[e])return _[e];var t;if("k256"===e)t=new y;else if("p224"===e)t=new g;else if("p192"===e)t=new b;else{if("p25519"!==e)throw new Error("Unknown prime "+e);t=new w}return _[e]=t,t},M.prototype._verify1=function(e){r(0===e.negative,"red works only with positives"),r(e.red,"red works only with red numbers")},M.prototype._verify2=function(e,t){r(0==(e.negative|t.negative),"red works only with positives"),r(e.red&&e.red===t.red,"red works only with red numbers")},M.prototype.imod=function(e){return this.prime?this.prime.ireduce(e)._forceRed(this):e.umod(this.m)._forceRed(this)},M.prototype.neg=function(e){return e.isZero()?e.clone():this.m.sub(e)._forceRed(this)},M.prototype.add=function(e,t){this._verify2(e,t);var n=e.add(t);return n.cmp(this.m)>=0&&n.isub(this.m),n._forceRed(this)},M.prototype.iadd=function(e,t){this._verify2(e,t);var n=e.iadd(t);return n.cmp(this.m)>=0&&n.isub(this.m),n},M.prototype.sub=function(e,t){this._verify2(e,t);var n=e.sub(t);return n.cmpn(0)<0&&n.iadd(this.m),n._forceRed(this)},M.prototype.isub=function(e,t){this._verify2(e,t);var n=e.isub(t);return n.cmpn(0)<0&&n.iadd(this.m),n},M.prototype.shl=function(e,t){return this._verify1(e),this.imod(e.ushln(t))},M.prototype.imul=function(e,t){return this._verify2(e,t),this.imod(e.imul(t))},M.prototype.mul=function(e,t){return this._verify2(e,t),this.imod(e.mul(t))},M.prototype.isqr=function(e){return this.imul(e,e.clone())},M.prototype.sqr=function(e){return this.mul(e,e)},M.prototype.sqrt=function(e){if(e.isZero())return e.clone();var t=this.m.andln(3);if(r(t%2==1),3===t){var n=this.m.add(new o(1)).iushrn(2);return this.pow(e,n)}for(var i=this.m.subn(1),a=0;!i.isZero()&&0===i.andln(1);)a++,i.iushrn(1);r(!i.isZero());var s=new o(1).toRed(this),u=s.redNeg(),c=this.m.subn(1).iushrn(1),d=this.m.bitLength();for(d=new o(2*d*d).toRed(this);0!==this.pow(d,c).cmp(u);)d.redIAdd(u);for(var l=this.pow(d,i),f=this.pow(e,i.addn(1).iushrn(1)),p=this.pow(e,i),h=a;0!==p.cmp(s);){for(var m=p,_=0;0!==m.cmp(s);_++)m=m.redSqr();r(_<h);var v=this.pow(l,new o(1).iushln(h-_-1));f=f.redMul(v),l=v.redSqr(),p=p.redMul(l),h=_}return f},M.prototype.invm=function(e){var t=e._invmp(this.m);return 0!==t.negative?(t.negative=0,this.imod(t).redNeg()):this.imod(t)},M.prototype.pow=function(e,t){if(t.isZero())return new o(1).toRed(this);if(0===t.cmpn(1))return e.clone();var n=new Array(16);n[0]=new o(1).toRed(this),n[1]=e;for(var r=2;r<n.length;r++)n[r]=this.mul(n[r-1],e);var i=n[0],a=0,s=0,u=t.bitLength()%26;for(0===u&&(u=26),r=t.length-1;r>=0;r--){for(var c=t.words[r],d=u-1;d>=0;d--){var l=c>>d&1;i!==n[0]&&(i=this.sqr(i)),0!==l||0!==a?(a<<=1,a|=l,(4===++s||0===r&&0===d)&&(i=this.mul(i,n[a]),s=0,a=0)):s=0}u=26}return i},M.prototype.convertTo=function(e){var t=e.umod(this.m);return t===e?t.clone():t},M.prototype.convertFrom=function(e){var t=e.clone();return t.red=null,t},o.mont=function(e){return new k(e)},i(k,M),k.prototype.convertTo=function(e){return this.imod(e.ushln(this.shift))},k.prototype.convertFrom=function(e){var t=this.imod(e.mul(this.rinv));return t.red=null,t},k.prototype.imul=function(e,t){if(e.isZero()||t.isZero())return e.words[0]=0,e.length=1,e;var n=e.imul(t),r=n.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m),i=n.isub(r).iushrn(this.shift),o=i;return i.cmp(this.m)>=0?o=i.isub(this.m):i.cmpn(0)<0&&(o=i.iadd(this.m)),o._forceRed(this)},k.prototype.mul=function(e,t){if(e.isZero()||t.isZero())return new o(0)._forceRed(this);var n=e.mul(t),r=n.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m),i=n.isub(r).iushrn(this.shift),a=i;return i.cmp(this.m)>=0?a=i.isub(this.m):i.cmpn(0)<0&&(a=i.iadd(this.m)),a._forceRed(this)},k.prototype.invm=function(e){return this.imod(e._invmp(this.m).mul(this.r2))._forceRed(this)}}(e,this)}).call(this,n(12)(e))},function(e,t){var n;e.exports=t,t.setLog4js=function(e){n=e},t.inherit=function(){function e(){}return Object.create?function(e,t){e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:!1}})}:function(t,n){e.prototype=n.prototype,t.prototype=new e,t.prototype.constructor=n}};var r=t.newLine="\r\n",i=(t.emptyFunction=function(){},t.isUndefined=function(e){return void 0===e});t.handleError=function(e,t){log4javascript.dispatchEvent("error",{message:e,exception:t})};t.extractStringFromParam=function(e,t){return i(e)?t:String(e)},t.extractBooleanFromParam=function(e,t){return i(e)?t:o(e)},t.extractIntFromParam=function(e,t){if(i(e))return t;try{var n=parseInt(e,10);return isNaN(n)?t:n}catch(e){return t}},t.extractFunctionFromParam=function(e,t){return"function"==typeof e?e:t};var o=t.bool=function(e){return Boolean(e)};t.isError=function(e){return e instanceof Error};var a;encodeURIComponent("asdfadsfadsf");try{a=window.encodeURIComponent}catch(e){a=function(e){return escape(e).replace(/\+/g,"%2B").replace(/"/g,"%22").replace(/'/g,"%27").replace(/\//g,"%2F").replace(/=/g,"%3D")}}t.urlEncode=a;var s=t.toStr=function(e){return e&&e.toString?e.toString():String(e)},u=t.getExceptionMessage=function(e){return e.message?e.message:e.description?e.description:s(e)},c=t.getUrlFileName=function(e){var t=Math.max(e.lastIndexOf("/"),e.lastIndexOf("\\"));return e.substr(t+1)},d=t.getExceptionStringRep=function(e){if(e){var t="Exception: "+u(e);try{e.lineNumber&&(t+=" on line number "+e.lineNumber),e.fileName&&(t+=" in file "+c(e.fileName))}catch(e){}return n.showStackTraces&&e.stack&&(t+=r+"Stack trace:"+r+e.stack),t}return null},l=(t.array_remove=function(e,t){for(var n=-1,r=0,i=e.length;r<i;r++)if(e[r]===t){n=r;break}return n>=0&&(e.splice(n,1),!0)},t.array_contains=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]==t)return!0;return!1});t.formatObjectExpansion=function(e,t,n){var i=[];return function e(t,n,o){var a,u,c,f,p,h,m;function _(e){for(var t=function(e){return e.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n")}(e),n=1,i=t.length;n<i;n++)t[n]=o+t[n];return t.join(r)}if(o||(o=""),null===t)return"null";if(void 0===t)return"undefined";if("string"==typeof t)return _(t);if("object"==typeof t&&l(i,t)){try{h=s(t)}catch(e){h="Error formatting property. Details: "+d(e)}return h+" [already expanded]"}if(t instanceof Array&&n>0){for(i.push(t),h="["+r,c=n-1,f=o+"  ",p=[],a=0,u=t.length;a<u;a++)try{m=e(t[a],c,f),p.push(f+m)}catch(e){p.push(f+"Error formatting array member. Details: "+d(e))}return h+=p.join(","+r)+r+o+"]"}if("[object Date]"==Object.prototype.toString.call(t))return t.toString();if("object"==typeof t&&n>0){for(a in i.push(t),h="{"+r,c=n-1,f=o+"  ",p=[],t)try{m=e(t[a],c,f),p.push(f+a+": "+m)}catch(e){p.push(f+a+": Error formatting property. Details: "+d(e))}return h+=p.join(","+r)+r+o+"}"}return _(s(t))}(e,t,n)}},function(e,t){var n;e.exports=t,t.setLog4js=function(e){n=e},t.inherit=function(){function e(){}return Object.create?function(e,t){e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:!1}})}:function(t,n){e.prototype=n.prototype,t.prototype=new e,t.prototype.constructor=n}};var r=t.newLine="\r\n",i=(t.emptyFunction=function(){},t.isUndefined=function(e){return void 0===e});t.handleError=function(e,t){log4javascript.dispatchEvent("error",{message:e,exception:t})};t.extractStringFromParam=function(e,t){return i(e)?t:String(e)},t.extractBooleanFromParam=function(e,t){return i(e)?t:o(e)},t.extractIntFromParam=function(e,t){if(i(e))return t;try{var n=parseInt(e,10);return isNaN(n)?t:n}catch(e){return t}},t.extractFunctionFromParam=function(e,t){return"function"==typeof e?e:t};var o=t.bool=function(e){return Boolean(e)};t.isError=function(e){return e instanceof Error};var a;encodeURIComponent("asdfadsfadsf");try{a=window.encodeURIComponent}catch(e){a=function(e){return escape(e).replace(/\+/g,"%2B").replace(/"/g,"%22").replace(/'/g,"%27").replace(/\//g,"%2F").replace(/=/g,"%3D")}}t.urlEncode=a;var s=t.toStr=function(e){return e&&e.toString?e.toString():String(e)},u=t.getExceptionMessage=function(e){return e.message?e.message:e.description?e.description:s(e)},c=t.getUrlFileName=function(e){var t=Math.max(e.lastIndexOf("/"),e.lastIndexOf("\\"));return e.substr(t+1)},d=t.getExceptionStringRep=function(e){if(e){var t="Exception: "+u(e);try{e.lineNumber&&(t+=" on line number "+e.lineNumber),e.fileName&&(t+=" in file "+c(e.fileName))}catch(e){}return n.showStackTraces&&e.stack&&(t+=r+"Stack trace:"+r+e.stack),t}return null},l=(t.array_remove=function(e,t){for(var n=-1,r=0,i=e.length;r<i;r++)if(e[r]===t){n=r;break}return n>=0&&(e.splice(n,1),!0)},t.array_contains=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]==t)return!0;return!1});t.formatObjectExpansion=function(e,t,n){var i=[];return function e(t,n,o){var a,u,c,f,p,h,m;function _(e){for(var t=function(e){return e.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n")}(e),n=1,i=t.length;n<i;n++)t[n]=o+t[n];return t.join(r)}if(o||(o=""),null===t)return"null";if(void 0===t)return"undefined";if("string"==typeof t)return _(t);if("object"==typeof t&&l(i,t)){try{h=s(t)}catch(e){h="Error formatting property. Details: "+d(e)}return h+" [already expanded]"}if(t instanceof Array&&n>0){for(i.push(t),h="["+r,c=n-1,f=o+"  ",p=[],a=0,u=t.length;a<u;a++)try{m=e(t[a],c,f),p.push(f+m)}catch(e){p.push(f+"Error formatting array member. Details: "+d(e))}return h+=p.join(","+r)+r+o+"]"}if("[object Date]"==Object.prototype.toString.call(t))return t.toString();if("object"==typeof t&&n>0){for(a in i.push(t),h="{"+r,c=n-1,f=o+"  ",p=[],t)try{m=e(t[a],c,f),p.push(f+a+": "+m)}catch(e){p.push(f+a+": Error formatting property. Details: "+d(e))}return h+=p.join(","+r)+r+o+"}"}return _(s(t))}(e,t,n)}},function(e,t){e.exports=function(e){return e.webpackPolyfill||(e.deprecate=function(){},e.paths=[],e.children||(e.children=[]),Object.defineProperty(e,"loaded",{enumerable:!0,get:function(){return e.l}}),Object.defineProperty(e,"id",{enumerable:!0,get:function(){return e.i}}),e.webpackPolyfill=1),e}},function(e,t,n){"use strict";var r=t;r.version=n(415).version,r.utils=n(416),r.rand=n(140),r.curve=n(61),r.curves=n(421),r.ec=n(429),r.eddsa=n(433)},function(e,t,n){"use strict";var r=n(5);function i(){}i.createFunc=function(e){return function(t){t=t||{},e.upgrade&&e.upgrade(t);var n=new e;return r.extend(n,t)}},i.upgrade=function(){},i.create=i.createFunc(i),i.prototype.asObject=function(){var e=r.cloneDeep(this);return r.omit(e,r.functions(this))},i.createDeepClone=function(e){return function(){return e.create(r.cloneDeep(this))}},i.prototype.KeyScope="User",i.prototype.asWhitelistedObject=function(e){var t=this.asObject(this);return r.pick(t,e)},e.exports=i},function(e,t){function n(e,t){if(!e)throw new Error(t||"Assertion failed")}e.exports=n,n.equal=function(e,t,n){if(e!=t)throw new Error(n||"Assertion failed: "+e+" != "+t)}},function(e,t,n){"use strict";var r=n(63),i=n(65),o=(n(73),n(169).getLogger("acm-api.service-base")),a=n(522).safeUrlParse,s=n(6),u=[408];function c(e){s.checkIsObject(e),s.checkIsFunction(e.request),this._request=e.request,this._features=e.features||{}}function d(e,t){t.maxRetries===t.retries&&t.onRetry();var n=1e3*Math.pow(2,t.maxRetries-t.retries);t.retries--,0===t.retries&&(n=0);var r=e._callback;return r=r.bind({original:t,request:e}),e.end(function(e,t){setTimeout(r.bind(r,e,t),n)})}function l(e,t,n){t=t||{},o[n=n||"debug"](t.name,t),e.reject(t)}function f(e){if(null===e.match(/^https:\/\//))return!1;var t=e.replace(/^https:\/\//,""),r=t.indexOf("/"),i=t.indexOf(":"),o=r;if(-1!==i&&i<r&&(o=i,null===t.substring(i+1,r).match(/^[0-9]{1,5}$/)))return!1;var a=t.substr(0,o>=0?o:void 0);if(0===a.length)return!1;if(null===a.match(/^[A-Za-z0-9_.-]+$/))return!1;if(a.indexOf(".virtru.com")>=0&&null===a.match(/\.virtru\.com$/))return!1;var s=n(531).parse(e),u=s.host&&s.host.hostname;return void 0!==u&&0!==u.length}c.prototype.end=function(e,t,n,a){return function(s,c){if(s){if(this&&this.original&&this.original.retries>0&&(s.status>=500||429===s.status))return d(this.request,this.original);if(s.crossDomain){var f="Internet connection issues";return f=new i.NetworkConnectionError(f),f=r.extend(f,s),l(t,f,"warn")}if(s.message&&"timeout of undefinedms exceeded"===s.message&&s.stack&&s.stack.indexOf("Request.abort")>0)return l(t,new i.RequestAborted,"info")}var p;if(c){if(c.status===e)return p=n?n(c):c.body,o.debug("Request succeeded.",p),t.resolve(p);var h=u.indexOf(c.status)>=0;if(this&&this.original&&this.original.retries>0&&h)return d(this.request,this.original);if(c.error&&a&&(p=a(c)))return l(t,p,"error");if(500===c.status)return l(t,new i.InternalServerError("There was an internal server error.",c.status),"error");if(401===c.status)return c.body&&c.body.error&&"InvalidCredentialComboError"===c.body.error.name?l(t,new i.InvalidAppId("The app id is invalid"),"error"):l(t,new i.Unauthorized("Unauthorized"));if(403===c.status){if(c.body.error){var m=c.body.error.reason?c.body.error.reason:i.AccessDisabled.UNAUTHORIZED;return l(t,new i.AccessDisabled("No access to this policy",m))}return l(t,new i.AccessDisabled("No access to this policy",i.AccessDisabled.UNAUTHORIZED))}if(404===c.status){var _=c.body&&c.body.error?c.body.error.message:"URL not found.";return l(t,new i.NotFoundError(_),"error")}return 504===c.status?l(t,new i.InternalServerError("504 Gateway timeout.",c.status),"error"):c.status>500&&c.status<=599?l(t,new i.InternalServerError("There was an internal server error.",c.status),"error"):l(t,c.body,"error")}return l(t,s,"error")}},c.prototype.buildRequest=function(e,t,n){o.debug("Request : "+t);var s=this._request(e,t);if(n){n.tokenId&&n.tokenSecret?function(e,t){if(!t.signRequest)throw new Error("Superagent is not initialized correctly...");t.signRequest({key:e.tokenId,secret:e.tokenSecret}),void 0!==e.clientString&&t.set("X-Virtru-Client",e.clientString);void 0!==e.sessionId&&t.set("X-Session-Id",e.sessionId)}(n,s):(n.userId||r.isArray(n))&&function(e,t,n){e=r.isArray(e)?e:[e];var o=[];r.each(e,function(e){if(e.appIdDomains&&e.userId){var t=[function(e,t){if(!f(t))throw new i.InvalidUriError("Encountered an invalid URI: "+t);var n=a(t).hostname,r=e[n];if(!r)throw new i.NoAppIdForDomain("No appId exists for the domain "+n);return r}(e.appIdDomains,n),e.userId];o.push(t)}}),o.length&&t.set("Authorization","Virtru "+JSON.stringify(o))}(n,s,t),s.onRetry=n.onRetry||r.noop;var u=n.retries;(n=r.isArray(n)?n[0]:n).retries=u,void 0!==n.clientString&&s.set("X-Virtru-Client",n.clientString),n.virtruTeamsAttribute&&s.set("X-Virtru-Teams-Attributes",n.virtruTeamsAttribute),void 0!==n.sessionId&&s.set("X-Session-Id",n.sessionId);var c=void 0===n.retries;if(n.retries=c?5:n.retries,n.retries){n.retries--,s.maxRetries=n.retries,s.retries=n.retries;var d=r.clone(s);s.end=function(e){return d.end.call(s,e.bind({original:d,request:s}))}}}return n&&n.withoutCredential||s.withCredentials(),s},c.prototype.statusResponder=function(e){return e.status},c.isUrlValid=f,c.prototype._getAccountsUrl=function(e){return!0===this._features.singleEndpoint?e.apiUrl+"/accounts":e.accountsUrl},c.prototype._getAcmUrl=function(e){return!0===this._features.singleEndpoint?e.apiUrl+"/acm":e.mainAcmUrl},c.prototype._getEventsUrl=function(e){return!0===this._features.singleEndpoint?e.apiUrl+"/events":e.eventsUrl},c.prototype._getAuditUrl=function(e){return!0===this._features.singleEndpoint?e.apiUrl+"/audit":e.eventsUrl},c.prototype._convertToSingleEndpoint=function(e,t){if(!0==!this._features.singleEndpoint)return e;try{var n=a(e),r=t[n.hostname];if(void 0!==r)return n.set("hostname",r),n.href}catch(e){console.error(e)}return e},t.ServiceBase=c},function(e,t,n){"use strict";const r=n(5),i=n(6),o=n(39),a=n(31),s=n(55),u=n(104),c=n(0),d=12;class l{constructor(e){const t=e.req,n=r.get(e,"details.updated",e.details),i=e.errorDetails,a=e._id||e.id||o.v4();this.setType(e.type),this.setUserData(e),this.timestamp=e.timestamp,this.expirationDate=c(this.timestamp).add(d,"months").unix(),this.recordId=`${e.timestamp}_${a}`,this.action=e.action,this.orgId=l._getOrgId(e),this.orgActionType=l._getOrgActionType(this.orgId,this.action,this.type),this.requestIp=t.ip,this.requestId=t.requestId,this.virtruClient=t.virtruClient||n.platform,this.userAgent=t.userAgent,i&&(this.errorName=i.name,this.errorMessage=i.message,this.errorCode=i.code,this.errorStack=i.stack)}setType(e){i.checkIsString(e),this.type=e}setOrgId(e){i.checkIsString(e),this.orgId=e,this.orgActionType=l._getOrgActionType(this.orgId,this.action,this.type)}setUserData(e){const t=r.get(e,"req.userSettings");if(t){const e=s.create(t);this.userId=e.userId,this.userPrimaryOu=e.getPrimaryOrgUnitId(),this.userOus=r.uniq(e.organizationalUnitsValues())||[],this.userGroups=e.groupValues()||[]}else this.userOus=[],this.userGroups=[]}static _getOrgId(e){if("organization"===e.type)return r.get(e,"details.id")||r.get(e,"details.updated.id");if("unit-attributes"===e.type)return r.get(e,"details.orgId")||r.get(e,"details.updated.orgId");const t=r.get(e,"details.updated",e.details);let n=r.get(t,"orgId");if(!r.isEmpty(n))return n;const i=e.req;if(n=l._getOrgIdFromRequest(i),!r.isEmpty(n))return n;const o=t.attributes;return void 0!==o?n=l._getOrgIdFromDetailsAttributes(o):void 0}static _getOrgIdFromRequest(e={}){let t=void 0,n=e.userSettings,i=e.apiToken;return n&&(t=(n=s.create(n)).getPrimaryOrgId(),!r.isEmpty(t))?t:i&&(t=(i=u.create(i)).getPrimaryOrgId(),!r.isEmpty(t))?t:void 0}static _getOrgIdFromDetailsAttributes(e={}){let t=void 0;const n=a.User.primaryOrg(),r=a.User.primaryOrgUnit(),i=a.Service.primaryOrg(),o=(e,t,n)=>{const r=e.find(e=>{const r=e.key;return r.includes(t)&&!r.includes(n)});return r&&r.value};return void 0!==(t=o(e,n,r))?t:t=o(e,i)}static _getOrgActionType(e,t,n){if(!r.some([e,t,n],r.isEmpty))return[e,t,n].join("_")}}e.exports=l},function(e,t,n){"use strict";var r=n(344),i=n(712),o=Object.prototype.toString;function a(e){return"[object Array]"===o.call(e)}function s(e){return null!==e&&"object"==typeof e}function u(e){return"[object Function]"===o.call(e)}function c(e,t){if(null!=e)if("object"!=typeof e&&(e=[e]),a(e))for(var n=0,r=e.length;n<r;n++)t.call(null,e[n],n,e);else for(var i in e)Object.prototype.hasOwnProperty.call(e,i)&&t.call(null,e[i],i,e)}e.exports={isArray:a,isArrayBuffer:function(e){return"[object ArrayBuffer]"===o.call(e)},isBuffer:i,isFormData:function(e){return"undefined"!=typeof FormData&&e instanceof FormData},isArrayBufferView:function(e){return"undefined"!=typeof ArrayBuffer&&ArrayBuffer.isView?ArrayBuffer.isView(e):e&&e.buffer&&e.buffer instanceof ArrayBuffer},isString:function(e){return"string"==typeof e},isNumber:function(e){return"number"==typeof e},isObject:s,isUndefined:function(e){return void 0===e},isDate:function(e){return"[object Date]"===o.call(e)},isFile:function(e){return"[object File]"===o.call(e)},isBlob:function(e){return"[object Blob]"===o.call(e)},isFunction:u,isStream:function(e){return s(e)&&u(e.pipe)},isURLSearchParams:function(e){return"undefined"!=typeof URLSearchParams&&e instanceof URLSearchParams},isStandardBrowserEnv:function(){return("undefined"==typeof navigator||"ReactNative"!==navigator.product)&&"undefined"!=typeof window&&"undefined"!=typeof document},forEach:c,merge:function e(){var t={};function n(n,r){"object"==typeof t[r]&&"object"==typeof n?t[r]=e(t[r],n):t[r]=n}for(var r=0,i=arguments.length;r<i;r++)c(arguments[r],n);return t},extend:function(e,t,n){return c(t,function(t,i){e[i]=n&&"function"==typeof t?r(t,n):t}),e},trim:function(e){return e.replace(/^\s*/,"").replace(/\s*$/,"")}}},function(e,t,n){"use strict";var r=n(15),i=n(1);function o(e,t){return 55296==(64512&e.charCodeAt(t))&&(!(t<0||t+1>=e.length)&&56320==(64512&e.charCodeAt(t+1)))}function a(e){return(e>>>24|e>>>8&65280|e<<8&16711680|(255&e)<<24)>>>0}function s(e){return 1===e.length?"0"+e:e}function u(e){return 7===e.length?"0"+e:6===e.length?"00"+e:5===e.length?"000"+e:4===e.length?"0000"+e:3===e.length?"00000"+e:2===e.length?"000000"+e:1===e.length?"0000000"+e:e}t.inherits=i,t.toArray=function(e,t){if(Array.isArray(e))return e.slice();if(!e)return[];var n=[];if("string"==typeof e)if(t){if("hex"===t)for((e=e.replace(/[^a-z0-9]+/gi,"")).length%2!=0&&(e="0"+e),i=0;i<e.length;i+=2)n.push(parseInt(e[i]+e[i+1],16))}else for(var r=0,i=0;i<e.length;i++){var a=e.charCodeAt(i);a<128?n[r++]=a:a<2048?(n[r++]=a>>6|192,n[r++]=63&a|128):o(e,i)?(a=65536+((1023&a)<<10)+(1023&e.charCodeAt(++i)),n[r++]=a>>18|240,n[r++]=a>>12&63|128,n[r++]=a>>6&63|128,n[r++]=63&a|128):(n[r++]=a>>12|224,n[r++]=a>>6&63|128,n[r++]=63&a|128)}else for(i=0;i<e.length;i++)n[i]=0|e[i];return n},t.toHex=function(e){for(var t="",n=0;n<e.length;n++)t+=s(e[n].toString(16));return t},t.htonl=a,t.toHex32=function(e,t){for(var n="",r=0;r<e.length;r++){var i=e[r];"little"===t&&(i=a(i)),n+=u(i.toString(16))}return n},t.zero2=s,t.zero8=u,t.join32=function(e,t,n,i){var o=n-t;r(o%4==0);for(var a=new Array(o/4),s=0,u=t;s<a.length;s++,u+=4){var c;c="big"===i?e[u]<<24|e[u+1]<<16|e[u+2]<<8|e[u+3]:e[u+3]<<24|e[u+2]<<16|e[u+1]<<8|e[u],a[s]=c>>>0}return a},t.split32=function(e,t){for(var n=new Array(4*e.length),r=0,i=0;r<e.length;r++,i+=4){var o=e[r];"big"===t?(n[i]=o>>>24,n[i+1]=o>>>16&255,n[i+2]=o>>>8&255,n[i+3]=255&o):(n[i+3]=o>>>24,n[i+2]=o>>>16&255,n[i+1]=o>>>8&255,n[i]=255&o)}return n},t.rotr32=function(e,t){return e>>>t|e<<32-t},t.rotl32=function(e,t){return e<<t|e>>>32-t},t.sum32=function(e,t){return e+t>>>0},t.sum32_3=function(e,t,n){return e+t+n>>>0},t.sum32_4=function(e,t,n,r){return e+t+n+r>>>0},t.sum32_5=function(e,t,n,r,i){return e+t+n+r+i>>>0},t.sum64=function(e,t,n,r){var i=e[t],o=r+e[t+1]>>>0,a=(o<r?1:0)+n+i;e[t]=a>>>0,e[t+1]=o},t.sum64_hi=function(e,t,n,r){return(t+r>>>0<t?1:0)+e+n>>>0},t.sum64_lo=function(e,t,n,r){return t+r>>>0},t.sum64_4_hi=function(e,t,n,r,i,o,a,s){var u=0,c=t;return u+=(c=c+r>>>0)<t?1:0,u+=(c=c+o>>>0)<o?1:0,e+n+i+a+(u+=(c=c+s>>>0)<s?1:0)>>>0},t.sum64_4_lo=function(e,t,n,r,i,o,a,s){return t+r+o+s>>>0},t.sum64_5_hi=function(e,t,n,r,i,o,a,s,u,c){var d=0,l=t;return d+=(l=l+r>>>0)<t?1:0,d+=(l=l+o>>>0)<o?1:0,d+=(l=l+s>>>0)<s?1:0,e+n+i+a+u+(d+=(l=l+c>>>0)<c?1:0)>>>0},t.sum64_5_lo=function(e,t,n,r,i,o,a,s,u,c){return t+r+o+s+c>>>0},t.rotr64_hi=function(e,t,n){return(t<<32-n|e>>>n)>>>0},t.rotr64_lo=function(e,t,n){return(e<<32-n|t>>>n)>>>0},t.shr64_hi=function(e,t,n){return e>>>n},t.shr64_lo=function(e,t,n){return(e<<32-n|t>>>n)>>>0}},function(e,t,n){(function(e,r){var i;
/**
 * @license
 * Lodash <https://lodash.com/>
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */(function(){var o,a=200,s="Unsupported core-js use. Try https://npms.io/search?q=ponyfill.",u="Expected a function",c="__lodash_hash_undefined__",d=500,l="__lodash_placeholder__",f=1,p=2,h=4,m=1,_=2,v=1,y=2,g=4,b=8,w=16,M=32,k=64,x=128,S=256,L=512,A=30,E="...",T=800,D=16,j=1,I=2,Y=1/0,O=9007199254740991,R=1.7976931348623157e308,C=NaN,P=4294967295,U=P-1,N=P>>>1,F=[["ary",x],["bind",v],["bindKey",y],["curry",b],["curryRight",w],["flip",L],["partial",M],["partialRight",k],["rearg",S]],H="[object Arguments]",B="[object Array]",z="[object AsyncFunction]",q="[object Boolean]",W="[object Date]",G="[object DOMException]",V="[object Error]",J="[object Function]",Z="[object GeneratorFunction]",K="[object Map]",X="[object Number]",Q="[object Null]",$="[object Object]",ee="[object Proxy]",te="[object RegExp]",ne="[object Set]",re="[object String]",ie="[object Symbol]",oe="[object Undefined]",ae="[object WeakMap]",se="[object WeakSet]",ue="[object ArrayBuffer]",ce="[object DataView]",de="[object Float32Array]",le="[object Float64Array]",fe="[object Int8Array]",pe="[object Int16Array]",he="[object Int32Array]",me="[object Uint8Array]",_e="[object Uint8ClampedArray]",ve="[object Uint16Array]",ye="[object Uint32Array]",ge=/\b__p \+= '';/g,be=/\b(__p \+=) '' \+/g,we=/(__e\(.*?\)|\b__t\)) \+\n'';/g,Me=/&(?:amp|lt|gt|quot|#39);/g,ke=/[&<>"']/g,xe=RegExp(Me.source),Se=RegExp(ke.source),Le=/<%-([\s\S]+?)%>/g,Ae=/<%([\s\S]+?)%>/g,Ee=/<%=([\s\S]+?)%>/g,Te=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,De=/^\w*$/,je=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,Ie=/[\\^$.*+?()[\]{}|]/g,Ye=RegExp(Ie.source),Oe=/^\s+|\s+$/g,Re=/^\s+/,Ce=/\s+$/,Pe=/\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/,Ue=/\{\n\/\* \[wrapped with (.+)\] \*/,Ne=/,? & /,Fe=/[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g,He=/\\(\\)?/g,Be=/\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,ze=/\w*$/,qe=/^[-+]0x[0-9a-f]+$/i,We=/^0b[01]+$/i,Ge=/^\[object .+?Constructor\]$/,Ve=/^0o[0-7]+$/i,Je=/^(?:0|[1-9]\d*)$/,Ze=/[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g,Ke=/($^)/,Xe=/['\n\r\u2028\u2029\\]/g,Qe="\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff",$e="\\xac\\xb1\\xd7\\xf7\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf\\u2000-\\u206f \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000",et="[\\ud800-\\udfff]",tt="["+$e+"]",nt="["+Qe+"]",rt="\\d+",it="[\\u2700-\\u27bf]",ot="[a-z\\xdf-\\xf6\\xf8-\\xff]",at="[^\\ud800-\\udfff"+$e+rt+"\\u2700-\\u27bfa-z\\xdf-\\xf6\\xf8-\\xffA-Z\\xc0-\\xd6\\xd8-\\xde]",st="\\ud83c[\\udffb-\\udfff]",ut="[^\\ud800-\\udfff]",ct="(?:\\ud83c[\\udde6-\\uddff]){2}",dt="[\\ud800-\\udbff][\\udc00-\\udfff]",lt="[A-Z\\xc0-\\xd6\\xd8-\\xde]",ft="(?:"+ot+"|"+at+")",pt="(?:"+lt+"|"+at+")",ht="(?:"+nt+"|"+st+")"+"?",mt="[\\ufe0e\\ufe0f]?"+ht+("(?:\\u200d(?:"+[ut,ct,dt].join("|")+")[\\ufe0e\\ufe0f]?"+ht+")*"),_t="(?:"+[it,ct,dt].join("|")+")"+mt,vt="(?:"+[ut+nt+"?",nt,ct,dt,et].join("|")+")",yt=RegExp("['’]","g"),gt=RegExp(nt,"g"),bt=RegExp(st+"(?="+st+")|"+vt+mt,"g"),wt=RegExp([lt+"?"+ot+"+(?:['’](?:d|ll|m|re|s|t|ve))?(?="+[tt,lt,"$"].join("|")+")",pt+"+(?:['’](?:D|LL|M|RE|S|T|VE))?(?="+[tt,lt+ft,"$"].join("|")+")",lt+"?"+ft+"+(?:['’](?:d|ll|m|re|s|t|ve))?",lt+"+(?:['’](?:D|LL|M|RE|S|T|VE))?","\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])","\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])",rt,_t].join("|"),"g"),Mt=RegExp("[\\u200d\\ud800-\\udfff"+Qe+"\\ufe0e\\ufe0f]"),kt=/[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/,xt=["Array","Buffer","DataView","Date","Error","Float32Array","Float64Array","Function","Int8Array","Int16Array","Int32Array","Map","Math","Object","Promise","RegExp","Set","String","Symbol","TypeError","Uint8Array","Uint8ClampedArray","Uint16Array","Uint32Array","WeakMap","_","clearTimeout","isFinite","parseInt","setTimeout"],St=-1,Lt={};Lt[de]=Lt[le]=Lt[fe]=Lt[pe]=Lt[he]=Lt[me]=Lt[_e]=Lt[ve]=Lt[ye]=!0,Lt[H]=Lt[B]=Lt[ue]=Lt[q]=Lt[ce]=Lt[W]=Lt[V]=Lt[J]=Lt[K]=Lt[X]=Lt[$]=Lt[te]=Lt[ne]=Lt[re]=Lt[ae]=!1;var At={};At[H]=At[B]=At[ue]=At[ce]=At[q]=At[W]=At[de]=At[le]=At[fe]=At[pe]=At[he]=At[K]=At[X]=At[$]=At[te]=At[ne]=At[re]=At[ie]=At[me]=At[_e]=At[ve]=At[ye]=!0,At[V]=At[J]=At[ae]=!1;var Et={"\\":"\\","'":"'","\n":"n","\r":"r","\u2028":"u2028","\u2029":"u2029"},Tt=parseFloat,Dt=parseInt,jt="object"==typeof e&&e&&e.Object===Object&&e,It="object"==typeof self&&self&&self.Object===Object&&self,Yt=jt||It||Function("return this")(),Ot=t&&!t.nodeType&&t,Rt=Ot&&"object"==typeof r&&r&&!r.nodeType&&r,Ct=Rt&&Rt.exports===Ot,Pt=Ct&&jt.process,Ut=function(){try{var e=Rt&&Rt.require&&Rt.require("util").types;return e||Pt&&Pt.binding&&Pt.binding("util")}catch(e){}}(),Nt=Ut&&Ut.isArrayBuffer,Ft=Ut&&Ut.isDate,Ht=Ut&&Ut.isMap,Bt=Ut&&Ut.isRegExp,zt=Ut&&Ut.isSet,qt=Ut&&Ut.isTypedArray;function Wt(e,t,n){switch(n.length){case 0:return e.call(t);case 1:return e.call(t,n[0]);case 2:return e.call(t,n[0],n[1]);case 3:return e.call(t,n[0],n[1],n[2])}return e.apply(t,n)}function Gt(e,t,n,r){for(var i=-1,o=null==e?0:e.length;++i<o;){var a=e[i];t(r,a,n(a),e)}return r}function Vt(e,t){for(var n=-1,r=null==e?0:e.length;++n<r&&!1!==t(e[n],n,e););return e}function Jt(e,t){for(var n=null==e?0:e.length;n--&&!1!==t(e[n],n,e););return e}function Zt(e,t){for(var n=-1,r=null==e?0:e.length;++n<r;)if(!t(e[n],n,e))return!1;return!0}function Kt(e,t){for(var n=-1,r=null==e?0:e.length,i=0,o=[];++n<r;){var a=e[n];t(a,n,e)&&(o[i++]=a)}return o}function Xt(e,t){return!!(null==e?0:e.length)&&un(e,t,0)>-1}function Qt(e,t,n){for(var r=-1,i=null==e?0:e.length;++r<i;)if(n(t,e[r]))return!0;return!1}function $t(e,t){for(var n=-1,r=null==e?0:e.length,i=Array(r);++n<r;)i[n]=t(e[n],n,e);return i}function en(e,t){for(var n=-1,r=t.length,i=e.length;++n<r;)e[i+n]=t[n];return e}function tn(e,t,n,r){var i=-1,o=null==e?0:e.length;for(r&&o&&(n=e[++i]);++i<o;)n=t(n,e[i],i,e);return n}function nn(e,t,n,r){var i=null==e?0:e.length;for(r&&i&&(n=e[--i]);i--;)n=t(n,e[i],i,e);return n}function rn(e,t){for(var n=-1,r=null==e?0:e.length;++n<r;)if(t(e[n],n,e))return!0;return!1}var on=fn("length");function an(e,t,n){var r;return n(e,function(e,n,i){if(t(e,n,i))return r=n,!1}),r}function sn(e,t,n,r){for(var i=e.length,o=n+(r?1:-1);r?o--:++o<i;)if(t(e[o],o,e))return o;return-1}function un(e,t,n){return t==t?function(e,t,n){var r=n-1,i=e.length;for(;++r<i;)if(e[r]===t)return r;return-1}(e,t,n):sn(e,dn,n)}function cn(e,t,n,r){for(var i=n-1,o=e.length;++i<o;)if(r(e[i],t))return i;return-1}function dn(e){return e!=e}function ln(e,t){var n=null==e?0:e.length;return n?mn(e,t)/n:C}function fn(e){return function(t){return null==t?o:t[e]}}function pn(e){return function(t){return null==e?o:e[t]}}function hn(e,t,n,r,i){return i(e,function(e,i,o){n=r?(r=!1,e):t(n,e,i,o)}),n}function mn(e,t){for(var n,r=-1,i=e.length;++r<i;){var a=t(e[r]);a!==o&&(n=n===o?a:n+a)}return n}function _n(e,t){for(var n=-1,r=Array(e);++n<e;)r[n]=t(n);return r}function vn(e){return function(t){return e(t)}}function yn(e,t){return $t(t,function(t){return e[t]})}function gn(e,t){return e.has(t)}function bn(e,t){for(var n=-1,r=e.length;++n<r&&un(t,e[n],0)>-1;);return n}function wn(e,t){for(var n=e.length;n--&&un(t,e[n],0)>-1;);return n}var Mn=pn({"À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","Ç":"C","ç":"c","Ð":"D","ð":"d","È":"E","É":"E","Ê":"E","Ë":"E","è":"e","é":"e","ê":"e","ë":"e","Ì":"I","Í":"I","Î":"I","Ï":"I","ì":"i","í":"i","î":"i","ï":"i","Ñ":"N","ñ":"n","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","Ù":"U","Ú":"U","Û":"U","Ü":"U","ù":"u","ú":"u","û":"u","ü":"u","Ý":"Y","ý":"y","ÿ":"y","Æ":"Ae","æ":"ae","Þ":"Th","þ":"th","ß":"ss","Ā":"A","Ă":"A","Ą":"A","ā":"a","ă":"a","ą":"a","Ć":"C","Ĉ":"C","Ċ":"C","Č":"C","ć":"c","ĉ":"c","ċ":"c","č":"c","Ď":"D","Đ":"D","ď":"d","đ":"d","Ē":"E","Ĕ":"E","Ė":"E","Ę":"E","Ě":"E","ē":"e","ĕ":"e","ė":"e","ę":"e","ě":"e","Ĝ":"G","Ğ":"G","Ġ":"G","Ģ":"G","ĝ":"g","ğ":"g","ġ":"g","ģ":"g","Ĥ":"H","Ħ":"H","ĥ":"h","ħ":"h","Ĩ":"I","Ī":"I","Ĭ":"I","Į":"I","İ":"I","ĩ":"i","ī":"i","ĭ":"i","į":"i","ı":"i","Ĵ":"J","ĵ":"j","Ķ":"K","ķ":"k","ĸ":"k","Ĺ":"L","Ļ":"L","Ľ":"L","Ŀ":"L","Ł":"L","ĺ":"l","ļ":"l","ľ":"l","ŀ":"l","ł":"l","Ń":"N","Ņ":"N","Ň":"N","Ŋ":"N","ń":"n","ņ":"n","ň":"n","ŋ":"n","Ō":"O","Ŏ":"O","Ő":"O","ō":"o","ŏ":"o","ő":"o","Ŕ":"R","Ŗ":"R","Ř":"R","ŕ":"r","ŗ":"r","ř":"r","Ś":"S","Ŝ":"S","Ş":"S","Š":"S","ś":"s","ŝ":"s","ş":"s","š":"s","Ţ":"T","Ť":"T","Ŧ":"T","ţ":"t","ť":"t","ŧ":"t","Ũ":"U","Ū":"U","Ŭ":"U","Ů":"U","Ű":"U","Ų":"U","ũ":"u","ū":"u","ŭ":"u","ů":"u","ű":"u","ų":"u","Ŵ":"W","ŵ":"w","Ŷ":"Y","ŷ":"y","Ÿ":"Y","Ź":"Z","Ż":"Z","Ž":"Z","ź":"z","ż":"z","ž":"z","Ĳ":"IJ","ĳ":"ij","Œ":"Oe","œ":"oe","ŉ":"'n","ſ":"s"}),kn=pn({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"});function xn(e){return"\\"+Et[e]}function Sn(e){return Mt.test(e)}function Ln(e){var t=-1,n=Array(e.size);return e.forEach(function(e,r){n[++t]=[r,e]}),n}function An(e,t){return function(n){return e(t(n))}}function En(e,t){for(var n=-1,r=e.length,i=0,o=[];++n<r;){var a=e[n];a!==t&&a!==l||(e[n]=l,o[i++]=n)}return o}function Tn(e){var t=-1,n=Array(e.size);return e.forEach(function(e){n[++t]=e}),n}function Dn(e){var t=-1,n=Array(e.size);return e.forEach(function(e){n[++t]=[e,e]}),n}function jn(e){return Sn(e)?function(e){var t=bt.lastIndex=0;for(;bt.test(e);)++t;return t}(e):on(e)}function In(e){return Sn(e)?function(e){return e.match(bt)||[]}(e):function(e){return e.split("")}(e)}var Yn=pn({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&#39;":"'"});var On=function e(t){var n,r=(t=null==t?Yt:On.defaults(Yt.Object(),t,On.pick(Yt,xt))).Array,i=t.Date,Qe=t.Error,$e=t.Function,et=t.Math,tt=t.Object,nt=t.RegExp,rt=t.String,it=t.TypeError,ot=r.prototype,at=$e.prototype,st=tt.prototype,ut=t["__core-js_shared__"],ct=at.toString,dt=st.hasOwnProperty,lt=0,ft=(n=/[^.]+$/.exec(ut&&ut.keys&&ut.keys.IE_PROTO||""))?"Symbol(src)_1."+n:"",pt=st.toString,ht=ct.call(tt),mt=Yt._,_t=nt("^"+ct.call(dt).replace(Ie,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),vt=Ct?t.Buffer:o,bt=t.Symbol,Mt=t.Uint8Array,Et=vt?vt.allocUnsafe:o,jt=An(tt.getPrototypeOf,tt),It=tt.create,Ot=st.propertyIsEnumerable,Rt=ot.splice,Pt=bt?bt.isConcatSpreadable:o,Ut=bt?bt.iterator:o,on=bt?bt.toStringTag:o,pn=function(){try{var e=No(tt,"defineProperty");return e({},"",{}),e}catch(e){}}(),Rn=t.clearTimeout!==Yt.clearTimeout&&t.clearTimeout,Cn=i&&i.now!==Yt.Date.now&&i.now,Pn=t.setTimeout!==Yt.setTimeout&&t.setTimeout,Un=et.ceil,Nn=et.floor,Fn=tt.getOwnPropertySymbols,Hn=vt?vt.isBuffer:o,Bn=t.isFinite,zn=ot.join,qn=An(tt.keys,tt),Wn=et.max,Gn=et.min,Vn=i.now,Jn=t.parseInt,Zn=et.random,Kn=ot.reverse,Xn=No(t,"DataView"),Qn=No(t,"Map"),$n=No(t,"Promise"),er=No(t,"Set"),tr=No(t,"WeakMap"),nr=No(tt,"create"),rr=tr&&new tr,ir={},or=la(Xn),ar=la(Qn),sr=la($n),ur=la(er),cr=la(tr),dr=bt?bt.prototype:o,lr=dr?dr.valueOf:o,fr=dr?dr.toString:o;function pr(e){if(Es(e)&&!vs(e)&&!(e instanceof vr)){if(e instanceof _r)return e;if(dt.call(e,"__wrapped__"))return fa(e)}return new _r(e)}var hr=function(){function e(){}return function(t){if(!As(t))return{};if(It)return It(t);e.prototype=t;var n=new e;return e.prototype=o,n}}();function mr(){}function _r(e,t){this.__wrapped__=e,this.__actions__=[],this.__chain__=!!t,this.__index__=0,this.__values__=o}function vr(e){this.__wrapped__=e,this.__actions__=[],this.__dir__=1,this.__filtered__=!1,this.__iteratees__=[],this.__takeCount__=P,this.__views__=[]}function yr(e){var t=-1,n=null==e?0:e.length;for(this.clear();++t<n;){var r=e[t];this.set(r[0],r[1])}}function gr(e){var t=-1,n=null==e?0:e.length;for(this.clear();++t<n;){var r=e[t];this.set(r[0],r[1])}}function br(e){var t=-1,n=null==e?0:e.length;for(this.clear();++t<n;){var r=e[t];this.set(r[0],r[1])}}function wr(e){var t=-1,n=null==e?0:e.length;for(this.__data__=new br;++t<n;)this.add(e[t])}function Mr(e){var t=this.__data__=new gr(e);this.size=t.size}function kr(e,t){var n=vs(e),r=!n&&_s(e),i=!n&&!r&&ws(e),o=!n&&!r&&!i&&Cs(e),a=n||r||i||o,s=a?_n(e.length,rt):[],u=s.length;for(var c in e)!t&&!dt.call(e,c)||a&&("length"==c||i&&("offset"==c||"parent"==c)||o&&("buffer"==c||"byteLength"==c||"byteOffset"==c)||Go(c,u))||s.push(c);return s}function xr(e){var t=e.length;return t?e[wi(0,t-1)]:o}function Sr(e,t){return ua(no(e),Or(t,0,e.length))}function Lr(e){return ua(no(e))}function Ar(e,t,n){(n===o||ps(e[t],n))&&(n!==o||t in e)||Ir(e,t,n)}function Er(e,t,n){var r=e[t];dt.call(e,t)&&ps(r,n)&&(n!==o||t in e)||Ir(e,t,n)}function Tr(e,t){for(var n=e.length;n--;)if(ps(e[n][0],t))return n;return-1}function Dr(e,t,n,r){return Nr(e,function(e,i,o){t(r,e,n(e),o)}),r}function jr(e,t){return e&&ro(t,iu(t),e)}function Ir(e,t,n){"__proto__"==t&&pn?pn(e,t,{configurable:!0,enumerable:!0,value:n,writable:!0}):e[t]=n}function Yr(e,t){for(var n=-1,i=t.length,a=r(i),s=null==e;++n<i;)a[n]=s?o:$s(e,t[n]);return a}function Or(e,t,n){return e==e&&(n!==o&&(e=e<=n?e:n),t!==o&&(e=e>=t?e:t)),e}function Rr(e,t,n,r,i,a){var s,u=t&f,c=t&p,d=t&h;if(n&&(s=i?n(e,r,i,a):n(e)),s!==o)return s;if(!As(e))return e;var l=vs(e);if(l){if(s=function(e){var t=e.length,n=new e.constructor(t);return t&&"string"==typeof e[0]&&dt.call(e,"index")&&(n.index=e.index,n.input=e.input),n}(e),!u)return no(e,s)}else{var m=Bo(e),_=m==J||m==Z;if(ws(e))return Ki(e,u);if(m==$||m==H||_&&!i){if(s=c||_?{}:qo(e),!u)return c?function(e,t){return ro(e,Ho(e),t)}(e,function(e,t){return e&&ro(t,ou(t),e)}(s,e)):function(e,t){return ro(e,Fo(e),t)}(e,jr(s,e))}else{if(!At[m])return i?e:{};s=function(e,t,n){var r,i,o,a=e.constructor;switch(t){case ue:return Xi(e);case q:case W:return new a(+e);case ce:return function(e,t){var n=t?Xi(e.buffer):e.buffer;return new e.constructor(n,e.byteOffset,e.byteLength)}(e,n);case de:case le:case fe:case pe:case he:case me:case _e:case ve:case ye:return Qi(e,n);case K:return new a;case X:case re:return new a(e);case te:return(o=new(i=e).constructor(i.source,ze.exec(i))).lastIndex=i.lastIndex,o;case ne:return new a;case ie:return r=e,lr?tt(lr.call(r)):{}}}(e,m,u)}}a||(a=new Mr);var v=a.get(e);if(v)return v;if(a.set(e,s),Ys(e))return e.forEach(function(r){s.add(Rr(r,t,n,r,e,a))}),s;if(Ts(e))return e.forEach(function(r,i){s.set(i,Rr(r,t,n,i,e,a))}),s;var y=l?o:(d?c?Io:jo:c?ou:iu)(e);return Vt(y||e,function(r,i){y&&(r=e[i=r]),Er(s,i,Rr(r,t,n,i,e,a))}),s}function Cr(e,t,n){var r=n.length;if(null==e)return!r;for(e=tt(e);r--;){var i=n[r],a=t[i],s=e[i];if(s===o&&!(i in e)||!a(s))return!1}return!0}function Pr(e,t,n){if("function"!=typeof e)throw new it(u);return ia(function(){e.apply(o,n)},t)}function Ur(e,t,n,r){var i=-1,o=Xt,s=!0,u=e.length,c=[],d=t.length;if(!u)return c;n&&(t=$t(t,vn(n))),r?(o=Qt,s=!1):t.length>=a&&(o=gn,s=!1,t=new wr(t));e:for(;++i<u;){var l=e[i],f=null==n?l:n(l);if(l=r||0!==l?l:0,s&&f==f){for(var p=d;p--;)if(t[p]===f)continue e;c.push(l)}else o(t,f,r)||c.push(l)}return c}pr.templateSettings={escape:Le,evaluate:Ae,interpolate:Ee,variable:"",imports:{_:pr}},pr.prototype=mr.prototype,pr.prototype.constructor=pr,_r.prototype=hr(mr.prototype),_r.prototype.constructor=_r,vr.prototype=hr(mr.prototype),vr.prototype.constructor=vr,yr.prototype.clear=function(){this.__data__=nr?nr(null):{},this.size=0},yr.prototype.delete=function(e){var t=this.has(e)&&delete this.__data__[e];return this.size-=t?1:0,t},yr.prototype.get=function(e){var t=this.__data__;if(nr){var n=t[e];return n===c?o:n}return dt.call(t,e)?t[e]:o},yr.prototype.has=function(e){var t=this.__data__;return nr?t[e]!==o:dt.call(t,e)},yr.prototype.set=function(e,t){var n=this.__data__;return this.size+=this.has(e)?0:1,n[e]=nr&&t===o?c:t,this},gr.prototype.clear=function(){this.__data__=[],this.size=0},gr.prototype.delete=function(e){var t=this.__data__,n=Tr(t,e);return!(n<0||(n==t.length-1?t.pop():Rt.call(t,n,1),--this.size,0))},gr.prototype.get=function(e){var t=this.__data__,n=Tr(t,e);return n<0?o:t[n][1]},gr.prototype.has=function(e){return Tr(this.__data__,e)>-1},gr.prototype.set=function(e,t){var n=this.__data__,r=Tr(n,e);return r<0?(++this.size,n.push([e,t])):n[r][1]=t,this},br.prototype.clear=function(){this.size=0,this.__data__={hash:new yr,map:new(Qn||gr),string:new yr}},br.prototype.delete=function(e){var t=Po(this,e).delete(e);return this.size-=t?1:0,t},br.prototype.get=function(e){return Po(this,e).get(e)},br.prototype.has=function(e){return Po(this,e).has(e)},br.prototype.set=function(e,t){var n=Po(this,e),r=n.size;return n.set(e,t),this.size+=n.size==r?0:1,this},wr.prototype.add=wr.prototype.push=function(e){return this.__data__.set(e,c),this},wr.prototype.has=function(e){return this.__data__.has(e)},Mr.prototype.clear=function(){this.__data__=new gr,this.size=0},Mr.prototype.delete=function(e){var t=this.__data__,n=t.delete(e);return this.size=t.size,n},Mr.prototype.get=function(e){return this.__data__.get(e)},Mr.prototype.has=function(e){return this.__data__.has(e)},Mr.prototype.set=function(e,t){var n=this.__data__;if(n instanceof gr){var r=n.__data__;if(!Qn||r.length<a-1)return r.push([e,t]),this.size=++n.size,this;n=this.__data__=new br(r)}return n.set(e,t),this.size=n.size,this};var Nr=ao(Vr),Fr=ao(Jr,!0);function Hr(e,t){var n=!0;return Nr(e,function(e,r,i){return n=!!t(e,r,i)}),n}function Br(e,t,n){for(var r=-1,i=e.length;++r<i;){var a=e[r],s=t(a);if(null!=s&&(u===o?s==s&&!Rs(s):n(s,u)))var u=s,c=a}return c}function zr(e,t){var n=[];return Nr(e,function(e,r,i){t(e,r,i)&&n.push(e)}),n}function qr(e,t,n,r,i){var o=-1,a=e.length;for(n||(n=Wo),i||(i=[]);++o<a;){var s=e[o];t>0&&n(s)?t>1?qr(s,t-1,n,r,i):en(i,s):r||(i[i.length]=s)}return i}var Wr=so(),Gr=so(!0);function Vr(e,t){return e&&Wr(e,t,iu)}function Jr(e,t){return e&&Gr(e,t,iu)}function Zr(e,t){return Kt(t,function(t){return xs(e[t])})}function Kr(e,t){for(var n=0,r=(t=Gi(t,e)).length;null!=e&&n<r;)e=e[da(t[n++])];return n&&n==r?e:o}function Xr(e,t,n){var r=t(e);return vs(e)?r:en(r,n(e))}function Qr(e){return null==e?e===o?oe:Q:on&&on in tt(e)?function(e){var t=dt.call(e,on),n=e[on];try{e[on]=o;var r=!0}catch(e){}var i=pt.call(e);return r&&(t?e[on]=n:delete e[on]),i}(e):function(e){return pt.call(e)}(e)}function $r(e,t){return e>t}function ei(e,t){return null!=e&&dt.call(e,t)}function ti(e,t){return null!=e&&t in tt(e)}function ni(e,t,n){for(var i=n?Qt:Xt,a=e[0].length,s=e.length,u=s,c=r(s),d=1/0,l=[];u--;){var f=e[u];u&&t&&(f=$t(f,vn(t))),d=Gn(f.length,d),c[u]=!n&&(t||a>=120&&f.length>=120)?new wr(u&&f):o}f=e[0];var p=-1,h=c[0];e:for(;++p<a&&l.length<d;){var m=f[p],_=t?t(m):m;if(m=n||0!==m?m:0,!(h?gn(h,_):i(l,_,n))){for(u=s;--u;){var v=c[u];if(!(v?gn(v,_):i(e[u],_,n)))continue e}h&&h.push(_),l.push(m)}}return l}function ri(e,t,n){var r=null==(e=ta(e,t=Gi(t,e)))?e:e[da(ka(t))];return null==r?o:Wt(r,e,n)}function ii(e){return Es(e)&&Qr(e)==H}function oi(e,t,n,r,i){return e===t||(null==e||null==t||!Es(e)&&!Es(t)?e!=e&&t!=t:function(e,t,n,r,i,a){var s=vs(e),u=vs(t),c=s?B:Bo(e),d=u?B:Bo(t),l=(c=c==H?$:c)==$,f=(d=d==H?$:d)==$,p=c==d;if(p&&ws(e)){if(!ws(t))return!1;s=!0,l=!1}if(p&&!l)return a||(a=new Mr),s||Cs(e)?To(e,t,n,r,i,a):function(e,t,n,r,i,o,a){switch(n){case ce:if(e.byteLength!=t.byteLength||e.byteOffset!=t.byteOffset)return!1;e=e.buffer,t=t.buffer;case ue:return!(e.byteLength!=t.byteLength||!o(new Mt(e),new Mt(t)));case q:case W:case X:return ps(+e,+t);case V:return e.name==t.name&&e.message==t.message;case te:case re:return e==t+"";case K:var s=Ln;case ne:var u=r&m;if(s||(s=Tn),e.size!=t.size&&!u)return!1;var c=a.get(e);if(c)return c==t;r|=_,a.set(e,t);var d=To(s(e),s(t),r,i,o,a);return a.delete(e),d;case ie:if(lr)return lr.call(e)==lr.call(t)}return!1}(e,t,c,n,r,i,a);if(!(n&m)){var h=l&&dt.call(e,"__wrapped__"),v=f&&dt.call(t,"__wrapped__");if(h||v){var y=h?e.value():e,g=v?t.value():t;return a||(a=new Mr),i(y,g,n,r,a)}}return!!p&&(a||(a=new Mr),function(e,t,n,r,i,a){var s=n&m,u=jo(e),c=u.length,d=jo(t).length;if(c!=d&&!s)return!1;for(var l=c;l--;){var f=u[l];if(!(s?f in t:dt.call(t,f)))return!1}var p=a.get(e);if(p&&a.get(t))return p==t;var h=!0;a.set(e,t),a.set(t,e);for(var _=s;++l<c;){f=u[l];var v=e[f],y=t[f];if(r)var g=s?r(y,v,f,t,e,a):r(v,y,f,e,t,a);if(!(g===o?v===y||i(v,y,n,r,a):g)){h=!1;break}_||(_="constructor"==f)}if(h&&!_){var b=e.constructor,w=t.constructor;b!=w&&"constructor"in e&&"constructor"in t&&!("function"==typeof b&&b instanceof b&&"function"==typeof w&&w instanceof w)&&(h=!1)}return a.delete(e),a.delete(t),h}(e,t,n,r,i,a))}(e,t,n,r,oi,i))}function ai(e,t,n,r){var i=n.length,a=i,s=!r;if(null==e)return!a;for(e=tt(e);i--;){var u=n[i];if(s&&u[2]?u[1]!==e[u[0]]:!(u[0]in e))return!1}for(;++i<a;){var c=(u=n[i])[0],d=e[c],l=u[1];if(s&&u[2]){if(d===o&&!(c in e))return!1}else{var f=new Mr;if(r)var p=r(d,l,c,e,t,f);if(!(p===o?oi(l,d,m|_,r,f):p))return!1}}return!0}function si(e){return!(!As(e)||(t=e,ft&&ft in t))&&(xs(e)?_t:Ge).test(la(e));var t}function ui(e){return"function"==typeof e?e:null==e?Du:"object"==typeof e?vs(e)?hi(e[0],e[1]):pi(e):Nu(e)}function ci(e){if(!Xo(e))return qn(e);var t=[];for(var n in tt(e))dt.call(e,n)&&"constructor"!=n&&t.push(n);return t}function di(e){if(!As(e))return function(e){var t=[];if(null!=e)for(var n in tt(e))t.push(n);return t}(e);var t=Xo(e),n=[];for(var r in e)("constructor"!=r||!t&&dt.call(e,r))&&n.push(r);return n}function li(e,t){return e<t}function fi(e,t){var n=-1,i=gs(e)?r(e.length):[];return Nr(e,function(e,r,o){i[++n]=t(e,r,o)}),i}function pi(e){var t=Uo(e);return 1==t.length&&t[0][2]?$o(t[0][0],t[0][1]):function(n){return n===e||ai(n,e,t)}}function hi(e,t){return Jo(e)&&Qo(t)?$o(da(e),t):function(n){var r=$s(n,e);return r===o&&r===t?eu(n,e):oi(t,r,m|_)}}function mi(e,t,n,r,i){e!==t&&Wr(t,function(a,s){if(As(a))i||(i=new Mr),function(e,t,n,r,i,a,s){var u=na(e,n),c=na(t,n),d=s.get(c);if(d)Ar(e,n,d);else{var l=a?a(u,c,n+"",e,t,s):o,f=l===o;if(f){var p=vs(c),h=!p&&ws(c),m=!p&&!h&&Cs(c);l=c,p||h||m?vs(u)?l=u:bs(u)?l=no(u):h?(f=!1,l=Ki(c,!0)):m?(f=!1,l=Qi(c,!0)):l=[]:js(c)||_s(c)?(l=u,_s(u)?l=qs(u):As(u)&&!xs(u)||(l=qo(c))):f=!1}f&&(s.set(c,l),i(l,c,r,a,s),s.delete(c)),Ar(e,n,l)}}(e,t,s,n,mi,r,i);else{var u=r?r(na(e,s),a,s+"",e,t,i):o;u===o&&(u=a),Ar(e,s,u)}},ou)}function _i(e,t){var n=e.length;if(n)return Go(t+=t<0?n:0,n)?e[t]:o}function vi(e,t,n){var r=-1;return t=$t(t.length?t:[Du],vn(Co())),function(e,t){var n=e.length;for(e.sort(t);n--;)e[n]=e[n].value;return e}(fi(e,function(e,n,i){return{criteria:$t(t,function(t){return t(e)}),index:++r,value:e}}),function(e,t){return function(e,t,n){for(var r=-1,i=e.criteria,o=t.criteria,a=i.length,s=n.length;++r<a;){var u=$i(i[r],o[r]);if(u){if(r>=s)return u;var c=n[r];return u*("desc"==c?-1:1)}}return e.index-t.index}(e,t,n)})}function yi(e,t,n){for(var r=-1,i=t.length,o={};++r<i;){var a=t[r],s=Kr(e,a);n(s,a)&&Li(o,Gi(a,e),s)}return o}function gi(e,t,n,r){var i=r?cn:un,o=-1,a=t.length,s=e;for(e===t&&(t=no(t)),n&&(s=$t(e,vn(n)));++o<a;)for(var u=0,c=t[o],d=n?n(c):c;(u=i(s,d,u,r))>-1;)s!==e&&Rt.call(s,u,1),Rt.call(e,u,1);return e}function bi(e,t){for(var n=e?t.length:0,r=n-1;n--;){var i=t[n];if(n==r||i!==o){var o=i;Go(i)?Rt.call(e,i,1):Ui(e,i)}}return e}function wi(e,t){return e+Nn(Zn()*(t-e+1))}function Mi(e,t){var n="";if(!e||t<1||t>O)return n;do{t%2&&(n+=e),(t=Nn(t/2))&&(e+=e)}while(t);return n}function ki(e,t){return oa(ea(e,t,Du),e+"")}function xi(e){return xr(pu(e))}function Si(e,t){var n=pu(e);return ua(n,Or(t,0,n.length))}function Li(e,t,n,r){if(!As(e))return e;for(var i=-1,a=(t=Gi(t,e)).length,s=a-1,u=e;null!=u&&++i<a;){var c=da(t[i]),d=n;if(i!=s){var l=u[c];(d=r?r(l,c,u):o)===o&&(d=As(l)?l:Go(t[i+1])?[]:{})}Er(u,c,d),u=u[c]}return e}var Ai=rr?function(e,t){return rr.set(e,t),e}:Du,Ei=pn?function(e,t){return pn(e,"toString",{configurable:!0,enumerable:!1,value:Au(t),writable:!0})}:Du;function Ti(e){return ua(pu(e))}function Di(e,t,n){var i=-1,o=e.length;t<0&&(t=-t>o?0:o+t),(n=n>o?o:n)<0&&(n+=o),o=t>n?0:n-t>>>0,t>>>=0;for(var a=r(o);++i<o;)a[i]=e[i+t];return a}function ji(e,t){var n;return Nr(e,function(e,r,i){return!(n=t(e,r,i))}),!!n}function Ii(e,t,n){var r=0,i=null==e?r:e.length;if("number"==typeof t&&t==t&&i<=N){for(;r<i;){var o=r+i>>>1,a=e[o];null!==a&&!Rs(a)&&(n?a<=t:a<t)?r=o+1:i=o}return i}return Yi(e,t,Du,n)}function Yi(e,t,n,r){t=n(t);for(var i=0,a=null==e?0:e.length,s=t!=t,u=null===t,c=Rs(t),d=t===o;i<a;){var l=Nn((i+a)/2),f=n(e[l]),p=f!==o,h=null===f,m=f==f,_=Rs(f);if(s)var v=r||m;else v=d?m&&(r||p):u?m&&p&&(r||!h):c?m&&p&&!h&&(r||!_):!h&&!_&&(r?f<=t:f<t);v?i=l+1:a=l}return Gn(a,U)}function Oi(e,t){for(var n=-1,r=e.length,i=0,o=[];++n<r;){var a=e[n],s=t?t(a):a;if(!n||!ps(s,u)){var u=s;o[i++]=0===a?0:a}}return o}function Ri(e){return"number"==typeof e?e:Rs(e)?C:+e}function Ci(e){if("string"==typeof e)return e;if(vs(e))return $t(e,Ci)+"";if(Rs(e))return fr?fr.call(e):"";var t=e+"";return"0"==t&&1/e==-Y?"-0":t}function Pi(e,t,n){var r=-1,i=Xt,o=e.length,s=!0,u=[],c=u;if(n)s=!1,i=Qt;else if(o>=a){var d=t?null:ko(e);if(d)return Tn(d);s=!1,i=gn,c=new wr}else c=t?[]:u;e:for(;++r<o;){var l=e[r],f=t?t(l):l;if(l=n||0!==l?l:0,s&&f==f){for(var p=c.length;p--;)if(c[p]===f)continue e;t&&c.push(f),u.push(l)}else i(c,f,n)||(c!==u&&c.push(f),u.push(l))}return u}function Ui(e,t){return null==(e=ta(e,t=Gi(t,e)))||delete e[da(ka(t))]}function Ni(e,t,n,r){return Li(e,t,n(Kr(e,t)),r)}function Fi(e,t,n,r){for(var i=e.length,o=r?i:-1;(r?o--:++o<i)&&t(e[o],o,e););return n?Di(e,r?0:o,r?o+1:i):Di(e,r?o+1:0,r?i:o)}function Hi(e,t){var n=e;return n instanceof vr&&(n=n.value()),tn(t,function(e,t){return t.func.apply(t.thisArg,en([e],t.args))},n)}function Bi(e,t,n){var i=e.length;if(i<2)return i?Pi(e[0]):[];for(var o=-1,a=r(i);++o<i;)for(var s=e[o],u=-1;++u<i;)u!=o&&(a[o]=Ur(a[o]||s,e[u],t,n));return Pi(qr(a,1),t,n)}function zi(e,t,n){for(var r=-1,i=e.length,a=t.length,s={};++r<i;){var u=r<a?t[r]:o;n(s,e[r],u)}return s}function qi(e){return bs(e)?e:[]}function Wi(e){return"function"==typeof e?e:Du}function Gi(e,t){return vs(e)?e:Jo(e,t)?[e]:ca(Ws(e))}var Vi=ki;function Ji(e,t,n){var r=e.length;return n=n===o?r:n,!t&&n>=r?e:Di(e,t,n)}var Zi=Rn||function(e){return Yt.clearTimeout(e)};function Ki(e,t){if(t)return e.slice();var n=e.length,r=Et?Et(n):new e.constructor(n);return e.copy(r),r}function Xi(e){var t=new e.constructor(e.byteLength);return new Mt(t).set(new Mt(e)),t}function Qi(e,t){var n=t?Xi(e.buffer):e.buffer;return new e.constructor(n,e.byteOffset,e.length)}function $i(e,t){if(e!==t){var n=e!==o,r=null===e,i=e==e,a=Rs(e),s=t!==o,u=null===t,c=t==t,d=Rs(t);if(!u&&!d&&!a&&e>t||a&&s&&c&&!u&&!d||r&&s&&c||!n&&c||!i)return 1;if(!r&&!a&&!d&&e<t||d&&n&&i&&!r&&!a||u&&n&&i||!s&&i||!c)return-1}return 0}function eo(e,t,n,i){for(var o=-1,a=e.length,s=n.length,u=-1,c=t.length,d=Wn(a-s,0),l=r(c+d),f=!i;++u<c;)l[u]=t[u];for(;++o<s;)(f||o<a)&&(l[n[o]]=e[o]);for(;d--;)l[u++]=e[o++];return l}function to(e,t,n,i){for(var o=-1,a=e.length,s=-1,u=n.length,c=-1,d=t.length,l=Wn(a-u,0),f=r(l+d),p=!i;++o<l;)f[o]=e[o];for(var h=o;++c<d;)f[h+c]=t[c];for(;++s<u;)(p||o<a)&&(f[h+n[s]]=e[o++]);return f}function no(e,t){var n=-1,i=e.length;for(t||(t=r(i));++n<i;)t[n]=e[n];return t}function ro(e,t,n,r){var i=!n;n||(n={});for(var a=-1,s=t.length;++a<s;){var u=t[a],c=r?r(n[u],e[u],u,n,e):o;c===o&&(c=e[u]),i?Ir(n,u,c):Er(n,u,c)}return n}function io(e,t){return function(n,r){var i=vs(n)?Gt:Dr,o=t?t():{};return i(n,e,Co(r,2),o)}}function oo(e){return ki(function(t,n){var r=-1,i=n.length,a=i>1?n[i-1]:o,s=i>2?n[2]:o;for(a=e.length>3&&"function"==typeof a?(i--,a):o,s&&Vo(n[0],n[1],s)&&(a=i<3?o:a,i=1),t=tt(t);++r<i;){var u=n[r];u&&e(t,u,r,a)}return t})}function ao(e,t){return function(n,r){if(null==n)return n;if(!gs(n))return e(n,r);for(var i=n.length,o=t?i:-1,a=tt(n);(t?o--:++o<i)&&!1!==r(a[o],o,a););return n}}function so(e){return function(t,n,r){for(var i=-1,o=tt(t),a=r(t),s=a.length;s--;){var u=a[e?s:++i];if(!1===n(o[u],u,o))break}return t}}function uo(e){return function(t){var n=Sn(t=Ws(t))?In(t):o,r=n?n[0]:t.charAt(0),i=n?Ji(n,1).join(""):t.slice(1);return r[e]()+i}}function co(e){return function(t){return tn(xu(_u(t).replace(yt,"")),e,"")}}function lo(e){return function(){var t=arguments;switch(t.length){case 0:return new e;case 1:return new e(t[0]);case 2:return new e(t[0],t[1]);case 3:return new e(t[0],t[1],t[2]);case 4:return new e(t[0],t[1],t[2],t[3]);case 5:return new e(t[0],t[1],t[2],t[3],t[4]);case 6:return new e(t[0],t[1],t[2],t[3],t[4],t[5]);case 7:return new e(t[0],t[1],t[2],t[3],t[4],t[5],t[6])}var n=hr(e.prototype),r=e.apply(n,t);return As(r)?r:n}}function fo(e){return function(t,n,r){var i=tt(t);if(!gs(t)){var a=Co(n,3);t=iu(t),n=function(e){return a(i[e],e,i)}}var s=e(t,n,r);return s>-1?i[a?t[s]:s]:o}}function po(e){return Do(function(t){var n=t.length,r=n,i=_r.prototype.thru;for(e&&t.reverse();r--;){var a=t[r];if("function"!=typeof a)throw new it(u);if(i&&!s&&"wrapper"==Oo(a))var s=new _r([],!0)}for(r=s?r:n;++r<n;){var c=Oo(a=t[r]),d="wrapper"==c?Yo(a):o;s=d&&Zo(d[0])&&d[1]==(x|b|M|S)&&!d[4].length&&1==d[9]?s[Oo(d[0])].apply(s,d[3]):1==a.length&&Zo(a)?s[c]():s.thru(a)}return function(){var e=arguments,r=e[0];if(s&&1==e.length&&vs(r))return s.plant(r).value();for(var i=0,o=n?t[i].apply(this,e):r;++i<n;)o=t[i].call(this,o);return o}})}function ho(e,t,n,i,a,s,u,c,d,l){var f=t&x,p=t&v,h=t&y,m=t&(b|w),_=t&L,g=h?o:lo(e);return function v(){for(var y=arguments.length,b=r(y),w=y;w--;)b[w]=arguments[w];if(m)var M=Ro(v),k=function(e,t){for(var n=e.length,r=0;n--;)e[n]===t&&++r;return r}(b,M);if(i&&(b=eo(b,i,a,m)),s&&(b=to(b,s,u,m)),y-=k,m&&y<l){var x=En(b,M);return wo(e,t,ho,v.placeholder,n,b,x,c,d,l-y)}var S=p?n:this,L=h?S[e]:e;return y=b.length,c?b=function(e,t){for(var n=e.length,r=Gn(t.length,n),i=no(e);r--;){var a=t[r];e[r]=Go(a,n)?i[a]:o}return e}(b,c):_&&y>1&&b.reverse(),f&&d<y&&(b.length=d),this&&this!==Yt&&this instanceof v&&(L=g||lo(L)),L.apply(S,b)}}function mo(e,t){return function(n,r){return function(e,t,n,r){return Vr(e,function(e,i,o){t(r,n(e),i,o)}),r}(n,e,t(r),{})}}function _o(e,t){return function(n,r){var i;if(n===o&&r===o)return t;if(n!==o&&(i=n),r!==o){if(i===o)return r;"string"==typeof n||"string"==typeof r?(n=Ci(n),r=Ci(r)):(n=Ri(n),r=Ri(r)),i=e(n,r)}return i}}function vo(e){return Do(function(t){return t=$t(t,vn(Co())),ki(function(n){var r=this;return e(t,function(e){return Wt(e,r,n)})})})}function yo(e,t){var n=(t=t===o?" ":Ci(t)).length;if(n<2)return n?Mi(t,e):t;var r=Mi(t,Un(e/jn(t)));return Sn(t)?Ji(In(r),0,e).join(""):r.slice(0,e)}function go(e){return function(t,n,i){return i&&"number"!=typeof i&&Vo(t,n,i)&&(n=i=o),t=Fs(t),n===o?(n=t,t=0):n=Fs(n),function(e,t,n,i){for(var o=-1,a=Wn(Un((t-e)/(n||1)),0),s=r(a);a--;)s[i?a:++o]=e,e+=n;return s}(t,n,i=i===o?t<n?1:-1:Fs(i),e)}}function bo(e){return function(t,n){return"string"==typeof t&&"string"==typeof n||(t=zs(t),n=zs(n)),e(t,n)}}function wo(e,t,n,r,i,a,s,u,c,d){var l=t&b;t|=l?M:k,(t&=~(l?k:M))&g||(t&=~(v|y));var f=[e,t,i,l?a:o,l?s:o,l?o:a,l?o:s,u,c,d],p=n.apply(o,f);return Zo(e)&&ra(p,f),p.placeholder=r,aa(p,e,t)}function Mo(e){var t=et[e];return function(e,n){if(e=zs(e),n=null==n?0:Gn(Hs(n),292)){var r=(Ws(e)+"e").split("e");return+((r=(Ws(t(r[0]+"e"+(+r[1]+n)))+"e").split("e"))[0]+"e"+(+r[1]-n))}return t(e)}}var ko=er&&1/Tn(new er([,-0]))[1]==Y?function(e){return new er(e)}:Ru;function xo(e){return function(t){var n=Bo(t);return n==K?Ln(t):n==ne?Dn(t):function(e,t){return $t(t,function(t){return[t,e[t]]})}(t,e(t))}}function So(e,t,n,i,a,s,c,d){var f=t&y;if(!f&&"function"!=typeof e)throw new it(u);var p=i?i.length:0;if(p||(t&=~(M|k),i=a=o),c=c===o?c:Wn(Hs(c),0),d=d===o?d:Hs(d),p-=a?a.length:0,t&k){var h=i,m=a;i=a=o}var _=f?o:Yo(e),L=[e,t,n,i,a,h,m,s,c,d];if(_&&function(e,t){var n=e[1],r=t[1],i=n|r,o=i<(v|y|x),a=r==x&&n==b||r==x&&n==S&&e[7].length<=t[8]||r==(x|S)&&t[7].length<=t[8]&&n==b;if(!o&&!a)return e;r&v&&(e[2]=t[2],i|=n&v?0:g);var s=t[3];if(s){var u=e[3];e[3]=u?eo(u,s,t[4]):s,e[4]=u?En(e[3],l):t[4]}(s=t[5])&&(u=e[5],e[5]=u?to(u,s,t[6]):s,e[6]=u?En(e[5],l):t[6]),(s=t[7])&&(e[7]=s),r&x&&(e[8]=null==e[8]?t[8]:Gn(e[8],t[8])),null==e[9]&&(e[9]=t[9]),e[0]=t[0],e[1]=i}(L,_),e=L[0],t=L[1],n=L[2],i=L[3],a=L[4],!(d=L[9]=L[9]===o?f?0:e.length:Wn(L[9]-p,0))&&t&(b|w)&&(t&=~(b|w)),t&&t!=v)A=t==b||t==w?function(e,t,n){var i=lo(e);return function a(){for(var s=arguments.length,u=r(s),c=s,d=Ro(a);c--;)u[c]=arguments[c];var l=s<3&&u[0]!==d&&u[s-1]!==d?[]:En(u,d);return(s-=l.length)<n?wo(e,t,ho,a.placeholder,o,u,l,o,o,n-s):Wt(this&&this!==Yt&&this instanceof a?i:e,this,u)}}(e,t,d):t!=M&&t!=(v|M)||a.length?ho.apply(o,L):function(e,t,n,i){var o=t&v,a=lo(e);return function t(){for(var s=-1,u=arguments.length,c=-1,d=i.length,l=r(d+u),f=this&&this!==Yt&&this instanceof t?a:e;++c<d;)l[c]=i[c];for(;u--;)l[c++]=arguments[++s];return Wt(f,o?n:this,l)}}(e,t,n,i);else var A=function(e,t,n){var r=t&v,i=lo(e);return function t(){return(this&&this!==Yt&&this instanceof t?i:e).apply(r?n:this,arguments)}}(e,t,n);return aa((_?Ai:ra)(A,L),e,t)}function Lo(e,t,n,r){return e===o||ps(e,st[n])&&!dt.call(r,n)?t:e}function Ao(e,t,n,r,i,a){return As(e)&&As(t)&&(a.set(t,e),mi(e,t,o,Ao,a),a.delete(t)),e}function Eo(e){return js(e)?o:e}function To(e,t,n,r,i,a){var s=n&m,u=e.length,c=t.length;if(u!=c&&!(s&&c>u))return!1;var d=a.get(e);if(d&&a.get(t))return d==t;var l=-1,f=!0,p=n&_?new wr:o;for(a.set(e,t),a.set(t,e);++l<u;){var h=e[l],v=t[l];if(r)var y=s?r(v,h,l,t,e,a):r(h,v,l,e,t,a);if(y!==o){if(y)continue;f=!1;break}if(p){if(!rn(t,function(e,t){if(!gn(p,t)&&(h===e||i(h,e,n,r,a)))return p.push(t)})){f=!1;break}}else if(h!==v&&!i(h,v,n,r,a)){f=!1;break}}return a.delete(e),a.delete(t),f}function Do(e){return oa(ea(e,o,ya),e+"")}function jo(e){return Xr(e,iu,Fo)}function Io(e){return Xr(e,ou,Ho)}var Yo=rr?function(e){return rr.get(e)}:Ru;function Oo(e){for(var t=e.name+"",n=ir[t],r=dt.call(ir,t)?n.length:0;r--;){var i=n[r],o=i.func;if(null==o||o==e)return i.name}return t}function Ro(e){return(dt.call(pr,"placeholder")?pr:e).placeholder}function Co(){var e=pr.iteratee||ju;return e=e===ju?ui:e,arguments.length?e(arguments[0],arguments[1]):e}function Po(e,t){var n,r,i=e.__data__;return("string"==(r=typeof(n=t))||"number"==r||"symbol"==r||"boolean"==r?"__proto__"!==n:null===n)?i["string"==typeof t?"string":"hash"]:i.map}function Uo(e){for(var t=iu(e),n=t.length;n--;){var r=t[n],i=e[r];t[n]=[r,i,Qo(i)]}return t}function No(e,t){var n=function(e,t){return null==e?o:e[t]}(e,t);return si(n)?n:o}var Fo=Fn?function(e){return null==e?[]:(e=tt(e),Kt(Fn(e),function(t){return Ot.call(e,t)}))}:Bu,Ho=Fn?function(e){for(var t=[];e;)en(t,Fo(e)),e=jt(e);return t}:Bu,Bo=Qr;function zo(e,t,n){for(var r=-1,i=(t=Gi(t,e)).length,o=!1;++r<i;){var a=da(t[r]);if(!(o=null!=e&&n(e,a)))break;e=e[a]}return o||++r!=i?o:!!(i=null==e?0:e.length)&&Ls(i)&&Go(a,i)&&(vs(e)||_s(e))}function qo(e){return"function"!=typeof e.constructor||Xo(e)?{}:hr(jt(e))}function Wo(e){return vs(e)||_s(e)||!!(Pt&&e&&e[Pt])}function Go(e,t){var n=typeof e;return!!(t=null==t?O:t)&&("number"==n||"symbol"!=n&&Je.test(e))&&e>-1&&e%1==0&&e<t}function Vo(e,t,n){if(!As(n))return!1;var r=typeof t;return!!("number"==r?gs(n)&&Go(t,n.length):"string"==r&&t in n)&&ps(n[t],e)}function Jo(e,t){if(vs(e))return!1;var n=typeof e;return!("number"!=n&&"symbol"!=n&&"boolean"!=n&&null!=e&&!Rs(e))||De.test(e)||!Te.test(e)||null!=t&&e in tt(t)}function Zo(e){var t=Oo(e),n=pr[t];if("function"!=typeof n||!(t in vr.prototype))return!1;if(e===n)return!0;var r=Yo(n);return!!r&&e===r[0]}(Xn&&Bo(new Xn(new ArrayBuffer(1)))!=ce||Qn&&Bo(new Qn)!=K||$n&&"[object Promise]"!=Bo($n.resolve())||er&&Bo(new er)!=ne||tr&&Bo(new tr)!=ae)&&(Bo=function(e){var t=Qr(e),n=t==$?e.constructor:o,r=n?la(n):"";if(r)switch(r){case or:return ce;case ar:return K;case sr:return"[object Promise]";case ur:return ne;case cr:return ae}return t});var Ko=ut?xs:zu;function Xo(e){var t=e&&e.constructor;return e===("function"==typeof t&&t.prototype||st)}function Qo(e){return e==e&&!As(e)}function $o(e,t){return function(n){return null!=n&&n[e]===t&&(t!==o||e in tt(n))}}function ea(e,t,n){return t=Wn(t===o?e.length-1:t,0),function(){for(var i=arguments,o=-1,a=Wn(i.length-t,0),s=r(a);++o<a;)s[o]=i[t+o];o=-1;for(var u=r(t+1);++o<t;)u[o]=i[o];return u[t]=n(s),Wt(e,this,u)}}function ta(e,t){return t.length<2?e:Kr(e,Di(t,0,-1))}function na(e,t){if("__proto__"!=t)return e[t]}var ra=sa(Ai),ia=Pn||function(e,t){return Yt.setTimeout(e,t)},oa=sa(Ei);function aa(e,t,n){var r=t+"";return oa(e,function(e,t){var n=t.length;if(!n)return e;var r=n-1;return t[r]=(n>1?"& ":"")+t[r],t=t.join(n>2?", ":" "),e.replace(Pe,"{\n/* [wrapped with "+t+"] */\n")}(r,function(e,t){return Vt(F,function(n){var r="_."+n[0];t&n[1]&&!Xt(e,r)&&e.push(r)}),e.sort()}(function(e){var t=e.match(Ue);return t?t[1].split(Ne):[]}(r),n)))}function sa(e){var t=0,n=0;return function(){var r=Vn(),i=D-(r-n);if(n=r,i>0){if(++t>=T)return arguments[0]}else t=0;return e.apply(o,arguments)}}function ua(e,t){var n=-1,r=e.length,i=r-1;for(t=t===o?r:t;++n<t;){var a=wi(n,i),s=e[a];e[a]=e[n],e[n]=s}return e.length=t,e}var ca=function(e){var t=ss(e,function(e){return n.size===d&&n.clear(),e}),n=t.cache;return t}(function(e){var t=[];return 46===e.charCodeAt(0)&&t.push(""),e.replace(je,function(e,n,r,i){t.push(r?i.replace(He,"$1"):n||e)}),t});function da(e){if("string"==typeof e||Rs(e))return e;var t=e+"";return"0"==t&&1/e==-Y?"-0":t}function la(e){if(null!=e){try{return ct.call(e)}catch(e){}try{return e+""}catch(e){}}return""}function fa(e){if(e instanceof vr)return e.clone();var t=new _r(e.__wrapped__,e.__chain__);return t.__actions__=no(e.__actions__),t.__index__=e.__index__,t.__values__=e.__values__,t}var pa=ki(function(e,t){return bs(e)?Ur(e,qr(t,1,bs,!0)):[]}),ha=ki(function(e,t){var n=ka(t);return bs(n)&&(n=o),bs(e)?Ur(e,qr(t,1,bs,!0),Co(n,2)):[]}),ma=ki(function(e,t){var n=ka(t);return bs(n)&&(n=o),bs(e)?Ur(e,qr(t,1,bs,!0),o,n):[]});function _a(e,t,n){var r=null==e?0:e.length;if(!r)return-1;var i=null==n?0:Hs(n);return i<0&&(i=Wn(r+i,0)),sn(e,Co(t,3),i)}function va(e,t,n){var r=null==e?0:e.length;if(!r)return-1;var i=r-1;return n!==o&&(i=Hs(n),i=n<0?Wn(r+i,0):Gn(i,r-1)),sn(e,Co(t,3),i,!0)}function ya(e){return null!=e&&e.length?qr(e,1):[]}function ga(e){return e&&e.length?e[0]:o}var ba=ki(function(e){var t=$t(e,qi);return t.length&&t[0]===e[0]?ni(t):[]}),wa=ki(function(e){var t=ka(e),n=$t(e,qi);return t===ka(n)?t=o:n.pop(),n.length&&n[0]===e[0]?ni(n,Co(t,2)):[]}),Ma=ki(function(e){var t=ka(e),n=$t(e,qi);return(t="function"==typeof t?t:o)&&n.pop(),n.length&&n[0]===e[0]?ni(n,o,t):[]});function ka(e){var t=null==e?0:e.length;return t?e[t-1]:o}var xa=ki(Sa);function Sa(e,t){return e&&e.length&&t&&t.length?gi(e,t):e}var La=Do(function(e,t){var n=null==e?0:e.length,r=Yr(e,t);return bi(e,$t(t,function(e){return Go(e,n)?+e:e}).sort($i)),r});function Aa(e){return null==e?e:Kn.call(e)}var Ea=ki(function(e){return Pi(qr(e,1,bs,!0))}),Ta=ki(function(e){var t=ka(e);return bs(t)&&(t=o),Pi(qr(e,1,bs,!0),Co(t,2))}),Da=ki(function(e){var t=ka(e);return t="function"==typeof t?t:o,Pi(qr(e,1,bs,!0),o,t)});function ja(e){if(!e||!e.length)return[];var t=0;return e=Kt(e,function(e){if(bs(e))return t=Wn(e.length,t),!0}),_n(t,function(t){return $t(e,fn(t))})}function Ia(e,t){if(!e||!e.length)return[];var n=ja(e);return null==t?n:$t(n,function(e){return Wt(t,o,e)})}var Ya=ki(function(e,t){return bs(e)?Ur(e,t):[]}),Oa=ki(function(e){return Bi(Kt(e,bs))}),Ra=ki(function(e){var t=ka(e);return bs(t)&&(t=o),Bi(Kt(e,bs),Co(t,2))}),Ca=ki(function(e){var t=ka(e);return t="function"==typeof t?t:o,Bi(Kt(e,bs),o,t)}),Pa=ki(ja);var Ua=ki(function(e){var t=e.length,n=t>1?e[t-1]:o;return n="function"==typeof n?(e.pop(),n):o,Ia(e,n)});function Na(e){var t=pr(e);return t.__chain__=!0,t}function Fa(e,t){return t(e)}var Ha=Do(function(e){var t=e.length,n=t?e[0]:0,r=this.__wrapped__,i=function(t){return Yr(t,e)};return!(t>1||this.__actions__.length)&&r instanceof vr&&Go(n)?((r=r.slice(n,+n+(t?1:0))).__actions__.push({func:Fa,args:[i],thisArg:o}),new _r(r,this.__chain__).thru(function(e){return t&&!e.length&&e.push(o),e})):this.thru(i)});var Ba=io(function(e,t,n){dt.call(e,n)?++e[n]:Ir(e,n,1)});var za=fo(_a),qa=fo(va);function Wa(e,t){return(vs(e)?Vt:Nr)(e,Co(t,3))}function Ga(e,t){return(vs(e)?Jt:Fr)(e,Co(t,3))}var Va=io(function(e,t,n){dt.call(e,n)?e[n].push(t):Ir(e,n,[t])});var Ja=ki(function(e,t,n){var i=-1,o="function"==typeof t,a=gs(e)?r(e.length):[];return Nr(e,function(e){a[++i]=o?Wt(t,e,n):ri(e,t,n)}),a}),Za=io(function(e,t,n){Ir(e,n,t)});function Ka(e,t){return(vs(e)?$t:fi)(e,Co(t,3))}var Xa=io(function(e,t,n){e[n?0:1].push(t)},function(){return[[],[]]});var Qa=ki(function(e,t){if(null==e)return[];var n=t.length;return n>1&&Vo(e,t[0],t[1])?t=[]:n>2&&Vo(t[0],t[1],t[2])&&(t=[t[0]]),vi(e,qr(t,1),[])}),$a=Cn||function(){return Yt.Date.now()};function es(e,t,n){return t=n?o:t,t=e&&null==t?e.length:t,So(e,x,o,o,o,o,t)}function ts(e,t){var n;if("function"!=typeof t)throw new it(u);return e=Hs(e),function(){return--e>0&&(n=t.apply(this,arguments)),e<=1&&(t=o),n}}var ns=ki(function(e,t,n){var r=v;if(n.length){var i=En(n,Ro(ns));r|=M}return So(e,r,t,n,i)}),rs=ki(function(e,t,n){var r=v|y;if(n.length){var i=En(n,Ro(rs));r|=M}return So(t,r,e,n,i)});function is(e,t,n){var r,i,a,s,c,d,l=0,f=!1,p=!1,h=!0;if("function"!=typeof e)throw new it(u);function m(t){var n=r,a=i;return r=i=o,l=t,s=e.apply(a,n)}function _(e){var n=e-d;return d===o||n>=t||n<0||p&&e-l>=a}function v(){var e=$a();if(_(e))return y(e);c=ia(v,function(e){var n=t-(e-d);return p?Gn(n,a-(e-l)):n}(e))}function y(e){return c=o,h&&r?m(e):(r=i=o,s)}function g(){var e=$a(),n=_(e);if(r=arguments,i=this,d=e,n){if(c===o)return function(e){return l=e,c=ia(v,t),f?m(e):s}(d);if(p)return c=ia(v,t),m(d)}return c===o&&(c=ia(v,t)),s}return t=zs(t)||0,As(n)&&(f=!!n.leading,a=(p="maxWait"in n)?Wn(zs(n.maxWait)||0,t):a,h="trailing"in n?!!n.trailing:h),g.cancel=function(){c!==o&&Zi(c),l=0,r=d=i=c=o},g.flush=function(){return c===o?s:y($a())},g}var os=ki(function(e,t){return Pr(e,1,t)}),as=ki(function(e,t,n){return Pr(e,zs(t)||0,n)});function ss(e,t){if("function"!=typeof e||null!=t&&"function"!=typeof t)throw new it(u);var n=function(){var r=arguments,i=t?t.apply(this,r):r[0],o=n.cache;if(o.has(i))return o.get(i);var a=e.apply(this,r);return n.cache=o.set(i,a)||o,a};return n.cache=new(ss.Cache||br),n}function us(e){if("function"!=typeof e)throw new it(u);return function(){var t=arguments;switch(t.length){case 0:return!e.call(this);case 1:return!e.call(this,t[0]);case 2:return!e.call(this,t[0],t[1]);case 3:return!e.call(this,t[0],t[1],t[2])}return!e.apply(this,t)}}ss.Cache=br;var cs=Vi(function(e,t){var n=(t=1==t.length&&vs(t[0])?$t(t[0],vn(Co())):$t(qr(t,1),vn(Co()))).length;return ki(function(r){for(var i=-1,o=Gn(r.length,n);++i<o;)r[i]=t[i].call(this,r[i]);return Wt(e,this,r)})}),ds=ki(function(e,t){var n=En(t,Ro(ds));return So(e,M,o,t,n)}),ls=ki(function(e,t){var n=En(t,Ro(ls));return So(e,k,o,t,n)}),fs=Do(function(e,t){return So(e,S,o,o,o,t)});function ps(e,t){return e===t||e!=e&&t!=t}var hs=bo($r),ms=bo(function(e,t){return e>=t}),_s=ii(function(){return arguments}())?ii:function(e){return Es(e)&&dt.call(e,"callee")&&!Ot.call(e,"callee")},vs=r.isArray,ys=Nt?vn(Nt):function(e){return Es(e)&&Qr(e)==ue};function gs(e){return null!=e&&Ls(e.length)&&!xs(e)}function bs(e){return Es(e)&&gs(e)}var ws=Hn||zu,Ms=Ft?vn(Ft):function(e){return Es(e)&&Qr(e)==W};function ks(e){if(!Es(e))return!1;var t=Qr(e);return t==V||t==G||"string"==typeof e.message&&"string"==typeof e.name&&!js(e)}function xs(e){if(!As(e))return!1;var t=Qr(e);return t==J||t==Z||t==z||t==ee}function Ss(e){return"number"==typeof e&&e==Hs(e)}function Ls(e){return"number"==typeof e&&e>-1&&e%1==0&&e<=O}function As(e){var t=typeof e;return null!=e&&("object"==t||"function"==t)}function Es(e){return null!=e&&"object"==typeof e}var Ts=Ht?vn(Ht):function(e){return Es(e)&&Bo(e)==K};function Ds(e){return"number"==typeof e||Es(e)&&Qr(e)==X}function js(e){if(!Es(e)||Qr(e)!=$)return!1;var t=jt(e);if(null===t)return!0;var n=dt.call(t,"constructor")&&t.constructor;return"function"==typeof n&&n instanceof n&&ct.call(n)==ht}var Is=Bt?vn(Bt):function(e){return Es(e)&&Qr(e)==te};var Ys=zt?vn(zt):function(e){return Es(e)&&Bo(e)==ne};function Os(e){return"string"==typeof e||!vs(e)&&Es(e)&&Qr(e)==re}function Rs(e){return"symbol"==typeof e||Es(e)&&Qr(e)==ie}var Cs=qt?vn(qt):function(e){return Es(e)&&Ls(e.length)&&!!Lt[Qr(e)]};var Ps=bo(li),Us=bo(function(e,t){return e<=t});function Ns(e){if(!e)return[];if(gs(e))return Os(e)?In(e):no(e);if(Ut&&e[Ut])return function(e){for(var t,n=[];!(t=e.next()).done;)n.push(t.value);return n}(e[Ut]());var t=Bo(e);return(t==K?Ln:t==ne?Tn:pu)(e)}function Fs(e){return e?(e=zs(e))===Y||e===-Y?(e<0?-1:1)*R:e==e?e:0:0===e?e:0}function Hs(e){var t=Fs(e),n=t%1;return t==t?n?t-n:t:0}function Bs(e){return e?Or(Hs(e),0,P):0}function zs(e){if("number"==typeof e)return e;if(Rs(e))return C;if(As(e)){var t="function"==typeof e.valueOf?e.valueOf():e;e=As(t)?t+"":t}if("string"!=typeof e)return 0===e?e:+e;e=e.replace(Oe,"");var n=We.test(e);return n||Ve.test(e)?Dt(e.slice(2),n?2:8):qe.test(e)?C:+e}function qs(e){return ro(e,ou(e))}function Ws(e){return null==e?"":Ci(e)}var Gs=oo(function(e,t){if(Xo(t)||gs(t))ro(t,iu(t),e);else for(var n in t)dt.call(t,n)&&Er(e,n,t[n])}),Vs=oo(function(e,t){ro(t,ou(t),e)}),Js=oo(function(e,t,n,r){ro(t,ou(t),e,r)}),Zs=oo(function(e,t,n,r){ro(t,iu(t),e,r)}),Ks=Do(Yr);var Xs=ki(function(e,t){e=tt(e);var n=-1,r=t.length,i=r>2?t[2]:o;for(i&&Vo(t[0],t[1],i)&&(r=1);++n<r;)for(var a=t[n],s=ou(a),u=-1,c=s.length;++u<c;){var d=s[u],l=e[d];(l===o||ps(l,st[d])&&!dt.call(e,d))&&(e[d]=a[d])}return e}),Qs=ki(function(e){return e.push(o,Ao),Wt(su,o,e)});function $s(e,t,n){var r=null==e?o:Kr(e,t);return r===o?n:r}function eu(e,t){return null!=e&&zo(e,t,ti)}var tu=mo(function(e,t,n){null!=t&&"function"!=typeof t.toString&&(t=pt.call(t)),e[t]=n},Au(Du)),nu=mo(function(e,t,n){null!=t&&"function"!=typeof t.toString&&(t=pt.call(t)),dt.call(e,t)?e[t].push(n):e[t]=[n]},Co),ru=ki(ri);function iu(e){return gs(e)?kr(e):ci(e)}function ou(e){return gs(e)?kr(e,!0):di(e)}var au=oo(function(e,t,n){mi(e,t,n)}),su=oo(function(e,t,n,r){mi(e,t,n,r)}),uu=Do(function(e,t){var n={};if(null==e)return n;var r=!1;t=$t(t,function(t){return t=Gi(t,e),r||(r=t.length>1),t}),ro(e,Io(e),n),r&&(n=Rr(n,f|p|h,Eo));for(var i=t.length;i--;)Ui(n,t[i]);return n});var cu=Do(function(e,t){return null==e?{}:function(e,t){return yi(e,t,function(t,n){return eu(e,n)})}(e,t)});function du(e,t){if(null==e)return{};var n=$t(Io(e),function(e){return[e]});return t=Co(t),yi(e,n,function(e,n){return t(e,n[0])})}var lu=xo(iu),fu=xo(ou);function pu(e){return null==e?[]:yn(e,iu(e))}var hu=co(function(e,t,n){return t=t.toLowerCase(),e+(n?mu(t):t)});function mu(e){return ku(Ws(e).toLowerCase())}function _u(e){return(e=Ws(e))&&e.replace(Ze,Mn).replace(gt,"")}var vu=co(function(e,t,n){return e+(n?"-":"")+t.toLowerCase()}),yu=co(function(e,t,n){return e+(n?" ":"")+t.toLowerCase()}),gu=uo("toLowerCase");var bu=co(function(e,t,n){return e+(n?"_":"")+t.toLowerCase()});var wu=co(function(e,t,n){return e+(n?" ":"")+ku(t)});var Mu=co(function(e,t,n){return e+(n?" ":"")+t.toUpperCase()}),ku=uo("toUpperCase");function xu(e,t,n){return e=Ws(e),(t=n?o:t)===o?function(e){return kt.test(e)}(e)?function(e){return e.match(wt)||[]}(e):function(e){return e.match(Fe)||[]}(e):e.match(t)||[]}var Su=ki(function(e,t){try{return Wt(e,o,t)}catch(e){return ks(e)?e:new Qe(e)}}),Lu=Do(function(e,t){return Vt(t,function(t){t=da(t),Ir(e,t,ns(e[t],e))}),e});function Au(e){return function(){return e}}var Eu=po(),Tu=po(!0);function Du(e){return e}function ju(e){return ui("function"==typeof e?e:Rr(e,f))}var Iu=ki(function(e,t){return function(n){return ri(n,e,t)}}),Yu=ki(function(e,t){return function(n){return ri(e,n,t)}});function Ou(e,t,n){var r=iu(t),i=Zr(t,r);null!=n||As(t)&&(i.length||!r.length)||(n=t,t=e,e=this,i=Zr(t,iu(t)));var o=!(As(n)&&"chain"in n&&!n.chain),a=xs(e);return Vt(i,function(n){var r=t[n];e[n]=r,a&&(e.prototype[n]=function(){var t=this.__chain__;if(o||t){var n=e(this.__wrapped__);return(n.__actions__=no(this.__actions__)).push({func:r,args:arguments,thisArg:e}),n.__chain__=t,n}return r.apply(e,en([this.value()],arguments))})}),e}function Ru(){}var Cu=vo($t),Pu=vo(Zt),Uu=vo(rn);function Nu(e){return Jo(e)?fn(da(e)):function(e){return function(t){return Kr(t,e)}}(e)}var Fu=go(),Hu=go(!0);function Bu(){return[]}function zu(){return!1}var qu=_o(function(e,t){return e+t},0),Wu=Mo("ceil"),Gu=_o(function(e,t){return e/t},1),Vu=Mo("floor");var Ju,Zu=_o(function(e,t){return e*t},1),Ku=Mo("round"),Xu=_o(function(e,t){return e-t},0);return pr.after=function(e,t){if("function"!=typeof t)throw new it(u);return e=Hs(e),function(){if(--e<1)return t.apply(this,arguments)}},pr.ary=es,pr.assign=Gs,pr.assignIn=Vs,pr.assignInWith=Js,pr.assignWith=Zs,pr.at=Ks,pr.before=ts,pr.bind=ns,pr.bindAll=Lu,pr.bindKey=rs,pr.castArray=function(){if(!arguments.length)return[];var e=arguments[0];return vs(e)?e:[e]},pr.chain=Na,pr.chunk=function(e,t,n){t=(n?Vo(e,t,n):t===o)?1:Wn(Hs(t),0);var i=null==e?0:e.length;if(!i||t<1)return[];for(var a=0,s=0,u=r(Un(i/t));a<i;)u[s++]=Di(e,a,a+=t);return u},pr.compact=function(e){for(var t=-1,n=null==e?0:e.length,r=0,i=[];++t<n;){var o=e[t];o&&(i[r++]=o)}return i},pr.concat=function(){var e=arguments.length;if(!e)return[];for(var t=r(e-1),n=arguments[0],i=e;i--;)t[i-1]=arguments[i];return en(vs(n)?no(n):[n],qr(t,1))},pr.cond=function(e){var t=null==e?0:e.length,n=Co();return e=t?$t(e,function(e){if("function"!=typeof e[1])throw new it(u);return[n(e[0]),e[1]]}):[],ki(function(n){for(var r=-1;++r<t;){var i=e[r];if(Wt(i[0],this,n))return Wt(i[1],this,n)}})},pr.conforms=function(e){return function(e){var t=iu(e);return function(n){return Cr(n,e,t)}}(Rr(e,f))},pr.constant=Au,pr.countBy=Ba,pr.create=function(e,t){var n=hr(e);return null==t?n:jr(n,t)},pr.curry=function e(t,n,r){var i=So(t,b,o,o,o,o,o,n=r?o:n);return i.placeholder=e.placeholder,i},pr.curryRight=function e(t,n,r){var i=So(t,w,o,o,o,o,o,n=r?o:n);return i.placeholder=e.placeholder,i},pr.debounce=is,pr.defaults=Xs,pr.defaultsDeep=Qs,pr.defer=os,pr.delay=as,pr.difference=pa,pr.differenceBy=ha,pr.differenceWith=ma,pr.drop=function(e,t,n){var r=null==e?0:e.length;return r?Di(e,(t=n||t===o?1:Hs(t))<0?0:t,r):[]},pr.dropRight=function(e,t,n){var r=null==e?0:e.length;return r?Di(e,0,(t=r-(t=n||t===o?1:Hs(t)))<0?0:t):[]},pr.dropRightWhile=function(e,t){return e&&e.length?Fi(e,Co(t,3),!0,!0):[]},pr.dropWhile=function(e,t){return e&&e.length?Fi(e,Co(t,3),!0):[]},pr.fill=function(e,t,n,r){var i=null==e?0:e.length;return i?(n&&"number"!=typeof n&&Vo(e,t,n)&&(n=0,r=i),function(e,t,n,r){var i=e.length;for((n=Hs(n))<0&&(n=-n>i?0:i+n),(r=r===o||r>i?i:Hs(r))<0&&(r+=i),r=n>r?0:Bs(r);n<r;)e[n++]=t;return e}(e,t,n,r)):[]},pr.filter=function(e,t){return(vs(e)?Kt:zr)(e,Co(t,3))},pr.flatMap=function(e,t){return qr(Ka(e,t),1)},pr.flatMapDeep=function(e,t){return qr(Ka(e,t),Y)},pr.flatMapDepth=function(e,t,n){return n=n===o?1:Hs(n),qr(Ka(e,t),n)},pr.flatten=ya,pr.flattenDeep=function(e){return null!=e&&e.length?qr(e,Y):[]},pr.flattenDepth=function(e,t){return null!=e&&e.length?qr(e,t=t===o?1:Hs(t)):[]},pr.flip=function(e){return So(e,L)},pr.flow=Eu,pr.flowRight=Tu,pr.fromPairs=function(e){for(var t=-1,n=null==e?0:e.length,r={};++t<n;){var i=e[t];r[i[0]]=i[1]}return r},pr.functions=function(e){return null==e?[]:Zr(e,iu(e))},pr.functionsIn=function(e){return null==e?[]:Zr(e,ou(e))},pr.groupBy=Va,pr.initial=function(e){return null!=e&&e.length?Di(e,0,-1):[]},pr.intersection=ba,pr.intersectionBy=wa,pr.intersectionWith=Ma,pr.invert=tu,pr.invertBy=nu,pr.invokeMap=Ja,pr.iteratee=ju,pr.keyBy=Za,pr.keys=iu,pr.keysIn=ou,pr.map=Ka,pr.mapKeys=function(e,t){var n={};return t=Co(t,3),Vr(e,function(e,r,i){Ir(n,t(e,r,i),e)}),n},pr.mapValues=function(e,t){var n={};return t=Co(t,3),Vr(e,function(e,r,i){Ir(n,r,t(e,r,i))}),n},pr.matches=function(e){return pi(Rr(e,f))},pr.matchesProperty=function(e,t){return hi(e,Rr(t,f))},pr.memoize=ss,pr.merge=au,pr.mergeWith=su,pr.method=Iu,pr.methodOf=Yu,pr.mixin=Ou,pr.negate=us,pr.nthArg=function(e){return e=Hs(e),ki(function(t){return _i(t,e)})},pr.omit=uu,pr.omitBy=function(e,t){return du(e,us(Co(t)))},pr.once=function(e){return ts(2,e)},pr.orderBy=function(e,t,n,r){return null==e?[]:(vs(t)||(t=null==t?[]:[t]),vs(n=r?o:n)||(n=null==n?[]:[n]),vi(e,t,n))},pr.over=Cu,pr.overArgs=cs,pr.overEvery=Pu,pr.overSome=Uu,pr.partial=ds,pr.partialRight=ls,pr.partition=Xa,pr.pick=cu,pr.pickBy=du,pr.property=Nu,pr.propertyOf=function(e){return function(t){return null==e?o:Kr(e,t)}},pr.pull=xa,pr.pullAll=Sa,pr.pullAllBy=function(e,t,n){return e&&e.length&&t&&t.length?gi(e,t,Co(n,2)):e},pr.pullAllWith=function(e,t,n){return e&&e.length&&t&&t.length?gi(e,t,o,n):e},pr.pullAt=La,pr.range=Fu,pr.rangeRight=Hu,pr.rearg=fs,pr.reject=function(e,t){return(vs(e)?Kt:zr)(e,us(Co(t,3)))},pr.remove=function(e,t){var n=[];if(!e||!e.length)return n;var r=-1,i=[],o=e.length;for(t=Co(t,3);++r<o;){var a=e[r];t(a,r,e)&&(n.push(a),i.push(r))}return bi(e,i),n},pr.rest=function(e,t){if("function"!=typeof e)throw new it(u);return ki(e,t=t===o?t:Hs(t))},pr.reverse=Aa,pr.sampleSize=function(e,t,n){return t=(n?Vo(e,t,n):t===o)?1:Hs(t),(vs(e)?Sr:Si)(e,t)},pr.set=function(e,t,n){return null==e?e:Li(e,t,n)},pr.setWith=function(e,t,n,r){return r="function"==typeof r?r:o,null==e?e:Li(e,t,n,r)},pr.shuffle=function(e){return(vs(e)?Lr:Ti)(e)},pr.slice=function(e,t,n){var r=null==e?0:e.length;return r?(n&&"number"!=typeof n&&Vo(e,t,n)?(t=0,n=r):(t=null==t?0:Hs(t),n=n===o?r:Hs(n)),Di(e,t,n)):[]},pr.sortBy=Qa,pr.sortedUniq=function(e){return e&&e.length?Oi(e):[]},pr.sortedUniqBy=function(e,t){return e&&e.length?Oi(e,Co(t,2)):[]},pr.split=function(e,t,n){return n&&"number"!=typeof n&&Vo(e,t,n)&&(t=n=o),(n=n===o?P:n>>>0)?(e=Ws(e))&&("string"==typeof t||null!=t&&!Is(t))&&!(t=Ci(t))&&Sn(e)?Ji(In(e),0,n):e.split(t,n):[]},pr.spread=function(e,t){if("function"!=typeof e)throw new it(u);return t=null==t?0:Wn(Hs(t),0),ki(function(n){var r=n[t],i=Ji(n,0,t);return r&&en(i,r),Wt(e,this,i)})},pr.tail=function(e){var t=null==e?0:e.length;return t?Di(e,1,t):[]},pr.take=function(e,t,n){return e&&e.length?Di(e,0,(t=n||t===o?1:Hs(t))<0?0:t):[]},pr.takeRight=function(e,t,n){var r=null==e?0:e.length;return r?Di(e,(t=r-(t=n||t===o?1:Hs(t)))<0?0:t,r):[]},pr.takeRightWhile=function(e,t){return e&&e.length?Fi(e,Co(t,3),!1,!0):[]},pr.takeWhile=function(e,t){return e&&e.length?Fi(e,Co(t,3)):[]},pr.tap=function(e,t){return t(e),e},pr.throttle=function(e,t,n){var r=!0,i=!0;if("function"!=typeof e)throw new it(u);return As(n)&&(r="leading"in n?!!n.leading:r,i="trailing"in n?!!n.trailing:i),is(e,t,{leading:r,maxWait:t,trailing:i})},pr.thru=Fa,pr.toArray=Ns,pr.toPairs=lu,pr.toPairsIn=fu,pr.toPath=function(e){return vs(e)?$t(e,da):Rs(e)?[e]:no(ca(Ws(e)))},pr.toPlainObject=qs,pr.transform=function(e,t,n){var r=vs(e),i=r||ws(e)||Cs(e);if(t=Co(t,4),null==n){var o=e&&e.constructor;n=i?r?new o:[]:As(e)&&xs(o)?hr(jt(e)):{}}return(i?Vt:Vr)(e,function(e,r,i){return t(n,e,r,i)}),n},pr.unary=function(e){return es(e,1)},pr.union=Ea,pr.unionBy=Ta,pr.unionWith=Da,pr.uniq=function(e){return e&&e.length?Pi(e):[]},pr.uniqBy=function(e,t){return e&&e.length?Pi(e,Co(t,2)):[]},pr.uniqWith=function(e,t){return t="function"==typeof t?t:o,e&&e.length?Pi(e,o,t):[]},pr.unset=function(e,t){return null==e||Ui(e,t)},pr.unzip=ja,pr.unzipWith=Ia,pr.update=function(e,t,n){return null==e?e:Ni(e,t,Wi(n))},pr.updateWith=function(e,t,n,r){return r="function"==typeof r?r:o,null==e?e:Ni(e,t,Wi(n),r)},pr.values=pu,pr.valuesIn=function(e){return null==e?[]:yn(e,ou(e))},pr.without=Ya,pr.words=xu,pr.wrap=function(e,t){return ds(Wi(t),e)},pr.xor=Oa,pr.xorBy=Ra,pr.xorWith=Ca,pr.zip=Pa,pr.zipObject=function(e,t){return zi(e||[],t||[],Er)},pr.zipObjectDeep=function(e,t){return zi(e||[],t||[],Li)},pr.zipWith=Ua,pr.entries=lu,pr.entriesIn=fu,pr.extend=Vs,pr.extendWith=Js,Ou(pr,pr),pr.add=qu,pr.attempt=Su,pr.camelCase=hu,pr.capitalize=mu,pr.ceil=Wu,pr.clamp=function(e,t,n){return n===o&&(n=t,t=o),n!==o&&(n=(n=zs(n))==n?n:0),t!==o&&(t=(t=zs(t))==t?t:0),Or(zs(e),t,n)},pr.clone=function(e){return Rr(e,h)},pr.cloneDeep=function(e){return Rr(e,f|h)},pr.cloneDeepWith=function(e,t){return Rr(e,f|h,t="function"==typeof t?t:o)},pr.cloneWith=function(e,t){return Rr(e,h,t="function"==typeof t?t:o)},pr.conformsTo=function(e,t){return null==t||Cr(e,t,iu(t))},pr.deburr=_u,pr.defaultTo=function(e,t){return null==e||e!=e?t:e},pr.divide=Gu,pr.endsWith=function(e,t,n){e=Ws(e),t=Ci(t);var r=e.length,i=n=n===o?r:Or(Hs(n),0,r);return(n-=t.length)>=0&&e.slice(n,i)==t},pr.eq=ps,pr.escape=function(e){return(e=Ws(e))&&Se.test(e)?e.replace(ke,kn):e},pr.escapeRegExp=function(e){return(e=Ws(e))&&Ye.test(e)?e.replace(Ie,"\\$&"):e},pr.every=function(e,t,n){var r=vs(e)?Zt:Hr;return n&&Vo(e,t,n)&&(t=o),r(e,Co(t,3))},pr.find=za,pr.findIndex=_a,pr.findKey=function(e,t){return an(e,Co(t,3),Vr)},pr.findLast=qa,pr.findLastIndex=va,pr.findLastKey=function(e,t){return an(e,Co(t,3),Jr)},pr.floor=Vu,pr.forEach=Wa,pr.forEachRight=Ga,pr.forIn=function(e,t){return null==e?e:Wr(e,Co(t,3),ou)},pr.forInRight=function(e,t){return null==e?e:Gr(e,Co(t,3),ou)},pr.forOwn=function(e,t){return e&&Vr(e,Co(t,3))},pr.forOwnRight=function(e,t){return e&&Jr(e,Co(t,3))},pr.get=$s,pr.gt=hs,pr.gte=ms,pr.has=function(e,t){return null!=e&&zo(e,t,ei)},pr.hasIn=eu,pr.head=ga,pr.identity=Du,pr.includes=function(e,t,n,r){e=gs(e)?e:pu(e),n=n&&!r?Hs(n):0;var i=e.length;return n<0&&(n=Wn(i+n,0)),Os(e)?n<=i&&e.indexOf(t,n)>-1:!!i&&un(e,t,n)>-1},pr.indexOf=function(e,t,n){var r=null==e?0:e.length;if(!r)return-1;var i=null==n?0:Hs(n);return i<0&&(i=Wn(r+i,0)),un(e,t,i)},pr.inRange=function(e,t,n){return t=Fs(t),n===o?(n=t,t=0):n=Fs(n),function(e,t,n){return e>=Gn(t,n)&&e<Wn(t,n)}(e=zs(e),t,n)},pr.invoke=ru,pr.isArguments=_s,pr.isArray=vs,pr.isArrayBuffer=ys,pr.isArrayLike=gs,pr.isArrayLikeObject=bs,pr.isBoolean=function(e){return!0===e||!1===e||Es(e)&&Qr(e)==q},pr.isBuffer=ws,pr.isDate=Ms,pr.isElement=function(e){return Es(e)&&1===e.nodeType&&!js(e)},pr.isEmpty=function(e){if(null==e)return!0;if(gs(e)&&(vs(e)||"string"==typeof e||"function"==typeof e.splice||ws(e)||Cs(e)||_s(e)))return!e.length;var t=Bo(e);if(t==K||t==ne)return!e.size;if(Xo(e))return!ci(e).length;for(var n in e)if(dt.call(e,n))return!1;return!0},pr.isEqual=function(e,t){return oi(e,t)},pr.isEqualWith=function(e,t,n){var r=(n="function"==typeof n?n:o)?n(e,t):o;return r===o?oi(e,t,o,n):!!r},pr.isError=ks,pr.isFinite=function(e){return"number"==typeof e&&Bn(e)},pr.isFunction=xs,pr.isInteger=Ss,pr.isLength=Ls,pr.isMap=Ts,pr.isMatch=function(e,t){return e===t||ai(e,t,Uo(t))},pr.isMatchWith=function(e,t,n){return n="function"==typeof n?n:o,ai(e,t,Uo(t),n)},pr.isNaN=function(e){return Ds(e)&&e!=+e},pr.isNative=function(e){if(Ko(e))throw new Qe(s);return si(e)},pr.isNil=function(e){return null==e},pr.isNull=function(e){return null===e},pr.isNumber=Ds,pr.isObject=As,pr.isObjectLike=Es,pr.isPlainObject=js,pr.isRegExp=Is,pr.isSafeInteger=function(e){return Ss(e)&&e>=-O&&e<=O},pr.isSet=Ys,pr.isString=Os,pr.isSymbol=Rs,pr.isTypedArray=Cs,pr.isUndefined=function(e){return e===o},pr.isWeakMap=function(e){return Es(e)&&Bo(e)==ae},pr.isWeakSet=function(e){return Es(e)&&Qr(e)==se},pr.join=function(e,t){return null==e?"":zn.call(e,t)},pr.kebabCase=vu,pr.last=ka,pr.lastIndexOf=function(e,t,n){var r=null==e?0:e.length;if(!r)return-1;var i=r;return n!==o&&(i=(i=Hs(n))<0?Wn(r+i,0):Gn(i,r-1)),t==t?function(e,t,n){for(var r=n+1;r--;)if(e[r]===t)return r;return r}(e,t,i):sn(e,dn,i,!0)},pr.lowerCase=yu,pr.lowerFirst=gu,pr.lt=Ps,pr.lte=Us,pr.max=function(e){return e&&e.length?Br(e,Du,$r):o},pr.maxBy=function(e,t){return e&&e.length?Br(e,Co(t,2),$r):o},pr.mean=function(e){return ln(e,Du)},pr.meanBy=function(e,t){return ln(e,Co(t,2))},pr.min=function(e){return e&&e.length?Br(e,Du,li):o},pr.minBy=function(e,t){return e&&e.length?Br(e,Co(t,2),li):o},pr.stubArray=Bu,pr.stubFalse=zu,pr.stubObject=function(){return{}},pr.stubString=function(){return""},pr.stubTrue=function(){return!0},pr.multiply=Zu,pr.nth=function(e,t){return e&&e.length?_i(e,Hs(t)):o},pr.noConflict=function(){return Yt._===this&&(Yt._=mt),this},pr.noop=Ru,pr.now=$a,pr.pad=function(e,t,n){e=Ws(e);var r=(t=Hs(t))?jn(e):0;if(!t||r>=t)return e;var i=(t-r)/2;return yo(Nn(i),n)+e+yo(Un(i),n)},pr.padEnd=function(e,t,n){e=Ws(e);var r=(t=Hs(t))?jn(e):0;return t&&r<t?e+yo(t-r,n):e},pr.padStart=function(e,t,n){e=Ws(e);var r=(t=Hs(t))?jn(e):0;return t&&r<t?yo(t-r,n)+e:e},pr.parseInt=function(e,t,n){return n||null==t?t=0:t&&(t=+t),Jn(Ws(e).replace(Re,""),t||0)},pr.random=function(e,t,n){if(n&&"boolean"!=typeof n&&Vo(e,t,n)&&(t=n=o),n===o&&("boolean"==typeof t?(n=t,t=o):"boolean"==typeof e&&(n=e,e=o)),e===o&&t===o?(e=0,t=1):(e=Fs(e),t===o?(t=e,e=0):t=Fs(t)),e>t){var r=e;e=t,t=r}if(n||e%1||t%1){var i=Zn();return Gn(e+i*(t-e+Tt("1e-"+((i+"").length-1))),t)}return wi(e,t)},pr.reduce=function(e,t,n){var r=vs(e)?tn:hn,i=arguments.length<3;return r(e,Co(t,4),n,i,Nr)},pr.reduceRight=function(e,t,n){var r=vs(e)?nn:hn,i=arguments.length<3;return r(e,Co(t,4),n,i,Fr)},pr.repeat=function(e,t,n){return t=(n?Vo(e,t,n):t===o)?1:Hs(t),Mi(Ws(e),t)},pr.replace=function(){var e=arguments,t=Ws(e[0]);return e.length<3?t:t.replace(e[1],e[2])},pr.result=function(e,t,n){var r=-1,i=(t=Gi(t,e)).length;for(i||(i=1,e=o);++r<i;){var a=null==e?o:e[da(t[r])];a===o&&(r=i,a=n),e=xs(a)?a.call(e):a}return e},pr.round=Ku,pr.runInContext=e,pr.sample=function(e){return(vs(e)?xr:xi)(e)},pr.size=function(e){if(null==e)return 0;if(gs(e))return Os(e)?jn(e):e.length;var t=Bo(e);return t==K||t==ne?e.size:ci(e).length},pr.snakeCase=bu,pr.some=function(e,t,n){var r=vs(e)?rn:ji;return n&&Vo(e,t,n)&&(t=o),r(e,Co(t,3))},pr.sortedIndex=function(e,t){return Ii(e,t)},pr.sortedIndexBy=function(e,t,n){return Yi(e,t,Co(n,2))},pr.sortedIndexOf=function(e,t){var n=null==e?0:e.length;if(n){var r=Ii(e,t);if(r<n&&ps(e[r],t))return r}return-1},pr.sortedLastIndex=function(e,t){return Ii(e,t,!0)},pr.sortedLastIndexBy=function(e,t,n){return Yi(e,t,Co(n,2),!0)},pr.sortedLastIndexOf=function(e,t){if(null!=e&&e.length){var n=Ii(e,t,!0)-1;if(ps(e[n],t))return n}return-1},pr.startCase=wu,pr.startsWith=function(e,t,n){return e=Ws(e),n=null==n?0:Or(Hs(n),0,e.length),t=Ci(t),e.slice(n,n+t.length)==t},pr.subtract=Xu,pr.sum=function(e){return e&&e.length?mn(e,Du):0},pr.sumBy=function(e,t){return e&&e.length?mn(e,Co(t,2)):0},pr.template=function(e,t,n){var r=pr.templateSettings;n&&Vo(e,t,n)&&(t=o),e=Ws(e),t=Js({},t,r,Lo);var i,a,s=Js({},t.imports,r.imports,Lo),u=iu(s),c=yn(s,u),d=0,l=t.interpolate||Ke,f="__p += '",p=nt((t.escape||Ke).source+"|"+l.source+"|"+(l===Ee?Be:Ke).source+"|"+(t.evaluate||Ke).source+"|$","g"),h="//# sourceURL="+("sourceURL"in t?t.sourceURL:"lodash.templateSources["+ ++St+"]")+"\n";e.replace(p,function(t,n,r,o,s,u){return r||(r=o),f+=e.slice(d,u).replace(Xe,xn),n&&(i=!0,f+="' +\n__e("+n+") +\n'"),s&&(a=!0,f+="';\n"+s+";\n__p += '"),r&&(f+="' +\n((__t = ("+r+")) == null ? '' : __t) +\n'"),d=u+t.length,t}),f+="';\n";var m=t.variable;m||(f="with (obj) {\n"+f+"\n}\n"),f=(a?f.replace(ge,""):f).replace(be,"$1").replace(we,"$1;"),f="function("+(m||"obj")+") {\n"+(m?"":"obj || (obj = {});\n")+"var __t, __p = ''"+(i?", __e = _.escape":"")+(a?", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n":";\n")+f+"return __p\n}";var _=Su(function(){return $e(u,h+"return "+f).apply(o,c)});if(_.source=f,ks(_))throw _;return _},pr.times=function(e,t){if((e=Hs(e))<1||e>O)return[];var n=P,r=Gn(e,P);t=Co(t),e-=P;for(var i=_n(r,t);++n<e;)t(n);return i},pr.toFinite=Fs,pr.toInteger=Hs,pr.toLength=Bs,pr.toLower=function(e){return Ws(e).toLowerCase()},pr.toNumber=zs,pr.toSafeInteger=function(e){return e?Or(Hs(e),-O,O):0===e?e:0},pr.toString=Ws,pr.toUpper=function(e){return Ws(e).toUpperCase()},pr.trim=function(e,t,n){if((e=Ws(e))&&(n||t===o))return e.replace(Oe,"");if(!e||!(t=Ci(t)))return e;var r=In(e),i=In(t);return Ji(r,bn(r,i),wn(r,i)+1).join("")},pr.trimEnd=function(e,t,n){if((e=Ws(e))&&(n||t===o))return e.replace(Ce,"");if(!e||!(t=Ci(t)))return e;var r=In(e);return Ji(r,0,wn(r,In(t))+1).join("")},pr.trimStart=function(e,t,n){if((e=Ws(e))&&(n||t===o))return e.replace(Re,"");if(!e||!(t=Ci(t)))return e;var r=In(e);return Ji(r,bn(r,In(t))).join("")},pr.truncate=function(e,t){var n=A,r=E;if(As(t)){var i="separator"in t?t.separator:i;n="length"in t?Hs(t.length):n,r="omission"in t?Ci(t.omission):r}var a=(e=Ws(e)).length;if(Sn(e)){var s=In(e);a=s.length}if(n>=a)return e;var u=n-jn(r);if(u<1)return r;var c=s?Ji(s,0,u).join(""):e.slice(0,u);if(i===o)return c+r;if(s&&(u+=c.length-u),Is(i)){if(e.slice(u).search(i)){var d,l=c;for(i.global||(i=nt(i.source,Ws(ze.exec(i))+"g")),i.lastIndex=0;d=i.exec(l);)var f=d.index;c=c.slice(0,f===o?u:f)}}else if(e.indexOf(Ci(i),u)!=u){var p=c.lastIndexOf(i);p>-1&&(c=c.slice(0,p))}return c+r},pr.unescape=function(e){return(e=Ws(e))&&xe.test(e)?e.replace(Me,Yn):e},pr.uniqueId=function(e){var t=++lt;return Ws(e)+t},pr.upperCase=Mu,pr.upperFirst=ku,pr.each=Wa,pr.eachRight=Ga,pr.first=ga,Ou(pr,(Ju={},Vr(pr,function(e,t){dt.call(pr.prototype,t)||(Ju[t]=e)}),Ju),{chain:!1}),pr.VERSION="4.17.11",Vt(["bind","bindKey","curry","curryRight","partial","partialRight"],function(e){pr[e].placeholder=pr}),Vt(["drop","take"],function(e,t){vr.prototype[e]=function(n){n=n===o?1:Wn(Hs(n),0);var r=this.__filtered__&&!t?new vr(this):this.clone();return r.__filtered__?r.__takeCount__=Gn(n,r.__takeCount__):r.__views__.push({size:Gn(n,P),type:e+(r.__dir__<0?"Right":"")}),r},vr.prototype[e+"Right"]=function(t){return this.reverse()[e](t).reverse()}}),Vt(["filter","map","takeWhile"],function(e,t){var n=t+1,r=n==j||3==n;vr.prototype[e]=function(e){var t=this.clone();return t.__iteratees__.push({iteratee:Co(e,3),type:n}),t.__filtered__=t.__filtered__||r,t}}),Vt(["head","last"],function(e,t){var n="take"+(t?"Right":"");vr.prototype[e]=function(){return this[n](1).value()[0]}}),Vt(["initial","tail"],function(e,t){var n="drop"+(t?"":"Right");vr.prototype[e]=function(){return this.__filtered__?new vr(this):this[n](1)}}),vr.prototype.compact=function(){return this.filter(Du)},vr.prototype.find=function(e){return this.filter(e).head()},vr.prototype.findLast=function(e){return this.reverse().find(e)},vr.prototype.invokeMap=ki(function(e,t){return"function"==typeof e?new vr(this):this.map(function(n){return ri(n,e,t)})}),vr.prototype.reject=function(e){return this.filter(us(Co(e)))},vr.prototype.slice=function(e,t){e=Hs(e);var n=this;return n.__filtered__&&(e>0||t<0)?new vr(n):(e<0?n=n.takeRight(-e):e&&(n=n.drop(e)),t!==o&&(n=(t=Hs(t))<0?n.dropRight(-t):n.take(t-e)),n)},vr.prototype.takeRightWhile=function(e){return this.reverse().takeWhile(e).reverse()},vr.prototype.toArray=function(){return this.take(P)},Vr(vr.prototype,function(e,t){var n=/^(?:filter|find|map|reject)|While$/.test(t),r=/^(?:head|last)$/.test(t),i=pr[r?"take"+("last"==t?"Right":""):t],a=r||/^find/.test(t);i&&(pr.prototype[t]=function(){var t=this.__wrapped__,s=r?[1]:arguments,u=t instanceof vr,c=s[0],d=u||vs(t),l=function(e){var t=i.apply(pr,en([e],s));return r&&f?t[0]:t};d&&n&&"function"==typeof c&&1!=c.length&&(u=d=!1);var f=this.__chain__,p=!!this.__actions__.length,h=a&&!f,m=u&&!p;if(!a&&d){t=m?t:new vr(this);var _=e.apply(t,s);return _.__actions__.push({func:Fa,args:[l],thisArg:o}),new _r(_,f)}return h&&m?e.apply(this,s):(_=this.thru(l),h?r?_.value()[0]:_.value():_)})}),Vt(["pop","push","shift","sort","splice","unshift"],function(e){var t=ot[e],n=/^(?:push|sort|unshift)$/.test(e)?"tap":"thru",r=/^(?:pop|shift)$/.test(e);pr.prototype[e]=function(){var e=arguments;if(r&&!this.__chain__){var i=this.value();return t.apply(vs(i)?i:[],e)}return this[n](function(n){return t.apply(vs(n)?n:[],e)})}}),Vr(vr.prototype,function(e,t){var n=pr[t];if(n){var r=n.name+"";(ir[r]||(ir[r]=[])).push({name:t,func:n})}}),ir[ho(o,y).name]=[{name:"wrapper",func:o}],vr.prototype.clone=function(){var e=new vr(this.__wrapped__);return e.__actions__=no(this.__actions__),e.__dir__=this.__dir__,e.__filtered__=this.__filtered__,e.__iteratees__=no(this.__iteratees__),e.__takeCount__=this.__takeCount__,e.__views__=no(this.__views__),e},vr.prototype.reverse=function(){if(this.__filtered__){var e=new vr(this);e.__dir__=-1,e.__filtered__=!0}else(e=this.clone()).__dir__*=-1;return e},vr.prototype.value=function(){var e=this.__wrapped__.value(),t=this.__dir__,n=vs(e),r=t<0,i=n?e.length:0,o=function(e,t,n){for(var r=-1,i=n.length;++r<i;){var o=n[r],a=o.size;switch(o.type){case"drop":e+=a;break;case"dropRight":t-=a;break;case"take":t=Gn(t,e+a);break;case"takeRight":e=Wn(e,t-a)}}return{start:e,end:t}}(0,i,this.__views__),a=o.start,s=o.end,u=s-a,c=r?s:a-1,d=this.__iteratees__,l=d.length,f=0,p=Gn(u,this.__takeCount__);if(!n||!r&&i==u&&p==u)return Hi(e,this.__actions__);var h=[];e:for(;u--&&f<p;){for(var m=-1,_=e[c+=t];++m<l;){var v=d[m],y=v.iteratee,g=v.type,b=y(_);if(g==I)_=b;else if(!b){if(g==j)continue e;break e}}h[f++]=_}return h},pr.prototype.at=Ha,pr.prototype.chain=function(){return Na(this)},pr.prototype.commit=function(){return new _r(this.value(),this.__chain__)},pr.prototype.next=function(){this.__values__===o&&(this.__values__=Ns(this.value()));var e=this.__index__>=this.__values__.length;return{done:e,value:e?o:this.__values__[this.__index__++]}},pr.prototype.plant=function(e){for(var t,n=this;n instanceof mr;){var r=fa(n);r.__index__=0,r.__values__=o,t?i.__wrapped__=r:t=r;var i=r;n=n.__wrapped__}return i.__wrapped__=e,t},pr.prototype.reverse=function(){var e=this.__wrapped__;if(e instanceof vr){var t=e;return this.__actions__.length&&(t=new vr(this)),(t=t.reverse()).__actions__.push({func:Fa,args:[Aa],thisArg:o}),new _r(t,this.__chain__)}return this.thru(Aa)},pr.prototype.toJSON=pr.prototype.valueOf=pr.prototype.value=function(){return Hi(this.__wrapped__,this.__actions__)},pr.prototype.first=pr.prototype.head,Ut&&(pr.prototype[Ut]=function(){return this}),pr}();Yt._=On,(i=function(){return On}.call(t,n,t,r))===o||(r.exports=i)}).call(this)}).call(this,n(4),n(12)(e))},function(e,t,n){var r=n(3),i=n(88),o=String.prototype.trim;e.exports=function(e,t){return e=r(e),!t&&o?o.call(e):(t=i(t),e.replace(new RegExp("^"+t+"+|"+t+"+$","g"),""))}},function(e,t,n){(function(t,n){
/*!
 *
 * Copyright 2009-2017 Kris Kowal under the terms of the MIT
 * license found at https://github.com/kriskowal/q/blob/v1/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
!function(t){"use strict";"function"==typeof bootstrap?bootstrap("promise",t):e.exports=t()}(function(){"use strict";var e=!1;try{throw new Error}catch(t){e=!!t.stack}var r,i=k(),o=function(){},a=function(){var e={task:void 0,next:null},r=e,i=!1,o=void 0,s=!1,u=[];function c(){for(var t,n;e.next;)t=(e=e.next).task,e.task=void 0,(n=e.domain)&&(e.domain=void 0,n.enter()),d(t,n);for(;u.length;)d(t=u.pop());i=!1}function d(e,t){try{e()}catch(e){if(s)throw t&&t.exit(),setTimeout(c,0),t&&t.enter(),e;setTimeout(function(){throw e},0)}t&&t.exit()}if(a=function(e){r=r.next={task:e,domain:s&&t.domain,next:null},i||(i=!0,o())},"object"==typeof t&&"[object process]"===t.toString()&&t.nextTick)s=!0,o=function(){t.nextTick(c)};else if("function"==typeof n)o="undefined"!=typeof window?n.bind(window,c):function(){n(c)};else if("undefined"!=typeof MessageChannel){var l=new MessageChannel;l.port1.onmessage=function(){o=f,l.port1.onmessage=c,c()};var f=function(){l.port2.postMessage(0)};o=function(){setTimeout(c,0),f()}}else o=function(){setTimeout(c,0)};return a.runAfter=function(e){u.push(e),i||(i=!0,o())},a}(),s=Function.call;function u(e){return function(){return s.apply(e,arguments)}}var c,d=u(Array.prototype.slice),l=u(Array.prototype.reduce||function(e,t){var n=0,r=this.length;if(1===arguments.length)for(;;){if(n in this){t=this[n++];break}if(++n>=r)throw new TypeError}for(;n<r;n++)n in this&&(t=e(t,this[n],n));return t}),f=u(Array.prototype.indexOf||function(e){for(var t=0;t<this.length;t++)if(this[t]===e)return t;return-1}),p=u(Array.prototype.map||function(e,t){var n=this,r=[];return l(n,function(i,o,a){r.push(e.call(t,o,a,n))},void 0),r}),h=Object.create||function(e){function t(){}return t.prototype=e,new t},m=Object.defineProperty||function(e,t,n){return e[t]=n.value,e},_=u(Object.prototype.hasOwnProperty),v=Object.keys||function(e){var t=[];for(var n in e)_(e,n)&&t.push(n);return t},y=u(Object.prototype.toString);c="undefined"!=typeof ReturnValue?ReturnValue:function(e){this.value=e};var g="From previous event:";function b(t,n){if(e&&n.stack&&"object"==typeof t&&null!==t&&t.stack){for(var r=[],i=n;i;i=i.source)i.stack&&(!t.__minimumStackCounter__||t.__minimumStackCounter__>i.stackCounter)&&(m(t,"__minimumStackCounter__",{value:i.stackCounter,configurable:!0}),r.unshift(i.stack));r.unshift(t.stack);var o=function(e){for(var t=e.split("\n"),n=[],r=0;r<t.length;++r){var i=t[r];!M(i)&&(-1===(o=i).indexOf("(module.js:")&&-1===o.indexOf("(node.js:"))&&i&&n.push(i)}var o;return n.join("\n")}(r.join("\n"+g+"\n"));m(t,"stack",{value:o,configurable:!0})}}function w(e){var t=/at .+ \((.+):(\d+):(?:\d+)\)$/.exec(e);if(t)return[t[1],Number(t[2])];var n=/at ([^ ]+):(\d+):(?:\d+)$/.exec(e);if(n)return[n[1],Number(n[2])];var r=/.*@(.+):(\d+)$/.exec(e);return r?[r[1],Number(r[2])]:void 0}function M(e){var t=w(e);if(!t)return!1;var n=t[0],o=t[1];return n===r&&o>=i&&o<=Z}function k(){if(e)try{throw new Error}catch(e){var t=e.stack.split("\n"),n=w(t[0].indexOf("@")>0?t[1]:t[2]);if(!n)return;return r=n[0],n[1]}}function x(e){return e instanceof T?e:Y(e)?(t=e,n=L(),x.nextTick(function(){try{t.then(n.resolve,n.reject,n.notify)}catch(e){n.reject(e)}}),n.promise):z(e);var t,n}x.resolve=x,x.nextTick=a,x.longStackSupport=!1;var S=1;function L(){var t,n=[],r=[],i=h(L.prototype),o=h(T.prototype);if(o.promiseDispatch=function(e,i,o){var a=d(arguments);n?(n.push(a),"when"===i&&o[1]&&r.push(o[1])):x.nextTick(function(){t.promiseDispatch.apply(t,a)})},o.valueOf=function(){if(n)return o;var e=j(t);return I(e)&&(t=e),e},o.inspect=function(){return t?t.inspect():{state:"pending"}},x.longStackSupport&&e)try{throw new Error}catch(e){o.stack=e.stack.substring(e.stack.indexOf("\n")+1),o.stackCounter=S++}function a(i){t=i,x.longStackSupport&&e&&(o.source=i),l(n,function(e,t){x.nextTick(function(){i.promiseDispatch.apply(i,t)})},void 0),n=void 0,r=void 0}return i.promise=o,i.resolve=function(e){t||a(x(e))},i.fulfill=function(e){t||a(z(e))},i.reject=function(e){t||a(B(e))},i.notify=function(e){t||l(r,function(t,n){x.nextTick(function(){n(e)})},void 0)},i}function A(e){if("function"!=typeof e)throw new TypeError("resolver must be a function.");var t=L();try{e(t.resolve,t.reject,t.notify)}catch(e){t.reject(e)}return t.promise}function E(e){return A(function(t,n){for(var r=0,i=e.length;r<i;r++)x(e[r]).then(t,n)})}function T(e,t,n){void 0===t&&(t=function(e){return B(new Error("Promise does not support operation: "+e))}),void 0===n&&(n=function(){return{state:"unknown"}});var r=h(T.prototype);if(r.promiseDispatch=function(n,i,o){var a;try{a=e[i]?e[i].apply(r,o):t.call(r,i,o)}catch(e){a=B(e)}n&&n(a)},r.inspect=n,n){var i=n();"rejected"===i.state&&(r.exception=i.reason),r.valueOf=function(){var e=n();return"pending"===e.state||"rejected"===e.state?r:e.value}}return r}function D(e,t,n,r){return x(e).then(t,n,r)}function j(e){if(I(e)){var t=e.inspect();if("fulfilled"===t.state)return t.value}return e}function I(e){return e instanceof T}function Y(e){return(t=e)===Object(t)&&"function"==typeof e.then;var t}"object"==typeof t&&t&&t.env&&t.env.Q_DEBUG&&(x.longStackSupport=!0),x.defer=L,L.prototype.makeNodeResolver=function(){var e=this;return function(t,n){t?e.reject(t):arguments.length>2?e.resolve(d(arguments,1)):e.resolve(n)}},x.Promise=A,x.promise=A,A.race=E,A.all=G,A.reject=B,A.resolve=x,x.passByCopy=function(e){return e},T.prototype.passByCopy=function(){return this},x.join=function(e,t){return x(e).join(t)},T.prototype.join=function(e){return x([this,e]).spread(function(e,t){if(e===t)return e;throw new Error("Q can't join: not the same: "+e+" "+t)})},x.race=E,T.prototype.race=function(){return this.then(x.race)},x.makePromise=T,T.prototype.toString=function(){return"[object Promise]"},T.prototype.then=function(e,t,n){var r=this,i=L(),o=!1;return x.nextTick(function(){r.promiseDispatch(function(t){o||(o=!0,i.resolve(function(t){try{return"function"==typeof e?e(t):t}catch(e){return B(e)}}(t)))},"when",[function(e){o||(o=!0,i.resolve(function(e){if("function"==typeof t){b(e,r);try{return t(e)}catch(e){return B(e)}}return B(e)}(e)))}])}),r.promiseDispatch(void 0,"when",[void 0,function(e){var t,r=!1;try{t=function(e){return"function"==typeof n?n(e):e}(e)}catch(e){if(r=!0,!x.onerror)throw e;x.onerror(e)}r||i.notify(t)}]),i.promise},x.tap=function(e,t){return x(e).tap(t)},T.prototype.tap=function(e){return e=x(e),this.then(function(t){return e.fcall(t).thenResolve(t)})},x.when=D,T.prototype.thenResolve=function(e){return this.then(function(){return e})},x.thenResolve=function(e,t){return x(e).thenResolve(t)},T.prototype.thenReject=function(e){return this.then(function(){throw e})},x.thenReject=function(e,t){return x(e).thenReject(t)},x.nearer=j,x.isPromise=I,x.isPromiseAlike=Y,x.isPending=function(e){return I(e)&&"pending"===e.inspect().state},T.prototype.isPending=function(){return"pending"===this.inspect().state},x.isFulfilled=function(e){return!I(e)||"fulfilled"===e.inspect().state},T.prototype.isFulfilled=function(){return"fulfilled"===this.inspect().state},x.isRejected=function(e){return I(e)&&"rejected"===e.inspect().state},T.prototype.isRejected=function(){return"rejected"===this.inspect().state};var O,R,C,P=[],U=[],N=[],F=!0;function H(){P.length=0,U.length=0,F||(F=!0)}function B(e){var n=T({when:function(n){return n&&function(e){if(F){var n=f(U,e);-1!==n&&("object"==typeof t&&"function"==typeof t.emit&&x.nextTick.runAfter(function(){var r=f(N,e);-1!==r&&(t.emit("rejectionHandled",P[n],e),N.splice(r,1))}),U.splice(n,1),P.splice(n,1))}}(this),n?n(e):this}},function(){return this},function(){return{state:"rejected",reason:e}});return function(e,n){F&&("object"==typeof t&&"function"==typeof t.emit&&x.nextTick.runAfter(function(){-1!==f(U,e)&&(t.emit("unhandledRejection",n,e),N.push(e))}),U.push(e),n&&void 0!==n.stack?P.push(n.stack):P.push("(no stack) "+n))}(n,e),n}function z(e){return T({when:function(){return e},get:function(t){return e[t]},set:function(t,n){e[t]=n},delete:function(t){delete e[t]},post:function(t,n){return null==t?e.apply(void 0,n):e[t].apply(e,n)},apply:function(t,n){return e.apply(t,n)},keys:function(){return v(e)}},void 0,function(){return{state:"fulfilled",value:e}})}function q(e,t,n){return x(e).spread(t,n)}function W(e,t,n){return x(e).dispatch(t,n)}function G(e){return D(e,function(e){var t=0,n=L();return l(e,function(r,i,o){var a;I(i)&&"fulfilled"===(a=i.inspect()).state?e[o]=a.value:(++t,D(i,function(r){e[o]=r,0==--t&&n.resolve(e)},n.reject,function(e){n.notify({index:o,value:e})}))},void 0),0===t&&n.resolve(e),n.promise})}function V(e){if(0===e.length)return x.resolve();var t=x.defer(),n=0;return l(e,function(r,i,o){var a=e[o];n++,D(a,function(e){t.resolve(e)},function(e){if(0==--n){var r=e||new Error(""+e);r.message="Q can't get fulfillment value from any promise, all promises were rejected. Last error message: "+r.message,t.reject(r)}},function(e){t.notify({index:o,value:e})})},void 0),t.promise}function J(e){return D(e,function(e){return e=p(e,x),D(G(p(e,function(e){return D(e,o,o)})),function(){return e})})}x.resetUnhandledRejections=H,x.getUnhandledReasons=function(){return P.slice()},x.stopUnhandledRejectionTracking=function(){H(),F=!1},H(),x.reject=B,x.fulfill=z,x.master=function(e){return T({isDef:function(){}},function(t,n){return W(e,t,n)},function(){return x(e).inspect()})},x.spread=q,T.prototype.spread=function(e,t){return this.all().then(function(t){return e.apply(void 0,t)},t)},x.async=function(e){return function(){function t(e,t){var o;if("undefined"==typeof StopIteration){try{o=n[e](t)}catch(e){return B(e)}return o.done?x(o.value):D(o.value,r,i)}try{o=n[e](t)}catch(e){return function(e){return"[object StopIteration]"===y(e)||e instanceof c}(e)?x(e.value):B(e)}return D(o,r,i)}var n=e.apply(this,arguments),r=t.bind(t,"next"),i=t.bind(t,"throw");return r()}},x.spawn=function(e){x.done(x.async(e)())},x.return=function(e){throw new c(e)},x.promised=function(e){return function(){return q([this,G(arguments)],function(t,n){return e.apply(t,n)})}},x.dispatch=W,T.prototype.dispatch=function(e,t){var n=this,r=L();return x.nextTick(function(){n.promiseDispatch(r.resolve,e,t)}),r.promise},x.get=function(e,t){return x(e).dispatch("get",[t])},T.prototype.get=function(e){return this.dispatch("get",[e])},x.set=function(e,t,n){return x(e).dispatch("set",[t,n])},T.prototype.set=function(e,t){return this.dispatch("set",[e,t])},x.del=x.delete=function(e,t){return x(e).dispatch("delete",[t])},T.prototype.del=T.prototype.delete=function(e){return this.dispatch("delete",[e])},x.mapply=x.post=function(e,t,n){return x(e).dispatch("post",[t,n])},T.prototype.mapply=T.prototype.post=function(e,t){return this.dispatch("post",[e,t])},x.send=x.mcall=x.invoke=function(e,t){return x(e).dispatch("post",[t,d(arguments,2)])},T.prototype.send=T.prototype.mcall=T.prototype.invoke=function(e){return this.dispatch("post",[e,d(arguments,1)])},x.fapply=function(e,t){return x(e).dispatch("apply",[void 0,t])},T.prototype.fapply=function(e){return this.dispatch("apply",[void 0,e])},x.try=x.fcall=function(e){return x(e).dispatch("apply",[void 0,d(arguments,1)])},T.prototype.fcall=function(){return this.dispatch("apply",[void 0,d(arguments)])},x.fbind=function(e){var t=x(e),n=d(arguments,1);return function(){return t.dispatch("apply",[this,n.concat(d(arguments))])}},T.prototype.fbind=function(){var e=this,t=d(arguments);return function(){return e.dispatch("apply",[this,t.concat(d(arguments))])}},x.keys=function(e){return x(e).dispatch("keys",[])},T.prototype.keys=function(){return this.dispatch("keys",[])},x.all=G,T.prototype.all=function(){return G(this)},x.any=V,T.prototype.any=function(){return V(this)},x.allResolved=(O=J,R="allResolved",C="allSettled",function(){return"undefined"!=typeof console&&"function"==typeof console.warn&&console.warn(R+" is deprecated, use "+C+" instead.",new Error("").stack),O.apply(O,arguments)}),T.prototype.allResolved=function(){return J(this)},x.allSettled=function(e){return x(e).allSettled()},T.prototype.allSettled=function(){return this.then(function(e){return G(p(e,function(e){function t(){return e.inspect()}return(e=x(e)).then(t,t)}))})},x.fail=x.catch=function(e,t){return x(e).then(void 0,t)},T.prototype.fail=T.prototype.catch=function(e){return this.then(void 0,e)},x.progress=function(e,t){return x(e).then(void 0,void 0,t)},T.prototype.progress=function(e){return this.then(void 0,void 0,e)},x.fin=x.finally=function(e,t){return x(e).finally(t)},T.prototype.fin=T.prototype.finally=function(e){if(!e||"function"!=typeof e.apply)throw new Error("Q can't apply finally callback");return e=x(e),this.then(function(t){return e.fcall().then(function(){return t})},function(t){return e.fcall().then(function(){throw t})})},x.done=function(e,t,n,r){return x(e).done(t,n,r)},T.prototype.done=function(e,n,r){var i=function(e){x.nextTick(function(){if(b(e,o),!x.onerror)throw e;x.onerror(e)})},o=e||n||r?this.then(e,n,r):this;"object"==typeof t&&t&&t.domain&&(i=t.domain.bind(i)),o.then(void 0,i)},x.timeout=function(e,t,n){return x(e).timeout(t,n)},T.prototype.timeout=function(e,t){var n=L(),r=setTimeout(function(){t&&"string"!=typeof t||((t=new Error(t||"Timed out after "+e+" ms")).code="ETIMEDOUT"),n.reject(t)},e);return this.then(function(e){clearTimeout(r),n.resolve(e)},function(e){clearTimeout(r),n.reject(e)},n.notify),n.promise},x.delay=function(e,t){return void 0===t&&(t=e,e=void 0),x(e).delay(t)},T.prototype.delay=function(e){return this.then(function(t){var n=L();return setTimeout(function(){n.resolve(t)},e),n.promise})},x.nfapply=function(e,t){return x(e).nfapply(t)},T.prototype.nfapply=function(e){var t=L(),n=d(e);return n.push(t.makeNodeResolver()),this.fapply(n).fail(t.reject),t.promise},x.nfcall=function(e){var t=d(arguments,1);return x(e).nfapply(t)},T.prototype.nfcall=function(){var e=d(arguments),t=L();return e.push(t.makeNodeResolver()),this.fapply(e).fail(t.reject),t.promise},x.nfbind=x.denodeify=function(e){if(void 0===e)throw new Error("Q can't wrap an undefined function");var t=d(arguments,1);return function(){var n=t.concat(d(arguments)),r=L();return n.push(r.makeNodeResolver()),x(e).fapply(n).fail(r.reject),r.promise}},T.prototype.nfbind=T.prototype.denodeify=function(){var e=d(arguments);return e.unshift(this),x.denodeify.apply(void 0,e)},x.nbind=function(e,t){var n=d(arguments,2);return function(){var r=n.concat(d(arguments)),i=L();return r.push(i.makeNodeResolver()),x(function(){return e.apply(t,arguments)}).fapply(r).fail(i.reject),i.promise}},T.prototype.nbind=function(){var e=d(arguments,0);return e.unshift(this),x.nbind.apply(void 0,e)},x.nmapply=x.npost=function(e,t,n){return x(e).npost(t,n)},T.prototype.nmapply=T.prototype.npost=function(e,t){var n=d(t||[]),r=L();return n.push(r.makeNodeResolver()),this.dispatch("post",[e,n]).fail(r.reject),r.promise},x.nsend=x.nmcall=x.ninvoke=function(e,t){var n=d(arguments,2),r=L();return n.push(r.makeNodeResolver()),x(e).dispatch("post",[t,n]).fail(r.reject),r.promise},T.prototype.nsend=T.prototype.nmcall=T.prototype.ninvoke=function(e){var t=d(arguments,1),n=L();return t.push(n.makeNodeResolver()),this.dispatch("post",[e,t]).fail(n.reject),n.promise},x.nodeify=function(e,t){return x(e).nodeify(t)},T.prototype.nodeify=function(e){if(!e)return this;this.then(function(t){x.nextTick(function(){e(null,t)})},function(t){x.nextTick(function(){e(t)})})},x.noConflict=function(){throw new Error("Q.noConflict only works when Q is used as a global")};var Z=k();return x})}).call(this,n(8),n(78).setImmediate)},function(e,t,n){var r=n(10),i=(r.isUndefined,r.handleError),o=r.extractStringFromParam,a=function(){};a.prototype={defaults:{loggerKey:"logger",timeStampKey:"timestamp",millisecondsKey:"milliseconds",levelKey:"level",messageKey:"message",exceptionKey:"exception",urlKey:"url"},loggerKey:"logger",timeStampKey:"timestamp",millisecondsKey:"milliseconds",levelKey:"level",messageKey:"message",exceptionKey:"exception",urlKey:"url",batchHeader:"",batchFooter:"",batchSeparator:"",returnsPostData:!1,overrideTimeStampsSetting:!1,useTimeStampsInMilliseconds:null,format:function(){i("Layout.format: layout supplied has no format() method")},ignoresThrowable:function(){i("Layout.ignoresThrowable: layout supplied has no ignoresThrowable() method")},getContentType:function(){return"text/plain"},allowBatching:function(){return!0},setTimeStampsInMilliseconds:function(e){this.overrideTimeStampsSetting=!0,this.useTimeStampsInMilliseconds=r.bool(e)},isTimeStampsInMilliseconds:function(){return this.overrideTimeStampsSetting?this.useTimeStampsInMilliseconds:this.log4js.useTimeStampsInMilliseconds},getTimeStampValue:function(e){return this.isTimeStampsInMilliseconds()?e.timeStampInMilliseconds:e.timeStampInSeconds},getDataValues:function(e,t){var n;try{n=window.location.href}catch(e){n=""}var i=[[this.loggerKey,e.logger.name],[this.timeStampKey,this.getTimeStampValue(e)],[this.levelKey,e.level.name],[this.urlKey,n],[this.messageKey,t?e.getCombinedMessages():e.messages]];if(this.isTimeStampsInMilliseconds()||i.push([this.millisecondsKey,e.milliseconds]),e.exception&&i.push([this.exceptionKey,r.getExceptionStringRep(e.exception)]),this.hasCustomFields())for(var o=0,a=this.customFields.length;o<a;o++){var s=this.customFields[o].value;"function"==typeof s&&(s=s(this,e)),i.push([this.customFields[o].name,s])}return i},setKeys:function(e,t,n,r,i,a,s){this.loggerKey=o(e,this.defaults.loggerKey),this.timeStampKey=o(t,this.defaults.timeStampKey),this.levelKey=o(n,this.defaults.levelKey),this.messageKey=o(r,this.defaults.messageKey),this.exceptionKey=o(i,this.defaults.exceptionKey),this.urlKey=o(a,this.defaults.urlKey),this.millisecondsKey=o(s,this.defaults.millisecondsKey)},setCustomField:function(e,t){for(var n=!1,r=0,i=this.customFields.length;r<i;r++)this.customFields[r].name===e&&(this.customFields[r].value=t,n=!0);n||this.customFields.push({name:e,value:t})},hasCustomFields:function(){return this.customFields.length>0},toString:function(){i("Layout.toString: all layouts must override this method")}},e.exports=a},function(e,t,n){(function(e){var r=Object.getOwnPropertyDescriptors||function(e){for(var t=Object.keys(e),n={},r=0;r<t.length;r++)n[t[r]]=Object.getOwnPropertyDescriptor(e,t[r]);return n},i=/%[sdj%]/g;t.format=function(e){if(!v(e)){for(var t=[],n=0;n<arguments.length;n++)t.push(s(arguments[n]));return t.join(" ")}n=1;for(var r=arguments,o=r.length,a=String(e).replace(i,function(e){if("%%"===e)return"%";if(n>=o)return e;switch(e){case"%s":return String(r[n++]);case"%d":return Number(r[n++]);case"%j":try{return JSON.stringify(r[n++])}catch(e){return"[Circular]"}default:return e}}),u=r[n];n<o;u=r[++n])m(u)||!b(u)?a+=" "+u:a+=" "+s(u);return a},t.deprecate=function(n,r){if(void 0!==e&&!0===e.noDeprecation)return n;if(void 0===e)return function(){return t.deprecate(n,r).apply(this,arguments)};var i=!1;return function(){if(!i){if(e.throwDeprecation)throw new Error(r);e.traceDeprecation?console.trace(r):console.error(r),i=!0}return n.apply(this,arguments)}};var o,a={};function s(e,n){var r={seen:[],stylize:c};return arguments.length>=3&&(r.depth=arguments[2]),arguments.length>=4&&(r.colors=arguments[3]),h(n)?r.showHidden=n:n&&t._extend(r,n),y(r.showHidden)&&(r.showHidden=!1),y(r.depth)&&(r.depth=2),y(r.colors)&&(r.colors=!1),y(r.customInspect)&&(r.customInspect=!0),r.colors&&(r.stylize=u),d(r,e,r.depth)}function u(e,t){var n=s.styles[t];return n?"["+s.colors[n][0]+"m"+e+"["+s.colors[n][1]+"m":e}function c(e,t){return e}function d(e,n,r){if(e.customInspect&&n&&k(n.inspect)&&n.inspect!==t.inspect&&(!n.constructor||n.constructor.prototype!==n)){var i=n.inspect(r,e);return v(i)||(i=d(e,i,r)),i}var o=function(e,t){if(y(t))return e.stylize("undefined","undefined");if(v(t)){var n="'"+JSON.stringify(t).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return e.stylize(n,"string")}if(_(t))return e.stylize(""+t,"number");if(h(t))return e.stylize(""+t,"boolean");if(m(t))return e.stylize("null","null")}(e,n);if(o)return o;var a=Object.keys(n),s=function(e){var t={};return e.forEach(function(e,n){t[e]=!0}),t}(a);if(e.showHidden&&(a=Object.getOwnPropertyNames(n)),M(n)&&(a.indexOf("message")>=0||a.indexOf("description")>=0))return l(n);if(0===a.length){if(k(n)){var u=n.name?": "+n.name:"";return e.stylize("[Function"+u+"]","special")}if(g(n))return e.stylize(RegExp.prototype.toString.call(n),"regexp");if(w(n))return e.stylize(Date.prototype.toString.call(n),"date");if(M(n))return l(n)}var c,b="",x=!1,S=["{","}"];(p(n)&&(x=!0,S=["[","]"]),k(n))&&(b=" [Function"+(n.name?": "+n.name:"")+"]");return g(n)&&(b=" "+RegExp.prototype.toString.call(n)),w(n)&&(b=" "+Date.prototype.toUTCString.call(n)),M(n)&&(b=" "+l(n)),0!==a.length||x&&0!=n.length?r<0?g(n)?e.stylize(RegExp.prototype.toString.call(n),"regexp"):e.stylize("[Object]","special"):(e.seen.push(n),c=x?function(e,t,n,r,i){for(var o=[],a=0,s=t.length;a<s;++a)A(t,String(a))?o.push(f(e,t,n,r,String(a),!0)):o.push("");return i.forEach(function(i){i.match(/^\d+$/)||o.push(f(e,t,n,r,i,!0))}),o}(e,n,r,s,a):a.map(function(t){return f(e,n,r,s,t,x)}),e.seen.pop(),function(e,t,n){if(e.reduce(function(e,t){return 0,t.indexOf("\n")>=0&&0,e+t.replace(/\u001b\[\d\d?m/g,"").length+1},0)>60)return n[0]+(""===t?"":t+"\n ")+" "+e.join(",\n  ")+" "+n[1];return n[0]+t+" "+e.join(", ")+" "+n[1]}(c,b,S)):S[0]+b+S[1]}function l(e){return"["+Error.prototype.toString.call(e)+"]"}function f(e,t,n,r,i,o){var a,s,u;if((u=Object.getOwnPropertyDescriptor(t,i)||{value:t[i]}).get?s=u.set?e.stylize("[Getter/Setter]","special"):e.stylize("[Getter]","special"):u.set&&(s=e.stylize("[Setter]","special")),A(r,i)||(a="["+i+"]"),s||(e.seen.indexOf(u.value)<0?(s=m(n)?d(e,u.value,null):d(e,u.value,n-1)).indexOf("\n")>-1&&(s=o?s.split("\n").map(function(e){return"  "+e}).join("\n").substr(2):"\n"+s.split("\n").map(function(e){return"   "+e}).join("\n")):s=e.stylize("[Circular]","special")),y(a)){if(o&&i.match(/^\d+$/))return s;(a=JSON.stringify(""+i)).match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)?(a=a.substr(1,a.length-2),a=e.stylize(a,"name")):(a=a.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'"),a=e.stylize(a,"string"))}return a+": "+s}function p(e){return Array.isArray(e)}function h(e){return"boolean"==typeof e}function m(e){return null===e}function _(e){return"number"==typeof e}function v(e){return"string"==typeof e}function y(e){return void 0===e}function g(e){return b(e)&&"[object RegExp]"===x(e)}function b(e){return"object"==typeof e&&null!==e}function w(e){return b(e)&&"[object Date]"===x(e)}function M(e){return b(e)&&("[object Error]"===x(e)||e instanceof Error)}function k(e){return"function"==typeof e}function x(e){return Object.prototype.toString.call(e)}function S(e){return e<10?"0"+e.toString(10):e.toString(10)}t.debuglog=function(n){if(y(o)&&(o=e.env.NODE_DEBUG||""),n=n.toUpperCase(),!a[n])if(new RegExp("\\b"+n+"\\b","i").test(o)){var r=e.pid;a[n]=function(){var e=t.format.apply(t,arguments);console.error("%s %d: %s",n,r,e)}}else a[n]=function(){};return a[n]},t.inspect=s,s.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]},s.styles={special:"cyan",number:"yellow",boolean:"yellow",undefined:"grey",null:"bold",string:"green",date:"magenta",regexp:"red"},t.isArray=p,t.isBoolean=h,t.isNull=m,t.isNullOrUndefined=function(e){return null==e},t.isNumber=_,t.isString=v,t.isSymbol=function(e){return"symbol"==typeof e},t.isUndefined=y,t.isRegExp=g,t.isObject=b,t.isDate=w,t.isError=M,t.isFunction=k,t.isPrimitive=function(e){return null===e||"boolean"==typeof e||"number"==typeof e||"string"==typeof e||"symbol"==typeof e||void 0===e},t.isBuffer=n(573);var L=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function A(e,t){return Object.prototype.hasOwnProperty.call(e,t)}t.log=function(){var e,n;console.log("%s - %s",(e=new Date,n=[S(e.getHours()),S(e.getMinutes()),S(e.getSeconds())].join(":"),[e.getDate(),L[e.getMonth()],n].join(" ")),t.format.apply(t,arguments))},t.inherits=n(1),t._extend=function(e,t){if(!t||!b(t))return e;for(var n=Object.keys(t),r=n.length;r--;)e[n[r]]=t[n[r]];return e};var E="undefined"!=typeof Symbol?Symbol("util.promisify.custom"):void 0;function T(e,t){if(!e){var n=new Error("Promise was rejected with a falsy value");n.reason=e,e=n}return t(e)}t.promisify=function(e){if("function"!=typeof e)throw new TypeError('The "original" argument must be of type Function');if(E&&e[E]){var t;if("function"!=typeof(t=e[E]))throw new TypeError('The "util.promisify.custom" argument must be of type Function');return Object.defineProperty(t,E,{value:t,enumerable:!1,writable:!1,configurable:!0}),t}function t(){for(var t,n,r=new Promise(function(e,r){t=e,n=r}),i=[],o=0;o<arguments.length;o++)i.push(arguments[o]);i.push(function(e,r){e?n(e):t(r)});try{e.apply(this,i)}catch(e){n(e)}return r}return Object.setPrototypeOf(t,Object.getPrototypeOf(e)),E&&Object.defineProperty(t,E,{value:t,enumerable:!1,writable:!1,configurable:!0}),Object.defineProperties(t,r(e))},t.promisify.custom=E,t.callbackify=function(t){if("function"!=typeof t)throw new TypeError('The "original" argument must be of type Function');function n(){for(var n=[],r=0;r<arguments.length;r++)n.push(arguments[r]);var i=n.pop();if("function"!=typeof i)throw new TypeError("The last argument must be of type Function");var o=this,a=function(){return i.apply(o,arguments)};t.apply(this,n).then(function(t){e.nextTick(a,null,t)},function(t){e.nextTick(T,t,a)})}return Object.setPrototypeOf(n,Object.getPrototypeOf(t)),Object.defineProperties(n,r(t)),n}}).call(this,n(8))},function(e,t,n){var r=n(11),i=(r.isUndefined,r.handleError),o=r.extractStringFromParam,a=function(){};a.prototype={defaults:{loggerKey:"logger",timeStampKey:"timestamp",millisecondsKey:"milliseconds",levelKey:"level",messageKey:"message",exceptionKey:"exception",urlKey:"url"},loggerKey:"logger",timeStampKey:"timestamp",millisecondsKey:"milliseconds",levelKey:"level",messageKey:"message",exceptionKey:"exception",urlKey:"url",batchHeader:"",batchFooter:"",batchSeparator:"",returnsPostData:!1,overrideTimeStampsSetting:!1,useTimeStampsInMilliseconds:null,format:function(){i("Layout.format: layout supplied has no format() method")},ignoresThrowable:function(){i("Layout.ignoresThrowable: layout supplied has no ignoresThrowable() method")},getContentType:function(){return"text/plain"},allowBatching:function(){return!0},setTimeStampsInMilliseconds:function(e){this.overrideTimeStampsSetting=!0,this.useTimeStampsInMilliseconds=r.bool(e)},isTimeStampsInMilliseconds:function(){return this.overrideTimeStampsSetting?this.useTimeStampsInMilliseconds:this.log4js.useTimeStampsInMilliseconds},getTimeStampValue:function(e){return this.isTimeStampsInMilliseconds()?e.timeStampInMilliseconds:e.timeStampInSeconds},getDataValues:function(e,t){var n;try{n=window.location.href}catch(e){n=""}var i=[[this.loggerKey,e.logger.name],[this.timeStampKey,this.getTimeStampValue(e)],[this.levelKey,e.level.name],[this.urlKey,n],[this.messageKey,t?e.getCombinedMessages():e.messages]];if(this.isTimeStampsInMilliseconds()||i.push([this.millisecondsKey,e.milliseconds]),e.exception&&i.push([this.exceptionKey,r.getExceptionStringRep(e.exception)]),this.hasCustomFields())for(var o=0,a=this.customFields.length;o<a;o++){var s=this.customFields[o].value;"function"==typeof s&&(s=s(this,e)),i.push([this.customFields[o].name,s])}return i},setKeys:function(e,t,n,r,i,a,s){this.loggerKey=o(e,this.defaults.loggerKey),this.timeStampKey=o(t,this.defaults.timeStampKey),this.levelKey=o(n,this.defaults.levelKey),this.messageKey=o(r,this.defaults.messageKey),this.exceptionKey=o(i,this.defaults.exceptionKey),this.urlKey=o(a,this.defaults.urlKey),this.millisecondsKey=o(s,this.defaults.millisecondsKey)},setCustomField:function(e,t){for(var n=!1,r=0,i=this.customFields.length;r<i;r++)this.customFields[r].name===e&&(this.customFields[r].value=t,n=!0);n||this.customFields.push({name:e,value:t})},hasCustomFields:function(){return this.customFields.length>0},toString:function(){i("Layout.toString: all layouts must override this method")}},e.exports=a},function(e,t,n){var r=n(2).Buffer,i=n(75).Transform,o=n(58).StringDecoder;function a(e){i.call(this),this.hashMode="string"==typeof e,this.hashMode?this[e]=this._finalOrDigest:this.final=this._finalOrDigest,this._final&&(this.__final=this._final,this._final=null),this._decoder=null,this._encoding=null}n(1)(a,i),a.prototype.update=function(e,t,n){"string"==typeof e&&(e=r.from(e,t));var i=this._update(e);return this.hashMode?this:(n&&(i=this._toString(i,n)),i)},a.prototype.setAutoPadding=function(){},a.prototype.getAuthTag=function(){throw new Error("trying to get auth tag in unsupported state")},a.prototype.setAuthTag=function(){throw new Error("trying to set auth tag in unsupported state")},a.prototype.setAAD=function(){throw new Error("trying to set aad in unsupported state")},a.prototype._transform=function(e,t,n){var r;try{this.hashMode?this._update(e):this.push(this._update(e))}catch(e){r=e}finally{n(r)}},a.prototype._flush=function(e){var t;try{this.push(this.__final())}catch(e){t=e}e(t)},a.prototype._finalOrDigest=function(e){var t=this.__final()||r.alloc(0);return e&&(t=this._toString(t,e,!0)),t},a.prototype._toString=function(e,t,n){if(this._decoder||(this._decoder=new o(t),this._encoding=t),this._encoding!==t)throw new Error("can't switch encodings");var r=this._decoder.write(e);return n&&(r+=this._decoder.end()),r},e.exports=a},function(e,t){var n=function(e,t){this.level=e,this.name=t};n.prototype={toString:function(){return this.name},equals:function(e){return this.level==e.level},isGreaterOrEqual:function(e){return this.level>=e.level}},n.ALL=new n(Number.MIN_VALUE,"ALL"),n.TRACE=new n(1e4,"TRACE"),n.DEBUG=new n(2e4,"DEBUG"),n.INFO=new n(3e4,"INFO"),n.WARN=new n(4e4,"WARN"),n.ERROR=new n(5e4,"ERROR"),n.FATAL=new n(6e4,"FATAL"),n.OFF=new n(Number.MAX_VALUE,"OFF"),e.exports=n},function(e,t){var n=function(e,t){this.level=e,this.name=t};n.prototype={toString:function(){return this.name},equals:function(e){return this.level==e.level},isGreaterOrEqual:function(e){return this.level>=e.level}},n.ALL=new n(Number.MIN_VALUE,"ALL"),n.TRACE=new n(1e4,"TRACE"),n.DEBUG=new n(2e4,"DEBUG"),n.INFO=new n(3e4,"INFO"),n.WARN=new n(4e4,"WARN"),n.ERROR=new n(5e4,"ERROR"),n.FATAL=new n(6e4,"FATAL"),n.OFF=new n(Number.MAX_VALUE,"OFF"),e.exports=n},function(e,t,n){"use strict";var r=n(57),i=Object.keys||function(e){var t=[];for(var n in e)t.push(n);return t};e.exports=l;var o=n(43);o.inherits=n(1);var a=n(120),s=n(77);o.inherits(l,a);for(var u=i(s.prototype),c=0;c<u.length;c++){var d=u[c];l.prototype[d]||(l.prototype[d]=s.prototype[d])}function l(e){if(!(this instanceof l))return new l(e);a.call(this,e),s.call(this,e),e&&!1===e.readable&&(this.readable=!1),e&&!1===e.writable&&(this.writable=!1),this.allowHalfOpen=!0,e&&!1===e.allowHalfOpen&&(this.allowHalfOpen=!1),this.once("end",f)}function f(){this.allowHalfOpen||this._writableState.ended||r.nextTick(p,this)}function p(e){e.end()}Object.defineProperty(l.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),Object.defineProperty(l.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&void 0!==this._writableState&&(this._readableState.destroyed&&this._writableState.destroyed)},set:function(e){void 0!==this._readableState&&void 0!==this._writableState&&(this._readableState.destroyed=e,this._writableState.destroyed=e)}}),l.prototype._destroy=function(e,t){this.push(null),this.end(),r.nextTick(t,e)}},function(e,t,n){var r=e.exports;[n(539),n(543),n(544),n(545),n(546),n(547)].forEach(function(e){Object.keys(e).forEach(function(t){r[t]=e[t].bind(r)})})},function(e,t,n){"use strict";var r=n(53),i=n(6),o=n(5);function a(){var e=o.toArray(arguments);return e.unshift(r.VIRTRU),e.join(r.SEP)}function s(){var e=o.toArray(arguments);return e.unshift(r.ACCESS),e.unshift(r.USER),e.unshift(r.VIRTRU),e.join(r.SEP)}function u(){var e=o.toArray(arguments);return e.unshift(r.ORG),e.unshift(r.ACCESS),e.unshift(r.USER),e.unshift(r.VIRTRU),e.join(r.SEP)}function c(){var e=o.toArray(arguments);return e.unshift(r.DATA),e.unshift(r.VIRTRU),e.join(r.SEP)}function d(){var e=o.toArray(arguments);return e.unshift(r.ORG),e.unshift(r.DATA),e.unshift(r.VIRTRU),e.join(r.SEP)}function l(){var e=o.toArray(arguments);return e.unshift(r.SERVICE),e.unshift(r.VIRTRU),e.join(r.SEP)}function f(e,t){i.checkIsString(e);var n=e.split(r.SEP);return n[n.length-1]===t&&n[0]===r.VIRTRU}e.exports.Data={},e.exports.User={},e.exports.Service={},e.exports.User.superAdmin=function(e){return i.checkIsString(e),function(){var e=o.toArray(arguments);return e.unshift(r.ORG),e.unshift(r.ACTION),e.unshift(r.USER),e.unshift(r.VIRTRU),e.join(r.SEP)}(e,r.SUPER_ADMIN)},e.exports.User.group=function(e){return i.checkIsString(e),u(e,r.GROUP)},e.exports.Data.group=function(e){return i.checkIsString(e),d(e,r.GROUP)},e.exports.User.alias=function(e){return i.checkIsString(e),u(e,r.ALIAS)},e.exports.Data.organizationalUnit=function(e){return i.checkIsString(e),d(e,r.ORGANIZATIONAL_UNIT)},e.exports.User.organizationalUnit=function(e){return i.checkIsString(e),u(e,r.ORGANIZATIONAL_UNIT)},e.exports.Data.primaryOrg=function(){return c(r.PRIMARY_ORG)},e.exports.User.primaryOrg=function(){return s(r.PRIMARY_ORG)},e.exports.Service.primaryOrg=function(){return function(){var e=o.toArray(arguments);return e.unshift(r.ACCESS),e.unshift(r.SERVICE),e.unshift(r.VIRTRU),e.join(r.SEP)}(r.PRIMARY_ORG)},e.exports.User.primaryOrgUnit=function(){return s(r.PRIMARY_ORG_UNIT)},e.exports.Data.primaryOrgUnit=function(){return c(r.PRIMARY_ORG_UNIT)},e.exports.User.uniqueId=function(){return s(r.UNIQUE_IDENTIFIER)},e.exports.Data.policyType=function(){return c(r.POLICY,r.TYPE)},e.exports.Data.owner=function(){return c(r.OWNER)},e.exports.Data.creator=function(){return c(r.CREATOR)},e.exports.Service.owner=function(){return l(r.OWNER)},e.exports.Service.creator=function(){return l(r.CREATOR)},e.exports.Service.apiTokenType=function(){return l(r.TYPE)},e.exports.isGroup=function(e){return f(e,r.GROUP)},e.exports.isAlias=function(e){return f(e,r.ALIAS)},e.exports.isOrganizationalUnit=function(e){return f(e,r.ORGANIZATIONAL_UNIT)},e.exports.isOrganizationKey=function(e,t){i.checkIsString(e);var n=e.split(r.SEP),a=o.indexOf(n,r.ORG);return a>0&&n.length>=a+2&&(n[a+1]===t&&n[0]===r.VIRTRU)},e.exports.isDataAttribute=function(e){i.checkIsString(e);var t=e.split(r.SEP);return t.length>=3&&t[0]===r.VIRTRU&&t[1]===r.DATA},e.exports.containsOrgToken=function(e){i.checkIsString(e);var t=e.split(r.SEP);return o.indexOf(t,r.ORG)>0},e.exports.getOrgId=function(e){i.checkIsString(e);var t=e.split(r.SEP),n=o.indexOf(t,r.ORG);if(n>0&&t.length>=n+2&&t[0]===r.VIRTRU)return t[n+1]},e.exports.permission=function(e,t,n){return a(r.USER,r.ADMIN,r.ORG,e,t,n)},e.exports.adminPermission=e.exports.permission,e.exports.actionPermission=function(e,t){return a(r.USER,r.ACTION,r.ORG,e,t)},e.exports.servicePermission=function(e,t){var n=["service","admin"];return t&&(n.push("org"),n.push(t)),n.push(e),a.apply(void 0,n)},e.exports.isPermissionKey=function(e){i.checkIsString(e);var t=e.split(r.SEP);return t.length>=3&&t[0]===r.VIRTRU&&"admin"===t[2]},e.exports.isPermissionKeyOfType=function(e,t){i.checkIsString(e),i.checkIsString(t);var n=e.split(r.SEP);return n.length>=3&&n[0]===r.VIRTRU&&"admin"===n[2]&&n[n.length-1]===t},e.exports.getUnitIdFromPermissionKey=function(e,t){i.checkIsString(e),i.checkIsString(t);var n=e.split(r.SEP);if(n.length>=3&&n[0]===r.VIRTRU&&"admin"===n[2]&&n[n.length-1]===t)return n[n.length-2]}},function(e,t,n){"use strict";(function(t,r){var i=65536,o=4294967295;var a=n(2).Buffer,s=t.crypto||t.msCrypto;s&&s.getRandomValues?e.exports=function(e,t){if(e>o)throw new RangeError("requested too many random bytes");var n=a.allocUnsafe(e);if(e>0)if(e>i)for(var u=0;u<e;u+=i)s.getRandomValues(n.slice(u,u+i));else s.getRandomValues(n);if("function"==typeof t)return r.nextTick(function(){t(null,n)});return n}:e.exports=function(){throw new Error("Secure random number generation is not supported by this browser.\nUse Chrome, Firefox or Internet Explorer 11")}}).call(this,n(4),n(8))},function(e,t,n){var r=n(2).Buffer;function i(e,t){this._block=r.alloc(e),this._finalSize=t,this._blockSize=e,this._len=0}i.prototype.update=function(e,t){"string"==typeof e&&(t=t||"utf8",e=r.from(e,t));for(var n=this._block,i=this._blockSize,o=e.length,a=this._len,s=0;s<o;){for(var u=a%i,c=Math.min(o-s,i-u),d=0;d<c;d++)n[u+d]=e[s+d];s+=c,(a+=c)%i==0&&this._update(n)}return this._len+=o,this},i.prototype.digest=function(e){var t=this._len%this._blockSize;this._block[t]=128,this._block.fill(0,t+1),t>=this._finalSize&&(this._update(this._block),this._block.fill(0));var n=8*this._len;if(n<=4294967295)this._block.writeUInt32BE(n,this._blockSize-4);else{var r=(4294967295&n)>>>0,i=(n-r)/4294967296;this._block.writeUInt32BE(i,this._blockSize-8),this._block.writeUInt32BE(r,this._blockSize-4)}this._update(this._block);var o=this._hash();return e?o.toString(e):o},i.prototype._update=function(){throw new Error("_update must be implemented by subclass")},e.exports=i},function(e,t,n){"use strict";
/*
* Underscore.string
* (c) 2010 Esa-Matti Suuronen <esa-matti aet suuronen dot org>
* Underscore.string is freely distributable under the terms of the MIT license.
* Documentation: https://github.com/epeli/underscore.string
* Some code is borrowed from MooTools and Alexandru Marasteanu.
* Version '3.3.4'
* @preserve
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */
a=function(e){var t=Object.prototype.toString,n=Array.isArray||function(e){return"[object Array]"===t.call(e)};function r(e){return"function"==typeof e}function i(e){return e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&")}function o(e,t){return null!=e&&"object"==typeof e&&t in e}var a=RegExp.prototype.test,s=/\S/;function u(e){return!function(e,t){return a.call(e,t)}(s,e)}var c={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60;","=":"&#x3D;"},d=/\s*/,l=/\s+/,f=/\s*=/,p=/\s*\}/,h=/#|\^|\/|>|\{|&|=|!/;function m(e){this.string=e,this.tail=e,this.pos=0}function _(e,t){this.view=e,this.cache={".":this.view},this.parent=t}function v(){this.cache={}}m.prototype.eos=function(){return""===this.tail},m.prototype.scan=function(e){var t=this.tail.match(e);if(!t||0!==t.index)return"";var n=t[0];return this.tail=this.tail.substring(n.length),this.pos+=n.length,n},m.prototype.scanUntil=function(e){var t,n=this.tail.search(e);switch(n){case-1:t=this.tail,this.tail="";break;case 0:t="";break;default:t=this.tail.substring(0,n),this.tail=this.tail.substring(n)}return this.pos+=t.length,t},_.prototype.push=function(e){return new _(e,this)},_.prototype.lookup=function(e){var t,n=this.cache;if(n.hasOwnProperty(e))t=n[e];else{for(var i,a,s=this,u=!1;s;){if(e.indexOf(".")>0)for(t=s.view,i=e.split("."),a=0;null!=t&&a<i.length;)a===i.length-1&&(u=o(t,i[a])),t=t[i[a++]];else t=s.view[e],u=o(s.view,e);if(u)break;s=s.parent}n[e]=t}return r(t)&&(t=t.call(this.view)),t},v.prototype.clearCache=function(){this.cache={}},v.prototype.parse=function(t,r){var o=this.cache,a=o[t];return null==a&&(a=o[t]=function(t,r){if(!t)return[];var o,a,s,c=[],_=[],v=[],y=!1,g=!1;function b(){if(y&&!g)for(;v.length;)delete _[v.pop()];else v=[];y=!1,g=!1}function w(e){if("string"==typeof e&&(e=e.split(l,2)),!n(e)||2!==e.length)throw new Error("Invalid tags: "+e);o=new RegExp(i(e[0])+"\\s*"),a=new RegExp("\\s*"+i(e[1])),s=new RegExp("\\s*"+i("}"+e[1]))}w(r||e.tags);for(var M,k,x,S,L,A,E=new m(t);!E.eos();){if(M=E.pos,x=E.scanUntil(o))for(var T=0,D=x.length;T<D;++T)u(S=x.charAt(T))?v.push(_.length):g=!0,_.push(["text",S,M,M+1]),M+=1,"\n"===S&&b();if(!E.scan(o))break;if(y=!0,k=E.scan(h)||"name",E.scan(d),"="===k?(x=E.scanUntil(f),E.scan(f),E.scanUntil(a)):"{"===k?(x=E.scanUntil(s),E.scan(p),E.scanUntil(a),k="&"):x=E.scanUntil(a),!E.scan(a))throw new Error("Unclosed tag at "+E.pos);if(L=[k,x,M,E.pos],_.push(L),"#"===k||"^"===k)c.push(L);else if("/"===k){if(!(A=c.pop()))throw new Error('Unopened section "'+x+'" at '+M);if(A[1]!==x)throw new Error('Unclosed section "'+A[1]+'" at '+M)}else"name"===k||"{"===k||"&"===k?g=!0:"="===k&&w(x)}if(A=c.pop())throw new Error('Unclosed section "'+A[1]+'" at '+E.pos);return function(e){for(var t,n=[],r=n,i=[],o=0,a=e.length;o<a;++o)switch((t=e[o])[0]){case"#":case"^":r.push(t),i.push(t),r=t[4]=[];break;case"/":i.pop()[5]=t[2],r=i.length>0?i[i.length-1][4]:n;break;default:r.push(t)}return n}(function(e){for(var t,n,r=[],i=0,o=e.length;i<o;++i)(t=e[i])&&("text"===t[0]&&n&&"text"===n[0]?(n[1]+=t[1],n[3]=t[3]):(r.push(t),n=t));return r}(_))}(t,r)),a},v.prototype.render=function(e,t,n){var r=this.parse(e),i=t instanceof _?t:new _(t);return this.renderTokens(r,i,n,e)},v.prototype.renderTokens=function(e,t,n,r){for(var i,o,a,s="",u=0,c=e.length;u<c;++u)a=void 0,"#"===(o=(i=e[u])[0])?a=this.renderSection(i,t,n,r):"^"===o?a=this.renderInverted(i,t,n,r):">"===o?a=this.renderPartial(i,t,n,r):"&"===o?a=this.unescapedValue(i,t):"name"===o?a=this.escapedValue(i,t):"text"===o&&(a=this.rawValue(i)),void 0!==a&&(s+=a);return s},v.prototype.renderSection=function(e,t,i,o){var a=this,s="",u=t.lookup(e[1]);if(u){if(n(u))for(var c=0,d=u.length;c<d;++c)s+=this.renderTokens(e[4],t.push(u[c]),i,o);else if("object"==typeof u||"string"==typeof u||"number"==typeof u)s+=this.renderTokens(e[4],t.push(u),i,o);else if(r(u)){if("string"!=typeof o)throw new Error("Cannot use higher-order sections without the original template");null!=(u=u.call(t.view,o.slice(e[3],e[5]),function(e){return a.render(e,t,i)}))&&(s+=u)}else s+=this.renderTokens(e[4],t,i,o);return s}},v.prototype.renderInverted=function(e,t,r,i){var o=t.lookup(e[1]);if(!o||n(o)&&0===o.length)return this.renderTokens(e[4],t,r,i)},v.prototype.renderPartial=function(e,t,n){if(n){var i=r(n)?n(e[1]):n[e[1]];return null!=i?this.renderTokens(this.parse(i),t,n,i):void 0}},v.prototype.unescapedValue=function(e,t){var n=t.lookup(e[1]);if(null!=n)return n},v.prototype.escapedValue=function(t,n){var r=n.lookup(t[1]);if(null!=r)return e.escape(r)},v.prototype.rawValue=function(e){return e[1]},e.name="mustache.js",e.version="2.3.2",e.tags=["{{","}}"];var y=new v;return e.clearCache=function(){return y.clearCache()},e.parse=function(e,t){return y.parse(e,t)},e.render=function(e,t,r){if("string"!=typeof e)throw new TypeError('Invalid template! Template should be a "string" but "'+(n(i=e)?"array":typeof i)+'" was given as the first argument for mustache#render(template, view, partials)');var i;return y.render(e,t,r)},e.to_html=function(t,n,i,o){var a=e.render(t,n,i);if(!r(o))return a;o(a)},e.escape=function(e){return String(e).replace(/[&<>"'`=\/]/g,function(e){return c[e]})},e.Scanner=m,e.Context=_,e.Writer=v,e},t&&"string"!=typeof t.nodeName?a(t):(i=[t],void 0===(o="function"==typeof(r=a)?r.apply(t,i):r)||(e.exports=o))},function(e,t,n){var r=n(320),i=n(28),o=n(321),a=n(588),s=n(11),u=s.handleError,c=s.toStr;function d(){this.rootLogger=new a(a.rootLoggerName,this),this.rootLogger.setLevel(l),this.loggers={},this.loggerNames=[],this.applicationStartDate=new Date,this.enabled=!0,this.showStackTraces=!1,this.useTimeStampsInMilliseconds=!0,this.uniqueId="log4javascript_"+this.applicationStartDate.getTime()+"_"+Math.floor(1e8*Math.random())}d.prototype=new o,d.prototype.version="1.4.6",d.prototype.edition="log4javascript";var l=i.DEBUG;d.prototype.getRootLogger=function(){return this.rootLogger},d.prototype.getLogger=function(e){if("string"!=typeof e&&(e=a.anonymousLoggerName,r.warn("log4javascript.getLogger: non-string logger name "+c(e)+" supplied, returning anonymous logger")),e==a.rootLoggerName&&u("log4javascript.getLogger: root logger may not be obtained by name"),!this.loggers[e]){var t=new a(e,this);this.loggers[e]=t,this.loggerNames.push(e);var n,i=e.lastIndexOf(".");if(i>-1){var o=e.substring(0,i);n=this.getLogger(o)}else n=this.rootLogger;n.addChild(t)}return this.loggers[e]};var f=null;d.prototype.getDefaultLogger=function(){if(!f){f=this.getLogger(a.defaultLoggerName);var e=new this.BrowserConsoleAppender(this);f.addAppender(e)}return f};var p=null;d.prototype.getNullLogger=function(){return p||(p=new a(a.nullLoggerName,this)).setLevel(i.OFF),p},d.prototype.resetConfiguration=function(){this.rootLogger.setLevel(l),this.loggers={}},e.exports=t=new d,t.setEventTypes(["load","error"]),d.prototype.setDocumentReady=function(){!0,t.dispatchEvent("load",{})};try{if(window)if(window.addEventListener)window.addEventListener("load",t.setDocumentReady,!1);else if(window.attachEvent)window.attachEvent("onload",t.setDocumentReady);else{var h=window.onload;"function"!=typeof window.onload?window.onload=t.setDocumentReady:window.onload=function(e){h&&h(e),t.setDocumentReady()}}}catch(e){}},function(e,t,n){var r=n(11),i=n(589),o=n(37),a=n(590),s=n(28),u=n(320);function c(e,t){this.name=e,this.parent=null,this.children=[],this.log4js=t;var n=[],d=null,l=this.name===c.rootLoggerName,f=this.name===c.nullLoggerName,p=null,h=!1;this.addChild=function(e){this.children.push(e),e.parent=this,e.invalidateAppenderCache()};var m=!0;this.getAdditivity=function(){return m},this.setAdditivity=function(e){var t=m!=e;m=e,t&&this.invalidateAppenderCache()},this.addAppender=function(e){f?r.handleError("Logger.addAppender: you may not add an appender to the null logger"):e instanceof o?r.array_contains(n,e)||(n.push(e),e.setAddedToLogger(this),this.invalidateAppenderCache()):r.handleError("Logger.addAppender: appender supplied ('"+r.toStr(e)+"') is not a subclass of Appender")},this.removeAppender=function(e){r.array_remove(n,e),e.setRemovedFromLogger(this),this.invalidateAppenderCache()},this.removeAllAppenders=function(){var e=n.length;if(e>0){for(var t=0;t<e;t++)n[t].setRemovedFromLogger(this);n.length=0,this.invalidateAppenderCache()}},this.getEffectiveAppenders=function(){if(null===p||h){var e=l||!this.getAdditivity()?[]:this.parent.getEffectiveAppenders();p=e.concat(n),h=!1}return p},this.invalidateAppenderCache=function(){h=!0;for(var e=0,t=this.children.length;e<t;e++)this.children[e].invalidateAppenderCache()},this.log=function(e,t){if(this.log4js.enabled&&e.isGreaterOrEqual(this.getEffectiveLevel())){var n,o=t.length-1,a=t[o];t.length>1&&r.isError(a)&&(n=a,o--);for(var s=[],u=0;u<=o;u++)s[u]=t[u];var c=new i(this,new Date,e,s,n);this.callAppenders(c)}},this.callAppenders=function(e){for(var t=this.getEffectiveAppenders(),n=0,r=t.length;n<r;n++)t[n].doAppend(e)},this.setLevel=function(e){l&&null===e?r.handleError("Logger.setLevel: you cannot set the level of the root logger to null"):e instanceof s?d=e:r.handleError("Logger.setLevel: level supplied to logger "+this.name+" is not an instance of log4javascript.Level")},this.getLevel=function(){return d},this.getEffectiveLevel=function(){for(var e=this;null!==e;e=e.parent){var t=e.getLevel();if(null!==t)return t}return null},this.group=function(e,t){if(this.log4js.enabled)for(var n=this.getEffectiveAppenders(),r=0,i=n.length;r<i;r++)n[r].group(e,t)},this.groupEnd=function(){if(this.log4js.enabled)for(var e=this.getEffectiveAppenders(),t=0,n=e.length;t<n;t++)e[t].groupEnd()};var _={};this.time=function(e,t){this.log4js.enabled&&(r.isUndefined(e)?r.handleError("Logger.time: a name for the timer must be supplied"):!t||t instanceof s?_[e]=new a(e,t):r.handleError("Logger.time: level supplied to timer "+e+" is not an instance of log4javascript.Level"))},this.timeEnd=function(e){if(this.log4js.enabled)if(r.isUndefined(e))r.handleError("Logger.timeEnd: a name for the timer must be supplied");else if(_[e]){var t=_[e],n=t.getElapsedTime();this.log(t.level,["Timer "+r.toStr(e)+" completed in "+n+"ms"]),delete _[e]}else u.warn("Logger.timeEnd: no timer found with name "+e)},this.assert=function(e){if(this.log4js.enabled&&!e){for(var t=[],n=1,i=arguments.length;n<i;n++)t.push(arguments[n]);(t=t.length>0?t:["Assertion Failure"]).push(r.newLine),t.push(e),this.log(s.ERROR,t)}},this.toString=function(){return"Logger["+this.name+"]"}}c.anonymousLoggerName="[anonymous]",c.defaultLoggerName="[default]",c.nullLoggerName="[null]",c.rootLoggerName="root",c.prototype={trace:function(){this.log(s.TRACE,arguments)},debug:function(){this.log(s.DEBUG,arguments)},info:function(){this.log(s.INFO,arguments)},warn:function(){this.log(s.WARN,arguments)},error:function(){this.log(s.ERROR,arguments)},fatal:function(){this.log(s.FATAL,arguments)},isEnabledFor:function(e){return e.isGreaterOrEqual(this.getEffectiveLevel())},isTraceEnabled:function(){return this.isEnabledFor(s.TRACE)},isDebugEnabled:function(){return this.isEnabledFor(s.DEBUG)},isInfoEnabled:function(){return this.isEnabledFor(s.INFO)},isWarnEnabled:function(){return this.isEnabledFor(s.WARN)},isErrorEnabled:function(){return this.isEnabledFor(s.ERROR)},isFatalEnabled:function(){return this.isEnabledFor(s.FATAL)}},c.prototype.trace.isEntryPoint=!0,c.prototype.debug.isEntryPoint=!0,c.prototype.info.isEntryPoint=!0,c.prototype.warn.isEntryPoint=!0,c.prototype.error.isEntryPoint=!0,c.prototype.fatal.isEntryPoint=!0,e.exports=c},function(e,t,n){var r=n(11),i=function(e,t,n,r,i){this.logger=e,this.timeStamp=t,this.timeStampInMilliseconds=t.getTime(),this.timeStampInSeconds=Math.floor(this.timeStampInMilliseconds/1e3),this.milliseconds=this.timeStamp.getMilliseconds(),this.level=n,this.messages=r,this.exception=i};i.prototype={getThrowableStrRep:function(){return this.exception?r.getExceptionStringRep(this.exception):""},getCombinedMessages:function(){return 1==this.messages.length?this.messages[0]:this.messages.join(r.newLine)},toString:function(){return"LoggingEvent["+this.level+"]"}},e.exports=i},function(e,t,n){var r=n(11),i=n(28);function o(e,t){this.name=e,this.level=r.isUndefined(t)?i.INFO:t,this.start=new Date}o.prototype.getElapsedTime=function(){return(new Date).getTime()-this.start.getTime()},e.exports=o},function(e,t,n){var r=n(324),i=n(37),o=(n(69),n(28),n(11));function a(e,t){this.log4js=e;var n=this,r=!0;t||(o.handleError("AjaxAppender: URL must be specified in constructor"),r=!1);var i=this.defaults.timed,a=this.defaults.waitForResponse,s=this.defaults.batchSize,c=this.defaults.timerInterval,d=this.defaults.requestSuccessCallback,l=this.defaults.failCallback,f=this.defaults.postVarName,p=this.defaults.sendAllOnUnload,h=this.defaults.contentType,m=null,_=[],v=[],y=[],g=!1,b=!1;function w(e){return!b||(o.handleError("AjaxAppender: configuration option '"+e+"' may not be set after the appender has been initialized"),!1)}function M(){var e;if(r&&this.log4js.enabled)if(g=!0,a)v.length>0?A(x(e=v.shift()),M):(g=!1,i&&S());else{for(;e=v.shift();)A(x(e));g=!1,i&&S()}}function k(){var e=!1;if(r&&this.log4js.enabled){for(var t,o=n.getLayout().allowBatching()?s:1,u=[];t=_.shift();)u.push(t),_.length>=o&&(v.push(u),u=[]);u.length>0&&v.push(u),e=v.length>0,a=!1,i=!1,M()}return e}function x(e){for(var t,r=[],i="";t=e.shift();){var a=n.getLayout().format(t);n.getLayout().ignoresThrowable()&&(a+=t.getThrowableStrRep()),r.push(a)}return i=1==e.length?r.join(""):n.getLayout().batchHeader+r.join(n.getLayout().batchSeparator)+n.getLayout().batchFooter,h==n.defaults.contentType&&((i=n.getLayout().returnsPostData?i:o.urlEncode(f)+"="+o.urlEncode(i)).length>0&&(i+="&"),i+="layout="+o.urlEncode(n.getLayout().toString())),i}function S(){setTimeout(M,c)}function L(){var e="AjaxAppender: could not create XMLHttpRequest object. AjaxAppender disabled";o.handleError(e),r=!1,l&&l(e)}function A(e,i){try{var a=u(L);if(r){a.overrideMimeType&&a.overrideMimeType(n.getLayout().getContentType()),a.onreadystatechange=function(){if(4==a.readyState){if(function(e){return o.isUndefined(e.status)||0===e.status||e.status>=200&&e.status<300||1223==e.status}(a))d&&d(a),i&&i(a);else{var e="AjaxAppender.append: XMLHttpRequest request to URL "+t+" returned status code "+a.status;o.handleError(e),l&&l(e)}a.onreadystatechange=o.emptyFunction,a=null}},a.open("POST",t,!0);try{for(var s,c=0;s=y[c++];)a.setRequestHeader(s.name,s.value);a.setRequestHeader("Content-Type",h)}catch(e){var f="AjaxAppender.append: your browser's XMLHttpRequest implementation does not support setRequestHeader, therefore cannot post data. AjaxAppender disabled";return o.handleError(f),r=!1,void(l&&l(f))}a.send(e)}}catch(e){var p="AjaxAppender.append: error sending log message to "+t;o.handleError(p,e),r=!1,l&&l(p+". Details: "+o.getExceptionStringRep(e))}}this.getSessionId=function(){return m},this.setSessionId=function(e){m=o.extractStringFromParam(e,null),this.layout.setCustomField("sessionid",m)},this.setLayout=function(e){w("layout")&&(this.layout=e,null!==m&&this.setSessionId(m))},this.isTimed=function(){return i},this.setTimed=function(e){w("timed")&&(i=o.bool(e))},this.getTimerInterval=function(){return c},this.setTimerInterval=function(e){w("timerInterval")&&(c=o.extractIntFromParam(e,c))},this.isWaitForResponse=function(){return a},this.setWaitForResponse=function(e){w("waitForResponse")&&(a=o.bool(e))},this.getBatchSize=function(){return s},this.setBatchSize=function(e){w("batchSize")&&(s=o.extractIntFromParam(e,s))},this.isSendAllOnUnload=function(){return p},this.setSendAllOnUnload=function(e){w("sendAllOnUnload")&&(p=o.extractBooleanFromParam(e,p))},this.setRequestSuccessCallback=function(e){d=o.extractFunctionFromParam(e,d)},this.setFailCallback=function(e){l=o.extractFunctionFromParam(e,l)},this.getPostVarName=function(){return f},this.setPostVarName=function(e){w("postVarName")&&(f=o.extractStringFromParam(e,f))},this.getHeaders=function(){return y},this.addHeader=function(e,t){"content-type"==e.toLowerCase()?h=t:y.push({name:e,value:t})},this.sendAll=M,this.sendAllRemaining=k,this.append=function(e){if(r){b||function(){if(b=!0,p)try{var e=window.onbeforeunload;window.onbeforeunload=function(){if(e&&e(),k())return"Sending log messages"}}catch(e){}i&&S()}(),_.push(e);var t=this.getLayout().allowBatching()?s:1;if(_.length>=t){for(var n,o=[];n=_.shift();)o.push(n);v.push(o),i||a&&(!a||g)||M()}}}}a.prototype=new i,a.prototype.defaults={waitForResponse:!1,timed:!1,timerInterval:1e3,batchSize:1,sendAllOnUnload:!1,requestSuccessCallback:null,failCallback:null,postVarName:"data",contentType:"application/x-www-form-urlencoded"},a.prototype.layout=new r,a.prototype.toString=function(){return"AjaxAppender"};var s=[function(){return new XMLHttpRequest},function(){return new ActiveXObject("Msxml2.XMLHTTP")},function(){return new ActiveXObject("Microsoft.XMLHTTP")}],u=function(e){for(var t,n=null,r=0,i=s.length;r<i;r++){t=s[r];try{return n=t(),u=t,n}catch(e){}}e?e():o.handleError("getXmlHttp: unable to obtain XMLHttpRequest object")};e.exports=a},function(e,t,n){var r=n(37),i=n(325);function o(e){this.log4js=e}o.prototype=new r,o.prototype.layout=new i,o.prototype.append=function(e){var t=this.getLayout().format(e);this.getLayout().ignoresThrowable()&&(t+=e.getThrowableStrRep()),alert(t)},o.prototype.toString=function(){return"AlertAppender"},e.exports=o},function(e,t,n){var r,i=n(37),o=n(69),a=n(28);try{r=window.console}catch(e){r=console}function s(e){this.log4js=e}s.prototype=new i,s.prototype.layout=new o,s.prototype.threshold=a.DEBUG,s.prototype.append=function(e){var t=this,n=function(){var n=t.getLayout(),r=n.format(e);return n.ignoresThrowable()&&e.exception&&(r+=e.getThrowableStrRep()),r}(),i=function(e){for(var t=[],n=0;n<e.length;n++)"object"==typeof e[n]&&t.push(e[n]);return t}(e.messages);i.splice(0,0,n);try{var o=null,s=(new Error).stack,u=s.indexOf(".Logger.");if(u>=0){var c=s.indexOf("\n",u),d=s.indexOf("(",c+1);o=s.substring(d,s.indexOf(")",d)+1)}else{var l=s.split("\n");l.length>=5&&(o=l[5])}if(o){var f=i[0];"string"==typeof f?i[0]=f.slice(0,-1)+" - "+o:i.push(o)}}catch(e){}"undefined"!=typeof opera&&opera.postError?opera.postError(n):r.debug&&a.DEBUG.isGreaterOrEqual(e.level)?void 0===r.debug.apply?Function.prototype.call.apply(r.debug,i):r.debug.apply(r,i):r.info&&a.INFO.equals(e.level)?void 0===r.info.apply?Function.prototype.call.apply(r.info,i):r.info.apply(r,i):r.warn&&a.WARN.equals(e.level)?void 0===r.warn.apply?Function.prototype.call.apply(r.warn,i):r.warn.apply(r,i):r.error&&e.level.isGreaterOrEqual(a.ERROR)?void 0===r.error.apply?Function.prototype.call.apply(r.error,i):r.error.apply(r,i):void 0===r.log.apply?Function.prototype.call.apply(r.log,i):r.log.apply(r,i)},s.prototype.group=function(e){r&&r.group&&r.group(e)},s.prototype.groupEnd=function(){r&&r.groupEnd&&r.groupEnd()},s.prototype.toString=function(){return"BrowserConsoleAppender"},e.exports=s},function(e,t,n){var r=n(37),i=n(69),o=n(28);function a(e){this.log4js=e,this.queue=[],e.inMemoryLogger=this}a.prototype=new r,a.prototype.layout=new i,a.prototype.threshold=o.DEBUG,a.prototype.append=function(e){var t,n,r=(t=this.getLayout(),n=t.format(e),t.ignoresThrowable()&&e.exception&&(n.exceptionInfo=e.getThrowableStrRep()),n);this.queue.push(r)},a.prototype.toString=function(){return"InMemoryQueueAppender"},a.prototype.dumpToConsole=function(e){for(var t=e=null!=e&&e>0&&e<this.queue.length?this.queue.length-e:0;t<this.queue.length;t++){var n=this.queue[t],r=n.level;try{"TRACE"===r||"DEBUG"===r?n.message?console.debug(n.message,n):console.debug(n):"INFO"===r?n.message?console.info(n.message,n):console.info(n):"WARN"===r?n.message?console.info(n.message,n):console.info(n):"ERROR"===r||"ERROR"===r?n.message?console.error(n.message,n):console.error(n):console.log(n)}catch(e){}}},a.prototype.dumpToText=function(e){for(var t=[],n=e=null!=e&&e>0&&e<this.queue.length?this.queue.length-e:0;n<this.queue.length;n++){var r=this.queue[n],i=r.level;try{r.message&&t.push(i+" : "+r.message),t.push(i+" : "+JSON.stringify(r,null,"  "))}catch(e){}}return t.join("\n")},e.exports=a},function(e,t,n){var r=n(25),i=n(11),o=i.newLine;function a(e,t,n){this.log4js=e,this.readable=i.extractBooleanFromParam(t,!1),this.combineMessages=i.extractBooleanFromParam(n,!0),this.batchHeader=this.readable?"["+o:"[",this.batchFooter=this.readable?"]"+o:"]",this.batchSeparator=this.readable?","+o:",",this.setKeys(),this.colon=this.readable?": ":":",this.tab=this.readable?"\t":"",this.lineBreak=this.readable?o:"",this.customFields=[]}a.prototype=new r,a.prototype.isReadable=function(){return this.readable},a.prototype.isCombinedMessages=function(){return this.combineMessages},a.prototype.format=function(e){var t,n,r=this,o=this.getDataValues(e,this.combineMessages),a="{"+this.lineBreak;function s(e,t,n){var o,a=typeof e;if(e instanceof Date)o=String(e.getTime());else if(n&&e instanceof Array){o="["+r.lineBreak;for(var u=0,c=e.length;u<c;u++){var d=t+r.tab;o+=d+s(e[u],d,!1),u<e.length-1&&(o+=","),o+=r.lineBreak}o+=t+"]"}else o="number"!==a&&"boolean"!==a?'"'+i.toStr(e).replace(/\"/g,'\\"').replace(/\r\n|\r|\n/g,"\\r\\n")+'"':e;return o}for(t=0,n=o.length-1;t<=n;t++)a+=this.tab+'"'+o[t][0]+'"'+this.colon+s(o[t][1],this.tab,!0),t<n&&(a+=","),a+=this.lineBreak;return a+="}"+this.lineBreak},a.prototype.ignoresThrowable=function(){return!1},a.prototype.toString=function(){return"JsonLayout"},a.prototype.getContentType=function(){return"application/json"},e.exports=a},function(e,t,n){var r=n(25);n(11).newLine;function i(e,t,n){this.log4js=e,this.customFields=[],this.setKeys()}i.prototype=new r,i.prototype.format=function(e){for(var t=this.getDataValues(e,this.combineMessages),n={},r=0;r<t.length;r++){var i=t[r][0];if("message"===i){var o=t[r][1];1===o.length?n[i]=o[0]:n[i]=o}else n[i]=t[r][1]}return e.exception&&(n.exception=e.exception),n.timestamp=e.timestamp,n},i.prototype.ignoresThrowable=function(){return!0},i.prototype.toString=function(){return"InMemoryObjectLayout"},i.prototype.getContentType=function(){return"application/json"},e.exports=i},function(e,t,n){var r=n(25),i=n(11),o=i.newLine;function a(e,t){this.log4js=e,this.combineMessages=i.extractBooleanFromParam(t,!0),this.customFields=[]}a.prototype=new r,a.prototype.isCombinedMessages=function(){return this.combineMessages},a.prototype.getContentType=function(){return"text/xml"},a.prototype.escapeCdata=function(e){return e.replace(/\]\]>/,"]]>]]&gt;<![CDATA[")},a.prototype.format=function(e){var t,n,r=this;function a(e){return e="string"==typeof e?e:i.toStr(e),"<log4javascript:message><![CDATA["+r.escapeCdata(e)+"]]></log4javascript:message>"}var s='<log4javascript:event logger="'+e.logger.name+'" timestamp="'+this.getTimeStampValue(e)+'"';if(this.log4js.useTimeStampsInMilliseconds||(s+=' milliseconds="'+e.milliseconds+'"'),s+=' level="'+e.level.name+'">'+o,this.combineMessages)s+=a(e.getCombinedMessages());else{for(s+="<log4javascript:messages>"+o,t=0,n=e.messages.length;t<n;t++)s+=a(e.messages[t])+o;s+="</log4javascript:messages>"+o}if(this.hasCustomFields())for(t=0,n=this.customFields.length;t<n;t++)s+='<log4javascript:customfield name="'+this.customFields[t].name+'"><![CDATA['+this.customFields[t].value.toString()+"]]></log4javascript:customfield>"+o;return e.exception&&(s+="<log4javascript:exception><![CDATA["+i.getExceptionStringRep(e.exception)+"]]></log4javascript:exception>"+o),s+="</log4javascript:event>"+o+o},a.prototype.ignoresThrowable=function(){return!1},a.prototype.toString=function(){return"XmlLayout"},e.exports=a},function(e,t,n){"use strict";var r=n(327);function i(e){if(e)return function(e){for(var t in i.prototype)e[t]=i.prototype[t];return e}(e)}e.exports=i,i.prototype.clearTimeout=function(){return clearTimeout(this._timer),clearTimeout(this._responseTimeoutTimer),delete this._timer,delete this._responseTimeoutTimer,this},i.prototype.parse=function(e){return this._parser=e,this},i.prototype.responseType=function(e){return this._responseType=e,this},i.prototype.serialize=function(e){return this._serializer=e,this},i.prototype.timeout=function(e){if(!e||"object"!=typeof e)return this._timeout=e,this._responseTimeout=0,this;for(var t in e)switch(t){case"deadline":this._timeout=e.deadline;break;case"response":this._responseTimeout=e.response;break;default:console.warn("Unknown timeout option",t)}return this},i.prototype.retry=function(e,t){return 0!==arguments.length&&!0!==e||(e=1),e<=0&&(e=0),this._maxRetries=e,this._retries=0,this._retryCallback=t,this};var o=["ECONNRESET","ETIMEDOUT","EADDRINFO","ESOCKETTIMEDOUT"];i.prototype._shouldRetry=function(e,t){if(!this._maxRetries||this._retries++>=this._maxRetries)return!1;if(this._retryCallback)try{var n=this._retryCallback(e,t);if(!0===n)return!0;if(!1===n)return!1}catch(e){console.error(e)}if(t&&t.status&&t.status>=500&&501!=t.status)return!0;if(e){if(e.code&&~o.indexOf(e.code))return!0;if(e.timeout&&"ECONNABORTED"==e.code)return!0;if(e.crossDomain)return!0}return!1},i.prototype._retry=function(){return this.clearTimeout(),this.req&&(this.req=null,this.req=this.request()),this._aborted=!1,this.timedout=!1,this._end()},i.prototype.then=function(e,t){if(!this._fullfilledPromise){var n=this;this._endCalled&&console.warn("Warning: superagent request was sent twice, because both .end() and .then() were called. Never call .end() if you use promises"),this._fullfilledPromise=new Promise(function(e,t){n.end(function(n,r){n?t(n):e(r)})})}return this._fullfilledPromise.then(e,t)},i.prototype.catch=function(e){return this.then(void 0,e)},i.prototype.use=function(e){return e(this),this},i.prototype.ok=function(e){if("function"!=typeof e)throw Error("Callback required");return this._okCallback=e,this},i.prototype._isResponseOK=function(e){return!!e&&(this._okCallback?this._okCallback(e):e.status>=200&&e.status<300)},i.prototype.get=function(e){return this._header[e.toLowerCase()]},i.prototype.getHeader=i.prototype.get,i.prototype.set=function(e,t){if(r(e)){for(var n in e)this.set(n,e[n]);return this}return this._header[e.toLowerCase()]=t,this.header[e]=t,this},i.prototype.unset=function(e){return delete this._header[e.toLowerCase()],delete this.header[e],this},i.prototype.field=function(e,t){if(null==e)throw new Error(".field(name, val) name can not be empty");if(this._data&&console.error(".field() can't be used if .send() is used. Please use only .send() or only .field() & .attach()"),r(e)){for(var n in e)this.field(n,e[n]);return this}if(Array.isArray(t)){for(var i in t)this.field(e,t[i]);return this}if(null==t)throw new Error(".field(name, val) val can not be empty");return"boolean"==typeof t&&(t=""+t),this._getFormData().append(e,t),this},i.prototype.abort=function(){return this._aborted?this:(this._aborted=!0,this.xhr&&this.xhr.abort(),this.req&&this.req.abort(),this.clearTimeout(),this.emit("abort"),this)},i.prototype._auth=function(e,t,n,r){switch(n.type){case"basic":this.set("Authorization","Basic "+r(e+":"+t));break;case"auto":this.username=e,this.password=t;break;case"bearer":this.set("Authorization","Bearer "+e)}return this},i.prototype.withCredentials=function(e){return null==e&&(e=!0),this._withCredentials=e,this},i.prototype.redirects=function(e){return this._maxRedirects=e,this},i.prototype.maxResponseSize=function(e){if("number"!=typeof e)throw TypeError("Invalid argument");return this._maxResponseSize=e,this},i.prototype.toJSON=function(){return{method:this.method,url:this.url,data:this._data,headers:this._header}},i.prototype.send=function(e){var t=r(e),n=this._header["content-type"];if(this._formData&&console.error(".send() can't be used if .attach() or .field() is used. Please use only .send() or only .field() & .attach()"),t&&!this._data)Array.isArray(e)?this._data=[]:this._isHost(e)||(this._data={});else if(e&&this._data&&this._isHost(this._data))throw Error("Can't merge these send calls");if(t&&r(this._data))for(var i in e)this._data[i]=e[i];else"string"==typeof e?(n||this.type("form"),n=this._header["content-type"],this._data="application/x-www-form-urlencoded"==n?this._data?this._data+"&"+e:e:(this._data||"")+e):this._data=e;return!t||this._isHost(e)?this:(n||this.type("json"),this)},i.prototype.sortQuery=function(e){return this._sort=void 0===e||e,this},i.prototype._finalizeQueryString=function(){var e=this._query.join("&");if(e&&(this.url+=(this.url.indexOf("?")>=0?"&":"?")+e),this._query.length=0,this._sort){var t=this.url.indexOf("?");if(t>=0){var n=this.url.substring(t+1).split("&");"function"==typeof this._sort?n.sort(this._sort):n.sort(),this.url=this.url.substring(0,t)+"?"+n.join("&")}}},i.prototype._appendQueryString=function(){console.trace("Unsupported")},i.prototype._timeoutError=function(e,t,n){if(!this._aborted){var r=new Error(e+t+"ms exceeded");r.timeout=t,r.code="ECONNABORTED",r.errno=n,this.timedout=!0,this.abort(),this.callback(r)}},i.prototype._setTimeouts=function(){var e=this;this._timeout&&!this._timer&&(this._timer=setTimeout(function(){e._timeoutError("Timeout of ",e._timeout,"ETIME")},this._timeout)),this._responseTimeout&&!this._responseTimeoutTimer&&(this._responseTimeoutTimer=setTimeout(function(){e._timeoutError("Response timeout of ",e._responseTimeout,"ETIMEDOUT")},this._responseTimeout))}},function(e,t,n){"use strict";var r=n(600);function i(e){if(e)return function(e){for(var t in i.prototype)e[t]=i.prototype[t];return e}(e)}e.exports=i,i.prototype.get=function(e){return this.header[e.toLowerCase()]},i.prototype._setHeaderProperties=function(e){var t=e["content-type"]||"";this.type=r.type(t);var n=r.params(t);for(var i in n)this[i]=n[i];this.links={};try{e.link&&(this.links=r.parseLinks(e.link))}catch(e){}},i.prototype._setStatusProperties=function(e){var t=e/100|0;this.status=this.statusCode=e,this.statusType=t,this.info=1==t,this.ok=2==t,this.redirect=3==t,this.clientError=4==t,this.serverError=5==t,this.error=(4==t||5==t)&&this.toError(),this.created=201==e,this.accepted=202==e,this.noContent=204==e,this.badRequest=400==e,this.unauthorized=401==e,this.notAcceptable=406==e,this.forbidden=403==e,this.notFound=404==e,this.unprocessableEntity=422==e}},function(e,t,n){"use strict";t.type=function(e){return e.split(/ *; */).shift()},t.params=function(e){return e.split(/ *; */).reduce(function(e,t){var n=t.split(/ *= */),r=n.shift(),i=n.shift();return r&&i&&(e[r]=i),e},{})},t.parseLinks=function(e){return e.split(/ *, */).reduce(function(e,t){var n=t.split(/ *; */),r=n[0].slice(1,-1);return e[n[1].split(/ *= */)[1].slice(1,-1)]=r,e},{})},t.cleanHeader=function(e,t){return delete e["content-type"],delete e["content-length"],delete e["transfer-encoding"],delete e.host,t&&(delete e.authorization,delete e.cookie),e}},function(e,t){function n(){this._defaults=[]}["use","on","once","set","query","type","accept","auth","withCredentials","sortQuery","retry","ok","redirects","timeout","buffer","serialize","parse","ca","key","pfx","cert"].forEach(function(e){n.prototype[e]=function(){return this._defaults.push({fn:e,arguments:arguments}),this}}),n.prototype._setDefaults=function(e){this._defaults.forEach(function(t){e[t.fn].apply(e,t.arguments)})},e.exports=n},function(e,t){},function(e,t,n){(function(e){function n(e,t){for(var n=0,r=e.length-1;r>=0;r--){var i=e[r];"."===i?e.splice(r,1):".."===i?(e.splice(r,1),n++):n&&(e.splice(r,1),n--)}if(t)for(;n--;n)e.unshift("..");return e}var r=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/,i=function(e){return r.exec(e).slice(1)};function o(e,t){if(e.filter)return e.filter(t);for(var n=[],r=0;r<e.length;r++)t(e[r],r,e)&&n.push(e[r]);return n}t.resolve=function(){for(var t="",r=!1,i=arguments.length-1;i>=-1&&!r;i--){var a=i>=0?arguments[i]:e.cwd();if("string"!=typeof a)throw new TypeError("Arguments to path.resolve must be strings");a&&(t=a+"/"+t,r="/"===a.charAt(0))}return(r?"/":"")+(t=n(o(t.split("/"),function(e){return!!e}),!r).join("/"))||"."},t.normalize=function(e){var r=t.isAbsolute(e),i="/"===a(e,-1);return(e=n(o(e.split("/"),function(e){return!!e}),!r).join("/"))||r||(e="."),e&&i&&(e+="/"),(r?"/":"")+e},t.isAbsolute=function(e){return"/"===e.charAt(0)},t.join=function(){var e=Array.prototype.slice.call(arguments,0);return t.normalize(o(e,function(e,t){if("string"!=typeof e)throw new TypeError("Arguments to path.join must be strings");return e}).join("/"))},t.relative=function(e,n){function r(e){for(var t=0;t<e.length&&""===e[t];t++);for(var n=e.length-1;n>=0&&""===e[n];n--);return t>n?[]:e.slice(t,n-t+1)}e=t.resolve(e).substr(1),n=t.resolve(n).substr(1);for(var i=r(e.split("/")),o=r(n.split("/")),a=Math.min(i.length,o.length),s=a,u=0;u<a;u++)if(i[u]!==o[u]){s=u;break}var c=[];for(u=s;u<i.length;u++)c.push("..");return(c=c.concat(o.slice(s))).join("/")},t.sep="/",t.delimiter=":",t.dirname=function(e){var t=i(e),n=t[0],r=t[1];return n||r?(r&&(r=r.substr(0,r.length-1)),n+r):"."},t.basename=function(e,t){var n=i(e)[2];return t&&n.substr(-1*t.length)===t&&(n=n.substr(0,n.length-t.length)),n},t.extname=function(e){return i(e)[3]};var a="b"==="ab".substr(-1)?function(e,t,n){return e.substr(t,n)}:function(e,t,n){return t<0&&(t=e.length+t),e.substr(t,n)}}).call(this,n(8))},function(e,t){e.exports='<div>\n  {{>template}}\n  <div style="font-size: 0em; display: none; visibility: hidden; overflow: hidden;">\n    <pre>Virtru Secure Email: v1.4.0</pre>\n    <pre>Message ID: {{ messageUUID }}</pre>\n    <pre>Virtru Metadata: {{ metadata }}</pre>\n    {{#searchTokens}}\n    <pre>\n      --- START VIRTRU SEARCH TOKENS ---\n      {{ searchTokens }}\n      --- END VIRTRU SEARCH TOKENS ---\n    </pre>\n    {{/searchTokens}}\n  </div>\n  <div style="font-size: 0em; display: none; visibility: hidden; overflow: hidden;">\n        <pre> --- START PROTECTED MESSAGE TDF {{ messageId }} --- {{ secureMessage }} --- END PROTECTED MESSAGE --- </pre>\n    {{#previousMessages}}\n        <pre> {{.}} </pre>\n    {{/previousMessages}}\n  </div>\n</div>\n'},function(e,t){e.exports='<div class="virtru-invitation campaign-id-barebones template-id-barebones-1-0-2" style="-webkit-font-smoothing: antialiased;width:100%;-webkit-text-size-adjust:none;">\n  <table width="100%" align="left" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="display: block; padding-bottom: 100px;">\n    <tr>\n      <td>\n\n        <table width="100%" align="left" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" class="wrapper" style="font-family: Helvetica, Arial, sans-serif;">\n\n          <tr>\n            <td style="padding-top: 15px; font-family: Helvetica, Arial, sans-serif; line-height: 23px;">\n              {{#welcomeMessage}}{{{.}}}{{/welcomeMessage}}{{^welcomeMessage}}\n              I use Virtru to send and receive encrypted email. Click the "unlock message" button below to decrypt and read my message. If you have any questions, please contact me.\n              {{/welcomeMessage}}\n            </td>\n          </tr>\n          <tr>\n            <td valign="middle" style="padding-top: 15px;">\n\n              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #4585ff; border-radius: 2px; -webkit-border-radius: 2px; -moz-border-radius: 2px;">\n                <tr>\n\n                  <td align="center" color="#4585ff" style="color:#FFFFFF; font-family:Helvetica, Arial, sans-serif; font-size:18px; font-weight: lighter;">\n                    <a {{#rcaLink}}href="{{.}}"{{/rcaLink}} {{#microTdfLink}}href="{{.}}"{{/microTdfLink}} target="_blank" style="color:#FFFFFF; font-family:Helvetica, Arial, sans-serif; font-size:22px; font-weight: lighter; text-decoration: none; display: inline-block; border-radius: 2px; -webkit-border-radius: 2px; -moz-border-radius: 2px; padding-top:15px; padding-right:18px; padding-bottom:15px; padding-left:18px; border: 1px solid #4585ff; ">\n                      <img src="https://apps.virtru.com/files/blue_lock.png" height="18" width="30" border="0" style="display: inline;  border-style: none; vertical-align: middle;">\n                                            Unlock Message\n                    </a>\n\n                  </td>\n                </tr>\n              </table>\n\n            </td>\n          </tr>\n          <tr>\n            <td align="left" valign="middle" style="color: #b7b7b7; font-family: Helvetica, Arial, sans-serif; padding-top: 15px; line-height: 23px;">\n              <img src="https://apps.virtru.com/files/virtru_logo_lightgrey.png" height="14" width="20" border="0" alt="virtru" style="display: inline-block;  vertical-align: middle;">\n                            Virtru encrypts emails to keep private information safe. Learn more at <a href="https://www.virtru.com" style="color: #b7b7b7; font-family: Helvetica, Arial, sans-serif; text-decoration: underline;">Virtru.com</a>.\n\n            </td>\n          </tr>\n\n        </table>\n\n      </td>\n    </tr>\n  </table>\n\n  <style>\n\n    table {border-collapse:separate; float: none;}\n    a, a:link, a:visited {text-decoration: none; color: #00788a}\n    a:hover {text-decoration: underline;}\n    h2,h2 a,h2 a:visited,h3,h3 a,h3 a:visited,h4,h5,h6,.t_cht {color:#000 !important}\n    .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td {line-height: 100%}\n\n    table[class="wrapper"] {\n      font-family: Helvetica, Arial, sans-serif !important;\n      line-height: 22px !important;\n      width: 600px !important;\n      max-width: 600px !important;\n      }\n    img {display: block;}\n\n\n    @media screen and (max-width: 481px) {\n\n    }\n\n\n    @media screen and (max-width: 599px) {\n        table[class="wrapper"]{\n            font-family: Helvetica, Arial, sans-serif !important;\n        line-height: 22px !important;\n\n        width:100% !important;\n        }\n    }\n\n  </style>\n\n</div>\n'},function(e,t){e.exports='<div class="virtru-attachment" id="{{tdoid}}" data-size="{{filesize}}" data-name="{{filename}}" data-tdo-id="{{tdoid}}" data-policy-uuid="{{policyuuid}}" style="position: relative; width: 396px; height: 30px; line-height: 30px; border: 1px solid #dcdcdc; background-color: #F5F5F5; z-index: 1; -webkit-border-radius: 1px; -moz-border-radius: 1px; border-radius: 1px; -webkit-touch-callout: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; -o-user-select: none; user-select: none;">\n  <div class="virtru-attachment-content" style="height: 30px; width: 100%; overflow: hidden; white-space: nowrap; -webkit-touch-callout: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; -o-user-select: none; user-select: none;">\n    <div class="virtru-attachment-icons" style="display: inline-block; margin-left: 8px; margin-right: 3px; float: left; cursor: default;">\n      <div class="virtru-attachment-shield" style="display: inline-block; vertical-align: middle; margin-top: -1px; width: 16px; height: 16px; background-image: url(\'{{iconImage}}\');"></div>\n    </div>\n    <a href="{{rcaLink}}" class="virtru-attachment-link" id={{tdoid}} style="text-decoration: none; font-size: 0; font-family: Arial, Helvetica, sans-serif; font-weight: bold; float: left;">\n      <span class="virtru-attachment-file-name" style="font-size: 13px; color: #1155CC; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; float: left; margin-left: 5px;">{{filename}}</span>\n      <span class="virtru-attachment-tdf-extension" style="font-size: 13px; color: #47ccc7;">.tdf</span>\n      <span class="virtru-attachment-file-size" style="margin-left: 5px; font-size: 13px; color: #808080;">({{filesize}})</span>\n    </a>\n    <div class="virtru-attachment-delete" style="display: block; position: absolute; top: 4px; right: 2px; width: 21px; height: 21px; opacity: 0; background-image: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyFpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDIxIDc5LjE1NDkxMSwgMjAxMy8xMC8yOS0xMTo0NzoxNiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDoxQjRCMzFGMEZDQjMxMUUzOTI4NzgyODdDREYyMDk2MCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDoxQjRCMzFGMUZDQjMxMUUzOTI4NzgyODdDREYyMDk2MCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjFCNEIzMUVFRkNCMzExRTM5Mjg3ODI4N0NERjIwOTYwIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjFCNEIzMUVGRkNCMzExRTM5Mjg3ODI4N0NERjIwOTYwIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+sNsBywAAAIFJREFUeNpi/P//PwO1ARMDDcCooXQ0lJGREYQzgFgUyoZhUag4blNBSQobBoIckDQQXwFiUahyUSgfJJ6DUy8eQ8WQDADRGmh8MXIMRXfZD3SXk2soA9SFP5AM1iAYdPR2qSiBMBUlx1CaxD4IZCAZiBwkGfi8zzha9I1gQwECDADtzkhyEeGqBgAAAABJRU5ErkJggg==\');"></div>\n  </div>\n  <div class="virtru-attachment-progress-bar" style="height: 2px; opacity: 0.7; width: 0; overflow: hidden; white-space: nowrap; background-color: #1155CC;"></div>\n</div><br>\n'},function(e,t){e.exports='<div>\n  <input name="virtru-secure-draft" type="hidden"/>\n  <div>This is a draft secured by Virtru</div>\n  <div style="font-size:0em">\n    --- START PROTECTED MESSAGE TDF 0 ---\n    {{tdfText}}\n    --- END PROTECTED MESSAGE ---\n  </div>\n</div>\n'},function(e,t,n){var r=n(91),i=n(609),o=[i("[\\p{L}\\p{M}\\p{Nd}\\p{Nl}\\p{Pc}]+","g")],a=[i('([^\\s^"]+)|("(?:[^"\\\\]|\\\\.)*")',"g")],s=/(<address[> ])|(<article[> ])|(<aside[> ])|(<blockquote[> ])|(<dd[> ])|(<div[> ])|(<dt[> ])|(<fieldset[> ])|(<figcaption[> ])|(<figure[> ])|(<footer[> ])|(<form[> ])|(<header[> ])|(<li[> ])|(<noscript[> ])|(<td[> ])|(<th[> ])|(<h1[> ])|(<h2[> ])|(<h3[> ])|(<h4[> ])|(<h5[> ])|(<h6[> ])|(<p[> ])|(<pre[> ])|(<br[> \/])/g;e.exports={createWordArray:function(e,t){var n=t&&t.preserveSyntax,u=n?a:o;"<"!==e[0]&&(e="<div>"+e+"</div>");var c,d=e.replace(s," $&");c=t&&t.jquery?t.jquery(d).text():r(d).text();var l=i.matchChain(c,u);if(l=l.map(function(e){return e.toLowerCase().normalize("NFC")}),n){var f=[],p=0;l.forEach(function(e){var t=e.slice(),n=e.indexOf(":")>0,r=0;if("or"===e)return f.push({original:"OR",terms:["OR"]});for(var a="",s=0;s<e.length;++s){if(-1==="+-(".indexOf(e[s])){e=e.substr(s);break}a+=e[s]}if(n)for(var u=e.indexOf(":");u<e.length;++u)"("===e[u]&&p++;for(var c="",d=e.length-1;d>=0;--d){if(")"!==e[d]){e=e.substr(0,d+1);break}r++,c=e[d]+c}if(p>0||n)f.push({original:t,terms:[a+e+c]});else{var l=i.matchChain(e,o);l[0]=a+l[0],l[l.length-1]+=c,f.push({original:t,terms:l})}p-=r}),l=f}return l}}},function(e,t,n){var r;e.exports=function e(t,n,i){function o(s,u){if(!n[s]){if(!t[s]){var c="function"==typeof r&&r;if(!u&&c)return r(s,!0);if(a)return a(s,!0);var d=new Error("Cannot find module '"+s+"'");throw d.code="MODULE_NOT_FOUND",d}var l=n[s]={exports:{}};t[s][0].call(l.exports,function(e){var n=t[s][1][e];return o(n||e)},l,l.exports,e,t,n,i)}return n[s].exports}for(var a="function"==typeof r&&r,s=0;s<i.length;s++)o(i[s]);return o}({1:[function(e,t,n){
/*!
 * XRegExp.build 3.2.0
 * <xregexp.com>
 * Steven Levithan (c) 2012-2017 MIT License
 * Inspired by Lea Verou's RegExp.create <lea.verou.me>
 */
t.exports=function(e){"use strict";var t="xregexp",n=/(\()(?!\?)|\\([1-9]\d*)|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*\]/g,r=e.union([/\({{([\w$]+)}}\)|{{([\w$]+)}}/,n],"g",{conjunction:"or"});function i(e){var t=/^(?:\(\?:\))*\^/,n=/\$(?:\(\?:\))*$/;return t.test(e)&&n.test(e)&&n.test(e.replace(/\\[\s\S]/g,""))?e.replace(t,"").replace(n,""):e}function o(n,r){var i=r?"x":"";return e.isRegExp(n)?n[t]&&n[t].captureNames?n:e(n.source,i):e(n,i)}e.build=function(a,s,u){var c=(u=u||"").indexOf("x")>-1,d=/^\(\?([\w$]+)\)/.exec(a);d&&(u=e._clipDuplicates(u+d[1]));var l={};for(var f in s)if(s.hasOwnProperty(f)){var p=o(s[f],c);l[f]={pattern:i(p.source),names:p[t].captureNames||[]}}var h,m=o(a,c),_=0,v=0,y=[0],g=m[t].captureNames||[],b=m.source.replace(r,function(e,t,r,i,o){var a,s,u,c=t||r;if(c){if(!l.hasOwnProperty(c))throw new ReferenceError("Undefined property "+e);return t?(a=g[v],y[++v]=++_,s="(?<"+(a||c)+">"):s="(?:",h=_,s+l[c].pattern.replace(n,function(e,t,n){if(t){if(a=l[c].names[_-h],++_,a)return"(?<"+a+">"}else if(n)return u=+n-1,l[c].names[u]?"\\k<"+l[c].names[u]+">":"\\"+(+n+h);return e})+")"}if(i){if(a=g[v],y[++v]=++_,a)return"(?<"+a+">"}else if(o)return g[u=+o-1]?"\\k<"+g[u]+">":"\\"+y[+o];return e});return e(b,u)}}},{}],2:[function(e,t,n){
/*!
 * XRegExp.matchRecursive 3.2.0
 * <xregexp.com>
 * Steven Levithan (c) 2009-2017 MIT License
 */
t.exports=function(e){"use strict";function t(e,t,n,r){return{name:e,value:t,start:n,end:r}}e.matchRecursive=function(n,r,i,o,a){a=a||{};var s,u,c,d,l,f=(o=o||"").indexOf("g")>-1,p=o.indexOf("y")>-1,h=o.replace(/y/g,""),m=a.escapeChar,_=a.valueNames,v=[],y=0,g=0,b=0,w=0;if(r=e(r,h),i=e(i,h),m){if(m.length>1)throw new Error("Cannot use more than one escape character");m=e.escape(m),l=new RegExp("(?:"+m+"[\\S\\s]|(?:(?!"+e.union([r,i],"",{conjunction:"or"}).source+")[^"+m+"])+)+",o.replace(/[^imu]+/g,""))}for(;;){if(m&&(b+=(e.exec(n,l,b,"sticky")||[""])[0].length),c=e.exec(n,r,b),d=e.exec(n,i,b),c&&d&&(c.index<=d.index?d=null:c=null),c||d)g=(c||d).index,b=g+(c||d)[0].length;else if(!y)break;if(p&&!y&&g>w)break;if(c)y||(s=g,u=b),++y;else{if(!d||!y)throw new Error("Unbalanced delimiter found in string");if(!--y&&(_?(_[0]&&s>w&&v.push(t(_[0],n.slice(w,s),w,s)),_[1]&&v.push(t(_[1],n.slice(s,u),s,u)),_[2]&&v.push(t(_[2],n.slice(u,g),u,g)),_[3]&&v.push(t(_[3],n.slice(g,b),g,b))):v.push(n.slice(u,g)),w=b,!f))break}g===b&&++b}return f&&!p&&_&&_[0]&&n.length>w&&v.push(t(_[0],n.slice(w),w,n.length)),v}}},{}],3:[function(e,t,n){
/*!
 * XRegExp Unicode Base 3.2.0
 * <xregexp.com>
 * Steven Levithan (c) 2008-2017 MIT License
 */
t.exports=function(e){"use strict";var t={},n=e._dec,r=e._hex,i=e._pad4;function o(e){return e.replace(/[- _]+/g,"").toLowerCase()}function a(e){var t=/^\\[xu](.+)/.exec(e);return t?n(t[1]):e.charCodeAt("\\"===e.charAt(0)?1:0)}function s(n){return t[n]["b!"]||(t[n]["b!"]=(o=t[n].bmp,s="",u=-1,e.forEach(o,/(\\x..|\\u....|\\?[\s\S])(?:-(\\x..|\\u....|\\?[\s\S]))?/,function(e){var t=a(e[1]);t>u+1&&(s+="\\u"+i(r(u+1)),t>u+2&&(s+="-\\u"+i(r(t-1)))),u=a(e[2]||e[1])}),u<65535&&(s+="\\u"+i(r(u+1)),u<65534&&(s+="-\\uFFFF")),s));var o,s,u}function u(e,n){var r=n?"a!":"a=";return t[e][r]||(t[e][r]=function(e,n){var r=t[e],i="";return r.bmp&&!r.isBmpLast&&(i="["+r.bmp+"]"+(r.astral?"|":"")),r.astral&&(i+=r.astral),r.isBmpLast&&r.bmp&&(i+=(r.astral?"|":"")+"["+r.bmp+"]"),n?"(?:(?!"+i+")(?:[\ud800-\udbff][\udc00-\udfff]|[\0-￿]))":"(?:"+i+")"}(e,n))}e.addToken(/\\([pP])(?:{(\^?)([^}]*)}|([A-Za-z]))/,function(e,n,r){var i="P"===e[1]||!!e[2],a=r.indexOf("A")>-1,c=o(e[4]||e[3]),d=t[c];if("P"===e[1]&&e[2])throw new SyntaxError("Invalid double negation "+e[0]);if(!t.hasOwnProperty(c))throw new SyntaxError("Unknown Unicode token "+e[0]);if(d.inverseOf){if(c=o(d.inverseOf),!t.hasOwnProperty(c))throw new ReferenceError("Unicode token missing data "+e[0]+" -> "+d.inverseOf);d=t[c],i=!i}if(!d.bmp&&!a)throw new SyntaxError("Astral mode required for Unicode token "+e[0]);if(a){if("class"===n)throw new SyntaxError("Astral mode does not support Unicode tokens within character classes");return u(c,i)}return"class"===n?i?s(c):d.bmp:(i?"[^":"[")+d.bmp+"]"},{scope:"all",optionalFlags:"A",leadChar:"\\"}),e.addUnicodeData=function(n){for(var r,i=0;i<n.length;++i){if(!(r=n[i]).name)throw new Error("Unicode token requires name");if(!(r.inverseOf||r.bmp||r.astral))throw new Error("Unicode token has no character data "+r.name);t[o(r.name)]=r,r.alias&&(t[o(r.alias)]=r)}e.cache.flush("patterns")},e._getUnicodeProperty=function(e){var n=o(e);return t[n]}}},{}],4:[function(e,t,n){
/*!
 * XRegExp Unicode Blocks 3.2.0
 * <xregexp.com>
 * Steven Levithan (c) 2010-2017 MIT License
 * Unicode data by Mathias Bynens <mathiasbynens.be>
 */
t.exports=function(e){"use strict";if(!e.addUnicodeData)throw new ReferenceError("Unicode Base must be loaded before Unicode Blocks");e.addUnicodeData([{name:"InAdlam",astral:"\ud83a[\udd00-\udd5f]"},{name:"InAegean_Numbers",astral:"\ud800[\udd00-\udd3f]"},{name:"InAhom",astral:"\ud805[\udf00-\udf3f]"},{name:"InAlchemical_Symbols",astral:"\ud83d[\udf00-\udf7f]"},{name:"InAlphabetic_Presentation_Forms",bmp:"ﬀ-ﭏ"},{name:"InAnatolian_Hieroglyphs",astral:"\ud811[\udc00-\ude7f]"},{name:"InAncient_Greek_Musical_Notation",astral:"\ud834[\ude00-\ude4f]"},{name:"InAncient_Greek_Numbers",astral:"\ud800[\udd40-\udd8f]"},{name:"InAncient_Symbols",astral:"\ud800[\udd90-\uddcf]"},{name:"InArabic",bmp:"؀-ۿ"},{name:"InArabic_Extended_A",bmp:"ࢠ-ࣿ"},{name:"InArabic_Mathematical_Alphabetic_Symbols",astral:"\ud83b[\ude00-\udeff]"},{name:"InArabic_Presentation_Forms_A",bmp:"ﭐ-﷿"},{name:"InArabic_Presentation_Forms_B",bmp:"ﹰ-\ufeff"},{name:"InArabic_Supplement",bmp:"ݐ-ݿ"},{name:"InArmenian",bmp:"԰-֏"},{name:"InArrows",bmp:"←-⇿"},{name:"InAvestan",astral:"\ud802[\udf00-\udf3f]"},{name:"InBalinese",bmp:"ᬀ-᭿"},{name:"InBamum",bmp:"ꚠ-꛿"},{name:"InBamum_Supplement",astral:"\ud81a[\udc00-\ude3f]"},{name:"InBasic_Latin",bmp:"\0-"},{name:"InBassa_Vah",astral:"\ud81a[\uded0-\udeff]"},{name:"InBatak",bmp:"ᯀ-᯿"},{name:"InBengali",bmp:"ঀ-৿"},{name:"InBhaiksuki",astral:"\ud807[\udc00-\udc6f]"},{name:"InBlock_Elements",bmp:"▀-▟"},{name:"InBopomofo",bmp:"㄀-ㄯ"},{name:"InBopomofo_Extended",bmp:"ㆠ-ㆿ"},{name:"InBox_Drawing",bmp:"─-╿"},{name:"InBrahmi",astral:"\ud804[\udc00-\udc7f]"},{name:"InBraille_Patterns",bmp:"⠀-⣿"},{name:"InBuginese",bmp:"ᨀ-᨟"},{name:"InBuhid",bmp:"ᝀ-᝟"},{name:"InByzantine_Musical_Symbols",astral:"\ud834[\udc00-\udcff]"},{name:"InCJK_Compatibility",bmp:"㌀-㏿"},{name:"InCJK_Compatibility_Forms",bmp:"︰-﹏"},{name:"InCJK_Compatibility_Ideographs",bmp:"豈-﫿"},{name:"InCJK_Compatibility_Ideographs_Supplement",astral:"\ud87e[\udc00-\ude1f]"},{name:"InCJK_Radicals_Supplement",bmp:"⺀-⻿"},{name:"InCJK_Strokes",bmp:"㇀-㇯"},{name:"InCJK_Symbols_and_Punctuation",bmp:"　-〿"},{name:"InCJK_Unified_Ideographs",bmp:"一-鿿"},{name:"InCJK_Unified_Ideographs_Extension_A",bmp:"㐀-䶿"},{name:"InCJK_Unified_Ideographs_Extension_B",astral:"[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\udedf]"},{name:"InCJK_Unified_Ideographs_Extension_C",astral:"\ud869[\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf3f]"},{name:"InCJK_Unified_Ideographs_Extension_D",astral:"\ud86d[\udf40-\udfff]|\ud86e[\udc00-\udc1f]"},{name:"InCJK_Unified_Ideographs_Extension_E",astral:"\ud86e[\udc20-\udfff]|[\ud86f-\ud872][\udc00-\udfff]|\ud873[\udc00-\udeaf]"},{name:"InCarian",astral:"\ud800[\udea0-\udedf]"},{name:"InCaucasian_Albanian",astral:"\ud801[\udd30-\udd6f]"},{name:"InChakma",astral:"\ud804[\udd00-\udd4f]"},{name:"InCham",bmp:"ꨀ-꩟"},{name:"InCherokee",bmp:"Ꭰ-᏿"},{name:"InCherokee_Supplement",bmp:"ꭰ-ꮿ"},{name:"InCombining_Diacritical_Marks",bmp:"̀-ͯ"},{name:"InCombining_Diacritical_Marks_Extended",bmp:"᪰-᫿"},{name:"InCombining_Diacritical_Marks_Supplement",bmp:"᷀-᷿"},{name:"InCombining_Diacritical_Marks_for_Symbols",bmp:"⃐-⃿"},{name:"InCombining_Half_Marks",bmp:"︠-︯"},{name:"InCommon_Indic_Number_Forms",bmp:"꠰-꠿"},{name:"InControl_Pictures",bmp:"␀-␿"},{name:"InCoptic",bmp:"Ⲁ-⳿"},{name:"InCoptic_Epact_Numbers",astral:"\ud800[\udee0-\udeff]"},{name:"InCounting_Rod_Numerals",astral:"\ud834[\udf60-\udf7f]"},{name:"InCuneiform",astral:"\ud808[\udc00-\udfff]"},{name:"InCuneiform_Numbers_and_Punctuation",astral:"\ud809[\udc00-\udc7f]"},{name:"InCurrency_Symbols",bmp:"₠-⃏"},{name:"InCypriot_Syllabary",astral:"\ud802[\udc00-\udc3f]"},{name:"InCyrillic",bmp:"Ѐ-ӿ"},{name:"InCyrillic_Extended_A",bmp:"ⷠ-ⷿ"},{name:"InCyrillic_Extended_B",bmp:"Ꙁ-ꚟ"},{name:"InCyrillic_Extended_C",bmp:"ᲀ-᲏"},{name:"InCyrillic_Supplement",bmp:"Ԁ-ԯ"},{name:"InDeseret",astral:"\ud801[\udc00-\udc4f]"},{name:"InDevanagari",bmp:"ऀ-ॿ"},{name:"InDevanagari_Extended",bmp:"꣠-ꣿ"},{name:"InDingbats",bmp:"✀-➿"},{name:"InDomino_Tiles",astral:"\ud83c[\udc30-\udc9f]"},{name:"InDuployan",astral:"\ud82f[\udc00-\udc9f]"},{name:"InEarly_Dynastic_Cuneiform",astral:"\ud809[\udc80-\udd4f]"},{name:"InEgyptian_Hieroglyphs",astral:"\ud80c[\udc00-\udfff]|\ud80d[\udc00-\udc2f]"},{name:"InElbasan",astral:"\ud801[\udd00-\udd2f]"},{name:"InEmoticons",astral:"\ud83d[\ude00-\ude4f]"},{name:"InEnclosed_Alphanumeric_Supplement",astral:"\ud83c[\udd00-\uddff]"},{name:"InEnclosed_Alphanumerics",bmp:"①-⓿"},{name:"InEnclosed_CJK_Letters_and_Months",bmp:"㈀-㋿"},{name:"InEnclosed_Ideographic_Supplement",astral:"\ud83c[\ude00-\udeff]"},{name:"InEthiopic",bmp:"ሀ-፿"},{name:"InEthiopic_Extended",bmp:"ⶀ-⷟"},{name:"InEthiopic_Extended_A",bmp:"꬀-꬯"},{name:"InEthiopic_Supplement",bmp:"ᎀ-᎟"},{name:"InGeneral_Punctuation",bmp:" -⁯"},{name:"InGeometric_Shapes",bmp:"■-◿"},{name:"InGeometric_Shapes_Extended",astral:"\ud83d[\udf80-\udfff]"},{name:"InGeorgian",bmp:"Ⴀ-ჿ"},{name:"InGeorgian_Supplement",bmp:"ⴀ-⴯"},{name:"InGlagolitic",bmp:"Ⰰ-ⱟ"},{name:"InGlagolitic_Supplement",astral:"\ud838[\udc00-\udc2f]"},{name:"InGothic",astral:"\ud800[\udf30-\udf4f]"},{name:"InGrantha",astral:"\ud804[\udf00-\udf7f]"},{name:"InGreek_Extended",bmp:"ἀ-῿"},{name:"InGreek_and_Coptic",bmp:"Ͱ-Ͽ"},{name:"InGujarati",bmp:"઀-૿"},{name:"InGurmukhi",bmp:"਀-੿"},{name:"InHalfwidth_and_Fullwidth_Forms",bmp:"＀-￯"},{name:"InHangul_Compatibility_Jamo",bmp:"㄰-㆏"},{name:"InHangul_Jamo",bmp:"ᄀ-ᇿ"},{name:"InHangul_Jamo_Extended_A",bmp:"ꥠ-꥿"},{name:"InHangul_Jamo_Extended_B",bmp:"ힰ-퟿"},{name:"InHangul_Syllables",bmp:"가-힯"},{name:"InHanunoo",bmp:"ᜠ-᜿"},{name:"InHatran",astral:"\ud802[\udce0-\udcff]"},{name:"InHebrew",bmp:"֐-׿"},{name:"InHigh_Private_Use_Surrogates",bmp:"\udb80-\udbff"},{name:"InHigh_Surrogates",bmp:"\ud800-\udb7f"},{name:"InHiragana",bmp:"぀-ゟ"},{name:"InIPA_Extensions",bmp:"ɐ-ʯ"},{name:"InIdeographic_Description_Characters",bmp:"⿰-⿿"},{name:"InIdeographic_Symbols_and_Punctuation",astral:"\ud81b[\udfe0-\udfff]"},{name:"InImperial_Aramaic",astral:"\ud802[\udc40-\udc5f]"},{name:"InInscriptional_Pahlavi",astral:"\ud802[\udf60-\udf7f]"},{name:"InInscriptional_Parthian",astral:"\ud802[\udf40-\udf5f]"},{name:"InJavanese",bmp:"ꦀ-꧟"},{name:"InKaithi",astral:"\ud804[\udc80-\udccf]"},{name:"InKana_Supplement",astral:"\ud82c[\udc00-\udcff]"},{name:"InKanbun",bmp:"㆐-㆟"},{name:"InKangxi_Radicals",bmp:"⼀-⿟"},{name:"InKannada",bmp:"ಀ-೿"},{name:"InKatakana",bmp:"゠-ヿ"},{name:"InKatakana_Phonetic_Extensions",bmp:"ㇰ-ㇿ"},{name:"InKayah_Li",bmp:"꤀-꤯"},{name:"InKharoshthi",astral:"\ud802[\ude00-\ude5f]"},{name:"InKhmer",bmp:"ក-៿"},{name:"InKhmer_Symbols",bmp:"᧠-᧿"},{name:"InKhojki",astral:"\ud804[\ude00-\ude4f]"},{name:"InKhudawadi",astral:"\ud804[\udeb0-\udeff]"},{name:"InLao",bmp:"຀-໿"},{name:"InLatin_Extended_Additional",bmp:"Ḁ-ỿ"},{name:"InLatin_Extended_A",bmp:"Ā-ſ"},{name:"InLatin_Extended_B",bmp:"ƀ-ɏ"},{name:"InLatin_Extended_C",bmp:"Ⱡ-Ɀ"},{name:"InLatin_Extended_D",bmp:"꜠-ꟿ"},{name:"InLatin_Extended_E",bmp:"ꬰ-꭯"},{name:"InLatin_1_Supplement",bmp:"-ÿ"},{name:"InLepcha",bmp:"ᰀ-ᱏ"},{name:"InLetterlike_Symbols",bmp:"℀-⅏"},{name:"InLimbu",bmp:"ᤀ-᥏"},{name:"InLinear_A",astral:"\ud801[\ude00-\udf7f]"},{name:"InLinear_B_Ideograms",astral:"\ud800[\udc80-\udcff]"},{name:"InLinear_B_Syllabary",astral:"\ud800[\udc00-\udc7f]"},{name:"InLisu",bmp:"ꓐ-꓿"},{name:"InLow_Surrogates",bmp:"\udc00-\udfff"},{name:"InLycian",astral:"\ud800[\ude80-\ude9f]"},{name:"InLydian",astral:"\ud802[\udd20-\udd3f]"},{name:"InMahajani",astral:"\ud804[\udd50-\udd7f]"},{name:"InMahjong_Tiles",astral:"\ud83c[\udc00-\udc2f]"},{name:"InMalayalam",bmp:"ഀ-ൿ"},{name:"InMandaic",bmp:"ࡀ-࡟"},{name:"InManichaean",astral:"\ud802[\udec0-\udeff]"},{name:"InMarchen",astral:"\ud807[\udc70-\udcbf]"},{name:"InMathematical_Alphanumeric_Symbols",astral:"\ud835[\udc00-\udfff]"},{name:"InMathematical_Operators",bmp:"∀-⋿"},{name:"InMeetei_Mayek",bmp:"ꯀ-꯿"},{name:"InMeetei_Mayek_Extensions",bmp:"ꫠ-꫿"},{name:"InMende_Kikakui",astral:"\ud83a[\udc00-\udcdf]"},{name:"InMeroitic_Cursive",astral:"\ud802[\udda0-\uddff]"},{name:"InMeroitic_Hieroglyphs",astral:"\ud802[\udd80-\udd9f]"},{name:"InMiao",astral:"\ud81b[\udf00-\udf9f]"},{name:"InMiscellaneous_Mathematical_Symbols_A",bmp:"⟀-⟯"},{name:"InMiscellaneous_Mathematical_Symbols_B",bmp:"⦀-⧿"},{name:"InMiscellaneous_Symbols",bmp:"☀-⛿"},{name:"InMiscellaneous_Symbols_and_Arrows",bmp:"⬀-⯿"},{name:"InMiscellaneous_Symbols_and_Pictographs",astral:"\ud83c[\udf00-\udfff]|\ud83d[\udc00-\uddff]"},{name:"InMiscellaneous_Technical",bmp:"⌀-⏿"},{name:"InModi",astral:"\ud805[\ude00-\ude5f]"},{name:"InModifier_Tone_Letters",bmp:"꜀-ꜟ"},{name:"InMongolian",bmp:"᠀-᢯"},{name:"InMongolian_Supplement",astral:"\ud805[\ude60-\ude7f]"},{name:"InMro",astral:"\ud81a[\ude40-\ude6f]"},{name:"InMultani",astral:"\ud804[\ude80-\udeaf]"},{name:"InMusical_Symbols",astral:"\ud834[\udd00-\uddff]"},{name:"InMyanmar",bmp:"က-႟"},{name:"InMyanmar_Extended_A",bmp:"ꩠ-ꩿ"},{name:"InMyanmar_Extended_B",bmp:"ꧠ-꧿"},{name:"InNKo",bmp:"߀-߿"},{name:"InNabataean",astral:"\ud802[\udc80-\udcaf]"},{name:"InNew_Tai_Lue",bmp:"ᦀ-᧟"},{name:"InNewa",astral:"\ud805[\udc00-\udc7f]"},{name:"InNumber_Forms",bmp:"⅐-↏"},{name:"InOgham",bmp:" -᚟"},{name:"InOl_Chiki",bmp:"᱐-᱿"},{name:"InOld_Hungarian",astral:"\ud803[\udc80-\udcff]"},{name:"InOld_Italic",astral:"\ud800[\udf00-\udf2f]"},{name:"InOld_North_Arabian",astral:"\ud802[\ude80-\ude9f]"},{name:"InOld_Permic",astral:"\ud800[\udf50-\udf7f]"},{name:"InOld_Persian",astral:"\ud800[\udfa0-\udfdf]"},{name:"InOld_South_Arabian",astral:"\ud802[\ude60-\ude7f]"},{name:"InOld_Turkic",astral:"\ud803[\udc00-\udc4f]"},{name:"InOptical_Character_Recognition",bmp:"⑀-⑟"},{name:"InOriya",bmp:"଀-୿"},{name:"InOrnamental_Dingbats",astral:"\ud83d[\ude50-\ude7f]"},{name:"InOsage",astral:"\ud801[\udcb0-\udcff]"},{name:"InOsmanya",astral:"\ud801[\udc80-\udcaf]"},{name:"InPahawh_Hmong",astral:"\ud81a[\udf00-\udf8f]"},{name:"InPalmyrene",astral:"\ud802[\udc60-\udc7f]"},{name:"InPau_Cin_Hau",astral:"\ud806[\udec0-\udeff]"},{name:"InPhags_pa",bmp:"ꡀ-꡿"},{name:"InPhaistos_Disc",astral:"\ud800[\uddd0-\uddff]"},{name:"InPhoenician",astral:"\ud802[\udd00-\udd1f]"},{name:"InPhonetic_Extensions",bmp:"ᴀ-ᵿ"},{name:"InPhonetic_Extensions_Supplement",bmp:"ᶀ-ᶿ"},{name:"InPlaying_Cards",astral:"\ud83c[\udca0-\udcff]"},{name:"InPrivate_Use_Area",bmp:"-"},{name:"InPsalter_Pahlavi",astral:"\ud802[\udf80-\udfaf]"},{name:"InRejang",bmp:"ꤰ-꥟"},{name:"InRumi_Numeral_Symbols",astral:"\ud803[\ude60-\ude7f]"},{name:"InRunic",bmp:"ᚠ-᛿"},{name:"InSamaritan",bmp:"ࠀ-࠿"},{name:"InSaurashtra",bmp:"ꢀ-꣟"},{name:"InSharada",astral:"\ud804[\udd80-\udddf]"},{name:"InShavian",astral:"\ud801[\udc50-\udc7f]"},{name:"InShorthand_Format_Controls",astral:"\ud82f[\udca0-\udcaf]"},{name:"InSiddham",astral:"\ud805[\udd80-\uddff]"},{name:"InSinhala",bmp:"඀-෿"},{name:"InSinhala_Archaic_Numbers",astral:"\ud804[\udde0-\uddff]"},{name:"InSmall_Form_Variants",bmp:"﹐-﹯"},{name:"InSora_Sompeng",astral:"\ud804[\udcd0-\udcff]"},{name:"InSpacing_Modifier_Letters",bmp:"ʰ-˿"},{name:"InSpecials",bmp:"￰-￿"},{name:"InSundanese",bmp:"ᮀ-ᮿ"},{name:"InSundanese_Supplement",bmp:"᳀-᳏"},{name:"InSuperscripts_and_Subscripts",bmp:"⁰-₟"},{name:"InSupplemental_Arrows_A",bmp:"⟰-⟿"},{name:"InSupplemental_Arrows_B",bmp:"⤀-⥿"},{name:"InSupplemental_Arrows_C",astral:"\ud83e[\udc00-\udcff]"},{name:"InSupplemental_Mathematical_Operators",bmp:"⨀-⫿"},{name:"InSupplemental_Punctuation",bmp:"⸀-⹿"},{name:"InSupplemental_Symbols_and_Pictographs",astral:"\ud83e[\udd00-\uddff]"},{name:"InSupplementary_Private_Use_Area_A",astral:"[\udb80-\udbbf][\udc00-\udfff]"},{name:"InSupplementary_Private_Use_Area_B",astral:"[\udbc0-\udbff][\udc00-\udfff]"},{name:"InSutton_SignWriting",astral:"\ud836[\udc00-\udeaf]"},{name:"InSyloti_Nagri",bmp:"ꠀ-꠯"},{name:"InSyriac",bmp:"܀-ݏ"},{name:"InTagalog",bmp:"ᜀ-ᜟ"},{name:"InTagbanwa",bmp:"ᝠ-᝿"},{name:"InTags",astral:"\udb40[\udc00-\udc7f]"},{name:"InTai_Le",bmp:"ᥐ-᥿"},{name:"InTai_Tham",bmp:"ᨠ-᪯"},{name:"InTai_Viet",bmp:"ꪀ-꫟"},{name:"InTai_Xuan_Jing_Symbols",astral:"\ud834[\udf00-\udf5f]"},{name:"InTakri",astral:"\ud805[\ude80-\udecf]"},{name:"InTamil",bmp:"஀-௿"},{name:"InTangut",astral:"[\ud81c-\ud821][\udc00-\udfff]"},{name:"InTangut_Components",astral:"\ud822[\udc00-\udeff]"},{name:"InTelugu",bmp:"ఀ-౿"},{name:"InThaana",bmp:"ހ-޿"},{name:"InThai",bmp:"฀-๿"},{name:"InTibetan",bmp:"ༀ-࿿"},{name:"InTifinagh",bmp:"ⴰ-⵿"},{name:"InTirhuta",astral:"\ud805[\udc80-\udcdf]"},{name:"InTransport_and_Map_Symbols",astral:"\ud83d[\ude80-\udeff]"},{name:"InUgaritic",astral:"\ud800[\udf80-\udf9f]"},{name:"InUnified_Canadian_Aboriginal_Syllabics",bmp:"᐀-ᙿ"},{name:"InUnified_Canadian_Aboriginal_Syllabics_Extended",bmp:"ᢰ-᣿"},{name:"InVai",bmp:"ꔀ-꘿"},{name:"InVariation_Selectors",bmp:"︀-️"},{name:"InVariation_Selectors_Supplement",astral:"\udb40[\udd00-\uddef]"},{name:"InVedic_Extensions",bmp:"᳐-᳿"},{name:"InVertical_Forms",bmp:"︐-︟"},{name:"InWarang_Citi",astral:"\ud806[\udca0-\udcff]"},{name:"InYi_Radicals",bmp:"꒐-꓏"},{name:"InYi_Syllables",bmp:"ꀀ-꒏"},{name:"InYijing_Hexagram_Symbols",bmp:"䷀-䷿"}])}},{}],5:[function(e,t,n){
/*!
 * XRegExp Unicode Categories 3.2.0
 * <xregexp.com>
 * Steven Levithan (c) 2010-2017 MIT License
 * Unicode data by Mathias Bynens <mathiasbynens.be>
 */
t.exports=function(e){"use strict";if(!e.addUnicodeData)throw new ReferenceError("Unicode Base must be loaded before Unicode Categories");e.addUnicodeData([{name:"C",alias:"Other",isBmpLast:!0,bmp:"\0--­͸͹΀-΃΋΍΢԰՗՘ՠֈ֋֌֐׈-׏׫-ׯ׵-؅؜؝۝܎܏݋݌޲-޿߻-߿࠮࠯࠿࡜࡝࡟-࢟ࢵࢾ-࣓࣢঄঍঎঑঒঩঱঳-঵঺঻৅৆৉৊৏-৖৘-৛৞৤৥ৼ-਀਄਋-਎਑਒਩਱਴਷਺਻਽੃-੆੉੊੎-੐੒-੘੝੟-੥੶-઀઄઎઒઩઱઴઺઻૆૊૎૏૑-૟૤૥૲-૸ૺ-଀଄଍଎଑଒଩଱଴଺଻୅୆୉୊୎-୕୘-୛୞୤୥୸-஁஄஋-஍஑஖-஘஛஝஠-஢஥-஧஫-஭஺-஽௃-௅௉௎௏௑-௖௘-௥௻-௿ఄ఍఑఩఺-఼౅౉౎-౔౗౛-౟౤౥౰-౷಄಍಑಩಴಺಻೅೉೎-೔೗-ೝ೟೤೥೰ೳ-ഀഄ഍഑഻഼൅൉൐-൓൤൥඀ඁ඄඗-඙඲඼඾඿෇-෉෋-෎෕෗෠-෥෰෱෵-฀฻-฾๜-຀຃຅ຆຉ຋ຌຎ-ຓຘຠ຤຦ຨຩຬ຺຾຿໅໇໎໏໚໛໠-໿཈཭-཰྘྽࿍࿛-࿿჆჈-჌჎჏቉቎቏቗቙቞቟኉኎኏኱኶኷኿዁዆዇዗጑጖጗፛፜፽-፿᎚-᎟᏶᏷᏾᏿᚝-᚟᛹-᛿ᜍ᜕-ᜟ᜷-᜿᝔-᝟᝭᝱᝴-᝿៞៟៪-៯៺-៿᠎᠏᠚-᠟ᡸ-᡿᢫-᢯᣶-᣿᤟᤬-᤯᤼-᤿᥁-᥃᥮᥯᥵-᥿᦬-᦯᧊-᧏᧛-᧝᨜᨝᩟᩽᩾᪊-᪏᪚-᪟᪮᪯ᪿ-᫿ᭌ-᭏᭽-᭿᯴-᯻᰸-᰺᱊-᱌Ᲊ-Ჿ᳈-᳏᳷ᳺ-᳿᷶-᷺἖἗἞἟὆὇὎὏὘὚὜὞὾὿᾵῅῔῕῜῰῱῵῿​-‏‪-‮⁠-⁯⁲⁳₏₝-₟₿-⃏⃱-⃿↌-↏⏿␧-␿⑋-⑟⭴⭵⮖⮗⮺-⮼⯉⯒-⯫⯰-⯿Ⱟⱟ⳴-⳸⴦⴨-⴬⴮⴯⵨-⵮⵱-⵾⶗-⶟⶧⶯⶷⶿⷇⷏⷗⷟⹅-⹿⺚⻴-⻿⿖-⿯⿼-⿿぀゗゘㄀-㄄ㄮ-㄰㆏ㆻ-ㆿ㇤-㇯㈟㋿䶶-䶿鿖-鿿꒍-꒏꓇-꓏꘬-꘿꛸-꛿ꞯꞸ-ꟶ꠬-꠯꠺-꠿꡸-꡿꣆-꣍꣚-꣟ꣾꣿ꥔-꥞꥽-꥿꧎꧚-꧝꧿꨷-꨿꩎꩏꩚꩛꫃-꫚꫷-꬀꬇꬈꬏꬐꬗-꬟꬧꬯ꭦ-꭯꯮꯯꯺-꯿힤-힯퟇-퟊퟼-﩮﩯﫚-﫿﬇-﬒﬘-﬜﬷﬽﬿﭂﭅﯂-﯒﵀-﵏﶐﶑﷈-﷯﷾﷿︚-︟﹓﹧﹬-﹯﹵﻽-＀﾿-￁￈￉￐￑￘￙￝-￟￧￯-￻￾￿",astral:"\ud800[\udc0c\udc27\udc3b\udc3e\udc4e\udc4f\udc5e-\udc7f\udcfb-\udcff\udd03-\udd06\udd34-\udd36\udd8f\udd9c-\udd9f\udda1-\uddcf\uddfe-\ude7f\ude9d-\ude9f\uded1-\udedf\udefc-\udeff\udf24-\udf2f\udf4b-\udf4f\udf7b-\udf7f\udf9e\udfc4-\udfc7\udfd6-\udfff]|\ud801[\udc9e\udc9f\udcaa-\udcaf\udcd4-\udcd7\udcfc-\udcff\udd28-\udd2f\udd64-\udd6e\udd70-\uddff\udf37-\udf3f\udf56-\udf5f\udf68-\udfff]|\ud802[\udc06\udc07\udc09\udc36\udc39-\udc3b\udc3d\udc3e\udc56\udc9f-\udca6\udcb0-\udcdf\udcf3\udcf6-\udcfa\udd1c-\udd1e\udd3a-\udd3e\udd40-\udd7f\uddb8-\uddbb\uddd0\uddd1\ude04\ude07-\ude0b\ude14\ude18\ude34-\ude37\ude3b-\ude3e\ude48-\ude4f\ude59-\ude5f\udea0-\udebf\udee7-\udeea\udef7-\udeff\udf36-\udf38\udf56\udf57\udf73-\udf77\udf92-\udf98\udf9d-\udfa8\udfb0-\udfff]|\ud803[\udc49-\udc7f\udcb3-\udcbf\udcf3-\udcf9\udd00-\ude5f\ude7f-\udfff]|\ud804[\udc4e-\udc51\udc70-\udc7e\udcbd\udcc2-\udccf\udce9-\udcef\udcfa-\udcff\udd35\udd44-\udd4f\udd77-\udd7f\uddce\uddcf\udde0\uddf5-\uddff\ude12\ude3f-\ude7f\ude87\ude89\ude8e\ude9e\udeaa-\udeaf\udeeb-\udeef\udefa-\udeff\udf04\udf0d\udf0e\udf11\udf12\udf29\udf31\udf34\udf3a\udf3b\udf45\udf46\udf49\udf4a\udf4e\udf4f\udf51-\udf56\udf58-\udf5c\udf64\udf65\udf6d-\udf6f\udf75-\udfff]|\ud805[\udc5a\udc5c\udc5e-\udc7f\udcc8-\udccf\udcda-\udd7f\uddb6\uddb7\uddde-\uddff\ude45-\ude4f\ude5a-\ude5f\ude6d-\ude7f\udeb8-\udebf\udeca-\udeff\udf1a-\udf1c\udf2c-\udf2f\udf40-\udfff]|\ud806[\udc00-\udc9f\udcf3-\udcfe\udd00-\udebf\udef9-\udfff]|\ud807[\udc09\udc37\udc46-\udc4f\udc6d-\udc6f\udc90\udc91\udca8\udcb7-\udfff]|\ud808[\udf9a-\udfff]|\ud809[\udc6f\udc75-\udc7f\udd44-\udfff]|[\ud80a\ud80b\ud80e-\ud810\ud812-\ud819\ud823-\ud82b\ud82d\ud82e\ud830-\ud833\ud837\ud839\ud83f\ud874-\ud87d\ud87f-\udb3f\udb41-\udbff][\udc00-\udfff]|\ud80d[\udc2f-\udfff]|\ud811[\ude47-\udfff]|\ud81a[\ude39-\ude3f\ude5f\ude6a-\ude6d\ude70-\udecf\udeee\udeef\udef6-\udeff\udf46-\udf4f\udf5a\udf62\udf78-\udf7c\udf90-\udfff]|\ud81b[\udc00-\udeff\udf45-\udf4f\udf7f-\udf8e\udfa0-\udfdf\udfe1-\udfff]|\ud821[\udfed-\udfff]|\ud822[\udef3-\udfff]|\ud82c[\udc02-\udfff]|\ud82f[\udc6b-\udc6f\udc7d-\udc7f\udc89-\udc8f\udc9a\udc9b\udca0-\udfff]|\ud834[\udcf6-\udcff\udd27\udd28\udd73-\udd7a\udde9-\uddff\ude46-\udeff\udf57-\udf5f\udf72-\udfff]|\ud835[\udc55\udc9d\udca0\udca1\udca3\udca4\udca7\udca8\udcad\udcba\udcbc\udcc4\udd06\udd0b\udd0c\udd15\udd1d\udd3a\udd3f\udd45\udd47-\udd49\udd51\udea6\udea7\udfcc\udfcd]|\ud836[\ude8c-\ude9a\udea0\udeb0-\udfff]|\ud838[\udc07\udc19\udc1a\udc22\udc25\udc2b-\udfff]|\ud83a[\udcc5\udcc6\udcd7-\udcff\udd4b-\udd4f\udd5a-\udd5d\udd60-\udfff]|\ud83b[\udc00-\uddff\ude04\ude20\ude23\ude25\ude26\ude28\ude33\ude38\ude3a\ude3c-\ude41\ude43-\ude46\ude48\ude4a\ude4c\ude50\ude53\ude55\ude56\ude58\ude5a\ude5c\ude5e\ude60\ude63\ude65\ude66\ude6b\ude73\ude78\ude7d\ude7f\ude8a\ude9c-\udea0\udea4\udeaa\udebc-\udeef\udef2-\udfff]|\ud83c[\udc2c-\udc2f\udc94-\udc9f\udcaf\udcb0\udcc0\udcd0\udcf6-\udcff\udd0d-\udd0f\udd2f\udd6c-\udd6f\uddad-\udde5\ude03-\ude0f\ude3c-\ude3f\ude49-\ude4f\ude52-\udeff]|\ud83d[\uded3-\udedf\udeed-\udeef\udef7-\udeff\udf74-\udf7f\udfd5-\udfff]|\ud83e[\udc0c-\udc0f\udc48-\udc4f\udc5a-\udc5f\udc88-\udc8f\udcae-\udd0f\udd1f\udd28-\udd2f\udd31\udd32\udd3f\udd4c-\udd4f\udd5f-\udd7f\udd92-\uddbf\uddc1-\udfff]|\ud869[\uded7-\udeff]|\ud86d[\udf35-\udf3f]|\ud86e[\udc1e\udc1f]|\ud873[\udea2-\udfff]|\ud87e[\ude1e-\udfff]|\udb40[\udc00-\udcff\uddf0-\udfff]"},{name:"Cc",alias:"Control",bmp:"\0--"},{name:"Cf",alias:"Format",bmp:"­؀-؅؜۝܏࣢᠎​-‏‪-‮⁠-⁤⁦-⁯\ufeff￹-￻",astral:"𑂽|\ud82f[\udca0-\udca3]|\ud834[\udd73-\udd7a]|\udb40[\udc01\udc20-\udc7f]"},{name:"Cn",alias:"Unassigned",bmp:"͸͹΀-΃΋΍΢԰՗՘ՠֈ֋֌֐׈-׏׫-ׯ׵-׿؝܎݋݌޲-޿߻-߿࠮࠯࠿࡜࡝࡟-࢟ࢵࢾ-࣓঄঍঎঑঒঩঱঳-঵঺঻৅৆৉৊৏-৖৘-৛৞৤৥ৼ-਀਄਋-਎਑਒਩਱਴਷਺਻਽੃-੆੉੊੎-੐੒-੘੝੟-੥੶-઀઄઎઒઩઱઴઺઻૆૊૎૏૑-૟૤૥૲-૸ૺ-଀଄଍଎଑଒଩଱଴଺଻୅୆୉୊୎-୕୘-୛୞୤୥୸-஁஄஋-஍஑஖-஘஛஝஠-஢஥-஧஫-஭஺-஽௃-௅௉௎௏௑-௖௘-௥௻-௿ఄ఍఑఩఺-఼౅౉౎-౔౗౛-౟౤౥౰-౷಄಍಑಩಴಺಻೅೉೎-೔೗-ೝ೟೤೥೰ೳ-ഀഄ഍഑഻഼൅൉൐-൓൤൥඀ඁ඄඗-඙඲඼඾඿෇-෉෋-෎෕෗෠-෥෰෱෵-฀฻-฾๜-຀຃຅ຆຉ຋ຌຎ-ຓຘຠ຤຦ຨຩຬ຺຾຿໅໇໎໏໚໛໠-໿཈཭-཰྘྽࿍࿛-࿿჆჈-჌჎჏቉቎቏቗቙቞቟኉኎኏኱኶኷኿዁዆዇዗጑጖጗፛፜፽-፿᎚-᎟᏶᏷᏾᏿᚝-᚟᛹-᛿ᜍ᜕-ᜟ᜷-᜿᝔-᝟᝭᝱᝴-᝿៞៟៪-៯៺-៿᠏᠚-᠟ᡸ-᡿᢫-᢯᣶-᣿᤟᤬-᤯᤼-᤿᥁-᥃᥮᥯᥵-᥿᦬-᦯᧊-᧏᧛-᧝᨜᨝᩟᩽᩾᪊-᪏᪚-᪟᪮᪯ᪿ-᫿ᭌ-᭏᭽-᭿᯴-᯻᰸-᰺᱊-᱌Ᲊ-Ჿ᳈-᳏᳷ᳺ-᳿᷶-᷺἖἗἞἟὆὇὎὏὘὚὜὞὾὿᾵῅῔῕῜῰῱῵῿⁥⁲⁳₏₝-₟₿-⃏⃱-⃿↌-↏⏿␧-␿⑋-⑟⭴⭵⮖⮗⮺-⮼⯉⯒-⯫⯰-⯿Ⱟⱟ⳴-⳸⴦⴨-⴬⴮⴯⵨-⵮⵱-⵾⶗-⶟⶧⶯⶷⶿⷇⷏⷗⷟⹅-⹿⺚⻴-⻿⿖-⿯⿼-⿿぀゗゘㄀-㄄ㄮ-㄰㆏ㆻ-ㆿ㇤-㇯㈟㋿䶶-䶿鿖-鿿꒍-꒏꓇-꓏꘬-꘿꛸-꛿ꞯꞸ-ꟶ꠬-꠯꠺-꠿꡸-꡿꣆-꣍꣚-꣟ꣾꣿ꥔-꥞꥽-꥿꧎꧚-꧝꧿꨷-꨿꩎꩏꩚꩛꫃-꫚꫷-꬀꬇꬈꬏꬐꬗-꬟꬧꬯ꭦ-꭯꯮꯯꯺-꯿힤-힯퟇-퟊퟼-퟿﩮﩯﫚-﫿﬇-﬒﬘-﬜﬷﬽﬿﭂﭅﯂-﯒﵀-﵏﶐﶑﷈-﷯﷾﷿︚-︟﹓﹧﹬-﹯﹵﻽﻾＀﾿-￁￈￉￐￑￘￙￝-￟￧￯-￸￾￿",astral:"\ud800[\udc0c\udc27\udc3b\udc3e\udc4e\udc4f\udc5e-\udc7f\udcfb-\udcff\udd03-\udd06\udd34-\udd36\udd8f\udd9c-\udd9f\udda1-\uddcf\uddfe-\ude7f\ude9d-\ude9f\uded1-\udedf\udefc-\udeff\udf24-\udf2f\udf4b-\udf4f\udf7b-\udf7f\udf9e\udfc4-\udfc7\udfd6-\udfff]|\ud801[\udc9e\udc9f\udcaa-\udcaf\udcd4-\udcd7\udcfc-\udcff\udd28-\udd2f\udd64-\udd6e\udd70-\uddff\udf37-\udf3f\udf56-\udf5f\udf68-\udfff]|\ud802[\udc06\udc07\udc09\udc36\udc39-\udc3b\udc3d\udc3e\udc56\udc9f-\udca6\udcb0-\udcdf\udcf3\udcf6-\udcfa\udd1c-\udd1e\udd3a-\udd3e\udd40-\udd7f\uddb8-\uddbb\uddd0\uddd1\ude04\ude07-\ude0b\ude14\ude18\ude34-\ude37\ude3b-\ude3e\ude48-\ude4f\ude59-\ude5f\udea0-\udebf\udee7-\udeea\udef7-\udeff\udf36-\udf38\udf56\udf57\udf73-\udf77\udf92-\udf98\udf9d-\udfa8\udfb0-\udfff]|\ud803[\udc49-\udc7f\udcb3-\udcbf\udcf3-\udcf9\udd00-\ude5f\ude7f-\udfff]|\ud804[\udc4e-\udc51\udc70-\udc7e\udcc2-\udccf\udce9-\udcef\udcfa-\udcff\udd35\udd44-\udd4f\udd77-\udd7f\uddce\uddcf\udde0\uddf5-\uddff\ude12\ude3f-\ude7f\ude87\ude89\ude8e\ude9e\udeaa-\udeaf\udeeb-\udeef\udefa-\udeff\udf04\udf0d\udf0e\udf11\udf12\udf29\udf31\udf34\udf3a\udf3b\udf45\udf46\udf49\udf4a\udf4e\udf4f\udf51-\udf56\udf58-\udf5c\udf64\udf65\udf6d-\udf6f\udf75-\udfff]|\ud805[\udc5a\udc5c\udc5e-\udc7f\udcc8-\udccf\udcda-\udd7f\uddb6\uddb7\uddde-\uddff\ude45-\ude4f\ude5a-\ude5f\ude6d-\ude7f\udeb8-\udebf\udeca-\udeff\udf1a-\udf1c\udf2c-\udf2f\udf40-\udfff]|\ud806[\udc00-\udc9f\udcf3-\udcfe\udd00-\udebf\udef9-\udfff]|\ud807[\udc09\udc37\udc46-\udc4f\udc6d-\udc6f\udc90\udc91\udca8\udcb7-\udfff]|\ud808[\udf9a-\udfff]|\ud809[\udc6f\udc75-\udc7f\udd44-\udfff]|[\ud80a\ud80b\ud80e-\ud810\ud812-\ud819\ud823-\ud82b\ud82d\ud82e\ud830-\ud833\ud837\ud839\ud83f\ud874-\ud87d\ud87f-\udb3f\udb41-\udb7f][\udc00-\udfff]|\ud80d[\udc2f-\udfff]|\ud811[\ude47-\udfff]|\ud81a[\ude39-\ude3f\ude5f\ude6a-\ude6d\ude70-\udecf\udeee\udeef\udef6-\udeff\udf46-\udf4f\udf5a\udf62\udf78-\udf7c\udf90-\udfff]|\ud81b[\udc00-\udeff\udf45-\udf4f\udf7f-\udf8e\udfa0-\udfdf\udfe1-\udfff]|\ud821[\udfed-\udfff]|\ud822[\udef3-\udfff]|\ud82c[\udc02-\udfff]|\ud82f[\udc6b-\udc6f\udc7d-\udc7f\udc89-\udc8f\udc9a\udc9b\udca4-\udfff]|\ud834[\udcf6-\udcff\udd27\udd28\udde9-\uddff\ude46-\udeff\udf57-\udf5f\udf72-\udfff]|\ud835[\udc55\udc9d\udca0\udca1\udca3\udca4\udca7\udca8\udcad\udcba\udcbc\udcc4\udd06\udd0b\udd0c\udd15\udd1d\udd3a\udd3f\udd45\udd47-\udd49\udd51\udea6\udea7\udfcc\udfcd]|\ud836[\ude8c-\ude9a\udea0\udeb0-\udfff]|\ud838[\udc07\udc19\udc1a\udc22\udc25\udc2b-\udfff]|\ud83a[\udcc5\udcc6\udcd7-\udcff\udd4b-\udd4f\udd5a-\udd5d\udd60-\udfff]|\ud83b[\udc00-\uddff\ude04\ude20\ude23\ude25\ude26\ude28\ude33\ude38\ude3a\ude3c-\ude41\ude43-\ude46\ude48\ude4a\ude4c\ude50\ude53\ude55\ude56\ude58\ude5a\ude5c\ude5e\ude60\ude63\ude65\ude66\ude6b\ude73\ude78\ude7d\ude7f\ude8a\ude9c-\udea0\udea4\udeaa\udebc-\udeef\udef2-\udfff]|\ud83c[\udc2c-\udc2f\udc94-\udc9f\udcaf\udcb0\udcc0\udcd0\udcf6-\udcff\udd0d-\udd0f\udd2f\udd6c-\udd6f\uddad-\udde5\ude03-\ude0f\ude3c-\ude3f\ude49-\ude4f\ude52-\udeff]|\ud83d[\uded3-\udedf\udeed-\udeef\udef7-\udeff\udf74-\udf7f\udfd5-\udfff]|\ud83e[\udc0c-\udc0f\udc48-\udc4f\udc5a-\udc5f\udc88-\udc8f\udcae-\udd0f\udd1f\udd28-\udd2f\udd31\udd32\udd3f\udd4c-\udd4f\udd5f-\udd7f\udd92-\uddbf\uddc1-\udfff]|\ud869[\uded7-\udeff]|\ud86d[\udf35-\udf3f]|\ud86e[\udc1e\udc1f]|\ud873[\udea2-\udfff]|\ud87e[\ude1e-\udfff]|\udb40[\udc00\udc02-\udc1f\udc80-\udcff\uddf0-\udfff]|[\udbbf\udbff][\udffe\udfff]"},{name:"Co",alias:"Private_Use",bmp:"-",astral:"[\udb80-\udbbe\udbc0-\udbfe][\udc00-\udfff]|[\udbbf\udbff][\udc00-\udffd]"},{name:"Cs",alias:"Surrogate",bmp:"\ud800-\udfff"},{name:"L",alias:"Letter",bmp:"A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠ-ࢴࢶ-ࢽऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡૹଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘ-ౚౠౡಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖൟ-ൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛱ-ᛸᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢄᢇ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᲀ-ᲈᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎↃↄⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々〆〱-〵〻〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿕ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚝꚠ-ꛥꜗ-ꜟꜢ-ꞈꞋ-ꞮꞰ-ꞷꟷ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꣽꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭥꭰ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ",astral:"\ud800[\udc00-\udc0b\udc0d-\udc26\udc28-\udc3a\udc3c\udc3d\udc3f-\udc4d\udc50-\udc5d\udc80-\udcfa\ude80-\ude9c\udea0-\uded0\udf00-\udf1f\udf30-\udf40\udf42-\udf49\udf50-\udf75\udf80-\udf9d\udfa0-\udfc3\udfc8-\udfcf]|\ud801[\udc00-\udc9d\udcb0-\udcd3\udcd8-\udcfb\udd00-\udd27\udd30-\udd63\ude00-\udf36\udf40-\udf55\udf60-\udf67]|\ud802[\udc00-\udc05\udc08\udc0a-\udc35\udc37\udc38\udc3c\udc3f-\udc55\udc60-\udc76\udc80-\udc9e\udce0-\udcf2\udcf4\udcf5\udd00-\udd15\udd20-\udd39\udd80-\uddb7\uddbe\uddbf\ude00\ude10-\ude13\ude15-\ude17\ude19-\ude33\ude60-\ude7c\ude80-\ude9c\udec0-\udec7\udec9-\udee4\udf00-\udf35\udf40-\udf55\udf60-\udf72\udf80-\udf91]|\ud803[\udc00-\udc48\udc80-\udcb2\udcc0-\udcf2]|\ud804[\udc03-\udc37\udc83-\udcaf\udcd0-\udce8\udd03-\udd26\udd50-\udd72\udd76\udd83-\uddb2\uddc1-\uddc4\uddda\udddc\ude00-\ude11\ude13-\ude2b\ude80-\ude86\ude88\ude8a-\ude8d\ude8f-\ude9d\ude9f-\udea8\udeb0-\udede\udf05-\udf0c\udf0f\udf10\udf13-\udf28\udf2a-\udf30\udf32\udf33\udf35-\udf39\udf3d\udf50\udf5d-\udf61]|\ud805[\udc00-\udc34\udc47-\udc4a\udc80-\udcaf\udcc4\udcc5\udcc7\udd80-\uddae\uddd8-\udddb\ude00-\ude2f\ude44\ude80-\udeaa\udf00-\udf19]|\ud806[\udca0-\udcdf\udcff\udec0-\udef8]|\ud807[\udc00-\udc08\udc0a-\udc2e\udc40\udc72-\udc8f]|\ud808[\udc00-\udf99]|\ud809[\udc80-\udd43]|[\ud80c\ud81c-\ud820\ud840-\ud868\ud86a-\ud86c\ud86f-\ud872][\udc00-\udfff]|\ud80d[\udc00-\udc2e]|\ud811[\udc00-\ude46]|\ud81a[\udc00-\ude38\ude40-\ude5e\uded0-\udeed\udf00-\udf2f\udf40-\udf43\udf63-\udf77\udf7d-\udf8f]|\ud81b[\udf00-\udf44\udf50\udf93-\udf9f\udfe0]|\ud821[\udc00-\udfec]|\ud822[\udc00-\udef2]|\ud82c[\udc00\udc01]|\ud82f[\udc00-\udc6a\udc70-\udc7c\udc80-\udc88\udc90-\udc99]|\ud835[\udc00-\udc54\udc56-\udc9c\udc9e\udc9f\udca2\udca5\udca6\udca9-\udcac\udcae-\udcb9\udcbb\udcbd-\udcc3\udcc5-\udd05\udd07-\udd0a\udd0d-\udd14\udd16-\udd1c\udd1e-\udd39\udd3b-\udd3e\udd40-\udd44\udd46\udd4a-\udd50\udd52-\udea5\udea8-\udec0\udec2-\udeda\udedc-\udefa\udefc-\udf14\udf16-\udf34\udf36-\udf4e\udf50-\udf6e\udf70-\udf88\udf8a-\udfa8\udfaa-\udfc2\udfc4-\udfcb]|\ud83a[\udc00-\udcc4\udd00-\udd43]|\ud83b[\ude00-\ude03\ude05-\ude1f\ude21\ude22\ude24\ude27\ude29-\ude32\ude34-\ude37\ude39\ude3b\ude42\ude47\ude49\ude4b\ude4d-\ude4f\ude51\ude52\ude54\ude57\ude59\ude5b\ude5d\ude5f\ude61\ude62\ude64\ude67-\ude6a\ude6c-\ude72\ude74-\ude77\ude79-\ude7c\ude7e\ude80-\ude89\ude8b-\ude9b\udea1-\udea3\udea5-\udea9\udeab-\udebb]|\ud869[\udc00-\uded6\udf00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d\udc20-\udfff]|\ud873[\udc00-\udea1]|\ud87e[\udc00-\ude1d]"},{name:"Ll",alias:"Lowercase_Letter",bmp:"a-zµß-öø-ÿāăąćĉċčďđēĕėęěĝğġģĥħĩīĭįıĳĵķĸĺļľŀłńņňŉŋōŏőœŕŗřśŝşšţťŧũūŭůűųŵŷźżž-ƀƃƅƈƌƍƒƕƙ-ƛƞơƣƥƨƪƫƭưƴƶƹƺƽ-ƿǆǉǌǎǐǒǔǖǘǚǜǝǟǡǣǥǧǩǫǭǯǰǳǵǹǻǽǿȁȃȅȇȉȋȍȏȑȓȕȗșțȝȟȡȣȥȧȩȫȭȯȱȳ-ȹȼȿɀɂɇɉɋɍɏ-ʓʕ-ʯͱͳͷͻ-ͽΐά-ώϐϑϕ-ϗϙϛϝϟϡϣϥϧϩϫϭϯ-ϳϵϸϻϼа-џѡѣѥѧѩѫѭѯѱѳѵѷѹѻѽѿҁҋҍҏґғҕҗҙқҝҟҡңҥҧҩҫҭүұҳҵҷҹһҽҿӂӄӆӈӊӌӎӏӑӓӕӗәӛӝӟӡӣӥӧөӫӭӯӱӳӵӷӹӻӽӿԁԃԅԇԉԋԍԏԑԓԕԗԙԛԝԟԡԣԥԧԩԫԭԯա-ևᏸ-ᏽᲀ-ᲈᴀ-ᴫᵫ-ᵷᵹ-ᶚḁḃḅḇḉḋḍḏḑḓḕḗḙḛḝḟḡḣḥḧḩḫḭḯḱḳḵḷḹḻḽḿṁṃṅṇṉṋṍṏṑṓṕṗṙṛṝṟṡṣṥṧṩṫṭṯṱṳṵṷṹṻṽṿẁẃẅẇẉẋẍẏẑẓẕ-ẝẟạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹỻỽỿ-ἇἐ-ἕἠ-ἧἰ-ἷὀ-ὅὐ-ὗὠ-ὧὰ-ώᾀ-ᾇᾐ-ᾗᾠ-ᾧᾰ-ᾴᾶᾷιῂ-ῄῆῇῐ-ΐῖῗῠ-ῧῲ-ῴῶῷℊℎℏℓℯℴℹℼℽⅆ-ⅉⅎↄⰰ-ⱞⱡⱥⱦⱨⱪⱬⱱⱳⱴⱶ-ⱻⲁⲃⲅⲇⲉⲋⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱⲳⲵⲷⲹⲻⲽⲿⳁⳃⳅⳇⳉⳋⳍⳏⳑⳓⳕⳗⳙⳛⳝⳟⳡⳣⳤⳬⳮⳳⴀ-ⴥⴧⴭꙁꙃꙅꙇꙉꙋꙍꙏꙑꙓꙕꙗꙙꙛꙝꙟꙡꙣꙥꙧꙩꙫꙭꚁꚃꚅꚇꚉꚋꚍꚏꚑꚓꚕꚗꚙꚛꜣꜥꜧꜩꜫꜭꜯ-ꜱꜳꜵꜷꜹꜻꜽꜿꝁꝃꝅꝇꝉꝋꝍꝏꝑꝓꝕꝗꝙꝛꝝꝟꝡꝣꝥꝧꝩꝫꝭꝯꝱ-ꝸꝺꝼꝿꞁꞃꞅꞇꞌꞎꞑꞓ-ꞕꞗꞙꞛꞝꞟꞡꞣꞥꞧꞩꞵꞷꟺꬰ-ꭚꭠ-ꭥꭰ-ꮿﬀ-ﬆﬓ-ﬗａ-ｚ",astral:"\ud801[\udc28-\udc4f\udcd8-\udcfb]|\ud803[\udcc0-\udcf2]|\ud806[\udcc0-\udcdf]|\ud835[\udc1a-\udc33\udc4e-\udc54\udc56-\udc67\udc82-\udc9b\udcb6-\udcb9\udcbb\udcbd-\udcc3\udcc5-\udccf\udcea-\udd03\udd1e-\udd37\udd52-\udd6b\udd86-\udd9f\uddba-\uddd3\uddee-\ude07\ude22-\ude3b\ude56-\ude6f\ude8a-\udea5\udec2-\udeda\udedc-\udee1\udefc-\udf14\udf16-\udf1b\udf36-\udf4e\udf50-\udf55\udf70-\udf88\udf8a-\udf8f\udfaa-\udfc2\udfc4-\udfc9\udfcb]|\ud83a[\udd22-\udd43]"},{name:"Lm",alias:"Modifier_Letter",bmp:"ʰ-ˁˆ-ˑˠ-ˤˬˮʹͺՙـۥۦߴߵߺࠚࠤࠨॱๆໆჼៗᡃᪧᱸ-ᱽᴬ-ᵪᵸᶛ-ᶿⁱⁿₐ-ₜⱼⱽⵯⸯ々〱-〵〻ゝゞー-ヾꀕꓸ-ꓽꘌꙿꚜꚝꜗ-ꜟꝰꞈꟸꟹꧏꧦꩰꫝꫳꫴꭜ-ꭟｰﾞﾟ",astral:"\ud81a[\udf40-\udf43]|\ud81b[\udf93-\udf9f\udfe0]"},{name:"Lo",alias:"Other_Letter",bmp:"ªºƻǀ-ǃʔא-תװ-ײؠ-ؿف-يٮٯٱ-ۓەۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪࠀ-ࠕࡀ-ࡘࢠ-ࢴࢶ-ࢽऄ-हऽॐक़-ॡॲ-ঀঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡૹଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘ-ౚౠౡಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖൟ-ൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๅກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎა-ჺჽ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛱ-ᛸᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៜᠠ-ᡂᡄ-ᡷᢀ-ᢄᢇ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉᨀ-ᨖᨠ-ᩔᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱷᳩ-ᳬᳮ-ᳱᳵᳶℵ-ℸⴰ-ⵧⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ〆〼ぁ-ゖゟァ-ヺヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿕ꀀ-ꀔꀖ-ꒌꓐ-ꓷꔀ-ꘋꘐ-ꘟꘪꘫꙮꚠ-ꛥꞏꟷꟻ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꣽꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧠ-ꧤꧧ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩯꩱ-ꩶꩺꩾ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛꫜꫠ-ꫪꫲꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎יִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼｦ-ｯｱ-ﾝﾠ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ",astral:"\ud800[\udc00-\udc0b\udc0d-\udc26\udc28-\udc3a\udc3c\udc3d\udc3f-\udc4d\udc50-\udc5d\udc80-\udcfa\ude80-\ude9c\udea0-\uded0\udf00-\udf1f\udf30-\udf40\udf42-\udf49\udf50-\udf75\udf80-\udf9d\udfa0-\udfc3\udfc8-\udfcf]|\ud801[\udc50-\udc9d\udd00-\udd27\udd30-\udd63\ude00-\udf36\udf40-\udf55\udf60-\udf67]|\ud802[\udc00-\udc05\udc08\udc0a-\udc35\udc37\udc38\udc3c\udc3f-\udc55\udc60-\udc76\udc80-\udc9e\udce0-\udcf2\udcf4\udcf5\udd00-\udd15\udd20-\udd39\udd80-\uddb7\uddbe\uddbf\ude00\ude10-\ude13\ude15-\ude17\ude19-\ude33\ude60-\ude7c\ude80-\ude9c\udec0-\udec7\udec9-\udee4\udf00-\udf35\udf40-\udf55\udf60-\udf72\udf80-\udf91]|\ud803[\udc00-\udc48]|\ud804[\udc03-\udc37\udc83-\udcaf\udcd0-\udce8\udd03-\udd26\udd50-\udd72\udd76\udd83-\uddb2\uddc1-\uddc4\uddda\udddc\ude00-\ude11\ude13-\ude2b\ude80-\ude86\ude88\ude8a-\ude8d\ude8f-\ude9d\ude9f-\udea8\udeb0-\udede\udf05-\udf0c\udf0f\udf10\udf13-\udf28\udf2a-\udf30\udf32\udf33\udf35-\udf39\udf3d\udf50\udf5d-\udf61]|\ud805[\udc00-\udc34\udc47-\udc4a\udc80-\udcaf\udcc4\udcc5\udcc7\udd80-\uddae\uddd8-\udddb\ude00-\ude2f\ude44\ude80-\udeaa\udf00-\udf19]|\ud806[\udcff\udec0-\udef8]|\ud807[\udc00-\udc08\udc0a-\udc2e\udc40\udc72-\udc8f]|\ud808[\udc00-\udf99]|\ud809[\udc80-\udd43]|[\ud80c\ud81c-\ud820\ud840-\ud868\ud86a-\ud86c\ud86f-\ud872][\udc00-\udfff]|\ud80d[\udc00-\udc2e]|\ud811[\udc00-\ude46]|\ud81a[\udc00-\ude38\ude40-\ude5e\uded0-\udeed\udf00-\udf2f\udf63-\udf77\udf7d-\udf8f]|\ud81b[\udf00-\udf44\udf50]|\ud821[\udc00-\udfec]|\ud822[\udc00-\udef2]|\ud82c[\udc00\udc01]|\ud82f[\udc00-\udc6a\udc70-\udc7c\udc80-\udc88\udc90-\udc99]|\ud83a[\udc00-\udcc4]|\ud83b[\ude00-\ude03\ude05-\ude1f\ude21\ude22\ude24\ude27\ude29-\ude32\ude34-\ude37\ude39\ude3b\ude42\ude47\ude49\ude4b\ude4d-\ude4f\ude51\ude52\ude54\ude57\ude59\ude5b\ude5d\ude5f\ude61\ude62\ude64\ude67-\ude6a\ude6c-\ude72\ude74-\ude77\ude79-\ude7c\ude7e\ude80-\ude89\ude8b-\ude9b\udea1-\udea3\udea5-\udea9\udeab-\udebb]|\ud869[\udc00-\uded6\udf00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d\udc20-\udfff]|\ud873[\udc00-\udea1]|\ud87e[\udc00-\ude1d]"},{name:"Lt",alias:"Titlecase_Letter",bmp:"ǅǈǋǲᾈ-ᾏᾘ-ᾟᾨ-ᾯᾼῌῼ"},{name:"Lu",alias:"Uppercase_Letter",bmp:"A-ZÀ-ÖØ-ÞĀĂĄĆĈĊČĎĐĒĔĖĘĚĜĞĠĢĤĦĨĪĬĮİĲĴĶĹĻĽĿŁŃŅŇŊŌŎŐŒŔŖŘŚŜŞŠŢŤŦŨŪŬŮŰŲŴŶŸŹŻŽƁƂƄƆƇƉ-ƋƎ-ƑƓƔƖ-ƘƜƝƟƠƢƤƦƧƩƬƮƯƱ-ƳƵƷƸƼǄǇǊǍǏǑǓǕǗǙǛǞǠǢǤǦǨǪǬǮǱǴǶ-ǸǺǼǾȀȂȄȆȈȊȌȎȐȒȔȖȘȚȜȞȠȢȤȦȨȪȬȮȰȲȺȻȽȾɁɃ-ɆɈɊɌɎͰͲͶͿΆΈ-ΊΌΎΏΑ-ΡΣ-ΫϏϒ-ϔϘϚϜϞϠϢϤϦϨϪϬϮϴϷϹϺϽ-ЯѠѢѤѦѨѪѬѮѰѲѴѶѸѺѼѾҀҊҌҎҐҒҔҖҘҚҜҞҠҢҤҦҨҪҬҮҰҲҴҶҸҺҼҾӀӁӃӅӇӉӋӍӐӒӔӖӘӚӜӞӠӢӤӦӨӪӬӮӰӲӴӶӸӺӼӾԀԂԄԆԈԊԌԎԐԒԔԖԘԚԜԞԠԢԤԦԨԪԬԮԱ-ՖႠ-ჅჇჍᎠ-ᏵḀḂḄḆḈḊḌḎḐḒḔḖḘḚḜḞḠḢḤḦḨḪḬḮḰḲḴḶḸḺḼḾṀṂṄṆṈṊṌṎṐṒṔṖṘṚṜṞṠṢṤṦṨṪṬṮṰṲṴṶṸṺṼṾẀẂẄẆẈẊẌẎẐẒẔẞẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸỺỼỾἈ-ἏἘ-ἝἨ-ἯἸ-ἿὈ-ὍὙὛὝὟὨ-ὯᾸ-ΆῈ-ΉῘ-ΊῨ-ῬῸ-Ώℂℇℋ-ℍℐ-ℒℕℙ-ℝℤΩℨK-ℭℰ-ℳℾℿⅅↃⰀ-ⰮⱠⱢ-ⱤⱧⱩⱫⱭ-ⱰⱲⱵⱾ-ⲀⲂⲄⲆⲈⲊⲌⲎⲐⲒⲔⲖⲘⲚⲜⲞⲠⲢⲤⲦⲨⲪⲬⲮⲰⲲⲴⲶⲸⲺⲼⲾⳀⳂⳄⳆⳈⳊⳌⳎⳐⳒⳔⳖⳘⳚⳜⳞⳠⳢⳫⳭⳲꙀꙂꙄꙆꙈꙊꙌꙎꙐꙒꙔꙖꙘꙚꙜꙞꙠꙢꙤꙦꙨꙪꙬꚀꚂꚄꚆꚈꚊꚌꚎꚐꚒꚔꚖꚘꚚꜢꜤꜦꜨꜪꜬꜮꜲꜴꜶꜸꜺꜼꜾꝀꝂꝄꝆꝈꝊꝌꝎꝐꝒꝔꝖꝘꝚꝜꝞꝠꝢꝤꝦꝨꝪꝬꝮꝹꝻꝽꝾꞀꞂꞄꞆꞋꞍꞐꞒꞖꞘꞚꞜꞞꞠꞢꞤꞦꞨꞪ-ꞮꞰ-ꞴꞶＡ-Ｚ",astral:"\ud801[\udc00-\udc27\udcb0-\udcd3]|\ud803[\udc80-\udcb2]|\ud806[\udca0-\udcbf]|\ud835[\udc00-\udc19\udc34-\udc4d\udc68-\udc81\udc9c\udc9e\udc9f\udca2\udca5\udca6\udca9-\udcac\udcae-\udcb5\udcd0-\udce9\udd04\udd05\udd07-\udd0a\udd0d-\udd14\udd16-\udd1c\udd38\udd39\udd3b-\udd3e\udd40-\udd44\udd46\udd4a-\udd50\udd6c-\udd85\udda0-\uddb9\uddd4-\udded\ude08-\ude21\ude3c-\ude55\ude70-\ude89\udea8-\udec0\udee2-\udefa\udf1c-\udf34\udf56-\udf6e\udf90-\udfa8\udfca]|\ud83a[\udd00-\udd21]"},{name:"M",alias:"Mark",bmp:"̀-ͯ҃-҉֑-ׇֽֿׁׂׅׄؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ܑۭܰ-݊ަ-ް߫-߳ࠖ-࠙ࠛ-ࠣࠥ-ࠧࠩ-࡙࠭-࡛ࣔ-ࣣ࣡-ःऺ-़ा-ॏ॑-ॗॢॣঁ-ঃ়া-ৄেৈো-্ৗৢৣਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑੰੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢૣଁ-ଃ଼ା-ୄେୈୋ-୍ୖୗୢୣஂா-ூெ-ைொ-்ௗఀ-ఃా-ౄె-ైొ-్ౕౖౢౣಁ-ಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢೣഁ-ഃാ-ൄെ-ൈൊ-്ൗൢൣංඃ්ා-ුූෘ-ෟෲෳัิ-ฺ็-๎ັິ-ູົຼ່-ໍ༹༘༙༵༷༾༿ཱ-྄྆྇ྍ-ྗྙ-ྼ࿆ါ-ှၖ-ၙၞ-ၠၢ-ၤၧ-ၭၱ-ၴႂ-ႍႏႚ-ႝ፝-፟ᜒ-᜔ᜲ-᜴ᝒᝓᝲᝳ឴-៓៝᠋-᠍ᢅᢆᢩᤠ-ᤫᤰ-᤻ᨗ-ᨛᩕ-ᩞ᩠-᩿᩼᪰-᪾ᬀ-ᬄ᬴-᭄᭫-᭳ᮀ-ᮂᮡ-ᮭ᯦-᯳ᰤ-᰷᳐-᳔᳒-᳨᳭ᳲ-᳴᳸᳹᷀-᷵᷻-᷿⃐-⃰⳯-⵿⳱ⷠ-〪ⷿ-゙゚〯꙯-꙲ꙴ-꙽ꚞꚟ꛰꛱ꠂ꠆ꠋꠣ-ꠧꢀꢁꢴ-ꣅ꣠-꣱ꤦ-꤭ꥇ-꥓ꦀ-ꦃ꦳-꧀ꧥꨩ-ꨶꩃꩌꩍꩻ-ꩽꪰꪲ-ꪴꪷꪸꪾ꪿꫁ꫫ-ꫯꫵ꫶ꯣ-ꯪ꯬꯭ﬞ︀-️︠-︯",astral:"\ud800[\uddfd\udee0\udf76-\udf7a]|\ud802[\ude01-\ude03\ude05\ude06\ude0c-\ude0f\ude38-\ude3a\ude3f\udee5\udee6]|\ud804[\udc00-\udc02\udc38-\udc46\udc7f-\udc82\udcb0-\udcba\udd00-\udd02\udd27-\udd34\udd73\udd80-\udd82\uddb3-\uddc0\uddca-\uddcc\ude2c-\ude37\ude3e\udedf-\udeea\udf00-\udf03\udf3c\udf3e-\udf44\udf47\udf48\udf4b-\udf4d\udf57\udf62\udf63\udf66-\udf6c\udf70-\udf74]|\ud805[\udc35-\udc46\udcb0-\udcc3\uddaf-\uddb5\uddb8-\uddc0\udddc\udddd\ude30-\ude40\udeab-\udeb7\udf1d-\udf2b]|\ud807[\udc2f-\udc36\udc38-\udc3f\udc92-\udca7\udca9-\udcb6]|\ud81a[\udef0-\udef4\udf30-\udf36]|\ud81b[\udf51-\udf7e\udf8f-\udf92]|\ud82f[\udc9d\udc9e]|\ud834[\udd65-\udd69\udd6d-\udd72\udd7b-\udd82\udd85-\udd8b\uddaa-\uddad\ude42-\ude44]|\ud836[\ude00-\ude36\ude3b-\ude6c\ude75\ude84\ude9b-\ude9f\udea1-\udeaf]|\ud838[\udc00-\udc06\udc08-\udc18\udc1b-\udc21\udc23\udc24\udc26-\udc2a]|\ud83a[\udcd0-\udcd6\udd44-\udd4a]|\udb40[\udd00-\uddef]"},{name:"Mc",alias:"Spacing_Mark",bmp:"ःऻा-ीॉ-ौॎॏংঃা-ীেৈোৌৗਃਾ-ੀઃા-ીૉોૌଂଃାୀେୈୋୌୗாிுூெ-ைொ-ௌௗఁ-ఃు-ౄಂಃಾೀ-ೄೇೈೊೋೕೖംഃാ-ീെ-ൈൊ-ൌൗංඃා-ෑෘ-ෟෲෳ༾༿ཿါာေးျြၖၗၢ-ၤၧ-ၭႃႄႇ-ႌႏႚ-ႜាើ-ៅះៈᤣ-ᤦᤩ-ᤫᤰᤱᤳ-ᤸᨙᨚᩕᩗᩡᩣᩤᩭ-ᩲᬄᬵᬻᬽ-ᭁᭃ᭄ᮂᮡᮦᮧ᮪ᯧᯪ-ᯬᯮ᯲᯳ᰤ-ᰫᰴᰵ᳡ᳲᳳ〮〯ꠣꠤꠧꢀꢁꢴ-ꣃꥒ꥓ꦃꦴꦵꦺꦻꦽ-꧀ꨯꨰꨳꨴꩍꩻꩽꫫꫮꫯꫵꯣꯤꯦꯧꯩꯪ꯬",astral:"\ud804[\udc00\udc02\udc82\udcb0-\udcb2\udcb7\udcb8\udd2c\udd82\uddb3-\uddb5\uddbf\uddc0\ude2c-\ude2e\ude32\ude33\ude35\udee0-\udee2\udf02\udf03\udf3e\udf3f\udf41-\udf44\udf47\udf48\udf4b-\udf4d\udf57\udf62\udf63]|\ud805[\udc35-\udc37\udc40\udc41\udc45\udcb0-\udcb2\udcb9\udcbb-\udcbe\udcc1\uddaf-\uddb1\uddb8-\uddbb\uddbe\ude30-\ude32\ude3b\ude3c\ude3e\udeac\udeae\udeaf\udeb6\udf20\udf21\udf26]|\ud807[\udc2f\udc3e\udca9\udcb1\udcb4]|\ud81b[\udf51-\udf7e]|\ud834[\udd65\udd66\udd6d-\udd72]"},{name:"Me",alias:"Enclosing_Mark",bmp:"҈҉᪾⃝-⃠⃢-⃤꙰-꙲"},{name:"Mn",alias:"Nonspacing_Mark",bmp:"̀-ͯ҃-֑҇-ׇֽֿׁׂׅׄؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ܑۭܰ-݊ަ-ް߫-߳ࠖ-࠙ࠛ-ࠣࠥ-ࠧࠩ-࡙࠭-࡛ࣔ-ࣣ࣡-ंऺ़ु-ै्॑-ॗॢॣঁ়ু-ৄ্ৢৣਁਂ਼ੁੂੇੈੋ-੍ੑੰੱੵઁં઼ુ-ૅેૈ્ૢૣଁ଼ିୁ-ୄ୍ୖୢୣஂீ்ఀా-ీె-ైొ-్ౕౖౢౣಁ಼ಿೆೌ್ೢೣഁു-ൄ്ൢൣ්ි-ුූัิ-ฺ็-๎ັິ-ູົຼ່-ໍཱ༹༘༙༵༷-ཾྀ-྄྆྇ྍ-ྗྙ-ྼ࿆ိ-ူဲ-့္်ွှၘၙၞ-ၠၱ-ၴႂႅႆႍႝ፝-፟ᜒ-᜔ᜲ-᜴ᝒᝓᝲᝳ឴឵ិ-ួំ៉-៓៝᠋-᠍ᢅᢆᢩᤠ-ᤢᤧᤨᤲ᤹-᤻ᨘᨗᨛᩖᩘ-ᩞ᩠ᩢᩥ-ᩬᩳ-᩿᩼᪰-᪽ᬀ-ᬃ᬴ᬶ-ᬺᬼᭂ᭫-᭳ᮀᮁᮢ-ᮥᮨᮩ᮫-ᮭ᯦ᯨᯩᯭᯯ-ᯱᰬ-ᰳᰶ᰷᳐-᳔᳒-᳢᳠-᳨᳭᳴᳸᳹᷀-᷵᷻-᷿⃐-⃥⃜⃡-⃰⳯-⵿⳱ⷠ-〪ⷿ-゙゚〭꙯ꙴ-꙽ꚞꚟ꛰꛱ꠂ꠆ꠋꠥꠦ꣄ꣅ꣠-꣱ꤦ-꤭ꥇ-ꥑꦀ-ꦂ꦳ꦶ-ꦹꦼꧥꨩ-ꨮꨱꨲꨵꨶꩃꩌꩼꪰꪲ-ꪴꪷꪸꪾ꪿꫁ꫬꫭ꫶ꯥꯨ꯭ﬞ︀-️︠-︯",astral:"\ud800[\uddfd\udee0\udf76-\udf7a]|\ud802[\ude01-\ude03\ude05\ude06\ude0c-\ude0f\ude38-\ude3a\ude3f\udee5\udee6]|\ud804[\udc01\udc38-\udc46\udc7f-\udc81\udcb3-\udcb6\udcb9\udcba\udd00-\udd02\udd27-\udd2b\udd2d-\udd34\udd73\udd80\udd81\uddb6-\uddbe\uddca-\uddcc\ude2f-\ude31\ude34\ude36\ude37\ude3e\udedf\udee3-\udeea\udf00\udf01\udf3c\udf40\udf66-\udf6c\udf70-\udf74]|\ud805[\udc38-\udc3f\udc42-\udc44\udc46\udcb3-\udcb8\udcba\udcbf\udcc0\udcc2\udcc3\uddb2-\uddb5\uddbc\uddbd\uddbf\uddc0\udddc\udddd\ude33-\ude3a\ude3d\ude3f\ude40\udeab\udead\udeb0-\udeb5\udeb7\udf1d-\udf1f\udf22-\udf25\udf27-\udf2b]|\ud807[\udc30-\udc36\udc38-\udc3d\udc3f\udc92-\udca7\udcaa-\udcb0\udcb2\udcb3\udcb5\udcb6]|\ud81a[\udef0-\udef4\udf30-\udf36]|\ud81b[\udf8f-\udf92]|\ud82f[\udc9d\udc9e]|\ud834[\udd67-\udd69\udd7b-\udd82\udd85-\udd8b\uddaa-\uddad\ude42-\ude44]|\ud836[\ude00-\ude36\ude3b-\ude6c\ude75\ude84\ude9b-\ude9f\udea1-\udeaf]|\ud838[\udc00-\udc06\udc08-\udc18\udc1b-\udc21\udc23\udc24\udc26-\udc2a]|\ud83a[\udcd0-\udcd6\udd44-\udd4a]|\udb40[\udd00-\uddef]"},{name:"N",alias:"Number",bmp:"0-9²³¹¼-¾٠-٩۰-۹߀-߉०-९০-৯৴-৹੦-੯૦-૯୦-୯୲-୷௦-௲౦-౯౸-౾೦-೯൘-൞൦-൸෦-෯๐-๙໐-໙༠-༳၀-၉႐-႙፩-፼ᛮ-ᛰ០-៩៰-៹᠐-᠙᥆-᥏᧐-᧚᪀-᪉᪐-᪙᭐-᭙᮰-᮹᱀-᱉᱐-᱙⁰⁴-⁹₀-₉⅐-ↂↅ-↉①-⒛⓪-⓿❶-➓⳽〇〡-〩〸-〺㆒-㆕㈠-㈩㉈-㉏㉑-㉟㊀-㊉㊱-㊿꘠-꘩ꛦ-ꛯ꠰-꠵꣐-꣙꤀-꤉꧐-꧙꧰-꧹꩐-꩙꯰-꯹０-９",astral:"\ud800[\udd07-\udd33\udd40-\udd78\udd8a\udd8b\udee1-\udefb\udf20-\udf23\udf41\udf4a\udfd1-\udfd5]|\ud801[\udca0-\udca9]|\ud802[\udc58-\udc5f\udc79-\udc7f\udca7-\udcaf\udcfb-\udcff\udd16-\udd1b\uddbc\uddbd\uddc0-\uddcf\uddd2-\uddff\ude40-\ude47\ude7d\ude7e\ude9d-\ude9f\udeeb-\udeef\udf58-\udf5f\udf78-\udf7f\udfa9-\udfaf]|\ud803[\udcfa-\udcff\ude60-\ude7e]|\ud804[\udc52-\udc6f\udcf0-\udcf9\udd36-\udd3f\uddd0-\uddd9\udde1-\uddf4\udef0-\udef9]|\ud805[\udc50-\udc59\udcd0-\udcd9\ude50-\ude59\udec0-\udec9\udf30-\udf3b]|\ud806[\udce0-\udcf2]|\ud807[\udc50-\udc6c]|\ud809[\udc00-\udc6e]|\ud81a[\ude60-\ude69\udf50-\udf59\udf5b-\udf61]|\ud834[\udf60-\udf71]|\ud835[\udfce-\udfff]|\ud83a[\udcc7-\udccf\udd50-\udd59]|\ud83c[\udd00-\udd0c]"},{name:"Nd",alias:"Decimal_Number",bmp:"0-9٠-٩۰-۹߀-߉०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯෦-෯๐-๙໐-໙༠-༩၀-၉႐-႙០-៩᠐-᠙᥆-᥏᧐-᧙᪀-᪉᪐-᪙᭐-᭙᮰-᮹᱀-᱉᱐-᱙꘠-꘩꣐-꣙꤀-꤉꧐-꧙꧰-꧹꩐-꩙꯰-꯹０-９",astral:"\ud801[\udca0-\udca9]|\ud804[\udc66-\udc6f\udcf0-\udcf9\udd36-\udd3f\uddd0-\uddd9\udef0-\udef9]|\ud805[\udc50-\udc59\udcd0-\udcd9\ude50-\ude59\udec0-\udec9\udf30-\udf39]|\ud806[\udce0-\udce9]|\ud807[\udc50-\udc59]|\ud81a[\ude60-\ude69\udf50-\udf59]|\ud835[\udfce-\udfff]|\ud83a[\udd50-\udd59]"},{name:"Nl",alias:"Letter_Number",bmp:"ᛮ-ᛰⅠ-ↂↅ-ↈ〇〡-〩〸-〺ꛦ-ꛯ",astral:"\ud800[\udd40-\udd74\udf41\udf4a\udfd1-\udfd5]|\ud809[\udc00-\udc6e]"},{name:"No",alias:"Other_Number",bmp:"²³¹¼-¾৴-৹୲-୷௰-௲౸-౾൘-൞൰-൸༪-༳፩-፼៰-៹᧚⁰⁴-⁹₀-₉⅐-⅟↉①-⒛⓪-⓿❶-➓⳽㆒-㆕㈠-㈩㉈-㉏㉑-㉟㊀-㊉㊱-㊿꠰-꠵",astral:"\ud800[\udd07-\udd33\udd75-\udd78\udd8a\udd8b\udee1-\udefb\udf20-\udf23]|\ud802[\udc58-\udc5f\udc79-\udc7f\udca7-\udcaf\udcfb-\udcff\udd16-\udd1b\uddbc\uddbd\uddc0-\uddcf\uddd2-\uddff\ude40-\ude47\ude7d\ude7e\ude9d-\ude9f\udeeb-\udeef\udf58-\udf5f\udf78-\udf7f\udfa9-\udfaf]|\ud803[\udcfa-\udcff\ude60-\ude7e]|\ud804[\udc52-\udc65\udde1-\uddf4]|\ud805[\udf3a\udf3b]|\ud806[\udcea-\udcf2]|\ud807[\udc5a-\udc6c]|\ud81a[\udf5b-\udf61]|\ud834[\udf60-\udf71]|\ud83a[\udcc7-\udccf]|\ud83c[\udd00-\udd0c]"},{name:"P",alias:"Punctuation",bmp:"!-#%-\\x2A,-/:;\\x3F@\\x5B-\\x5D_\\x7B}¡§«¶·»¿;·՚-՟։֊־׀׃׆׳״؉؊،؍؛؞؟٪-٭۔܀-܍߷-߹࠰-࠾࡞।॥॰૰෴๏๚๛༄-༒༔༺-༽྅࿐-࿔࿙࿚၊-၏჻፠-፨᐀᙭᙮᚛᚜᛫-᛭᜵᜶។-៖៘-៚᠀-᠊᥄᥅᨞᨟᪠-᪦᪨-᪭᭚-᭠᯼-᯿᰻-᰿᱾᱿᳀-᳇᳓‐-‧‰-⁃⁅-⁑⁓-⁞⁽⁾₍₎⌈-⌋〈〉❨-❵⟅⟆⟦-⟯⦃-⦘⧘-⧛⧼⧽⳹-⳼⳾⳿⵰⸀-⸮⸰-⹄、-〃〈-】〔-〟〰〽゠・꓾꓿꘍-꘏꙳꙾꛲-꛷꡴-꡷꣎꣏꣸-꣺꣼꤮꤯꥟꧁-꧍꧞꧟꩜-꩟꫞꫟꫰꫱꯫﴾﴿︐-︙︰-﹒﹔-﹡﹣﹨﹪﹫！-＃％-＊，-／：；？＠［-］＿｛｝｟-･",astral:"\ud800[\udd00-\udd02\udf9f\udfd0]|𐕯|\ud802[\udc57\udd1f\udd3f\ude50-\ude58\ude7f\udef0-\udef6\udf39-\udf3f\udf99-\udf9c]|\ud804[\udc47-\udc4d\udcbb\udcbc\udcbe-\udcc1\udd40-\udd43\udd74\udd75\uddc5-\uddc9\uddcd\udddb\udddd-\udddf\ude38-\ude3d\udea9]|\ud805[\udc4b-\udc4f\udc5b\udc5d\udcc6\uddc1-\uddd7\ude41-\ude43\ude60-\ude6c\udf3c-\udf3e]|\ud807[\udc41-\udc45\udc70\udc71]|\ud809[\udc70-\udc74]|\ud81a[\ude6e\ude6f\udef5\udf37-\udf3b\udf44]|𛲟|\ud836[\ude87-\ude8b]|\ud83a[\udd5e\udd5f]"},{name:"Pc",alias:"Connector_Punctuation",bmp:"_‿⁀⁔︳︴﹍-﹏＿"},{name:"Pd",alias:"Dash_Punctuation",bmp:"\\x2D֊־᐀᠆‐-―⸗⸚⸺⸻⹀〜〰゠︱︲﹘﹣－"},{name:"Pe",alias:"Close_Punctuation",bmp:"\\x29\\x5D}༻༽᚜⁆⁾₎⌉⌋〉❩❫❭❯❱❳❵⟆⟧⟩⟫⟭⟯⦄⦆⦈⦊⦌⦎⦐⦒⦔⦖⦘⧙⧛⧽⸣⸥⸧⸩〉》」』】〕〗〙〛〞〟﴾︘︶︸︺︼︾﹀﹂﹄﹈﹚﹜﹞）］｝｠｣"},{name:"Pf",alias:"Final_Punctuation",bmp:"»’”›⸃⸅⸊⸍⸝⸡"},{name:"Pi",alias:"Initial_Punctuation",bmp:"«‘‛“‟‹⸂⸄⸉⸌⸜⸠"},{name:"Po",alias:"Other_Punctuation",bmp:"!-#%-'\\x2A,\\x2E/:;\\x3F@\\x5C¡§¶·¿;·՚-՟։׀׃׆׳״؉؊،؍؛؞؟٪-٭۔܀-܍߷-߹࠰-࠾࡞।॥॰૰෴๏๚๛༄-༒༔྅࿐-࿔࿙࿚၊-၏჻፠-፨᙭᙮᛫-᛭᜵᜶។-៖៘-៚᠀-᠅᠇-᠊᥄᥅᨞᨟᪠-᪦᪨-᪭᭚-᭠᯼-᯿᰻-᰿᱾᱿᳀-᳇᳓‖‗†-‧‰-‸※-‾⁁-⁃⁇-⁑⁓⁕-⁞⳹-⳼⳾⳿⵰⸀⸁⸆-⸈⸋⸎-⸖⸘⸙⸛⸞⸟⸪-⸮⸰-⸹⸼-⸿⹁⹃⹄、-〃〽・꓾꓿꘍-꘏꙳꙾꛲-꛷꡴-꡷꣎꣏꣸-꣺꣼꤮꤯꥟꧁-꧍꧞꧟꩜-꩟꫞꫟꫰꫱꯫︐-︖︙︰﹅﹆﹉-﹌﹐-﹒﹔-﹗﹟-﹡﹨﹪﹫！-＃％-＇＊，．／：；？＠＼｡､･",astral:"\ud800[\udd00-\udd02\udf9f\udfd0]|𐕯|\ud802[\udc57\udd1f\udd3f\ude50-\ude58\ude7f\udef0-\udef6\udf39-\udf3f\udf99-\udf9c]|\ud804[\udc47-\udc4d\udcbb\udcbc\udcbe-\udcc1\udd40-\udd43\udd74\udd75\uddc5-\uddc9\uddcd\udddb\udddd-\udddf\ude38-\ude3d\udea9]|\ud805[\udc4b-\udc4f\udc5b\udc5d\udcc6\uddc1-\uddd7\ude41-\ude43\ude60-\ude6c\udf3c-\udf3e]|\ud807[\udc41-\udc45\udc70\udc71]|\ud809[\udc70-\udc74]|\ud81a[\ude6e\ude6f\udef5\udf37-\udf3b\udf44]|𛲟|\ud836[\ude87-\ude8b]|\ud83a[\udd5e\udd5f]"},{name:"Ps",alias:"Open_Punctuation",bmp:"\\x28\\x5B\\x7B༺༼᚛‚„⁅⁽₍⌈⌊〈❨❪❬❮❰❲❴⟅⟦⟨⟪⟬⟮⦃⦅⦇⦉⦋⦍⦏⦑⦓⦕⦗⧘⧚⧼⸢⸤⸦⸨⹂〈《「『【〔〖〘〚〝﴿︗︵︷︹︻︽︿﹁﹃﹇﹙﹛﹝（［｛｟｢"},{name:"S",alias:"Symbol",bmp:"\\x24\\x2B<->\\x5E`\\x7C~¢-¦¨©¬®-±´¸×÷˂-˅˒-˟˥-˫˭˯-˿͵΄΅϶҂֍-֏؆-؈؋؎؏۞۩۽۾߶৲৳৺৻૱୰௳-௺౿൏൹฿༁-༃༓༕-༗༚-༟༴༶༸྾-࿅࿇-࿌࿎࿏࿕-࿘႞႟᎐-᎙៛᥀᧞-᧿᭡-᭪᭴-᭼᾽᾿-῁῍-῏῝-῟῭-`´῾⁄⁒⁺-⁼₊-₌₠-₾℀℁℃-℆℈℉℔№-℘℞-℣℥℧℩℮℺℻⅀-⅄⅊-⅍⅏↊↋←-⌇⌌-⌨⌫-⏾␀-␦⑀-⑊⒜-ⓩ─-❧➔-⟄⟇-⟥⟰-⦂⦙-⧗⧜-⧻⧾-⭳⭶-⮕⮘-⮹⮽-⯈⯊-⯑⯬-⯯⳥-⳪⺀-⺙⺛-⻳⼀-⿕⿰-⿻〄〒〓〠〶〷〾〿゛゜㆐㆑㆖-㆟㇀-㇣㈀-㈞㈪-㉇㉐㉠-㉿㊊-㊰㋀-㋾㌀-㏿䷀-䷿꒐-꓆꜀-꜖꜠꜡꞉꞊꠨-꠫꠶-꠹꩷-꩹꭛﬩﮲-﯁﷼﷽﹢﹤-﹦﹩＄＋＜-＞＾｀｜～￠-￦￨-￮￼�",astral:"\ud800[\udd37-\udd3f\udd79-\udd89\udd8c-\udd8e\udd90-\udd9b\udda0\uddd0-\uddfc]|\ud802[\udc77\udc78\udec8]|𑜿|\ud81a[\udf3c-\udf3f\udf45]|𛲜|\ud834[\udc00-\udcf5\udd00-\udd26\udd29-\udd64\udd6a-\udd6c\udd83\udd84\udd8c-\udda9\uddae-\udde8\ude00-\ude41\ude45\udf00-\udf56]|\ud835[\udec1\udedb\udefb\udf15\udf35\udf4f\udf6f\udf89\udfa9\udfc3]|\ud836[\udc00-\uddff\ude37-\ude3a\ude6d-\ude74\ude76-\ude83\ude85\ude86]|\ud83b[\udef0\udef1]|\ud83c[\udc00-\udc2b\udc30-\udc93\udca0-\udcae\udcb1-\udcbf\udcc1-\udccf\udcd1-\udcf5\udd10-\udd2e\udd30-\udd6b\udd70-\uddac\udde6-\ude02\ude10-\ude3b\ude40-\ude48\ude50\ude51\udf00-\udfff]|\ud83d[\udc00-\uded2\udee0-\udeec\udef0-\udef6\udf00-\udf73\udf80-\udfd4]|\ud83e[\udc00-\udc0b\udc10-\udc47\udc50-\udc59\udc60-\udc87\udc90-\udcad\udd10-\udd1e\udd20-\udd27\udd30\udd33-\udd3e\udd40-\udd4b\udd50-\udd5e\udd80-\udd91\uddc0]"},{name:"Sc",alias:"Currency_Symbol",bmp:"\\x24¢-¥֏؋৲৳৻૱௹฿៛₠-₾꠸﷼﹩＄￠￡￥￦"},{name:"Sk",alias:"Modifier_Symbol",bmp:"\\x5E`¨¯´¸˂-˅˒-˟˥-˫˭˯-˿͵΄΅᾽᾿-῁῍-῏῝-῟῭-`´῾゛゜꜀-꜖꜠꜡꞉꞊꭛﮲-﯁＾｀￣",astral:"\ud83c[\udffb-\udfff]"},{name:"Sm",alias:"Math_Symbol",bmp:"\\x2B<->\\x7C~¬±×÷϶؆-؈⁄⁒⁺-⁼₊-₌℘⅀-⅄⅋←-↔↚↛↠↣↦↮⇎⇏⇒⇔⇴-⋿⌠⌡⍼⎛-⎳⏜-⏡▷◁◸-◿♯⟀-⟄⟇-⟥⟰-⟿⤀-⦂⦙-⧗⧜-⧻⧾-⫿⬰-⭄⭇-⭌﬩﹢﹤-﹦＋＜-＞｜～￢￩-￬",astral:"\ud835[\udec1\udedb\udefb\udf15\udf35\udf4f\udf6f\udf89\udfa9\udfc3]|\ud83b[\udef0\udef1]"},{name:"So",alias:"Other_Symbol",bmp:"¦©®°҂֍֎؎؏۞۩۽۾߶৺୰௳-௸௺౿൏൹༁-༃༓༕-༗༚-༟༴༶༸྾-࿅࿇-࿌࿎࿏࿕-࿘႞႟᎐-᎙᥀᧞-᧿᭡-᭪᭴-᭼℀℁℃-℆℈℉℔№℗℞-℣℥℧℩℮℺℻⅊⅌⅍⅏↊↋↕-↙↜-↟↡↢↤↥↧-↭↯-⇍⇐⇑⇓⇕-⇳⌀-⌇⌌-⌟⌢-⌨⌫-⍻⍽-⎚⎴-⏛⏢-⏾␀-␦⑀-⑊⒜-ⓩ─-▶▸-◀◂-◷☀-♮♰-❧➔-➿⠀-⣿⬀-⬯⭅⭆⭍-⭳⭶-⮕⮘-⮹⮽-⯈⯊-⯑⯬-⯯⳥-⳪⺀-⺙⺛-⻳⼀-⿕⿰-⿻〄〒〓〠〶〷〾〿㆐㆑㆖-㆟㇀-㇣㈀-㈞㈪-㉇㉐㉠-㉿㊊-㊰㋀-㋾㌀-㏿䷀-䷿꒐-꓆꠨-꠫꠶꠷꠹꩷-꩹﷽￤￨￭￮￼�",astral:"\ud800[\udd37-\udd3f\udd79-\udd89\udd8c-\udd8e\udd90-\udd9b\udda0\uddd0-\uddfc]|\ud802[\udc77\udc78\udec8]|𑜿|\ud81a[\udf3c-\udf3f\udf45]|𛲜|\ud834[\udc00-\udcf5\udd00-\udd26\udd29-\udd64\udd6a-\udd6c\udd83\udd84\udd8c-\udda9\uddae-\udde8\ude00-\ude41\ude45\udf00-\udf56]|\ud836[\udc00-\uddff\ude37-\ude3a\ude6d-\ude74\ude76-\ude83\ude85\ude86]|\ud83c[\udc00-\udc2b\udc30-\udc93\udca0-\udcae\udcb1-\udcbf\udcc1-\udccf\udcd1-\udcf5\udd10-\udd2e\udd30-\udd6b\udd70-\uddac\udde6-\ude02\ude10-\ude3b\ude40-\ude48\ude50\ude51\udf00-\udffa]|\ud83d[\udc00-\uded2\udee0-\udeec\udef0-\udef6\udf00-\udf73\udf80-\udfd4]|\ud83e[\udc00-\udc0b\udc10-\udc47\udc50-\udc59\udc60-\udc87\udc90-\udcad\udd10-\udd1e\udd20-\udd27\udd30\udd33-\udd3e\udd40-\udd4b\udd50-\udd5e\udd80-\udd91\uddc0]"},{name:"Z",alias:"Separator",bmp:"    - \u2028\u2029  　"},{name:"Zl",alias:"Line_Separator",bmp:"\u2028"},{name:"Zp",alias:"Paragraph_Separator",bmp:"\u2029"},{name:"Zs",alias:"Space_Separator",bmp:"    -   　"}])}},{}],6:[function(e,t,n){
/*!
 * XRegExp Unicode Properties 3.2.0
 * <xregexp.com>
 * Steven Levithan (c) 2012-2017 MIT License
 * Unicode data by Mathias Bynens <mathiasbynens.be>
 */
t.exports=function(e){"use strict";if(!e.addUnicodeData)throw new ReferenceError("Unicode Base must be loaded before Unicode Properties");var t=[{name:"ASCII",bmp:"\0-"},{name:"Alphabetic",bmp:"A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͅͰ-ʹͶͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙա-ևְ-ׇֽֿׁׂׅׄא-תװ-ײؐ-ؚؠ-ٗٙ-ٟٮ-ۓە-ۜۡ-ۭۨ-ۯۺ-ۼۿܐ-ܿݍ-ޱߊ-ߪߴߵߺࠀ-ࠗࠚ-ࠬࡀ-ࡘࢠ-ࢴࢶ-ࢽࣔ-ࣣࣟ-ࣰࣩ-ऻऽ-ौॎ-ॐॕ-ॣॱ-ঃঅ-ঌএঐও-নপ-রলশ-হঽ-ৄেৈোৌৎৗড়ঢ়য়-ৣৰৱਁ-ਃਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਾ-ੂੇੈੋੌੑਖ਼-ੜਫ਼ੰ-ੵઁ-ઃઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽ-ૅે-ૉોૌૐૠ-ૣૹଁ-ଃଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽ-ୄେୈୋୌୖୗଡ଼ଢ଼ୟ-ୣୱஂஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹா-ூெ-ைொ-ௌௐௗఀ-ఃఅ-ఌఎ-ఐఒ-నప-హఽ-ౄె-ైొ-ౌౕౖౘ-ౚౠ-ౣಀ-ಃಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽ-ೄೆ-ೈೊ-ೌೕೖೞೠ-ೣೱೲഁ-ഃഅ-ഌഎ-ഐഒ-ഺഽ-ൄെ-ൈൊ-ൌൎൔ-ൗൟ-ൣൺ-ൿංඃඅ-ඖක-නඳ-රලව-ෆා-ුූෘ-ෟෲෳก-ฺเ-ๆํກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ູົ-ຽເ-ໄໆໍໜ-ໟༀཀ-ཇཉ-ཬཱ-ཱྀྈ-ྗྙ-ྼက-ံးျ-ဿၐ-ၢၥ-ၨၮ-ႆႎႜႝႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፟ᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜌᜎ-ᜓᜠ-ᜳᝀ-ᝓᝠ-ᝬᝮ-ᝰᝲᝳក-ឳា-ៈៗៜᠠ-ᡷᢀ-ᢪᢰ-ᣵᤀ-ᤞᤠ-ᤫᤰ-ᤸᥐ-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉᨀ-ᨛᨠ-ᩞᩡ-ᩴᪧᬀ-ᬳᬵ-ᭃᭅ-ᭋᮀ-ᮩᮬ-ᮯᮺ-ᯥᯧ-ᯱᰀ-ᰵᱍ-ᱏᱚ-ᱽᲀ-ᲈᳩ-ᳬᳮ-ᳳᳵᳶᴀ-ᶿᷧ-ᷴḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⒶ-ⓩⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⷠ-ⷿⸯ々-〇〡-〩〱-〵〸-〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿕ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙴ-ꙻꙿ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꞮꞰ-ꞷꟷ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠧꡀ-ꡳꢀ-ꣃꣅꣲ-ꣷꣻꣽꤊ-ꤪꤰ-ꥒꥠ-ꥼꦀ-ꦲꦴ-ꦿꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨶꩀ-ꩍꩠ-ꩶꩺꩾ-ꪾꫀꫂꫛ-ꫝꫠ-ꫯꫲ-ꫵꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭥꭰ-ꯪ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ",astral:"\ud800[\udc00-\udc0b\udc0d-\udc26\udc28-\udc3a\udc3c\udc3d\udc3f-\udc4d\udc50-\udc5d\udc80-\udcfa\udd40-\udd74\ude80-\ude9c\udea0-\uded0\udf00-\udf1f\udf30-\udf4a\udf50-\udf7a\udf80-\udf9d\udfa0-\udfc3\udfc8-\udfcf\udfd1-\udfd5]|\ud801[\udc00-\udc9d\udcb0-\udcd3\udcd8-\udcfb\udd00-\udd27\udd30-\udd63\ude00-\udf36\udf40-\udf55\udf60-\udf67]|\ud802[\udc00-\udc05\udc08\udc0a-\udc35\udc37\udc38\udc3c\udc3f-\udc55\udc60-\udc76\udc80-\udc9e\udce0-\udcf2\udcf4\udcf5\udd00-\udd15\udd20-\udd39\udd80-\uddb7\uddbe\uddbf\ude00-\ude03\ude05\ude06\ude0c-\ude13\ude15-\ude17\ude19-\ude33\ude60-\ude7c\ude80-\ude9c\udec0-\udec7\udec9-\udee4\udf00-\udf35\udf40-\udf55\udf60-\udf72\udf80-\udf91]|\ud803[\udc00-\udc48\udc80-\udcb2\udcc0-\udcf2]|\ud804[\udc00-\udc45\udc82-\udcb8\udcd0-\udce8\udd00-\udd32\udd50-\udd72\udd76\udd80-\uddbf\uddc1-\uddc4\uddda\udddc\ude00-\ude11\ude13-\ude34\ude37\ude3e\ude80-\ude86\ude88\ude8a-\ude8d\ude8f-\ude9d\ude9f-\udea8\udeb0-\udee8\udf00-\udf03\udf05-\udf0c\udf0f\udf10\udf13-\udf28\udf2a-\udf30\udf32\udf33\udf35-\udf39\udf3d-\udf44\udf47\udf48\udf4b\udf4c\udf50\udf57\udf5d-\udf63]|\ud805[\udc00-\udc41\udc43-\udc45\udc47-\udc4a\udc80-\udcc1\udcc4\udcc5\udcc7\udd80-\uddb5\uddb8-\uddbe\uddd8-\udddd\ude00-\ude3e\ude40\ude44\ude80-\udeb5\udf00-\udf19\udf1d-\udf2a]|\ud806[\udca0-\udcdf\udcff\udec0-\udef8]|\ud807[\udc00-\udc08\udc0a-\udc36\udc38-\udc3e\udc40\udc72-\udc8f\udc92-\udca7\udca9-\udcb6]|\ud808[\udc00-\udf99]|\ud809[\udc00-\udc6e\udc80-\udd43]|[\ud80c\ud81c-\ud820\ud840-\ud868\ud86a-\ud86c\ud86f-\ud872][\udc00-\udfff]|\ud80d[\udc00-\udc2e]|\ud811[\udc00-\ude46]|\ud81a[\udc00-\ude38\ude40-\ude5e\uded0-\udeed\udf00-\udf36\udf40-\udf43\udf63-\udf77\udf7d-\udf8f]|\ud81b[\udf00-\udf44\udf50-\udf7e\udf93-\udf9f\udfe0]|\ud821[\udc00-\udfec]|\ud822[\udc00-\udef2]|\ud82c[\udc00\udc01]|\ud82f[\udc00-\udc6a\udc70-\udc7c\udc80-\udc88\udc90-\udc99\udc9e]|\ud835[\udc00-\udc54\udc56-\udc9c\udc9e\udc9f\udca2\udca5\udca6\udca9-\udcac\udcae-\udcb9\udcbb\udcbd-\udcc3\udcc5-\udd05\udd07-\udd0a\udd0d-\udd14\udd16-\udd1c\udd1e-\udd39\udd3b-\udd3e\udd40-\udd44\udd46\udd4a-\udd50\udd52-\udea5\udea8-\udec0\udec2-\udeda\udedc-\udefa\udefc-\udf14\udf16-\udf34\udf36-\udf4e\udf50-\udf6e\udf70-\udf88\udf8a-\udfa8\udfaa-\udfc2\udfc4-\udfcb]|\ud838[\udc00-\udc06\udc08-\udc18\udc1b-\udc21\udc23\udc24\udc26-\udc2a]|\ud83a[\udc00-\udcc4\udd00-\udd43\udd47]|\ud83b[\ude00-\ude03\ude05-\ude1f\ude21\ude22\ude24\ude27\ude29-\ude32\ude34-\ude37\ude39\ude3b\ude42\ude47\ude49\ude4b\ude4d-\ude4f\ude51\ude52\ude54\ude57\ude59\ude5b\ude5d\ude5f\ude61\ude62\ude64\ude67-\ude6a\ude6c-\ude72\ude74-\ude77\ude79-\ude7c\ude7e\ude80-\ude89\ude8b-\ude9b\udea1-\udea3\udea5-\udea9\udeab-\udebb]|\ud83c[\udd30-\udd49\udd50-\udd69\udd70-\udd89]|\ud869[\udc00-\uded6\udf00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d\udc20-\udfff]|\ud873[\udc00-\udea1]|\ud87e[\udc00-\ude1d]"},{name:"Any",isBmpLast:!0,bmp:"\0-￿",astral:"[\ud800-\udbff][\udc00-\udfff]"},{name:"Default_Ignorable_Code_Point",bmp:"­͏؜ᅟᅠ឴឵᠋-᠎​-‏‪-‮⁠-⁯ㅤ︀-️\ufeffﾠ￰-￸",astral:"\ud82f[\udca0-\udca3]|\ud834[\udd73-\udd7a]|[\udb40-\udb43][\udc00-\udfff]"},{name:"Lowercase",bmp:"a-zªµºß-öø-ÿāăąćĉċčďđēĕėęěĝğġģĥħĩīĭįıĳĵķĸĺļľŀłńņňŉŋōŏőœŕŗřśŝşšţťŧũūŭůűųŵŷźżž-ƀƃƅƈƌƍƒƕƙ-ƛƞơƣƥƨƪƫƭưƴƶƹƺƽ-ƿǆǉǌǎǐǒǔǖǘǚǜǝǟǡǣǥǧǩǫǭǯǰǳǵǹǻǽǿȁȃȅȇȉȋȍȏȑȓȕȗșțȝȟȡȣȥȧȩȫȭȯȱȳ-ȹȼȿɀɂɇɉɋɍɏ-ʓʕ-ʸˀˁˠ-ˤͅͱͳͷͺ-ͽΐά-ώϐϑϕ-ϗϙϛϝϟϡϣϥϧϩϫϭϯ-ϳϵϸϻϼа-џѡѣѥѧѩѫѭѯѱѳѵѷѹѻѽѿҁҋҍҏґғҕҗҙқҝҟҡңҥҧҩҫҭүұҳҵҷҹһҽҿӂӄӆӈӊӌӎӏӑӓӕӗәӛӝӟӡӣӥӧөӫӭӯӱӳӵӷӹӻӽӿԁԃԅԇԉԋԍԏԑԓԕԗԙԛԝԟԡԣԥԧԩԫԭԯա-ևᏸ-ᏽᲀ-ᲈᴀ-ᶿḁḃḅḇḉḋḍḏḑḓḕḗḙḛḝḟḡḣḥḧḩḫḭḯḱḳḵḷḹḻḽḿṁṃṅṇṉṋṍṏṑṓṕṗṙṛṝṟṡṣṥṧṩṫṭṯṱṳṵṷṹṻṽṿẁẃẅẇẉẋẍẏẑẓẕ-ẝẟạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹỻỽỿ-ἇἐ-ἕἠ-ἧἰ-ἷὀ-ὅὐ-ὗὠ-ὧὰ-ώᾀ-ᾇᾐ-ᾗᾠ-ᾧᾰ-ᾴᾶᾷιῂ-ῄῆῇῐ-ΐῖῗῠ-ῧῲ-ῴῶῷⁱⁿₐ-ₜℊℎℏℓℯℴℹℼℽⅆ-ⅉⅎⅰ-ⅿↄⓐ-ⓩⰰ-ⱞⱡⱥⱦⱨⱪⱬⱱⱳⱴⱶ-ⱽⲁⲃⲅⲇⲉⲋⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱⲳⲵⲷⲹⲻⲽⲿⳁⳃⳅⳇⳉⳋⳍⳏⳑⳓⳕⳗⳙⳛⳝⳟⳡⳣⳤⳬⳮⳳⴀ-ⴥⴧⴭꙁꙃꙅꙇꙉꙋꙍꙏꙑꙓꙕꙗꙙꙛꙝꙟꙡꙣꙥꙧꙩꙫꙭꚁꚃꚅꚇꚉꚋꚍꚏꚑꚓꚕꚗꚙꚛ-ꚝꜣꜥꜧꜩꜫꜭꜯ-ꜱꜳꜵꜷꜹꜻꜽꜿꝁꝃꝅꝇꝉꝋꝍꝏꝑꝓꝕꝗꝙꝛꝝꝟꝡꝣꝥꝧꝩꝫꝭꝯ-ꝸꝺꝼꝿꞁꞃꞅꞇꞌꞎꞑꞓ-ꞕꞗꞙꞛꞝꞟꞡꞣꞥꞧꞩꞵꞷꟸ-ꟺꬰ-ꭚꭜ-ꭥꭰ-ꮿﬀ-ﬆﬓ-ﬗａ-ｚ",astral:"\ud801[\udc28-\udc4f\udcd8-\udcfb]|\ud803[\udcc0-\udcf2]|\ud806[\udcc0-\udcdf]|\ud835[\udc1a-\udc33\udc4e-\udc54\udc56-\udc67\udc82-\udc9b\udcb6-\udcb9\udcbb\udcbd-\udcc3\udcc5-\udccf\udcea-\udd03\udd1e-\udd37\udd52-\udd6b\udd86-\udd9f\uddba-\uddd3\uddee-\ude07\ude22-\ude3b\ude56-\ude6f\ude8a-\udea5\udec2-\udeda\udedc-\udee1\udefc-\udf14\udf16-\udf1b\udf36-\udf4e\udf50-\udf55\udf70-\udf88\udf8a-\udf8f\udfaa-\udfc2\udfc4-\udfc9\udfcb]|\ud83a[\udd22-\udd43]"},{name:"Noncharacter_Code_Point",bmp:"﷐-﷯￾￿",astral:"[\ud83f\ud87f\ud8bf\ud8ff\ud93f\ud97f\ud9bf\ud9ff\uda3f\uda7f\udabf\udaff\udb3f\udb7f\udbbf\udbff][\udffe\udfff]"},{name:"Uppercase",bmp:"A-ZÀ-ÖØ-ÞĀĂĄĆĈĊČĎĐĒĔĖĘĚĜĞĠĢĤĦĨĪĬĮİĲĴĶĹĻĽĿŁŃŅŇŊŌŎŐŒŔŖŘŚŜŞŠŢŤŦŨŪŬŮŰŲŴŶŸŹŻŽƁƂƄƆƇƉ-ƋƎ-ƑƓƔƖ-ƘƜƝƟƠƢƤƦƧƩƬƮƯƱ-ƳƵƷƸƼǄǇǊǍǏǑǓǕǗǙǛǞǠǢǤǦǨǪǬǮǱǴǶ-ǸǺǼǾȀȂȄȆȈȊȌȎȐȒȔȖȘȚȜȞȠȢȤȦȨȪȬȮȰȲȺȻȽȾɁɃ-ɆɈɊɌɎͰͲͶͿΆΈ-ΊΌΎΏΑ-ΡΣ-ΫϏϒ-ϔϘϚϜϞϠϢϤϦϨϪϬϮϴϷϹϺϽ-ЯѠѢѤѦѨѪѬѮѰѲѴѶѸѺѼѾҀҊҌҎҐҒҔҖҘҚҜҞҠҢҤҦҨҪҬҮҰҲҴҶҸҺҼҾӀӁӃӅӇӉӋӍӐӒӔӖӘӚӜӞӠӢӤӦӨӪӬӮӰӲӴӶӸӺӼӾԀԂԄԆԈԊԌԎԐԒԔԖԘԚԜԞԠԢԤԦԨԪԬԮԱ-ՖႠ-ჅჇჍᎠ-ᏵḀḂḄḆḈḊḌḎḐḒḔḖḘḚḜḞḠḢḤḦḨḪḬḮḰḲḴḶḸḺḼḾṀṂṄṆṈṊṌṎṐṒṔṖṘṚṜṞṠṢṤṦṨṪṬṮṰṲṴṶṸṺṼṾẀẂẄẆẈẊẌẎẐẒẔẞẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸỺỼỾἈ-ἏἘ-ἝἨ-ἯἸ-ἿὈ-ὍὙὛὝὟὨ-ὯᾸ-ΆῈ-ΉῘ-ΊῨ-ῬῸ-Ώℂℇℋ-ℍℐ-ℒℕℙ-ℝℤΩℨK-ℭℰ-ℳℾℿⅅⅠ-ⅯↃⒶ-ⓏⰀ-ⰮⱠⱢ-ⱤⱧⱩⱫⱭ-ⱰⱲⱵⱾ-ⲀⲂⲄⲆⲈⲊⲌⲎⲐⲒⲔⲖⲘⲚⲜⲞⲠⲢⲤⲦⲨⲪⲬⲮⲰⲲⲴⲶⲸⲺⲼⲾⳀⳂⳄⳆⳈⳊⳌⳎⳐⳒⳔⳖⳘⳚⳜⳞⳠⳢⳫⳭⳲꙀꙂꙄꙆꙈꙊꙌꙎꙐꙒꙔꙖꙘꙚꙜꙞꙠꙢꙤꙦꙨꙪꙬꚀꚂꚄꚆꚈꚊꚌꚎꚐꚒꚔꚖꚘꚚꜢꜤꜦꜨꜪꜬꜮꜲꜴꜶꜸꜺꜼꜾꝀꝂꝄꝆꝈꝊꝌꝎꝐꝒꝔꝖꝘꝚꝜꝞꝠꝢꝤꝦꝨꝪꝬꝮꝹꝻꝽꝾꞀꞂꞄꞆꞋꞍꞐꞒꞖꞘꞚꞜꞞꞠꞢꞤꞦꞨꞪ-ꞮꞰ-ꞴꞶＡ-Ｚ",astral:"\ud801[\udc00-\udc27\udcb0-\udcd3]|\ud803[\udc80-\udcb2]|\ud806[\udca0-\udcbf]|\ud835[\udc00-\udc19\udc34-\udc4d\udc68-\udc81\udc9c\udc9e\udc9f\udca2\udca5\udca6\udca9-\udcac\udcae-\udcb5\udcd0-\udce9\udd04\udd05\udd07-\udd0a\udd0d-\udd14\udd16-\udd1c\udd38\udd39\udd3b-\udd3e\udd40-\udd44\udd46\udd4a-\udd50\udd6c-\udd85\udda0-\uddb9\uddd4-\udded\ude08-\ude21\ude3c-\ude55\ude70-\ude89\udea8-\udec0\udee2-\udefa\udf1c-\udf34\udf56-\udf6e\udf90-\udfa8\udfca]|\ud83a[\udd00-\udd21]|\ud83c[\udd30-\udd49\udd50-\udd69\udd70-\udd89]"},{name:"White_Space",bmp:"\t-\r    - \u2028\u2029  　"}];t.push({name:"Assigned",inverseOf:"Cn"}),e.addUnicodeData(t)}},{}],7:[function(e,t,n){
/*!
 * XRegExp Unicode Scripts 3.2.0
 * <xregexp.com>
 * Steven Levithan (c) 2010-2017 MIT License
 * Unicode data by Mathias Bynens <mathiasbynens.be>
 */
t.exports=function(e){"use strict";if(!e.addUnicodeData)throw new ReferenceError("Unicode Base must be loaded before Unicode Scripts");e.addUnicodeData([{name:"Adlam",astral:"\ud83a[\udd00-\udd4a\udd50-\udd59\udd5e\udd5f]"},{name:"Ahom",astral:"\ud805[\udf00-\udf19\udf1d-\udf2b\udf30-\udf3f]"},{name:"Anatolian_Hieroglyphs",astral:"\ud811[\udc00-\ude46]"},{name:"Arabic",bmp:"؀-؄؆-؋؍-ؚ؞ؠ-ؿف-يٖ-ٯٱ-ۜ۞-ۿݐ-ݿࢠ-ࢴࢶ-ࢽࣔ-ࣣ࣡-ࣿﭐ-﯁ﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-﷽ﹰ-ﹴﹶ-ﻼ",astral:"\ud803[\ude60-\ude7e]|\ud83b[\ude00-\ude03\ude05-\ude1f\ude21\ude22\ude24\ude27\ude29-\ude32\ude34-\ude37\ude39\ude3b\ude42\ude47\ude49\ude4b\ude4d-\ude4f\ude51\ude52\ude54\ude57\ude59\ude5b\ude5d\ude5f\ude61\ude62\ude64\ude67-\ude6a\ude6c-\ude72\ude74-\ude77\ude79-\ude7c\ude7e\ude80-\ude89\ude8b-\ude9b\udea1-\udea3\udea5-\udea9\udeab-\udebb\udef0\udef1]"},{name:"Armenian",bmp:"Ա-Ֆՙ-՟ա-և֊֍-֏ﬓ-ﬗ"},{name:"Avestan",astral:"\ud802[\udf00-\udf35\udf39-\udf3f]"},{name:"Balinese",bmp:"ᬀ-ᭋ᭐-᭼"},{name:"Bamum",bmp:"ꚠ-꛷",astral:"\ud81a[\udc00-\ude38]"},{name:"Bassa_Vah",astral:"\ud81a[\uded0-\udeed\udef0-\udef5]"},{name:"Batak",bmp:"ᯀ-᯳᯼-᯿"},{name:"Bengali",bmp:"ঀ-ঃঅ-ঌএঐও-নপ-রলশ-হ়-ৄেৈো-ৎৗড়ঢ়য়-ৣ০-৻"},{name:"Bhaiksuki",astral:"\ud807[\udc00-\udc08\udc0a-\udc36\udc38-\udc45\udc50-\udc6c]"},{name:"Bopomofo",bmp:"˪˫ㄅ-ㄭㆠ-ㆺ"},{name:"Brahmi",astral:"\ud804[\udc00-\udc4d\udc52-\udc6f\udc7f]"},{name:"Braille",bmp:"⠀-⣿"},{name:"Buginese",bmp:"ᨀ-ᨛ᨞᨟"},{name:"Buhid",bmp:"ᝀ-ᝓ"},{name:"Canadian_Aboriginal",bmp:"᐀-ᙿᢰ-ᣵ"},{name:"Carian",astral:"\ud800[\udea0-\uded0]"},{name:"Caucasian_Albanian",astral:"\ud801[\udd30-\udd63\udd6f]"},{name:"Chakma",astral:"\ud804[\udd00-\udd34\udd36-\udd43]"},{name:"Cham",bmp:"ꨀ-ꨶꩀ-ꩍ꩐-꩙꩜-꩟"},{name:"Cherokee",bmp:"Ꭰ-Ᏽᏸ-ᏽꭰ-ꮿ"},{name:"Common",bmp:"\0-@\\x5B-`\\x7B-©«-¹»-¿×÷ʹ-˟˥-˩ˬ-˿ʹ;΅·։؅،؛؜؟ـ۝࣢।॥฿࿕-࿘჻᛫-᛭᜵᜶᠂᠃᠅᳓᳡ᳩ-ᳬᳮ-ᳳᳵᳶ -​‎-⁤⁦-⁰⁴-⁾₀-₎₠-₾℀-℥℧-℩ℬ-ℱℳ-⅍⅏-⅟↉-↋←-⏾␀-␦⑀-⑊①-⟿⤀-⭳⭶-⮕⮘-⮹⮽-⯈⯊-⯑⯬-⯯⸀-⹄⿰-⿻　-〄〆〈-〠〰-〷〼-〿゛゜゠・ー㆐-㆟㇀-㇣㈠-㉟㉿-㋏㍘-㏿䷀-䷿꜀-꜡ꞈ-꞊꠰-꠹꤮ꧏ꭛﴾﴿︐-︙︰-﹒﹔-﹦﹨-﹫\ufeff！-＠［-｀｛-･ｰﾞﾟ￠-￦￨-￮￹-�",astral:"\ud800[\udd00-\udd02\udd07-\udd33\udd37-\udd3f\udd90-\udd9b\uddd0-\uddfc\udee1-\udefb]|\ud82f[\udca0-\udca3]|\ud834[\udc00-\udcf5\udd00-\udd26\udd29-\udd66\udd6a-\udd7a\udd83\udd84\udd8c-\udda9\uddae-\udde8\udf00-\udf56\udf60-\udf71]|\ud835[\udc00-\udc54\udc56-\udc9c\udc9e\udc9f\udca2\udca5\udca6\udca9-\udcac\udcae-\udcb9\udcbb\udcbd-\udcc3\udcc5-\udd05\udd07-\udd0a\udd0d-\udd14\udd16-\udd1c\udd1e-\udd39\udd3b-\udd3e\udd40-\udd44\udd46\udd4a-\udd50\udd52-\udea5\udea8-\udfcb\udfce-\udfff]|\ud83c[\udc00-\udc2b\udc30-\udc93\udca0-\udcae\udcb1-\udcbf\udcc1-\udccf\udcd1-\udcf5\udd00-\udd0c\udd10-\udd2e\udd30-\udd6b\udd70-\uddac\udde6-\uddff\ude01\ude02\ude10-\ude3b\ude40-\ude48\ude50\ude51\udf00-\udfff]|\ud83d[\udc00-\uded2\udee0-\udeec\udef0-\udef6\udf00-\udf73\udf80-\udfd4]|\ud83e[\udc00-\udc0b\udc10-\udc47\udc50-\udc59\udc60-\udc87\udc90-\udcad\udd10-\udd1e\udd20-\udd27\udd30\udd33-\udd3e\udd40-\udd4b\udd50-\udd5e\udd80-\udd91\uddc0]|\udb40[\udc01\udc20-\udc7f]"},{name:"Coptic",bmp:"Ϣ-ϯⲀ-ⳳ⳹-⳿"},{name:"Cuneiform",astral:"\ud808[\udc00-\udf99]|\ud809[\udc00-\udc6e\udc70-\udc74\udc80-\udd43]"},{name:"Cypriot",astral:"\ud802[\udc00-\udc05\udc08\udc0a-\udc35\udc37\udc38\udc3c\udc3f]"},{name:"Cyrillic",bmp:"Ѐ-҄҇-ԯᲀ-ᲈᴫᵸⷠ-ⷿꙀ-ꚟ︮︯"},{name:"Deseret",astral:"\ud801[\udc00-\udc4f]"},{name:"Devanagari",bmp:"ऀ-ॐ॓-ॣ०-ॿ꣠-ꣽ"},{name:"Duployan",astral:"\ud82f[\udc00-\udc6a\udc70-\udc7c\udc80-\udc88\udc90-\udc99\udc9c-\udc9f]"},{name:"Egyptian_Hieroglyphs",astral:"\ud80c[\udc00-\udfff]|\ud80d[\udc00-\udc2e]"},{name:"Elbasan",astral:"\ud801[\udd00-\udd27]"},{name:"Ethiopic",bmp:"ሀ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፝-፼ᎀ-᎙ⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮ"},{name:"Georgian",bmp:"Ⴀ-ჅჇჍა-ჺჼ-ჿⴀ-ⴥⴧⴭ"},{name:"Glagolitic",bmp:"Ⰰ-Ⱞⰰ-ⱞ",astral:"\ud838[\udc00-\udc06\udc08-\udc18\udc1b-\udc21\udc23\udc24\udc26-\udc2a]"},{name:"Gothic",astral:"\ud800[\udf30-\udf4a]"},{name:"Grantha",astral:"\ud804[\udf00-\udf03\udf05-\udf0c\udf0f\udf10\udf13-\udf28\udf2a-\udf30\udf32\udf33\udf35-\udf39\udf3c-\udf44\udf47\udf48\udf4b-\udf4d\udf50\udf57\udf5d-\udf63\udf66-\udf6c\udf70-\udf74]"},{name:"Greek",bmp:"Ͱ-ͳ͵-ͷͺ-ͽͿ΄ΆΈ-ΊΌΎ-ΡΣ-ϡϰ-Ͽᴦ-ᴪᵝ-ᵡᵦ-ᵪᶿἀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ῄῆ-ΐῖ-Ί῝-`ῲ-ῴῶ-῾Ωꭥ",astral:"\ud800[\udd40-\udd8e\udda0]|\ud834[\ude00-\ude45]"},{name:"Gujarati",bmp:"ઁ-ઃઅ-ઍએ-ઑઓ-નપ-રલળવ-હ઼-ૅે-ૉો-્ૐૠ-ૣ૦-૱ૹ"},{name:"Gurmukhi",bmp:"ਁ-ਃਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹ਼ਾ-ੂੇੈੋ-੍ੑਖ਼-ੜਫ਼੦-ੵ"},{name:"Han",bmp:"⺀-⺙⺛-⻳⼀-⿕々〇〡-〩〸-〻㐀-䶵一-鿕豈-舘並-龎",astral:"[\ud840-\ud868\ud86a-\ud86c\ud86f-\ud872][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d\udc20-\udfff]|\ud873[\udc00-\udea1]|\ud87e[\udc00-\ude1d]"},{name:"Hangul",bmp:"ᄀ-ᇿ〮〯ㄱ-ㆎ㈀-㈞㉠-㉾ꥠ-ꥼ가-힣ힰ-ퟆퟋ-ퟻﾠ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ"},{name:"Hanunoo",bmp:"ᜠ-᜴"},{name:"Hatran",astral:"\ud802[\udce0-\udcf2\udcf4\udcf5\udcfb-\udcff]"},{name:"Hebrew",bmp:"֑-ׇא-תװ-״יִ-זּטּ-לּמּנּסּףּפּצּ-ﭏ"},{name:"Hiragana",bmp:"ぁ-ゖゝ-ゟ",astral:"𛀁|🈀"},{name:"Imperial_Aramaic",astral:"\ud802[\udc40-\udc55\udc57-\udc5f]"},{name:"Inherited",bmp:"̀-ًͯ҅҆-ٰٕ॒॑᪰-᪾᳐-᳔᳒-᳢᳠-᳨᳭᳴᳸᳹᷀-᷵᷻-᷿‌‍⃐-〪⃰-゙゚〭︀-️︠-︭",astral:"\ud800[\uddfd\udee0]|\ud834[\udd67-\udd69\udd7b-\udd82\udd85-\udd8b\uddaa-\uddad]|\udb40[\udd00-\uddef]"},{name:"Inscriptional_Pahlavi",astral:"\ud802[\udf60-\udf72\udf78-\udf7f]"},{name:"Inscriptional_Parthian",astral:"\ud802[\udf40-\udf55\udf58-\udf5f]"},{name:"Javanese",bmp:"ꦀ-꧍꧐-꧙꧞꧟"},{name:"Kaithi",astral:"\ud804[\udc80-\udcc1]"},{name:"Kannada",bmp:"ಀ-ಃಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹ಼-ೄೆ-ೈೊ-್ೕೖೞೠ-ೣ೦-೯ೱೲ"},{name:"Katakana",bmp:"ァ-ヺヽ-ヿㇰ-ㇿ㋐-㋾㌀-㍗ｦ-ｯｱ-ﾝ",astral:"𛀀"},{name:"Kayah_Li",bmp:"꤀-꤭꤯"},{name:"Kharoshthi",astral:"\ud802[\ude00-\ude03\ude05\ude06\ude0c-\ude13\ude15-\ude17\ude19-\ude33\ude38-\ude3a\ude3f-\ude47\ude50-\ude58]"},{name:"Khmer",bmp:"ក-៝០-៩៰-៹᧠-᧿"},{name:"Khojki",astral:"\ud804[\ude00-\ude11\ude13-\ude3e]"},{name:"Khudawadi",astral:"\ud804[\udeb0-\udeea\udef0-\udef9]"},{name:"Lao",bmp:"ກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ູົ-ຽເ-ໄໆ່-ໍ໐-໙ໜ-ໟ"},{name:"Latin",bmp:"A-Za-zªºÀ-ÖØ-öø-ʸˠ-ˤᴀ-ᴥᴬ-ᵜᵢ-ᵥᵫ-ᵷᵹ-ᶾḀ-ỿⁱⁿₐ-ₜKÅℲⅎⅠ-ↈⱠ-ⱿꜢ-ꞇꞋ-ꞮꞰ-ꞷꟷ-ꟿꬰ-ꭚꭜ-ꭤﬀ-ﬆＡ-Ｚａ-ｚ"},{name:"Lepcha",bmp:"ᰀ-᰷᰻-᱉ᱍ-ᱏ"},{name:"Limbu",bmp:"ᤀ-ᤞᤠ-ᤫᤰ-᤻᥀᥄-᥏"},{name:"Linear_A",astral:"\ud801[\ude00-\udf36\udf40-\udf55\udf60-\udf67]"},{name:"Linear_B",astral:"\ud800[\udc00-\udc0b\udc0d-\udc26\udc28-\udc3a\udc3c\udc3d\udc3f-\udc4d\udc50-\udc5d\udc80-\udcfa]"},{name:"Lisu",bmp:"ꓐ-꓿"},{name:"Lycian",astral:"\ud800[\ude80-\ude9c]"},{name:"Lydian",astral:"\ud802[\udd20-\udd39\udd3f]"},{name:"Mahajani",astral:"\ud804[\udd50-\udd76]"},{name:"Malayalam",bmp:"ഁ-ഃഅ-ഌഎ-ഐഒ-ഺഽ-ൄെ-ൈൊ-൏ൔ-ൣ൦-ൿ"},{name:"Mandaic",bmp:"ࡀ-࡛࡞"},{name:"Manichaean",astral:"\ud802[\udec0-\udee6\udeeb-\udef6]"},{name:"Marchen",astral:"\ud807[\udc70-\udc8f\udc92-\udca7\udca9-\udcb6]"},{name:"Meetei_Mayek",bmp:"ꫠ-꫶ꯀ-꯭꯰-꯹"},{name:"Mende_Kikakui",astral:"\ud83a[\udc00-\udcc4\udcc7-\udcd6]"},{name:"Meroitic_Cursive",astral:"\ud802[\udda0-\uddb7\uddbc-\uddcf\uddd2-\uddff]"},{name:"Meroitic_Hieroglyphs",astral:"\ud802[\udd80-\udd9f]"},{name:"Miao",astral:"\ud81b[\udf00-\udf44\udf50-\udf7e\udf8f-\udf9f]"},{name:"Modi",astral:"\ud805[\ude00-\ude44\ude50-\ude59]"},{name:"Mongolian",bmp:"᠀᠁᠄᠆-᠎᠐-᠙ᠠ-ᡷᢀ-ᢪ",astral:"\ud805[\ude60-\ude6c]"},{name:"Mro",astral:"\ud81a[\ude40-\ude5e\ude60-\ude69\ude6e\ude6f]"},{name:"Multani",astral:"\ud804[\ude80-\ude86\ude88\ude8a-\ude8d\ude8f-\ude9d\ude9f-\udea9]"},{name:"Myanmar",bmp:"က-႟ꧠ-ꧾꩠ-ꩿ"},{name:"Nabataean",astral:"\ud802[\udc80-\udc9e\udca7-\udcaf]"},{name:"New_Tai_Lue",bmp:"ᦀ-ᦫᦰ-ᧉ᧐-᧚᧞᧟"},{name:"Newa",astral:"\ud805[\udc00-\udc59\udc5b\udc5d]"},{name:"Nko",bmp:"߀-ߺ"},{name:"Ogham",bmp:" -᚜"},{name:"Ol_Chiki",bmp:"᱐-᱿"},{name:"Old_Hungarian",astral:"\ud803[\udc80-\udcb2\udcc0-\udcf2\udcfa-\udcff]"},{name:"Old_Italic",astral:"\ud800[\udf00-\udf23]"},{name:"Old_North_Arabian",astral:"\ud802[\ude80-\ude9f]"},{name:"Old_Permic",astral:"\ud800[\udf50-\udf7a]"},{name:"Old_Persian",astral:"\ud800[\udfa0-\udfc3\udfc8-\udfd5]"},{name:"Old_South_Arabian",astral:"\ud802[\ude60-\ude7f]"},{name:"Old_Turkic",astral:"\ud803[\udc00-\udc48]"},{name:"Oriya",bmp:"ଁ-ଃଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହ଼-ୄେୈୋ-୍ୖୗଡ଼ଢ଼ୟ-ୣ୦-୷"},{name:"Osage",astral:"\ud801[\udcb0-\udcd3\udcd8-\udcfb]"},{name:"Osmanya",astral:"\ud801[\udc80-\udc9d\udca0-\udca9]"},{name:"Pahawh_Hmong",astral:"\ud81a[\udf00-\udf45\udf50-\udf59\udf5b-\udf61\udf63-\udf77\udf7d-\udf8f]"},{name:"Palmyrene",astral:"\ud802[\udc60-\udc7f]"},{name:"Pau_Cin_Hau",astral:"\ud806[\udec0-\udef8]"},{name:"Phags_Pa",bmp:"ꡀ-꡷"},{name:"Phoenician",astral:"\ud802[\udd00-\udd1b\udd1f]"},{name:"Psalter_Pahlavi",astral:"\ud802[\udf80-\udf91\udf99-\udf9c\udfa9-\udfaf]"},{name:"Rejang",bmp:"ꤰ-꥓꥟"},{name:"Runic",bmp:"ᚠ-ᛪᛮ-ᛸ"},{name:"Samaritan",bmp:"ࠀ-࠭࠰-࠾"},{name:"Saurashtra",bmp:"ꢀ-ꣅ꣎-꣙"},{name:"Sharada",astral:"\ud804[\udd80-\uddcd\uddd0-\udddf]"},{name:"Shavian",astral:"\ud801[\udc50-\udc7f]"},{name:"Siddham",astral:"\ud805[\udd80-\uddb5\uddb8-\udddd]"},{name:"SignWriting",astral:"\ud836[\udc00-\ude8b\ude9b-\ude9f\udea1-\udeaf]"},{name:"Sinhala",bmp:"ංඃඅ-ඖක-නඳ-රලව-ෆ්ා-ුූෘ-ෟ෦-෯ෲ-෴",astral:"\ud804[\udde1-\uddf4]"},{name:"Sora_Sompeng",astral:"\ud804[\udcd0-\udce8\udcf0-\udcf9]"},{name:"Sundanese",bmp:"ᮀ-ᮿ᳀-᳇"},{name:"Syloti_Nagri",bmp:"ꠀ-꠫"},{name:"Syriac",bmp:"܀-܍܏-݊ݍ-ݏ"},{name:"Tagalog",bmp:"ᜀ-ᜌᜎ-᜔"},{name:"Tagbanwa",bmp:"ᝠ-ᝬᝮ-ᝰᝲᝳ"},{name:"Tai_Le",bmp:"ᥐ-ᥭᥰ-ᥴ"},{name:"Tai_Tham",bmp:"ᨠ-ᩞ᩠-᩿᩼-᪉᪐-᪙᪠-᪭"},{name:"Tai_Viet",bmp:"ꪀ-ꫂꫛ-꫟"},{name:"Takri",astral:"\ud805[\ude80-\udeb7\udec0-\udec9]"},{name:"Tamil",bmp:"ஂஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹா-ூெ-ைொ-்ௐௗ௦-௺"},{name:"Tangut",astral:"𖿠|[\ud81c-\ud820][\udc00-\udfff]|\ud821[\udc00-\udfec]|\ud822[\udc00-\udef2]"},{name:"Telugu",bmp:"ఀ-ఃఅ-ఌఎ-ఐఒ-నప-హఽ-ౄె-ైొ-్ౕౖౘ-ౚౠ-ౣ౦-౯౸-౿"},{name:"Thaana",bmp:"ހ-ޱ"},{name:"Thai",bmp:"ก-ฺเ-๛"},{name:"Tibetan",bmp:"ༀ-ཇཉ-ཬཱ-ྗྙ-ྼ྾-࿌࿎-࿔࿙࿚"},{name:"Tifinagh",bmp:"ⴰ-ⵧⵯ⵰⵿"},{name:"Tirhuta",astral:"\ud805[\udc80-\udcc7\udcd0-\udcd9]"},{name:"Ugaritic",astral:"\ud800[\udf80-\udf9d\udf9f]"},{name:"Vai",bmp:"ꔀ-ꘫ"},{name:"Warang_Citi",astral:"\ud806[\udca0-\udcf2\udcff]"},{name:"Yi",bmp:"ꀀ-ꒌ꒐-꓆"}])}},{}],8:[function(e,t,n){var r=e("./xregexp");e("./addons/build")(r),e("./addons/matchrecursive")(r),e("./addons/unicode-base")(r),e("./addons/unicode-blocks")(r),e("./addons/unicode-categories")(r),e("./addons/unicode-properties")(r),e("./addons/unicode-scripts")(r),t.exports=r},{"./addons/build":1,"./addons/matchrecursive":2,"./addons/unicode-base":3,"./addons/unicode-blocks":4,"./addons/unicode-categories":5,"./addons/unicode-properties":6,"./addons/unicode-scripts":7,"./xregexp":9}],9:[function(e,t,n){
/*!
 * XRegExp 3.2.0
 * <xregexp.com>
 * Steven Levithan (c) 2007-2017 MIT License
 */
"use strict";var r="xregexp",i={astral:!1,natives:!1},o={exec:RegExp.prototype.exec,test:RegExp.prototype.test,match:String.prototype.match,replace:String.prototype.replace,split:String.prototype.split},a={},s={},u={},c=[],d="default",l="class",f={default:/\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9]\d*|x[\dA-Fa-f]{2}|u(?:[\dA-Fa-f]{4}|{[\dA-Fa-f]+})|c[A-Za-z]|[\s\S])|\(\?(?:[:=!]|<[=!])|[?*+]\?|{\d+(?:,\d*)?}\??|[\s\S]/,class:/\\(?:[0-3][0-7]{0,2}|[4-7][0-7]?|x[\dA-Fa-f]{2}|u(?:[\dA-Fa-f]{4}|{[\dA-Fa-f]+})|c[A-Za-z]|[\s\S])|[\s\S]/},p=/\$(?:{([\w$]+)}|(\d\d?|[\s\S]))/g,h=void 0===o.exec.call(/()??/,"")[1],m=void 0!==/x/.flags,_={}.toString;function v(e){var t=!0;try{new RegExp("",e)}catch(e){t=!1}return t}var y=v("u"),g=v("y"),b={g:!0,i:!0,m:!0,u:y,y:g};function w(e,t,n,i,o){var a;if(e[r]={captureNames:t},o)return e;if(e.__proto__)e.__proto__=C.prototype;else for(a in C.prototype)e[a]=C.prototype[a];return e[r].source=n,e[r].flags=i?i.split("").sort().join(""):i,e}function M(e){return o.replace.call(e,/([\s\S])(?=[\s\S]*\1)/g,"")}function k(e,t){if(!C.isRegExp(e))throw new TypeError("Type RegExp expected");var n=e[r]||{},i=function(e){return m?e.flags:o.exec.call(/\/([a-z]*)$/i,RegExp.prototype.toString.call(e))[1]}(e),a="",s="",u=null,c=null;return(t=t||{}).removeG&&(s+="g"),t.removeY&&(s+="y"),s&&(i=o.replace.call(i,new RegExp("["+s+"]+","g"),"")),t.addG&&(a+="g"),t.addY&&(a+="y"),a&&(i=M(i+a)),t.isInternalOnly||(void 0!==n.source&&(u=n.source),null!=n.flags&&(c=a?M(n.flags+a):n.flags)),e=w(new RegExp(t.source||e.source,i),function(e){return!(!e[r]||!e[r].captureNames)}(e)?n.captureNames.slice(0):null,u,c,t.isInternalOnly)}function x(e){return parseInt(e,16)}function S(e,t,n){return"("===e.input.charAt(e.index-1)||")"===e.input.charAt(e.index+e[0].length)||function(e,t,n,r){var i=n.indexOf("x")>-1?["\\s","#[^#\\n]*","\\(\\?#[^)]*\\)"]:["\\(\\?#[^)]*\\)"];return o.test.call(new RegExp("^(?:"+i.join("|")+")*(?:"+r+")"),e.slice(t))}(e.input,e.index+e[0].length,n,"[?*+]|{\\d+(?:,\\d*)?}")?"":"(?:)"}function L(e){return parseInt(e,10).toString(16)}function A(e,t){var n,r=e.length;for(n=0;n<r;++n)if(e[n]===t)return n;return-1}function E(e,t){return _.call(e)==="[object "+t+"]"}function T(e){for(;e.length<4;)e="0"+e;return e}function D(e){var t={};return E(e,"String")?(C.forEach(e,/[^\s,]+/,function(e){t[e]=!0}),t):e}function j(e){if(!/^[\w$]$/.test(e))throw new Error("Flag must be a single character A-Za-z0-9_$");b[e]=!0}function I(e,t,n,r,i){for(var o,a,s=c.length,u=e.charAt(n),d=null;s--;)if(!((a=c[s]).leadChar&&a.leadChar!==u||a.scope!==r&&"all"!==a.scope||a.flag&&-1===t.indexOf(a.flag))&&(o=C.exec(e,a.regex,n,"sticky"))){d={matchLength:o[0].length,output:a.handler.call(i,o,r,t),reparse:a.reparse};break}return d}function Y(e){i.astral=e}function O(e){RegExp.prototype.exec=(e?a:o).exec,RegExp.prototype.test=(e?a:o).test,String.prototype.match=(e?a:o).match,String.prototype.replace=(e?a:o).replace,String.prototype.split=(e?a:o).split,i.natives=e}function R(e){if(null==e)throw new TypeError("Cannot convert null or undefined to object");return e}function C(e,t){if(C.isRegExp(e)){if(void 0!==t)throw new TypeError("Cannot supply flags when copying a RegExp");return k(e)}if(e=void 0===e?"":String(e),t=void 0===t?"":String(t),C.isInstalled("astral")&&-1===t.indexOf("A")&&(t+="A"),u[e]||(u[e]={}),!u[e][t]){for(var n,r={hasNamedCapture:!1,captureNames:[]},i=d,a="",s=0,c=function(e,t){var n;if(M(t)!==t)throw new SyntaxError("Invalid duplicate regex flag "+t);for(e=o.replace.call(e,/^\(\?([\w$]+)\)/,function(e,n){if(o.test.call(/[gy]/,n))throw new SyntaxError("Cannot use flag g or y in mode modifier "+e);return t=M(t+n),""}),n=0;n<t.length;++n)if(!b[t.charAt(n)])throw new SyntaxError("Unknown regex flag "+t.charAt(n));return{pattern:e,flags:t}}(e,t),p=c.pattern,h=c.flags;s<p.length;){do{(n=I(p,h,s,i,r))&&n.reparse&&(p=p.slice(0,s)+n.output+p.slice(s+n.matchLength))}while(n&&n.reparse);if(n)a+=n.output,s+=n.matchLength||1;else{var m=C.exec(p,f[i],s,"sticky")[0];a+=m,s+=m.length,"["===m&&i===d?i=l:"]"===m&&i===l&&(i=d)}}u[e][t]={pattern:o.replace.call(a,/(?:\(\?:\))+/g,"(?:)"),flags:o.replace.call(h,/[^gimuy]+/g,""),captures:r.hasNamedCapture?r.captureNames:null}}var _=u[e][t];return w(new RegExp(_.pattern,_.flags),_.captures,e,t)}C.prototype=new RegExp,C.version="3.2.0",C._clipDuplicates=M,C._hasNativeFlag=v,C._dec=x,C._hex=L,C._pad4=T,C.addToken=function(e,t,n){var r,i=(n=n||{}).optionalFlags;if(n.flag&&j(n.flag),i)for(i=o.split.call(i,""),r=0;r<i.length;++r)j(i[r]);c.push({regex:k(e,{addG:!0,addY:g,isInternalOnly:!0}),handler:t,scope:n.scope||d,flag:n.flag,reparse:n.reparse,leadChar:n.leadChar}),C.cache.flush("patterns")},C.cache=function(e,t){return s[e]||(s[e]={}),s[e][t]||(s[e][t]=C(e,t))},C.cache.flush=function(e){"patterns"===e?u={}:s={}},C.escape=function(e){return o.replace.call(R(e),/[-\[\]{}()*+?.,\\^$|#\s]/g,"\\$&")},C.exec=function(e,t,n,i){var o,s,u="g",c=!1,d=!1;return(c=g&&!!(i||t.sticky&&!1!==i))?u+="y":i&&(d=!0,u+="FakeY"),t[r]=t[r]||{},s=t[r][u]||(t[r][u]=k(t,{addG:!0,addY:c,source:d?t.source+"|()":void 0,removeY:!1===i,isInternalOnly:!0})),n=n||0,s.lastIndex=n,o=a.exec.call(s,e),d&&o&&""===o.pop()&&(o=null),t.global&&(t.lastIndex=o?s.lastIndex:0),o},C.forEach=function(e,t,n){for(var r,i=0,o=-1;r=C.exec(e,t,i);)n(r,++o,e,t),i=r.index+(r[0].length||1)},C.globalize=function(e){return k(e,{addG:!0})},C.install=function(e){e=D(e),!i.astral&&e.astral&&Y(!0),!i.natives&&e.natives&&O(!0)},C.isInstalled=function(e){return!!i[e]},C.isRegExp=function(e){return"[object RegExp]"===_.call(e)},C.match=function(e,t,n){var i,a,s=t.global&&"one"!==n||"all"===n,u=(s?"g":"")+(t.sticky?"y":"")||"noGY";return t[r]=t[r]||{},a=t[r][u]||(t[r][u]=k(t,{addG:!!s,removeG:"one"===n,isInternalOnly:!0})),i=o.match.call(R(e),a),t.global&&(t.lastIndex="one"===n&&i?i.index+i[0].length:0),s?i||[]:i&&i[0]},C.matchChain=function(e,t){return function e(n,r){var i=t[r].regex?t[r]:{regex:t[r]},o=[];function a(e){if(i.backref){if(!(e.hasOwnProperty(i.backref)||+i.backref<e.length))throw new ReferenceError("Backreference to undefined group: "+i.backref);o.push(e[i.backref]||"")}else o.push(e[0])}for(var s=0;s<n.length;++s)C.forEach(n[s],i.regex,a);return r!==t.length-1&&o.length?e(o,r+1):o}([e],0)},C.replace=function(e,t,n,i){var o,s=C.isRegExp(t),u=t.global&&"one"!==i||"all"===i,c=(u?"g":"")+(t.sticky?"y":"")||"noGY",d=t;return s?(t[r]=t[r]||{},d=t[r][c]||(t[r][c]=k(t,{addG:!!u,removeG:"one"===i,isInternalOnly:!0}))):u&&(d=new RegExp(C.escape(String(t)),"g")),o=a.replace.call(R(e),d,n),s&&t.global&&(t.lastIndex=0),o},C.replaceEach=function(e,t){var n,r;for(n=0;n<t.length;++n)r=t[n],e=C.replace(e,r[0],r[1],r[2]);return e},C.split=function(e,t,n){return a.split.call(R(e),t,n)},C.test=function(e,t,n,r){return!!C.exec(e,t,n,r)},C.uninstall=function(e){e=D(e),i.astral&&e.astral&&Y(!1),i.natives&&e.natives&&O(!1)},C.union=function(e,t,n){var i,a,s=(n=n||{}).conjunction||"or",u=0;function c(e,t,n){var r=a[u-i];if(t){if(++u,r)return"(?<"+r+">"}else if(n)return"\\"+(+n+i);return e}if(!E(e,"Array")||!e.length)throw new TypeError("Must provide a nonempty array of patterns to merge");for(var d,l=/(\()(?!\?)|\\([1-9]\d*)|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*\]/g,f=[],p=0;p<e.length;++p)d=e[p],C.isRegExp(d)?(i=u,a=d[r]&&d[r].captureNames||[],f.push(o.replace.call(C(d.source).source,l,c))):f.push(C.escape(d));var h="none"===s?"":"|";return C(f.join(h),t)},a.exec=function(e){var t,n,i,a=this.lastIndex,s=o.exec.apply(this,arguments);if(s){if(!h&&s.length>1&&A(s,"")>-1&&(n=k(this,{removeG:!0,isInternalOnly:!0}),o.replace.call(String(e).slice(s.index),n,function(){var e,t=arguments.length;for(e=1;e<t-2;++e)void 0===arguments[e]&&(s[e]=void 0)})),this[r]&&this[r].captureNames)for(i=1;i<s.length;++i)(t=this[r].captureNames[i-1])&&(s[t]=s[i]);this.global&&!s[0].length&&this.lastIndex>s.index&&(this.lastIndex=s.index)}return this.global||(this.lastIndex=a),s},a.test=function(e){return!!a.exec.call(this,e)},a.match=function(e){var t;if(C.isRegExp(e)){if(e.global)return t=o.match.apply(this,arguments),e.lastIndex=0,t}else e=new RegExp(e);return a.exec.call(e,R(this))},a.replace=function(e,t){var n,i,a,s=C.isRegExp(e);return s?(e[r]&&(i=e[r].captureNames),n=e.lastIndex):e+="",a=E(t,"Function")?o.replace.call(String(this),e,function(){var n,r=arguments;if(i)for(r[0]=new String(r[0]),n=0;n<i.length;++n)i[n]&&(r[0][i[n]]=r[n+1]);return s&&e.global&&(e.lastIndex=r[r.length-2]+r[0].length),t.apply(void 0,r)}):o.replace.call(null==this?this:String(this),e,function(){var e=arguments;return o.replace.call(String(t),p,function(t,n,r){var o;if(n){if((o=+n)<=e.length-3)return e[o]||"";if((o=i?A(i,n):-1)<0)throw new SyntaxError("Backreference to undefined group "+t);return e[o+1]||""}if("$"===r)return"$";if("&"===r||0==+r)return e[0];if("`"===r)return e[e.length-1].slice(0,e[e.length-2]);if("'"===r)return e[e.length-1].slice(e[e.length-2]+e[0].length);if(r=+r,!isNaN(r)){if(r>e.length-3)throw new SyntaxError("Backreference to undefined group "+t);return e[r]||""}throw new SyntaxError("Invalid token "+t)})}),s&&(e.global?e.lastIndex=0:e.lastIndex=n),a},a.split=function(e,t){if(!C.isRegExp(e))return o.split.apply(this,arguments);var n,r=String(this),i=[],a=e.lastIndex,s=0;return t=(void 0===t?-1:t)>>>0,C.forEach(r,e,function(e){e.index+e[0].length>s&&(i.push(r.slice(s,e.index)),e.length>1&&e.index<r.length&&Array.prototype.push.apply(i,e.slice(1)),n=e[0].length,s=e.index+n)}),s===r.length?o.test.call(e,"")&&!n||i.push(""):i.push(r.slice(s)),e.lastIndex=a,i.length>t?i.slice(0,t):i},C.addToken(/\\([ABCE-RTUVXYZaeg-mopqyz]|c(?![A-Za-z])|u(?![\dA-Fa-f]{4}|{[\dA-Fa-f]+})|x(?![\dA-Fa-f]{2}))/,function(e,t){if("B"===e[1]&&t===d)return e[0];throw new SyntaxError("Invalid escape "+e[0])},{scope:"all",leadChar:"\\"}),C.addToken(/\\u{([\dA-Fa-f]+)}/,function(e,t,n){var r=x(e[1]);if(r>1114111)throw new SyntaxError("Invalid Unicode code point "+e[0]);if(r<=65535)return"\\u"+T(L(r));if(y&&n.indexOf("u")>-1)return e[0];throw new SyntaxError("Cannot use Unicode code point above \\u{FFFF} without flag u")},{scope:"all",leadChar:"\\"}),C.addToken(/\[(\^?)\]/,function(e){return e[1]?"[\\s\\S]":"\\b\\B"},{leadChar:"["}),C.addToken(/\(\?#[^)]*\)/,S,{leadChar:"("}),C.addToken(/\s+|#[^\n]*\n?/,S,{flag:"x"}),C.addToken(/\./,function(){return"[\\s\\S]"},{flag:"s",leadChar:"."}),C.addToken(/\\k<([\w$]+)>/,function(e){var t=isNaN(e[1])?A(this.captureNames,e[1])+1:+e[1],n=e.index+e[0].length;if(!t||t>this.captureNames.length)throw new SyntaxError("Backreference to undefined group "+e[0]);return"\\"+t+(n===e.input.length||isNaN(e.input.charAt(n))?"":"(?:)")},{leadChar:"\\"}),C.addToken(/\\(\d+)/,function(e,t){if(!(t===d&&/^[1-9]/.test(e[1])&&+e[1]<=this.captureNames.length)&&"0"!==e[1])throw new SyntaxError("Cannot use octal escape or backreference to undefined group "+e[0]);return e[0]},{scope:"all",leadChar:"\\"}),C.addToken(/\(\?P?<([\w$]+)>/,function(e){if(!isNaN(e[1]))throw new SyntaxError("Cannot use integer as capture name "+e[0]);if("length"===e[1]||"__proto__"===e[1])throw new SyntaxError("Cannot use reserved word as capture name "+e[0]);if(A(this.captureNames,e[1])>-1)throw new SyntaxError("Cannot use same name for multiple groups "+e[0]);return this.captureNames.push(e[1]),this.hasNamedCapture=!0,"("},{leadChar:"("}),C.addToken(/\((?!\?)/,function(e,t,n){return n.indexOf("n")>-1?"(?:":(this.captureNames.push(null),"(")},{optionalFlags:"n",leadChar:"("}),t.exports=C},{}]},{},[8])(8)},function(e,t,n){var r=n(611),i=n(319).getLogger("client-common-utils.clientStorage"),o=n(640),a={};a[o.name]=o;var s=[o.name],u={storagePrefix:"_virtruClientStorage",drivers:[],asyncMode:!1,ready:!1,availableDrivers:a,init:function(e){this.reset();var t=e||{};return this.storagePrefix=t.storagePrefix||this.storagePrefix,t.drivers&&r(t.drivers||s,this.addDriver.bind(this)),this.drivers.length>0?this.ready=!0:i.error("Either you didn't specify any drivers, or none of them are supported by the current browser."),this},reset:function(){this.drivers=[],this.asyncMode=!1,this.ready=!1,this.storagePrefix="_virtruClientStorage"},addDriver:function(e){var t=a[e.toLowerCase()];if(!t)throw new Error("A storage driver with that name doesn't exist: "+e);t.checkSupport()&&this.drivers.push(t)},setItem:function(e,t){this.drivers[0].setItem(this.storagePrefix+e,t)},getItem:function(e){return this.drivers[0].getItem(this.storagePrefix+e)||null},removeItem:function(e){this.drivers[0].removeItem(this.storagePrefix+e)},clear:function(){this.drivers[0].clear()}};u.init({drivers:s}),e.exports=u},function(e,t,n){var r=n(612),i=n(613),o=n(638),a=n(331);e.exports=function(e,t){return(a(e)?r:i)(e,o(t))}},function(e,t){e.exports=function(e,t){for(var n=-1,r=null==e?0:e.length;++n<r&&!1!==t(e[n],n,e););return e}},function(e,t,n){var r=n(614),i=n(637)(r);e.exports=i},function(e,t,n){var r=n(615),i=n(617);e.exports=function(e,t){return e&&r(e,t,i)}},function(e,t,n){var r=n(616)();e.exports=r},function(e,t){e.exports=function(e){return function(t,n,r){for(var i=-1,o=Object(t),a=r(t),s=a.length;s--;){var u=a[e?s:++i];if(!1===n(o[u],u,o))break}return t}}},function(e,t,n){var r=n(618),i=n(631),o=n(333);e.exports=function(e){return o(e)?r(e):i(e)}},function(e,t,n){var r=n(619),i=n(620),o=n(331),a=n(624),s=n(626),u=n(627),c=Object.prototype.hasOwnProperty;e.exports=function(e,t){var n=o(e),d=!n&&i(e),l=!n&&!d&&a(e),f=!n&&!d&&!l&&u(e),p=n||d||l||f,h=p?r(e.length,String):[],m=h.length;for(var _ in e)!t&&!c.call(e,_)||p&&("length"==_||l&&("offset"==_||"parent"==_)||f&&("buffer"==_||"byteLength"==_||"byteOffset"==_)||s(_,m))||h.push(_);return h}},function(e,t){e.exports=function(e,t){for(var n=-1,r=Array(e);++n<e;)r[n]=t(n);return r}},function(e,t,n){var r=n(621),i=n(101),o=Object.prototype,a=o.hasOwnProperty,s=o.propertyIsEnumerable,u=r(function(){return arguments}())?r:function(e){return i(e)&&a.call(e,"callee")&&!s.call(e,"callee")};e.exports=u},function(e,t,n){var r=n(100),i=n(101),o="[object Arguments]";e.exports=function(e){return i(e)&&r(e)==o}},function(e,t,n){var r=n(328),i=Object.prototype,o=i.hasOwnProperty,a=i.toString,s=r?r.toStringTag:void 0;e.exports=function(e){var t=o.call(e,s),n=e[s];try{e[s]=void 0;var r=!0}catch(e){}var i=a.call(e);return r&&(t?e[s]=n:delete e[s]),i}},function(e,t){var n=Object.prototype.toString;e.exports=function(e){return n.call(e)}},function(e,t,n){(function(e){var r=n(329),i=n(625),o=t&&!t.nodeType&&t,a=o&&"object"==typeof e&&e&&!e.nodeType&&e,s=a&&a.exports===o?r.Buffer:void 0,u=(s?s.isBuffer:void 0)||i;e.exports=u}).call(this,n(12)(e))},function(e,t){e.exports=function(){return!1}},function(e,t){var n=9007199254740991,r=/^(?:0|[1-9]\d*)$/;e.exports=function(e,t){var i=typeof e;return!!(t=null==t?n:t)&&("number"==i||"symbol"!=i&&r.test(e))&&e>-1&&e%1==0&&e<t}},function(e,t,n){var r=n(628),i=n(629),o=n(630),a=o&&o.isTypedArray,s=a?i(a):r;e.exports=s},function(e,t,n){var r=n(100),i=n(332),o=n(101),a={};a["[object Float32Array]"]=a["[object Float64Array]"]=a["[object Int8Array]"]=a["[object Int16Array]"]=a["[object Int32Array]"]=a["[object Uint8Array]"]=a["[object Uint8ClampedArray]"]=a["[object Uint16Array]"]=a["[object Uint32Array]"]=!0,a["[object Arguments]"]=a["[object Array]"]=a["[object ArrayBuffer]"]=a["[object Boolean]"]=a["[object DataView]"]=a["[object Date]"]=a["[object Error]"]=a["[object Function]"]=a["[object Map]"]=a["[object Number]"]=a["[object Object]"]=a["[object RegExp]"]=a["[object Set]"]=a["[object String]"]=a["[object WeakMap]"]=!1,e.exports=function(e){return o(e)&&i(e.length)&&!!a[r(e)]}},function(e,t){e.exports=function(e){return function(t){return e(t)}}},function(e,t,n){(function(e){var r=n(330),i=t&&!t.nodeType&&t,o=i&&"object"==typeof e&&e&&!e.nodeType&&e,a=o&&o.exports===i&&r.process,s=function(){try{var e=o&&o.require&&o.require("util").types;return e||a&&a.binding&&a.binding("util")}catch(e){}}();e.exports=s}).call(this,n(12)(e))},function(e,t,n){var r=n(632),i=n(633),o=Object.prototype.hasOwnProperty;e.exports=function(e){if(!r(e))return i(e);var t=[];for(var n in Object(e))o.call(e,n)&&"constructor"!=n&&t.push(n);return t}},function(e,t){var n=Object.prototype;e.exports=function(e){var t=e&&e.constructor;return e===("function"==typeof t&&t.prototype||n)}},function(e,t,n){var r=n(634)(Object.keys,Object);e.exports=r},function(e,t){e.exports=function(e,t){return function(n){return e(t(n))}}},function(e,t,n){var r=n(100),i=n(636),o="[object AsyncFunction]",a="[object Function]",s="[object GeneratorFunction]",u="[object Proxy]";e.exports=function(e){if(!i(e))return!1;var t=r(e);return t==a||t==s||t==o||t==u}},function(e,t){e.exports=function(e){var t=typeof e;return null!=e&&("object"==t||"function"==t)}},function(e,t,n){var r=n(333);e.exports=function(e,t){return function(n,i){if(null==n)return n;if(!r(n))return e(n,i);for(var o=n.length,a=t?o:-1,s=Object(n);(t?a--:++a<o)&&!1!==i(s[a],a,s););return n}}},function(e,t,n){var r=n(639);e.exports=function(e){return"function"==typeof e?e:r}},function(e,t){e.exports=function(e){return e}},function(e,t,n){var r=n(641),i=[n(642),n(643),n(644)],o=r.createStore(i),a={name:"synchronousstorage",async:!1,checkSupport:function(){try{return this.setItem("___TESTSTORAGE___",!0),this.getItem("___TESTSTORAGE___"),this.removeItem("___TESTSTORAGE___"),!0}catch(e){return!1}},setItem:function(e,t){o.set(e,t)},getItem:function(e){return o.get(e)},removeItem:function(e){return o.remove(e)},clear:function(){return o.clearAll()}};e.exports=a},function(e,t,n){var r=n(102),i=r.slice,o=r.pluck,a=r.each,s=r.bind,u=r.create,c=r.isList,d=r.isFunction,l=r.isObject;e.exports={createStore:p};var f={version:"2.0.12",enabled:!1,get:function(e,t){var n=this.storage.read(this._namespacePrefix+e);return this._deserialize(n,t)},set:function(e,t){return void 0===t?this.remove(e):(this.storage.write(this._namespacePrefix+e,this._serialize(t)),t)},remove:function(e){this.storage.remove(this._namespacePrefix+e)},each:function(e){var t=this;this.storage.each(function(n,r){e.call(t,t._deserialize(n),(r||"").replace(t._namespaceRegexp,""))})},clearAll:function(){this.storage.clearAll()},hasNamespace:function(e){return this._namespacePrefix=="__storejs_"+e+"_"},createStore:function(){return p.apply(this,arguments)},addPlugin:function(e){this._addPlugin(e)},namespace:function(e){return p(this.storage,this.plugins,e)}};function p(e,t,n){n||(n=""),e&&!c(e)&&(e=[e]),t&&!c(t)&&(t=[t]);var r=n?"__storejs_"+n+"_":"",p=n?new RegExp("^"+r):null;if(!/^[a-zA-Z0-9_\-]*$/.test(n))throw new Error("store.js namespaces can only have alphanumerics + underscores and dashes");var h=u({_namespacePrefix:r,_namespaceRegexp:p,_testStorage:function(e){try{var t="__storejs__test__";e.write(t,t);var n=e.read(t)===t;return e.remove(t),n}catch(e){return!1}},_assignPluginFnProp:function(e,t){var n=this[t];this[t]=function(){var t=i(arguments,0),r=this;var o=[function(){if(n)return a(arguments,function(e,n){t[n]=e}),n.apply(r,t)}].concat(t);return e.apply(r,o)}},_serialize:function(e){return JSON.stringify(e)},_deserialize:function(e,t){if(!e)return t;var n="";try{n=JSON.parse(e)}catch(t){n=e}return void 0!==n?n:t},_addStorage:function(e){this.enabled||this._testStorage(e)&&(this.storage=e,this.enabled=!0)},_addPlugin:function(e){var t=this;if(c(e))a(e,function(e){t._addPlugin(e)});else if(!o(this.plugins,function(t){return e===t})){if(this.plugins.push(e),!d(e))throw new Error("Plugins must be function values that return objects");var n=e.call(this);if(!l(n))throw new Error("Plugins must return an object of function properties");a(n,function(n,r){if(!d(n))throw new Error("Bad plugin property: "+r+" from plugin "+e.name+". Plugins should only return functions.");t._assignPluginFnProp(n,r)})}},addStorage:function(e){!function(){var e="undefined"==typeof console?null:console;e&&(e.warn?e.warn:e.log).apply(e,arguments)}("store.addStorage(storage) is deprecated. Use createStore([storages])"),this._addStorage(e)}},f,{plugins:[]});return h.raw={},a(h,function(e,t){d(e)&&(h.raw[t]=s(h,e))}),a(e,function(e){h._addStorage(e)}),a(t,function(e){h._addPlugin(e)}),h}},function(e,t,n){var r=n(102).Global;function i(){return r.localStorage}function o(e){return i().getItem(e)}e.exports={name:"localStorage",read:o,write:function(e,t){return i().setItem(e,t)},each:function(e){for(var t=i().length-1;t>=0;t--){var n=i().key(t);e(o(n),n)}},remove:function(e){return i().removeItem(e)},clearAll:function(){return i().clear()}}},function(e,t,n){var r=n(102).Global;function i(){return r.sessionStorage}function o(e){return i().getItem(e)}e.exports={name:"sessionStorage",read:o,write:function(e,t){return i().setItem(e,t)},each:function(e){for(var t=i().length-1;t>=0;t--){var n=i().key(t);e(o(n),n)}},remove:function(e){return i().removeItem(e)},clearAll:function(){return i().clear()}}},function(e,t){e.exports={name:"memoryStorage",read:function(e){return n[e]},write:function(e,t){n[e]=t},each:function(e){for(var t in n)n.hasOwnProperty(t)&&e(n[t],t)},remove:function(e){delete n[e]},clearAll:function(e){n={}}};var n={}},function(e,t,n){"use strict";const r=n(646).config.drive,i=n(326),o=n(303),a=n(52),s={scriptStatus:!1,apiLoaded:!1,authStatus:!1};function u(){var e=window.localStorage.getItem("accessToken");return e?JSON.parse(e):{}}function c(e){e&&"object"==typeof e&&window.localStorage.setItem("accessToken",JSON.stringify(e))}o(s);const d=function(){return new a(function(e,t){const n=setTimeout(function(){t(new Error("Google API failed to load."))},1e4);window.googleDriveApiLoad=function(){clearTimeout(n),e()},((e,t,n=!0,r=!0)=>new a((i,o)=>{let a=document.createElement("script");const s=t||document.getElementsByTagName("script")[0];function u(e,t){(t||!a.readyState||/loaded|complete/.test(a.readyState))&&(a.onload=null,a.onreadystatechange=null,a=void 0,t?o():i())}a.async=n,a.defer=r,a.onload=u,a.onreadystatechange=u,a.src=e,s.parentNode.insertBefore(a,s)}))(r.apiUrl)})},l=function(e){return new a(function(t,n){var i=r.clientId[e];gapi.auth.authorize({client_id:i,scope:r.apiScopes,immediate:!0},f.bind(null,t))})},f=function(e,t){if(t&&t.error&&"immediate_failed"!==t.error)reject(t);else if(t&&!t.error&&t.status&&t.status.signed_in){var n=u();t.access_token&&(n[t.access_token]={access_token:t.access_token},c(n)),s.emit("user_authorized",!0),e(!0)}else e(!1)};function p(e,t,n){return new a(function(r,o){const a=i.get(e);n&&a.responseType("arraybuffer"),a.set("Authorization","Bearer "+t),a.end(function(e,n){if(e||n.error){if(!0===n.unauthorized&&401===n.error.status){var i=u();delete i[t],c(i)}return o(e||n.error)}r(n.response)})})}const h=function(e,t){return function(){return new a(function(n,r){var i=u();let o="https://www.googleapis.com/drive/v2/files/";o+=e+"?alt=media";let s=a.resolve(o);t&&(s=function(e,t){return new a(function(n,r){gapi.client.drive.revisions.get({fileId:e,revisionId:t}).execute(function(e){if(!e.downloadUrl)return r("Unable to determine drive file revision URL");n(e.downloadUrl)})})}(e,t)),s.then(function(e){var t=Object.keys(i).map(t=>(function(e,t){return p(t,e,!0)})(t,e));a.any(t).then(e=>n(e)).catch(e=>{r(e)})})})}};e.exports={getDriveFile:function(e,t){new a(function(e,t){s.apiLoaded?e():gapi.client.load("drive","v2",function(){s.apiLoaded=!0,e()})}).then(h(e,t)).then(function(e){resolve(e)}).catch(function(e){reject(e)})},getDriveFileRevisions:function(e){return new a(function(t,n){const r=u(),i="https://www.googleapis.com/drive/v2/files/"+e+"/revisions",o=Object.keys(r).map(e=>(function(e,t){return p(t,e)})(e,i));a.any(o).then(e=>t(e)).catch(e=>{n(e)})})},getDriveAuthStatus:function(e){return new a(function(e,t){"loaded"!==s.scriptStatus&&"loading"!==s.scriptStatus?(s.scriptStatus="loading",d().then(function(){s.scriptStatus="loaded",s.emit("script_loaded"),e()}).catch(function(e){t(e)})):"loading"===s.scriptStatus?s.on("script_loaded",function(){e()}):e()}).then(function(){if("authorized"!==s.authStatus&&"pending"!==s.authStatus)return s.authStatus="pending",l(e).then(function(e){resolve(e)});s.authStatus="authorized",resolve(!0)}).catch(function(e){return e})},getDriveApiPermission:l}},function(e,t,n){e.exports={config:n(334),utils:n(654)}},function(e,t){e.exports={production:{name:"Production",showDebug:!1,reportClientErrors:!0,loggingLevel:"ERROR",matchHostnames:["www.virtru.com","www-production01.virtru.com","secure.virtru.com","secure-production01.virtru.com"],matchStorageKeys:["prod","production","production01"],mainAcmUrl:"https://acm.virtru.com",eventsUrl:"https://events.virtru.com",accountsUrl:"https://accounts.virtru.com",microTdfBaseUrl:"https://www.virtru.com/start/",authDomains:["accounts.virtru.com","acm2.virtru.com","acm.virtru.com","events.virtru.com"],templates:"templates-prod.virtru.com/",segmentWriteKey:"36r9psxney",amplitudeKey:"d34d3d2c70eb854183143c56c470dcb4",lambdaEndpoint:"https://czix76s5qd.execute-api.us-east-1.amazonaws.com/production/segment"},production01:{name:"Production",showDebug:!1,reportClientErrors:!0,loggingLevel:"ERROR",matchHostnames:["www.virtru.com","www-production01.virtru.com","secure.virtru.com","secure-production01.virtru.com"],matchStorageKeys:["prod","production","production01"],mainAcmUrl:"https://acm.virtru.com",eventsUrl:"https://events.virtru.com",accountsUrl:"https://accounts.virtru.com",microTdfBaseUrl:"https://www.virtru.com/start/",authDomains:["accounts.virtru.com","acm2.virtru.com","acm.virtru.com","events.virtru.com"],templates:"templates-prod.virtru.com/",segmentWriteKey:"36r9psxney",amplitudeKey:"d34d3d2c70eb854183143c56c470dcb4",lambdaEndpoint:"https://czix76s5qd.execute-api.us-east-1.amazonaws.com/production/segment"},production02:{name:"Production02",showDebug:!1,reportClientErrors:!0,loggingLevel:"ERROR",matchHostnames:["secure-production02.virtru.com"],matchStorageKeys:["production02"],mainAcmUrl:"https://acm-production02.virtru.com",eventsUrl:"https://events-production02.virtru.com",accountsUrl:"https://accounts-production02.virtru.com",microTdfBaseUrl:"https://www.virtru.com/start/",authDomains:["accounts-production02.virtru.com","acm-production02.virtru.com","events-production02.virtru.com"],templates:"templates-prod.virtru.com/",segmentWriteKey:"36r9psxney",amplitudeKey:"d34d3d2c70eb854183143c56c470dcb4",lambdaEndpoint:"https://czix76s5qd.execute-api.us-east-1.amazonaws.com/production/segment"},staging01:{name:"Staging01",showDebug:!0,reportClientErrors:!0,loggingLevel:"INFO",matchHostnames:["www-staging01.virtru.com","secure-staging01.virtru.com","www-staging.virtru.com"],matchStorageKeys:["staging01"],mainAcmUrl:"https://acm-staging01.virtru.com",eventsUrl:"https://events-staging01.virtru.com",accountsUrl:"https://accounts-staging01.virtru.com",microTdfBaseUrl:"https://secure-staging01.virtru.com/start/",authDomains:["accounts-staging01.virtru.com","acm-staging01.virtru.com","events-staging01.virtru.com"],templates:"templates-staging.virtru.com/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"},staging02:{name:"Staging02",showDebug:!0,reportClientErrors:!0,loggingLevel:"INFO",matchHostnames:["www-staging02.virtru.com","secure-staging02.virtru.com"],matchStorageKeys:["staging02"],mainAcmUrl:"https://acm-staging02.virtru.com",eventsUrl:"https://events-staging02.virtru.com",accountsUrl:"https://accounts-staging02.virtru.com",microTdfBaseUrl:"https://secure-staging02.virtru.com/start/",authDomains:["accounts-staging02.virtru.com","acm-staging02.virtru.com","events-staging02.virtru.com"],templates:"templates-staging.virtru.com/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"},develop01:{name:"Develop01",showDebug:!0,reportClientErrors:!1,loggingLevel:"ALL",matchHostnames:["www-develop01.virtru.com","secure-develop01.virtru.com","www-dev.virtru.com"],matchStorageKeys:["develop01"],mainAcmUrl:"https://acm-develop01.virtru.com",eventsUrl:"https://events-develop01.virtru.com",accountsUrl:"https://accounts-develop01.virtru.com",microTdfBaseUrl:"https://secure-develop01.virtru.com/start/",authDomains:["accounts-develop01.virtru.com","acm-develop01.virtru.com","events-develop01.virtru.com"],templates:"templates-dev.virtru.com/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"},develop02:{name:"Develop02",showDebug:!0,reportClientErrors:!1,loggingLevel:"ALL",matchHostnames:["www-develop02.virtru.com","secure-develop02.virtru.com"],matchStorageKeys:["develop02"],mainAcmUrl:"https://acm-develop02.virtru.com",eventsUrl:"https://events-develop02.virtru.com",accountsUrl:"https://accounts-develop02.virtru.com",microTdfBaseUrl:"https://secure-develop02.virtru.com/start/",authDomains:["accounts-develop02.virtru.com","acm-develop02.virtru.com","events-develop02.virtru.com"],templates:"templates-dev.virtru.com/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"},develop03:{name:"develop03",showDebug:!0,reportClientErrors:!1,loggingLevel:"ALL",matchHostnames:["www-develop03.virtru.com","secure-develop03.virtru.com"],matchStorageKeys:["develop03"],mainAcmUrl:"https://acm-develop03.virtru.com",eventsUrl:"https://events-develop03.virtru.com",accountsUrl:"https://accounts-develop03.virtru.com",microTdfBaseUrl:"https://secure-develop03.virtru.com/start/",authDomains:["accounts-develop03.virtru.com","acm-develop03.virtru.com","events-develop03.virtru.com"],templates:"templates-dev.virtru.com/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"},mars_develop01:{name:"mars_develop01",showDebug:!0,reportClientErrors:!1,loggingLevel:"ALL",matchHostnames:["www-develop01.develop.virtru.com","secure-develop01.develop.virtru.com"],matchStorageKeys:["mars_develop01"],mainAcmUrl:"https://acm-develop01.develop.virtru.com",eventsUrl:"https://events-develop01.develop.virtru.com",accountsUrl:"https://accounts-develop01.develop.virtru.com",microTdfBaseUrl:"https://secure-develop01.develop.virtru.com/start/",authDomains:["accounts-develop01.develop.virtru.com","acm-develop01.develop.virtru.com","events-develop01.develop.virtru.com"],templates:"virtru-com-us-west-2-templates-develop01/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"},mars_develop02:{name:"mars_develop02",showDebug:!0,reportClientErrors:!1,loggingLevel:"ALL",matchHostnames:["www-develop02.develop.virtru.com","secure-develop02.develop.virtru.com"],matchStorageKeys:["mars_develop02"],mainAcmUrl:"https://acm-develop02.develop.virtru.com",eventsUrl:"https://events-develop02.develop.virtru.com",accountsUrl:"https://accounts-develop02.develop.virtru.com",microTdfBaseUrl:"https://secure-develop02.develop.virtru.com/start/",authDomains:["accounts-develop02.develop.virtru.com","acm-develop02.develop.virtru.com","events-develop02.develop.virtru.com"],templates:"virtru-com-us-west-2-templates-develop02/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"},mars_develop03:{name:"mars_develop03",showDebug:!0,reportClientErrors:!1,loggingLevel:"ALL",matchHostnames:["www-develop03.develop.virtru.com","secure-develop03.develop.virtru.com"],matchStorageKeys:["mars_develop03"],mainAcmUrl:"https://acm-develop03.develop.virtru.com",eventsUrl:"https://events-develop03.develop.virtru.com",accountsUrl:"https://accounts-develop03.develop.virtru.com",microTdfBaseUrl:"https://secure-develop03.develop.virtru.com/start/",authDomains:["accounts-develop03.develop.virtru.com","acm-develop03.develop.virtru.com","events-develop03.develop.virtru.com"],templates:"virtru-com-us-west-2-templates-develop03/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"},mars_develop04:{name:"mars_develop04",showDebug:!0,reportClientErrors:!1,loggingLevel:"ALL",matchHostnames:["www-develop04.develop.virtru.com","secure-develop04.develop.virtru.com"],matchStorageKeys:["mars_develop04"],mainAcmUrl:"https://acm-develop04.develop.virtru.com",eventsUrl:"https://events-develop04.develop.virtru.com",accountsUrl:"https://accounts-develop04.develop.virtru.com",microTdfBaseUrl:"https://secure-develop04.develop.virtru.com/start/",authDomains:["accounts-develop04.develop.virtru.com","acm-develop04.develop.virtru.com","events-develop04.develop.virtru.com"],templates:"virtru-com-us-west-2-templates-develop04/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"},mars_staging:{name:"mars_staging",showDebug:!0,reportClientErrors:!1,loggingLevel:"ALL",matchHostnames:["secure.staging.virtru.com"],matchStorageKeys:["mars_staging"],mainAcmUrl:"https://acm.staging.virtru.com",eventsUrl:"https://events.staging.virtru.com",accountsUrl:"https://accounts.staging.virtru.com",microTdfBaseUrl:"https://secure.staging.virtru.com/start/",authDomains:["accounts.staging.virtru.com","acm.staging.virtru.com","events.staging.virtru.com"],templates:"virtru-com-us-west-2-templates/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"},mars_production:{name:"mars_production",showDebug:!1,reportClientErrors:!0,loggingLevel:"ERROR",matchHostnames:["www.virtru.com","secure.virtru.com","secure.virtru.com"],matchStorageKeys:["mars_production"],mainAcmUrl:"https://acm.virtru.com",eventsUrl:"https://events.virtru.com",accountsUrl:"https://accounts.virtru.com",microTdfBaseUrl:"https://www.virtru.com/start/",authDomains:["accounts.virtru.com","acm.virtru.com","events.virtru.com"],templates:"templates-prod.virtru.com/",segmentWriteKey:"36r9psxney",amplitudeKey:"d34d3d2c70eb854183143c56c470dcb4",lambdaEndpoint:"https://czix76s5qd.execute-api.us-east-1.amazonaws.com/production/segment"},local:{name:"Local",showDebug:!0,reportClientErrors:!1,loggingLevel:"ALL",matchHostnames:["secure.testingtru.com"],matchStorageKeys:["local"],mainAcmUrl:"https://acm.testingtru.com",eventsUrl:"https://events.testingtru.com",accountsUrl:"https://accounts.testingtru.com",microTdfBaseUrl:"https://secure.testingtru.com/start/",authDomains:["accounts.testingtru.com","acm.testingtru.com","events.testingtru.com"],templates:"templates-dev.virtru.com/",segmentWriteKey:"axvs7ovrve",amplitudeKey:"3e6592f019223965c6f403818496b6e6"}}},function(e,t){e.exports={local:"-dev",dev:"-develop01",development:"-develop01",develop01:"-develop01",develop02:"-develop02",develop03:"-develop03",stag:"-staging01",staging:"-staging01",staging01:"-staging01",staging02:"-staging02",prod:"",production:"",production01:"",production02:"",mars_develop01:"",mars_develop02:"",mars_develop03:"",mars_develop04:"",mars_staging:"",mars_production:""}},function(e,t){e.exports={ios:"iphone",firefox:"browser_extension_ff",chrome:"browser_extension_chrome",android:"android",macmail:"mac_mail_desktop",outlook:"outlook_desktop",ie:"browser_extension_ie",safari:"browser_extension_safari"}},function(e,t){e.exports={prefix:{prod:"https://acm.virtru.com/api/policies/",staging:"https://acm-staging.virtru.com/api/policies/",dev:"https://acm-dev.virtru.com/api/policies/",staging01:"https://acm-staging01.virtru.com/api/policies/",develop01:"https://acm-develop01.virtru.com/api/policies/",staging02:"https://acm-staging02.virtru.com/api/policies/",develop02:"https://acm-develop02.virtru.com/api/policies/",local:"https://local.virtru.com/api/policies/",mars_develop01:"https://acm-develop01.develop.virtru.com/api/policies/",mars_develop02:"https://acm-develop02.develop.virtru.com/api/policies/",mars_develop03:"https://acm-develop03.develop.virtru.com/api/policies/",mars_develop04:"https://acm-develop04.develop.virtru.com/api/policies/",mars_staging:"https://acm.staging.virtru.com/api/policies/",mars_production:"https://acm.virtru.com/api/policies/"},postfix:"/contract"}},function(e,t){var n="755040699543-fmf76phrtmlfif7qodfri21qomuvf7ls.apps.googleusercontent.com",r="329241629064-vr1snnmsia51ndq792ido78ed5pjv76v.apps.googleusercontent.com";e.exports={clientId:{development:n,develop01:n,develop02:n,develop03:n,staging:r,staging01:r,production:"271004153288-4prt5r84l07ro79uh2sba76qtqcu9uhq.apps.googleusercontent.com",mars_develop01:n,mars_develop02:n,mars_develop03:n,mars_develop04:n,mars_staging:r,mars_production:"271004153288-4prt5r84l07ro79uh2sba76qtqcu9uhq.apps.googleusercontent.com"},apiScopes:["https://www.googleapis.com/auth/drive.readonly"],noAuthDownloadLink:"https://googledrive.com/host/",authorizedDownloadLink:"https://www.googleapis.com/drive/v2/files/",apiUrl:"https://apis.google.com/js/client.js?onload=googleDriveApiLoad"}},function(e,t){e.exports={visa:/^4/,mastercard:/^5[1-5]/,discover:/^6(?:011|5)/,amex:/^3[47]/}},function(e,t){e.exports={monthly:2.5,"monthly-regular":5,yearly:24,"yearly-regular":48,annually:24,"annually-regular":48}},function(e,t,n){"use strict";var r=n(20),i=n(334);function o(){this.initialized=!1,this.environment=void 0,r.bindAll(this)}o.DEFAULT_ENVIRONMENT="develop01",o.DEFAULT_LOGGING_LEVEL="ALL",o.prototype._isInitialized=function(){return this.initialized},o.prototype._setEnvironment=function(e){this.environment=e,this.initialized=!0},o.prototype.getEnvironment=function(){if(this._isInitialized())return this.environment;var e;try{e=localStorage.getItem("readerConfig")}catch(e){}var t=e?this._getMatchingStorageKeys(e):this._getMatchingHostnames();return t=t||o.DEFAULT_ENVIRONMENT,this._setEnvironment(t),t},o.prototype.getLoggingEnvironment=function(){var e=this.getEnvironment();return i.env[e].loggingLevel||o.DEFAULT_LOGGING_LEVEL},o.prototype._getMatchingStorageKeys=function(e){return r.findKey(i.env,function(t,n){return r.includes(t.matchStorageKeys,e)})},o.prototype._getMatchingHostnames=function(){return r.findKey(i.env,function(e,t){return r.includes(e.matchHostnames,location.hostname)})},e.exports=new o},function(e,t,n){"use strict";var r=n(63),i=n(34),o=n(22),a=n(1),s=n(65),u=n(16).ServiceBase,c=n(6),d=n(52),l=n(656).OrganizationModel;function f(e){u.call(this,e)}a(f,u),f.setup=function(e){return c.checkIsObject(e),c.checkIsFunction(e.request),new f(e)},f.prototype.appIdBundleStatus=function(e){var t=o.defer(),n=i.sprintf("%s/api/appIdBundle",this._getAccountsUrl(e));return this.buildRequest("GET",n,e).end(this.end(200,t,void 0)),t.promise},f.prototype.appIdBundlesRevoke=function(e,t){var n=o.defer(),r=i.sprintf("%s/api/appIdBundle/revoke",this._getAccountsUrl(t)),a=this.buildRequest("POST",r,t);return Array.isArray(e)||(e=[e]),a.send({appIds:e}).withCredentials().end(this.end(200,n,void 0)),n.promise},f.prototype.sendLoginEmail=function(e,t){var n=o.defer(),r=i.sprintf("%s/api/email-login",this._getAccountsUrl(t));return this.buildRequest("POST",r,t).send(e).withCredentials().end(this.end(200,n,void 0,function(e){if(400===e.status)return new s.InvalidEmailAddress("Invalid email address. Please enter a valid email address.")})),n.promise},f.prototype.mxLookup=function(e,t){var n=o.defer(),r=i.sprintf("%s/api/mx-lookup",this._getAccountsUrl(t));return this.buildRequest("POST",r,t).send(e).end(this.end(200,n,void 0)),n.promise},f.prototype.getAppIdBundle=function(e){var t=o.defer(),n=i.sprintf("%s/api/currentAppIdBundle",this._getAccountsUrl(e));return this.buildRequest("GET",n,e).withCredentials().end(this.end(200,t)),t.promise},f.prototype.createHmacSessionToken=function(e,t,n,r){var a=o.defer(),s={clientInstanceId:e};n&&(s.publicKey=n),r&&(s.ttlSeconds=r);var u=i.sprintf("%s/api/auth/hmac",this._getAccountsUrl(t));return this.buildRequest("POST",u,t).send(s).withCredentials().end(this.end(200,a)),a.promise},f.prototype.verifyJwt=function(e,t,n){var r=i.sprintf("%s/api/auth/jwt",this._getAccountsUrl(e)),o={jwt:t,permission:n};return this.buildRequest("POST",r,e).send(o)},f.prototype.validateVjwt=function(e,t,n){var r=i.sprintf("%s/api/auth/vjwt",this._getAccountsUrl(e)),o={req:t,permission:n};return this.buildRequest("POST",r,e).send(o)},f.prototype.register=function(e,t,n,r,a){var s=o.defer(),u={userId:e,platform:t,activationMethod:n};a&&(u.delegatee=a);var c=i.sprintf("%s/api/register",this._getAccountsUrl(r));return this._request("POST",c).send(u).withCredentials().end(this.end(201,s)),s.promise},f.prototype.verifyAdmin=function(e,t){var n=o.defer(),r=i.sprintf("%s/api/domain/%s/admin-verify",this._getAccountsUrl(t),e);return this.buildRequest("POST",r,t).end(this.end(200,n,void 0)),n.promise},f.prototype.getUserSettings=function(e,t){t=t||{};var n=o.defer();e=r.isArray(e)?e[0]:e;var a=i.sprintf("%s/api/userSettings",this._getAccountsUrl(e)),s=this.buildRequest("GET",a,e);return t.includePermissions&&s.set("X-Virtru-Permissions-Attributes","true"),t.includeCardInfo&&s.query({include:"cardInfo"}),e.tokenId&&e.tokenSecret&&t.userId&&s.query({userId:t.userId}),s.withCredentials().end(this.end(200,n,void 0)),n.promise},f.prototype.updateUserSettings=function(e,t){var n=o.defer(),r=i.sprintf("%s/api/userSettings/%s/preferences",this._getAccountsUrl(t),encodeURIComponent(t.userId));return this.buildRequest("PATCH",r,t).send(e).end(this.end(200,n,void 0)),n.promise},f.prototype.getDomainInformation=function(e,t){var n=o.defer();var r=i.sprintf("%s/api/domain/%s",this._getAccountsUrl(t),e);return this.buildRequest("GET",r,t).end(this.end(200,n,void 0,function(e){if(404===e.status)return new s.DomainNotFoundError(e.body.error.message)})),n.promise},f.prototype.refreshDomainInformation=function(e,t){var n=o.defer(),r=i.sprintf("%s/api/domain/%s/refresh",this._getAccountsUrl(t),e);return this.buildRequest("POST",r,t).end(this.end(200,n,void 0)),n.promise},f.prototype.sendBrowserReply=function(e,t){var n=o.defer();var r=i.sprintf("%s/api/browser-reply",this._getAccountsUrl(e));return this.buildRequest("POST",r,e).send(t).end(this.end(200,n,void 0,function(e){if(400===e.status&&"InvalidBodyFormatError"===e.body.error.name)return new s.InvalidBodyFormat(e.body.error.message)})),n.promise},f.prototype.listSignUp=function(e,t,n){var r=o.defer(),a=i.sprintf("%s/api/mailchimp/list-registration",this._getAccountsUrl(e)),s={email:t,listId:n};return this.buildRequest("POST",a,e).send(s).end(function(e,t){return e||200!==t.status&&222!==t.status?r.reject():r.resolve()}),r.promise},f.prototype.getAllLicenses=function(e){var t=o.defer(),n=i.sprintf("%s/api/userSettings/licenses",this._getAccountsUrl(e));return this.buildRequest("GET",n,e).end(this.end(200,t,void 0)),t.promise},f.prototype.requestActivationCode=function(e,t,n){var r=o.defer(),a=i.sprintf("%s/api/code-login",this._getAccountsUrl(n));var u={userId:e,relatedPolicyId:t};return this.buildRequest("POST",a,n).send(u).end(this.end(200,r,void 0,function(e){if(401===e.status){var t=e.body.error;switch(t.name){case"CodeRateLimitError":return new s.CodeRateLimitError(t.message);case"MaxCodesRequestedError":return new s.MaxCodesRequestedError(t.message);default:return}}})),r.promise},f.prototype.activateWithCode=function(e,t,n,r){var a=o.defer();var u=i.sprintf("%s/api/code-activation",this._getAccountsUrl(r)),c={sessionId:e,userId:t,code:n};return this.buildRequest("POST",u,r).send(c).end(this.end(200,a,void 0,function(e){if(401===e.status){var t=e.body.error;switch(t.name){case"InvalidCodeError":return new s.InvalidCodeError(t.message);case"CodeAlreadyUsed":return new s.CodeAlreadyUsed(t.message);case"CodeExpiredError":return new s.CodeExpiredError(t.message);case"CodeRateLimitError":return new s.CodeRateLimitError(t.message);case"BadActivationRequest":return new s.BadActivationRequest(t.message);case"CookieNotFoundError":return new s.CookieNotFoundError(t.message);default:return}}})),a.promise},f.prototype.getOrg=function(e){return new d(function(t,n){e=r.isArray(e)?e[0]:e;var o=i.sprintf("%s/api/org",this._getAccountsUrl(e));this.buildRequest("GET",o,e).end(this.end(200,{resolve:t,reject:n},void 0))}.bind(this)).then(function(e){return l.create(e)})},f.prototype.storeUserPublicKey=function(e,t){var n=o.defer(),r=i.sprintf("%s/api/appIdBundle/public-key",this._getAccountsUrl(t));return this.buildRequest("POST",r,t).send({publicKey:e}).end(this.end(200,n,this.statusResponder)),n.promise},f.prototype.doesUserPublicKeyExist=function(e){var t=o.defer(),n=i.sprintf("%s/api/appIdBundle/public-key/exists",this._getAccountsUrl(e));return this.buildRequest("GET",n,e).end(this.end(200,t,this.statusResponder)),t.promise},f.prototype.updateAdmin=function(e,t,n){var r=this;return new d(function(o,a){var s=i.sprintf("%s/api/org/update-admin",r._getAccountsUrl(n)),u=r.buildRequest("POST",s,n),c={userId:e,isAdmin:t};u.send(c).end(r.end(200,{resolve:o,reject:a},void 0))})},f.prototype.analyticsProxy=function(e,t){return new d(function(n,r){var o=i.sprintf("%s/api/analytics-proxy",this._getAccountsUrl(t)),a=this.buildRequest("POST",o,t),s={events:e};a.send(s).end(this.end(200,{resolve:n,reject:r},void 0))}.bind(this))},f.prototype.getClientConfig=function(e){return e=r.isArray(e)?e[0]:e,c.checkIsObject(e),c.checkIsString(e.clientString),new d(function(t,n){var r=i.sprintf("%s/api/client-config",this._getAccountsUrl(e));this.buildRequest("GET",r,e).end(this.end(200,{resolve:t,reject:n},void 0))}.bind(this))},f.prototype.cancelOrg=function(e){var t=this;return new d(function(n,r){var o=i.sprintf("%s/api/org/cancel",t._getAccountsUrl(e));t.buildRequest("POST",o,e).end(t.end(200,{resolve:n,reject:r},void 0))})},f.prototype.updateOrganizationSettings=function(e,t){c.checkIsObject(e),c.checkIsObject(t);var n=this;return new d(function(r,o){var a=i.sprintf("%s/api/org/settings",n._getAccountsUrl(t));n.buildRequest("POST",a,t).send(e).end(n.end(200,{resolve:r,reject:o},void 0))})},f.prototype.exportMemberList=function(e){c.checkIsObject(e);var t=this;return new d(function(n,r){var o=i.sprintf("%s/api/org/members/list",t._getAccountsUrl(e));t.buildRequest("POST",o,e).end(t.end(200,{resolve:n,reject:r},void 0))})},f.prototype.getCertificateUploadLink=function(e,t,n){c.checkIsObject(n);var r=this;return new d(function(o,a){var s=i.sprintf("%s/api/org/certificate-upload-link",r._getAccountsUrl(n)),u=r.buildRequest("POST",s,n),c={orgId:e,hostname:t};u.send(c).end(r.end(200,{resolve:o,reject:a},void 0))})},t.AccountsService=f},function(e,t,n){e.exports={ApiTokenModel:n(104),AttributeConstants:n(53),DlpRulesModel:n(105),DlpPolicyModel:n(660),Keys:n(31),OrganizationModel:n(106),PolicyModel:n(107),UnitAttributesModel:n(677),UserSettingsModel:n(55),UserSearchModel:n(678),AuditRecordModel:n(679),ModelTranslator:n(343),EncryptedSearchKeyModel:n(680),AuthCodeSessionModel:n(681),TaskModel:n(682).TaskModel,DynamoAuditModels:n(683)}},function(e,t,n){(function(t){const r=n(117),i=n(658),o=n(24),a=["-----BEGIN RSA PUBLIC KEY-----","-----BEGIN PUBLIC KEY-----"],s=["-----END RSA PUBLIC KEY-----","-----END PUBLIC KEY-----"];e.exports=function(e){var n=(e=e.replace(/\s+$/,"")).split("\n"),u=n[0].trim(),c=n.slice(-1)[0].trim(),d=a.indexOf(u);if(-1===d)throw new TypeError(o.format('Unexpected Begin line "%s". Public key must be PEM encoded PKCS1 or PKCS8 key',u));if(s.indexOf(c)!==d)throw new TypeError(o.format('Unexpected End line "%s". Public key must be PEM encoded PKCS1 or PKCS8 key',c));for(var l="",f=1;f<n.length-1;f++){var p=n[f];if(l+=p,-1!==s.indexOf(p)||-1!==a.indexOf(p))throw new TypeError("Public key is not a properly PEM encoded PKCS1 or PKCS8 key")}var h=new t(l,"base64"),m=r.createHash("sha256");m.update(h);var _=m.digest();return i.encode(_)}}).call(this,n(7).Buffer)},function(e,t,n){"use strict";(function(t){function n(e){return(e+"===".slice((e.length+3)%4)).replace(/-/g,"+").replace(/_/g,"/")}function r(e){return e.replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"")}e.exports={unescape:n,escape:r,encode:function(e,n){return r(t.from(e,n||"utf8").toString("base64"))},decode:function(e,r){return t.from(n(e),"base64").toString(r||"utf8")}}}).call(this,n(7).Buffer)},function(e,t,n){(function(t){var n,r=t.crypto||t.msCrypto;if(r&&r.getRandomValues){var i=new Uint8Array(16);n=function(){return r.getRandomValues(i),i}}if(!n){var o=new Array(16);n=function(){for(var e,t=0;t<16;t++)0==(3&t)&&(e=4294967296*Math.random()),o[t]=e>>>((3&t)<<3)&255;return o}}e.exports=n}).call(this,n(4))},function(e,t,n){"use strict";var r=n(105),i=n(5),o=n(40),a=n(39),s=n(14);c.CURRENT_VERSION="3.0.0",c.DEFAULT_ACTIONS={"virtru:encrypt":{displayName:"Encrypt",description:"This action results in the email being encrypted.",auditAction:"Email Encrypted"},"virtru:warn":{displayName:"Warn",description:"This action results in the user being warned about the violation, and being given the opportunity to encrypt, and/or modify the email prior to sending.",auditAction:"User Warned"},"virtru:ignore":{displayName:"Ignore",description:"This action results in the violation being ignored. We will log this on the policy.",auditAction:"Violation Logged"},"virtru:addCc":{displayName:"Add CC",description:"This action results in an email address being added to the email's CC field.",auditAction:"User CCed"},"virtru:addBcc":{displayName:"Add BCC",description:"This action results in an email address being added to the email's BCC field.",auditAction:"User BCCed"},"virtru:addTo":{displayName:"Add To",description:"This action results in an email address being added to the email's To field.",auditAction:"User added as recipient"},"virtru:stripAttachments":{displayName:"Removed attachments",description:"This action results in any attachemnts being removed from the email.",auditAction:"Attachment removed."},"virtru:addContent":{displayName:"Content added",description:"This action results in content being added to the email body.",auditAction:"Content added."}},c.ADVANCED_ACTION_NAMES=["virtru:gateway:archive","virtru:addBcc","virtru:addCc","virtru:addTo","virtru:addContent"];var u={version:c.CURRENT_VERSION,actions:c.DEFAULT_ACTIONS,rules:[],createdForUserId:void 0,orgId:void 0};function c(){i.extend(this,i.cloneDeep(u))}c.create=s.createFunc(c),c.prototype.deepClone=s.createDeepClone(c),c.upgrade=function(e){return o.lt(e.version||"3.0.0",c.CURRENT_VERSION)?(c.upgradeTo_v3_0_0(e),e):e},c.createFromRulesArray=function(e){if(e&&e.length){var t=e[0].getPrimaryOrgId(),n={rules:e,orgId:t};return c.create(n)}},c.upgradeTo_v3_0_0=function(e){var t=e.version||"3.0.0";if(o.lt(t,c.CURRENT_VERSION)){e.version="3.0.0",delete e.id,delete e._id;var n=i.cloneDeep(e.rules);e.rules=n.map(function(t){var n=r.create({id:a.v4()});n.setPrimaryOrgId(e.orgId),n.definition=t,n.staticId=n.id;var o=t.labels[0],s=e.relationships[o],u=i.map(s,function(e,t){var n=e.action,r={key:n};return i.includes(c.ADVANCED_ACTION_NAMES,n)&&e.actionParams&&(r.value=e.actionParams),r});return t.labels=u,n.isDeprecated=!1,n}),delete e.relationships}},c.prototype.transformTo_2_1_0=function(){var e={id:a.v4(),version:"2.1.0",orgId:this.orgId,rules:[],relationships:{},actions:c.DEFAULT_ACTIONS},t=this.rules.map(function(t){var n=(t=r.create(t)).getDefinition(),o=t.getRelationshipId(),a=t.getLabels();return 0===a.length?e.relationships[o]=[{action:""}]:e.relationships[o]=i.map(a,function(e){var t={action:e.key};return e.value&&(t.actionParams=e.value),t}),n.labels=[o],delete n.actions,n});return e.rules=t,e},c.prototype.getPrimaryOrgId=function(){return this.orgId},c.prototype.getRules=function(){return this.rules||[]},i.extend(c.prototype,s.prototype),e.exports=c},function(e,t){function n(e,t){var n=[],r=[];return null==t&&(t=function(e,t){return n[0]===t?"[Circular ~]":"[Circular ~."+r.slice(0,n.indexOf(t)).join(".")+"]"}),function(i,o){if(n.length>0){var a=n.indexOf(this);~a?n.splice(a+1):n.push(this),~a?r.splice(a,1/0,i):r.push(i),~n.indexOf(o)&&(o=t.call(this,i,o))}else n.push(o);return null==e?o:e.call(this,i,o)}}(e.exports=function(e,t,r,i){return JSON.stringify(e,n(t,i),r)}).getSerialize=n},function(e,t,n){var r=n(663),i=n(664),o=i;o.v1=r,o.v4=i,e.exports=o},function(e,t,n){var r,i,o=n(338),a=n(339),s=0,u=0;e.exports=function(e,t,n){var c=t&&n||0,d=t||[],l=(e=e||{}).node||r,f=void 0!==e.clockseq?e.clockseq:i;if(null==l||null==f){var p=o();null==l&&(l=r=[1|p[0],p[1],p[2],p[3],p[4],p[5]]),null==f&&(f=i=16383&(p[6]<<8|p[7]))}var h=void 0!==e.msecs?e.msecs:(new Date).getTime(),m=void 0!==e.nsecs?e.nsecs:u+1,_=h-s+(m-u)/1e4;if(_<0&&void 0===e.clockseq&&(f=f+1&16383),(_<0||h>s)&&void 0===e.nsecs&&(m=0),m>=1e4)throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");s=h,u=m,i=f;var v=(1e4*(268435455&(h+=122192928e5))+m)%4294967296;d[c++]=v>>>24&255,d[c++]=v>>>16&255,d[c++]=v>>>8&255,d[c++]=255&v;var y=h/4294967296*1e4&268435455;d[c++]=y>>>8&255,d[c++]=255&y,d[c++]=y>>>24&15|16,d[c++]=y>>>16&255,d[c++]=f>>>8|128,d[c++]=255&f;for(var g=0;g<6;++g)d[c+g]=l[g];return t||a(d)}},function(e,t,n){var r=n(338),i=n(339);e.exports=function(e,t,n){var o=t&&n||0;"string"==typeof e&&(t="binary"===e?new Array(16):null,e=null);var a=(e=e||{}).random||(e.rng||r)();if(a[6]=15&a[6]|64,a[8]=63&a[8]|128,t)for(var s=0;s<16;++s)t[o+s]=a[s];return t||i(a)}},function(e,t,n){e.exports=n(666)},function(e,t,n){var r=n(24),i=e.exports=n(667);function o(e,t,n,i){n=n||"";var o=new e(r.format.apply(this,[n].concat(i)));throw Error.captureStackTrace(o,t),o}function a(e,t,n){o(i.IllegalArgumentError,e,t,n)}function s(e){var t=typeof e;if("object"==t){if(!e)return"null";if(e instanceof Array)return"array"}return t}function u(e){return function(t,n){var r=s(t);if(r==e)return t;a(arguments.callee,n||'Expected "'+e+'" but got "'+r+'".',Array.prototype.slice.call(arguments,2))}}e.exports.checkArgument=function(e,t){e||a(arguments.callee,t,Array.prototype.slice.call(arguments,2))},e.exports.checkState=function(e,t){e||function(e,t,n){o(i.IllegalStateError,e,t,n)}(arguments.callee,t,Array.prototype.slice.call(arguments,2))},e.exports.checkIsDef=function(e,t){if(void 0!==e)return e;a(arguments.callee,t||"Expected value to be defined but was undefined.",Array.prototype.slice.call(arguments,2))},e.exports.checkIsDefAndNotNull=function(e,t){if(null!=e)return e;a(arguments.callee,t||'Expected value to be defined and not null but got "'+s(e)+'".',Array.prototype.slice.call(arguments,2))},e.exports.checkIsString=u("string"),e.exports.checkIsArray=u("array"),e.exports.checkIsNumber=u("number"),e.exports.checkIsBoolean=u("boolean"),e.exports.checkIsFunction=u("function"),e.exports.checkIsObject=u("object")},function(e,t,n){var r=n(24);function i(e){Error.call(this,e),this.message=e}function o(e){Error.call(this,e),this.message=e}r.inherits(i,Error),i.prototype.name="IllegalArgumentError",r.inherits(o,Error),o.prototype.name="IllegalStateError",e.exports.IllegalStateError=o,e.exports.IllegalArgumentError=i},function(e,t,n){var r=n(341).sanitizeErrorFilter;function i(e){var t=e||r;return function(e,n,r,i){return e=t(e),r.status(e.code),r.send(e)}}e.exports={createCatchAllErrorHandlerMiddleware:i,catchAllErrorHandlerMW:i()}},function(e,t,n){(function(t){var r=n(342).stderrErrorLogger;function i(e){var n=e||console.error;return function(e,i,o,a){return t.env.SILENCE_LOGS?a(e):(r(e,i,{},n),a(e))}}e.exports={createStderrErrorLoggerMW:i,stderrErrorLoggerMW:i()}}).call(this,n(8))},function(e,t,n){(function(t){var r=n(671),i=n(48),o=n(20),a=n(54).BaseError,s=n(41).sanitizeError;e.exports={sentryErrorLoggerMW:function(e,n){return(u,c,d,l)=>{if(t.env.SILENCE_LOGS)return l(u);if(u instanceof a){if(u.code>=500){var f={requestId:c.requestId,server:n,type:"error"},p=o.cloneDeep(c.query);p.appId&&delete p.appId;var h=u.getRootCause(),m=i.stringify(p),_={extra:f,"sentry.interfaces.Http":{url:(c.socket.encrypted?"https":"http")+"://"+(c.headers.host||"<no host>")+r.parse(c.url).pathname+"?"+m,method:c.method,query_string:m},tags:{rootErrorName:h.name,rootErrorMessage:h.message,errorName:u.name,errorMessage:u.message,method:c.method}};e.captureException(s(h),_)}}else e.captureException(s(u));return l(u)}}}}).call(this,n(8))},function(e,t,n){"use strict";var r=n(672),i=n(673);function o(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}t.parse=g,t.resolve=function(e,t){return g(e,!1,!0).resolve(t)},t.resolveObject=function(e,t){return e?g(e,!1,!0).resolveObject(t):t},t.format=function(e){i.isString(e)&&(e=g(e));return e instanceof o?e.format():o.prototype.format.call(e)},t.Url=o;var a=/^([a-z0-9.+-]+:)/i,s=/:[0-9]*$/,u=/^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,c=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),d=["'"].concat(c),l=["%","/","?",";","#"].concat(d),f=["/","?","#"],p=/^[+a-z0-9A-Z_-]{0,63}$/,h=/^([+a-z0-9A-Z_-]{0,63})(.*)$/,m={javascript:!0,"javascript:":!0},_={javascript:!0,"javascript:":!0},v={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0},y=n(48);function g(e,t,n){if(e&&i.isObject(e)&&e instanceof o)return e;var r=new o;return r.parse(e,t,n),r}o.prototype.parse=function(e,t,n){if(!i.isString(e))throw new TypeError("Parameter 'url' must be a string, not "+typeof e);var o=e.indexOf("?"),s=-1!==o&&o<e.indexOf("#")?"?":"#",c=e.split(s);c[0]=c[0].replace(/\\/g,"/");var g=e=c.join(s);if(g=g.trim(),!n&&1===e.split("#").length){var b=u.exec(g);if(b)return this.path=g,this.href=g,this.pathname=b[1],b[2]?(this.search=b[2],this.query=t?y.parse(this.search.substr(1)):this.search.substr(1)):t&&(this.search="",this.query={}),this}var w=a.exec(g);if(w){var M=(w=w[0]).toLowerCase();this.protocol=M,g=g.substr(w.length)}if(n||w||g.match(/^\/\/[^@\/]+@[^@\/]+/)){var k="//"===g.substr(0,2);!k||w&&_[w]||(g=g.substr(2),this.slashes=!0)}if(!_[w]&&(k||w&&!v[w])){for(var x,S,L=-1,A=0;A<f.length;A++){-1!==(E=g.indexOf(f[A]))&&(-1===L||E<L)&&(L=E)}-1!==(S=-1===L?g.lastIndexOf("@"):g.lastIndexOf("@",L))&&(x=g.slice(0,S),g=g.slice(S+1),this.auth=decodeURIComponent(x)),L=-1;for(A=0;A<l.length;A++){var E;-1!==(E=g.indexOf(l[A]))&&(-1===L||E<L)&&(L=E)}-1===L&&(L=g.length),this.host=g.slice(0,L),g=g.slice(L),this.parseHost(),this.hostname=this.hostname||"";var T="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!T)for(var D=this.hostname.split(/\./),j=(A=0,D.length);A<j;A++){var I=D[A];if(I&&!I.match(p)){for(var Y="",O=0,R=I.length;O<R;O++)I.charCodeAt(O)>127?Y+="x":Y+=I[O];if(!Y.match(p)){var C=D.slice(0,A),P=D.slice(A+1),U=I.match(h);U&&(C.push(U[1]),P.unshift(U[2])),P.length&&(g="/"+P.join(".")+g),this.hostname=C.join(".");break}}}this.hostname.length>255?this.hostname="":this.hostname=this.hostname.toLowerCase(),T||(this.hostname=r.toASCII(this.hostname));var N=this.port?":"+this.port:"",F=this.hostname||"";this.host=F+N,this.href+=this.host,T&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==g[0]&&(g="/"+g))}if(!m[M])for(A=0,j=d.length;A<j;A++){var H=d[A];if(-1!==g.indexOf(H)){var B=encodeURIComponent(H);B===H&&(B=escape(H)),g=g.split(H).join(B)}}var z=g.indexOf("#");-1!==z&&(this.hash=g.substr(z),g=g.slice(0,z));var q=g.indexOf("?");if(-1!==q?(this.search=g.substr(q),this.query=g.substr(q+1),t&&(this.query=y.parse(this.query)),g=g.slice(0,q)):t&&(this.search="",this.query={}),g&&(this.pathname=g),v[M]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){N=this.pathname||"";var W=this.search||"";this.path=N+W}return this.href=this.format(),this},o.prototype.format=function(){var e=this.auth||"";e&&(e=(e=encodeURIComponent(e)).replace(/%3A/i,":"),e+="@");var t=this.protocol||"",n=this.pathname||"",r=this.hash||"",o=!1,a="";this.host?o=e+this.host:this.hostname&&(o=e+(-1===this.hostname.indexOf(":")?this.hostname:"["+this.hostname+"]"),this.port&&(o+=":"+this.port)),this.query&&i.isObject(this.query)&&Object.keys(this.query).length&&(a=y.stringify(this.query));var s=this.search||a&&"?"+a||"";return t&&":"!==t.substr(-1)&&(t+=":"),this.slashes||(!t||v[t])&&!1!==o?(o="//"+(o||""),n&&"/"!==n.charAt(0)&&(n="/"+n)):o||(o=""),r&&"#"!==r.charAt(0)&&(r="#"+r),s&&"?"!==s.charAt(0)&&(s="?"+s),t+o+(n=n.replace(/[?#]/g,function(e){return encodeURIComponent(e)}))+(s=s.replace("#","%23"))+r},o.prototype.resolve=function(e){return this.resolveObject(g(e,!1,!0)).format()},o.prototype.resolveObject=function(e){if(i.isString(e)){var t=new o;t.parse(e,!1,!0),e=t}for(var n=new o,r=Object.keys(this),a=0;a<r.length;a++){var s=r[a];n[s]=this[s]}if(n.hash=e.hash,""===e.href)return n.href=n.format(),n;if(e.slashes&&!e.protocol){for(var u=Object.keys(e),c=0;c<u.length;c++){var d=u[c];"protocol"!==d&&(n[d]=e[d])}return v[n.protocol]&&n.hostname&&!n.pathname&&(n.path=n.pathname="/"),n.href=n.format(),n}if(e.protocol&&e.protocol!==n.protocol){if(!v[e.protocol]){for(var l=Object.keys(e),f=0;f<l.length;f++){var p=l[f];n[p]=e[p]}return n.href=n.format(),n}if(n.protocol=e.protocol,e.host||_[e.protocol])n.pathname=e.pathname;else{for(var h=(e.pathname||"").split("/");h.length&&!(e.host=h.shift()););e.host||(e.host=""),e.hostname||(e.hostname=""),""!==h[0]&&h.unshift(""),h.length<2&&h.unshift(""),n.pathname=h.join("/")}if(n.search=e.search,n.query=e.query,n.host=e.host||"",n.auth=e.auth,n.hostname=e.hostname||e.host,n.port=e.port,n.pathname||n.search){var m=n.pathname||"",y=n.search||"";n.path=m+y}return n.slashes=n.slashes||e.slashes,n.href=n.format(),n}var g=n.pathname&&"/"===n.pathname.charAt(0),b=e.host||e.pathname&&"/"===e.pathname.charAt(0),w=b||g||n.host&&e.pathname,M=w,k=n.pathname&&n.pathname.split("/")||[],x=(h=e.pathname&&e.pathname.split("/")||[],n.protocol&&!v[n.protocol]);if(x&&(n.hostname="",n.port=null,n.host&&(""===k[0]?k[0]=n.host:k.unshift(n.host)),n.host="",e.protocol&&(e.hostname=null,e.port=null,e.host&&(""===h[0]?h[0]=e.host:h.unshift(e.host)),e.host=null),w=w&&(""===h[0]||""===k[0])),b)n.host=e.host||""===e.host?e.host:n.host,n.hostname=e.hostname||""===e.hostname?e.hostname:n.hostname,n.search=e.search,n.query=e.query,k=h;else if(h.length)k||(k=[]),k.pop(),k=k.concat(h),n.search=e.search,n.query=e.query;else if(!i.isNullOrUndefined(e.search)){if(x)n.hostname=n.host=k.shift(),(T=!!(n.host&&n.host.indexOf("@")>0)&&n.host.split("@"))&&(n.auth=T.shift(),n.host=n.hostname=T.shift());return n.search=e.search,n.query=e.query,i.isNull(n.pathname)&&i.isNull(n.search)||(n.path=(n.pathname?n.pathname:"")+(n.search?n.search:"")),n.href=n.format(),n}if(!k.length)return n.pathname=null,n.search?n.path="/"+n.search:n.path=null,n.href=n.format(),n;for(var S=k.slice(-1)[0],L=(n.host||e.host||k.length>1)&&("."===S||".."===S)||""===S,A=0,E=k.length;E>=0;E--)"."===(S=k[E])?k.splice(E,1):".."===S?(k.splice(E,1),A++):A&&(k.splice(E,1),A--);if(!w&&!M)for(;A--;A)k.unshift("..");!w||""===k[0]||k[0]&&"/"===k[0].charAt(0)||k.unshift(""),L&&"/"!==k.join("/").substr(-1)&&k.push("");var T,D=""===k[0]||k[0]&&"/"===k[0].charAt(0);x&&(n.hostname=n.host=D?"":k.length?k.shift():"",(T=!!(n.host&&n.host.indexOf("@")>0)&&n.host.split("@"))&&(n.auth=T.shift(),n.host=n.hostname=T.shift()));return(w=w||n.host&&k.length)&&!D&&k.unshift(""),k.length?n.pathname=k.join("/"):(n.pathname=null,n.path=null),i.isNull(n.pathname)&&i.isNull(n.search)||(n.path=(n.pathname?n.pathname:"")+(n.search?n.search:"")),n.auth=e.auth||n.auth,n.slashes=n.slashes||e.slashes,n.href=n.format(),n},o.prototype.parseHost=function(){var e=this.host,t=s.exec(e);t&&(":"!==(t=t[0])&&(this.port=t.substr(1)),e=e.substr(0,e.length-t.length)),e&&(this.hostname=e)}},function(e,t,n){(function(e,r){var i;/*! https://mths.be/punycode v1.4.1 by @mathias */!function(o){t&&t.nodeType,e&&e.nodeType;var a="object"==typeof r&&r;a.global!==a&&a.window!==a&&a.self;var s,u=2147483647,c=36,d=1,l=26,f=38,p=700,h=72,m=128,_="-",v=/^xn--/,y=/[^\x20-\x7E]/,g=/[\x2E\u3002\uFF0E\uFF61]/g,b={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},w=c-d,M=Math.floor,k=String.fromCharCode;function x(e){throw new RangeError(b[e])}function S(e,t){for(var n=e.length,r=[];n--;)r[n]=t(e[n]);return r}function L(e,t){var n=e.split("@"),r="";return n.length>1&&(r=n[0]+"@",e=n[1]),r+S((e=e.replace(g,".")).split("."),t).join(".")}function A(e){for(var t,n,r=[],i=0,o=e.length;i<o;)(t=e.charCodeAt(i++))>=55296&&t<=56319&&i<o?56320==(64512&(n=e.charCodeAt(i++)))?r.push(((1023&t)<<10)+(1023&n)+65536):(r.push(t),i--):r.push(t);return r}function E(e){return S(e,function(e){var t="";return e>65535&&(t+=k((e-=65536)>>>10&1023|55296),e=56320|1023&e),t+=k(e)}).join("")}function T(e,t){return e+22+75*(e<26)-((0!=t)<<5)}function D(e,t,n){var r=0;for(e=n?M(e/p):e>>1,e+=M(e/t);e>w*l>>1;r+=c)e=M(e/w);return M(r+(w+1)*e/(e+f))}function j(e){var t,n,r,i,o,a,s,f,p,v,y,g=[],b=e.length,w=0,k=m,S=h;for((n=e.lastIndexOf(_))<0&&(n=0),r=0;r<n;++r)e.charCodeAt(r)>=128&&x("not-basic"),g.push(e.charCodeAt(r));for(i=n>0?n+1:0;i<b;){for(o=w,a=1,s=c;i>=b&&x("invalid-input"),((f=(y=e.charCodeAt(i++))-48<10?y-22:y-65<26?y-65:y-97<26?y-97:c)>=c||f>M((u-w)/a))&&x("overflow"),w+=f*a,!(f<(p=s<=S?d:s>=S+l?l:s-S));s+=c)a>M(u/(v=c-p))&&x("overflow"),a*=v;S=D(w-o,t=g.length+1,0==o),M(w/t)>u-k&&x("overflow"),k+=M(w/t),w%=t,g.splice(w++,0,k)}return E(g)}function I(e){var t,n,r,i,o,a,s,f,p,v,y,g,b,w,S,L=[];for(g=(e=A(e)).length,t=m,n=0,o=h,a=0;a<g;++a)(y=e[a])<128&&L.push(k(y));for(r=i=L.length,i&&L.push(_);r<g;){for(s=u,a=0;a<g;++a)(y=e[a])>=t&&y<s&&(s=y);for(s-t>M((u-n)/(b=r+1))&&x("overflow"),n+=(s-t)*b,t=s,a=0;a<g;++a)if((y=e[a])<t&&++n>u&&x("overflow"),y==t){for(f=n,p=c;!(f<(v=p<=o?d:p>=o+l?l:p-o));p+=c)S=f-v,w=c-v,L.push(k(T(v+S%w,0))),f=M(S/w);L.push(k(T(f,0))),o=D(n,b,r==i),n=0,++r}++n,++t}return L.join("")}s={version:"1.4.1",ucs2:{decode:A,encode:E},decode:j,encode:I,toASCII:function(e){return L(e,function(e){return y.test(e)?"xn--"+I(e):e})},toUnicode:function(e){return L(e,function(e){return v.test(e)?j(e.slice(4).toLowerCase()):e})}},void 0===(i=function(){return s}.call(t,n,t,e))||(e.exports=i)}()}).call(this,n(12)(e),n(4))},function(e,t,n){"use strict";e.exports={isString:function(e){return"string"==typeof e},isObject:function(e){return"object"==typeof e&&null!==e},isNull:function(e){return null===e},isNullOrUndefined:function(e){return null==e}}},function(e,t,n){(function(t){var r=n(20),i=n(54).BaseError,o=n(41).sanitizeError;e.exports={sentryNonHttpErrorLogger:function(e,n){return(a,s)=>{if(!t.env.SILENCE_LOGS){var u={extra:{requestId:(s=s||{}).requestId||"na",server:n,type:"error"}},c=a;a instanceof i&&(c=a.getRootCause(),r.extend(u,{tags:{rootErrorName:c.name,rootErrorMessage:c.message,errorName:a.name,errorMessage:a.message}})),e.captureException(o(c),u)}}}}}).call(this,n(8))},function(e,t,n){(function(t){var r=n(41).sanitizeError;e.exports={uncaughtExceptionHandler:function(e,n){t.on("uncaughtException",function(i){if(console.error("%j",{type:"fatal",server:t.env.PUBLIC_DNS||"localhost",timestamp:(new Date).toISOString(),error:{name:i.name,message:i.message,stack:i.stack}}),!t.env.SILENCE_LOGS&&e){var o={extraErrorData:{server:n,type:"fatal"},tags:{rootErrorName:i.name,rootErrorMessage:i.message,errorName:"FatalError",errorMessage:"A fatal error has occurred."}};e.once("logged",()=>{t.exit(1)}),e.once("error",()=>{t.exit(1)}),e.captureError(r(i),o)}else t.exit(1)})}}}).call(this,n(8))},function(e,t,n){(function(t){e.exports.unhandledRejectionHandler=function(e){t.on("unhandledRejection",(n,r)=>{const i=`UnhandledPromiseRejection for ${JSON.stringify(r)}. Reason: ${JSON.stringify(n)}`;try{e.logEvent("UnhandledPromiseRejection",i)}catch(e){const n=t.env.PUBLIC_DNS||"localhost",r=(new Date).toISOString();console.error(`${i}. Server: ${n}. Timestamp: ${r}`)}})}}).call(this,n(8))},function(e,t,n){"use strict";var r=n(5),i=n(6),o=n(14),a=n(40),s=n(53);c.CURRENT_VERSION="1.0.0";var u={version:c.CURRENT_VERSION,name:void 0,orgId:void 0,remoteId:void 0,parentId:void 0,type:void 0,createdOn:void 0,permissions:{},lastModified:void 0};function c(){r.extend(this,r.cloneDeep(u))}c.CURRENT_VERSION="1.0.0";var d={};c._create=o.createFunc(c),c.TYPE_GROUP="group",c.TYPE_OU="organizational-unit";var l=[c.TYPE_OU,c.TYPE_GROUP];c.create=function(e){var t=c._create(e);return r.isEmpty(t.permissions)&&(t.permissions=r.cloneDeep(d)),t},c.upgrade=function(e){return a.lt(e.version||"0.0.0",c.CURRENT_VERSION)?(c.upgradeTo_v1_0_0(e),e):e},c.upgradeTo_v1_0_0=function(e){var t=e.version||"0.0.0";a.lt(t,"1.0.0")&&(r.isEmpty(e.permissions)&&(e.permissions=r.cloneDeep(d)),e.version="1.0.0")},c.createFromGoogleUnit=function(e){i.checkIsObject(e),i.checkIsString(e.orgId);var t=e.orgId,n={orgId:t,version:c.CURRENT_VERSION,permissions:{}},r=e.orgUnitPath?c.TYPE_OU:c.TYPE_GROUP;return r===c.TYPE_OU?(n.remoteId=encodeURIComponent(e.orgUnitId),n.name=e.orgUnitPath,e.parentOrgUnitId&&(n.parentId=encodeURIComponent(e.parentOrgUnitId))):r===c.TYPE_GROUP&&(n.remoteId=e.id,n.name=e.email),n.id=t+"-"+n.remoteId,n._id=n.id,n.type=r,c.create(n)},c.createFromUserSettings=function(e){i.checkIsObject(e);var t=e.permissions,n=e.getPrimaryOrgId(),r=e.getUniqueId(),o=e.userId,a={orgId:n,type:c.TYPE_GROUP,name:o,permissions:t,id:n+"-"+r,remoteId:r};return c.create(a)},r.extend(c.prototype,o.prototype),c.prototype.deepClone=o.createDeepClone(c),c.prototype.getAllowed=function(e){return r.get(this.permissions,e)},c.prototype.getType=function(){return this.type},c.prototype.setType=function(e){return i.checkIsString(e),i.checkArgument(l.indexOf(e)>=0,"Invalid type"),this.type=e,this},c.prototype.getPrimaryOrgId=function(){return this.orgId},c.prototype.getMemberships=function(){const e={};return Object.keys(this.permissions).forEach(t=>{const n=this.permissions[t];n.length&&n.forEach(t=>{e[t]=!0})}),Object.keys(e)},d[s.Permissions.Admin.adminUnit]=[],d[s.Permissions.Admin.adminDlp]=[],d[s.Permissions.Admin.adminPolicyRead]=[],d[s.Permissions.Admin.adminPolicyRevoke]=[],d[s.Permissions.Admin.adminPolicyEdit]=[],d[s.Permissions.Admin.adminPolicyContractFetch]=[],d[s.Permissions.Admin.adminPolicyBulkExport]=[],d[s.Permissions.User.canRevokeOwnedPolicies]=!1,d[s.Permissions.User.canDisableForwardingOwnedPolicies]=!1,d[s.Permissions.User.canCreatePolicies]=!1,d[s.Permissions.User.canExpireOwnedPolicies]=!1,e.exports=c},function(e,t,n){"use strict";var r=n(5),i=n(14);function o(){}o.CURRENT_VERSION="0.1.0",o.LICENSE_ACTIVE="active",o.LICENSE_PENDING="pending",o.LICENSE_REVOKED="revoked",o.create=i.createFunc(o),r.extend(o.prototype,i.prototype),o.prototype.addActivatedPlatform=function(e){r.includes(this.activatedPlatforms,e)||this.activatedPlatforms.push(e)},o.prototype.setLicenseRevoked=function(){this.licenseStatus=o.LICENSE_REVOKED},o.prototype.setLicensePending=function(){this.licenseStatus=o.LICENSE_PENDING},o.prototype.setLicenseActive=function(){this.licenseStatus=o.LICENSE_ACTIVE},o.prototype.setAdminStatus=function(e){this.isAdmin=e},e.exports=o},function(e,t,n){"use strict";const r=n(5),i=n(40),o=n(14),a=n(107),s=n(55),u=n(106),c=n(343);let d={};d.policy=c.create(a),d.userSettings=c.create(s),d.organization=c.create(u),f.CURRENT_VERSION="2.0.0";const l={version:f.CURRENT_VERSION,context:{policyChanges:[]}};function f(){r.extend(this,r.cloneDeep(l))}r.extend(f.prototype,o.prototype),f._create=o.createFunc(f),f.prototype.deepClone=o.createDeepClone(f);const p=f.CREATE_ACTION="create",h=f.UPDATE_ACTION="update",m=f.CREATE_ERROR_ACTION="create-error",_=f.UPDATE_ERROR_ACTION="update-error";f.create=function(e){const t=f._create(e);return t.processRequestObject(),t.processDetails(),t},f.prototype.processRequestObject=function(){const e=r.get(this,"req.userSettings");e&&(this.req.userSettings=d.userSettings.translate(e))},f.prototype.processDetails=function(){if(this.isMetricsRecord())return;const e=this.details;this.isCreateAction()?this.details=this.translateToModel(e):this.isUpdateAction()&&(this.details.original=this.translateToModel(e.original),this.details.updated=this.translateToModel(e.updated))},f.prototype.getReqObject=function(){return r.get(this,"req")},f.prototype.getAuthenticationContext=function(){return r.get(this,"authContext")},f.prototype.translateToModel=function(e){const t=this.type;return d[t]&&(e=d[t].translate(e)),e},f.prototype.getPolicyChanges=function(){return this.context.policyChanges},f.prototype.addPolicyChange=function(e){this.context.policyChanges.push(e)},f.prototype.setPolicy=function(e){this.context.policy=e.deepClone()},f.prototype.setRecipientGroupMap=function(e){this.context.recipientGroupMap=e},f.prototype.getRecipientGroupMap=function(){return this.context.recipientGroupMap},f.prototype.setFirstTouchRecipients=function(e){this.context.firstTouchRecipients=e},f.prototype.getFirstTouchRecipients=function(){return this.context.firstTouchRecipients},f.prototype.getPolicy=function(){const e=this.context.policy.deepClone();return this.context.policyChanges.forEach(function(t){t(e)}),e},f.prototype.getUserSettings=function(){return r.get(this,"req.userSettings")},f.prototype.getOrganization=function(){return r.get(this,"req.organization")},f.prototype.setOrganization=function(e){this.req.organization=e},f.prototype.setOrgRules=function(e){this.req.dlpRules=e},f.prototype.getOrgRules=function(){const e=this.getOrganization();if(e)return this.req.dlpRules||e.dlp;const t=this.getUserSettings();return t?t.dlp:void 0},f.prototype.isCompatibleVersion=function(e){return i.satisfies(this.version,e)},f.prototype.isMetricsRecord=function(){return"ctr-email-click"===this.type||"email-click"===this.type||"contract-get"===this.type||"viral-activation-started"===this.type},f.prototype.isErrorAction=function(){return this.action===m||this.action===_},f.prototype.isCreateAction=function(){return this.action===p},f.prototype.isUpdateAction=function(){return this.action===h},f.prototype.isUserSettingsType=function(){return"userSettings"===this.type},f.prototype.isPolicyType=function(){return"policy"===this.type},f.prototype.isLicenseInvitationType=function(){return"licenseInvitation"===this.type},f.prototype.isAppIdBundleType=function(){return"appIdBundle"===this.type},f.prototype.isOrganizationType=function(){return"organization"===this.type},f.prototype.isContractGetType=function(){return"contract-get"===this.type},f.prototype.isEmailClickType=function(){return"email-click"===this.type},f.prototype.isCtrEmailClickType=function(){return"ctr-email-click"===this.type},f.prototype.isViralActivationStartType=function(){return"viral-activation-started"===this.type},f.prototype.isViralActivationSuccessType=function(){return"viral-activation-success"===this.type},f.prototype.isCompatibleViralEvent=function(){return void 0!==this.details.userId&&""!==this.details.userId},f.prototype.deleteContext=function(){delete this.context},e.exports=f},function(e,t,n){"use strict";var r=n(5),i=n(39),o=n(14),a=n(38),s=n(6),u=n(0);d.CURRENT_VERSION="1.0.0";var c={version:d.CURRENT_VERSION,encryptedKey:void 0,attributes:[],created:void 0,lastModified:void 0};function d(){r.extend(this,r.cloneDeep(c))}r.extend(d.prototype,o.prototype),r.extend(d.prototype,a.prototype),d.create=o.createFunc(d),d.createFromEncryptedKey=function(e){s.checkIsObject(e,"encryptedKey must be an object");var t=i.v4(),n=new d;return n.encryptedKey=e,n.id=t,n._id=t,d.create(n)},d.prototype.KeyScope="Data",d.prototype.deepClone=o.createDeepClone(d),d.prototype.getEncryptedKey=function(){return r.get(this,"encryptedKey")},d.prototype.revoke=function(){this.revokedOn=u().toISOString()},d.prototype.isRevoked=function(){return void 0!==this.revokedOn},e.exports=d},function(e,t,n){"use strict";var r=n(5),i=n(14),o=n(0);s.CURRENT_VERSION="1.0.0",s.EXPIRE_TIME_MINUTES=10,s.MAX_ACTIVATION_ATTEMPTS=5;var a={version:s.CURRENT_VERSION,sessionId:"",userId:"",code:void 0,activationAttempts:0,appId:void 0,activatedOn:void 0,relatedPolicyId:void 0,created:void 0,lastModified:void 0};function s(){r.extend(this,r.cloneDeep(a))}s.create=i.createFunc(s),s.createFromSessionAndUserId=function(e,t){var n={sessionId:e,userId:t,code:(Math.floor(9e7*Math.random())+1e7).toString(),created:o().toISOString()};return s.create(n)},r.extend(s.prototype,i.prototype),s.prototype.deepClone=i.createDeepClone(s),s.prototype.getSessionId=function(){return this.sessionId},s.prototype.getCode=function(){return this.code},s.prototype.incrementActivationAttempts=function(){return this.activationAttempts++,this},s.prototype.activate=function(e){return this.activatedOn=o().toISOString(),this.appId=e,this},s.prototype.disable=function(){return this.created=o(0).toISOString(),this},s.prototype.setPolicyId=function(e){return this.relatedPolicyId=e,this},s.prototype.setCode=function(e){return this.code=e,this},s.prototype.isExpired=function(){var e=o(),t=o(this.created).add(s.EXPIRE_TIME_MINUTES,"minutes");return e.isAfter(t)},s.prototype.timeLeft=function(){var e=o(),t=o(this.created).add(s.EXPIRE_TIME_MINUTES,"minutes").valueOf()-e.valueOf();return o.duration(t).asSeconds()},s.prototype.hasMoreActivationAttempts=function(){return this.activationAttempts<s.MAX_ACTIVATION_ATTEMPTS},s.prototype.isValidSessionCode=function(e){return!this.isExpired()&&void 0===this.activatedOn&&this.code===e&&this.activationAttempts<s.MAX_ACTIVATION_ATTEMPTS},e.exports=s},function(e,t,n){"use strict";const r=n(39),i=n(24),o=n(0),a=n(5),s=n(337).BaseError;function u(e){u.super_.call(this,null,"TaskValidationError",e||"Invalid input for this Task object")}function c(e){this._taskData=e}i.inherits(u,s),c.allowedStatuses=["pending","active","completed","cancelled","failed"],c.create=function(){return new c({taskId:r.v4(),progressUpdated:o().toISOString(),status:"pending",progressInfo:{message:"Pending Task"}})},c.prototype.updateProgress=function(e,t){if(-1===c.allowedStatuses.indexOf(e))throw new u(i.format('Invalid status value "%s"',e));if(void 0===t.message)throw new u("progressInfo.message is a required field");this._taskData.status=e,this._taskData.progressInfo=t,this._taskData.progressUpdated=o().toISOString()},c.prototype.id=function(){return this._taskData.taskId},c.prototype.toJSON=function(){return a.cloneDeep(a.pick(this._taskData,["progressUpdated","status","progressInfo"]))},e.exports={TaskModel:c,TaskValidationError:u}},function(e,t,n){e.exports={DynamoAuditBaseModel:n(17),DynamoAuditLicenseInvitationModel:n(684),DynamoAuditApiTokenModel:n(685),DynamoAuditAppIdBundlesModel:n(686),DynamoAuditContractGetModel:n(687),DynamoAuditDlpRulesModel:n(688),DynamoAuditDlpOverrideModel:n(689),DynamoAuditEncryptedSearchKeyModel:n(690),DynamoAuditOrganizationModel:n(691),DynamoAuditPolicyModel:n(692),DynamoAuditUnitAttributesModel:n(693),DynamoAuditUserSettingsModel:n(694)}},function(e,t,n){"use strict";const r=n(5),i=n(17);e.exports=class extends i{constructor(e){super(e);const t=r.get(e,"details.updated",e.details);this.invitationId=r.get(t,"id"),this.receiverId=r.get(t,"receiverId"),this.created=r.get(t,"created"),this.status=r.get(t,"status"),this.acceptedOn=r.get(t,"acceptedOn"),this.revokedOn=r.get(t,"revokedOn")}}},function(e,t,n){"use strict";const r=n(5),i=n(17),o=n(53),a=n(104);class s extends i{constructor(e){super(e);const t=r.get(e,"details.updated")||e.details,n=a.create(t);this.tokenId=t.tokenId,this.created=t.created,this.displayName=t.displayName,this.creator=n.getCreator(),this.owner=n.getOwner(),this.permissions=s._getPermissions(n)||[]}static _getPermissions(e){return e.permissionsAttributes().filter(e=>e.value).map(e=>{const t=e.key;return r.last(t.split(o.SEP))})}}e.exports=s},function(e,t,n){"use strict";const r=n(5),i=n(55),o=n(17);class a extends o{constructor(e){super(e);const t=e.action,n=e.details,i=r.get(n,"original",{}),o="update"===this.action?r.get(n,"updated",{}):n;this.appId=o.appId,this.userId=o.userId,this.created=o.created,this.state=o.state,this.isActivateEvent=!1,this.isDisableEvent=!1,this.isRevokedEvent=!1,"update"===t&&(this.isActivateEvent=a._isActivateEvent(i,o),this.isDisableEvent=a._isDisableEvent(i,o),this.isRevokedEvent=a._isRevokedEvent(i,o))}static _isDisableEvent(e,t){return"disabled"===t.state&&"disabled"!==e.state}static _isActivateEvent(e,t){return"active"===t.state&&"active"!==e.state}static _isRevokedEvent(e,t){return"revoked"===t.state&&"revoked"!==e.state}populateFromUserSettings(e){const t=i.create(e);this.setOrgId(t.getPrimaryOrgId()),this.userPrimaryOu=t.getPrimaryOrgUnitId(),this.userOus=r.uniq(t.organizationalUnitsValues()),this.userGroups=t.groupValues()}}e.exports=a},function(e,t,n){"use strict";const r=n(5),i=n(17);class o extends i{constructor(e){super(e);const t=e.details;this.userId=this.userId?this.userId:o._getUserId(e),this.policyId=t.policyId,this.policyOrgId=t.policyOrgId,this.isNoAuth=this.userId&&this.userId.includes("no-auth")}static _getUserId(e){const t=e.req,n=e.details;return r.get(t,"userSettings.userId")||n.userIdForAccess}}e.exports=o},function(e,t,n){"use strict";const r=n(5),i=n(17),o=n(105);class a extends i{constructor(e){super(e);const t=r.get(e,"details.updated",e.details),n=o.create(t);this.displayName=n.getDisplayName(),this.ruleId=n.getStaticId(),this.dlpActions=a._getDlpActions(n)||[],this.isDeprecated=!!n.getIsDeprecated(),this.ruleOus=r.uniq(n.organizationalUnitsValues())||[],this.ruleGroups=n.groupValues()||[],this.scope=r.get(t,"definition.scope"),this.created=n.getCreationDate()}static _getDlpActions(e){return e.getLabels().map(e=>e.key)}}e.exports=a},function(e,t,n){"use strict";const r=n(17);e.exports=class extends r{constructor(e){super(e);const{violatedRuleIds:t,violatedRuleNames:n}=e.details;this.violatedRuleIds=t||[],this.violatedRuleNames=n||[]}}},function(e,t,n){"use strict";const r=n(5),i=n(17);e.exports=class extends i{constructor(e){super(e);const t=r.get(e,"details.updated",e.details);this.keyId=t.id,this.created=t.created,this.revokedOn=t.revokedOn}}},function(e,t,n){"use strict";const r=n(5),i=n(17),o=n(106);e.exports=class extends i{constructor(e){super(e);const t=r.get(e,"details.updated",e.details),n=o.create(t);this.created=n.created,this.delegationEmail=n.delegationEmail,this.owner=n.getOwner(),this.lastDomainRefresh=n.lastDomainRefresh}}},function(e,t,n){"use strict";const r=n(5),i=n(17),o=n(107);class a extends i{constructor(e){super(e);const t=e.details,n="update"===this.action,i=r.get(t,"original"),s=n?r.get(t,"updated"):t,u=n?o.create(i):o.create({}),c=o.create(s),{violatedRuleIds:d,violatedRuleNames:l}=a._getViolationData(s);this.policyId=s.uuid||s._id,this.recipients=c.getAuthorizedEmails()||[],this.accessedBy=c.getAccessedBy()||[],this.created=s.created,this.displayName=s.displayName,this.policyPrimaryOu=c.getPrimaryOrgUnitId(),this.policyOus=r.uniq(c.organizationalUnitsValues())||[],this.policyGroups=c.groupValues()||[],this.policyOwner=c.getOwner(),this.violatedRuleIds=d,this.violatedRuleNames=l,this.appliedActions=r.get(s,"dlpAuditRecord.appliedActions")||[],this.policyType=c.getPolicyType(),this.state=c.getState(),this.isRevokeEvent=a._getIsRevokeEvent(u,c),this.isReauthorizeEvent=!!n&&a._getIsReauthorizeEvent(u,c),this.expiration=r.get(s,"simplePolicy.activeEnd"),this.isExpireEvent=a._getIsExpireEvent(i,s),this.isUnexpireEvent=a._getIsUnexpireEvent(i,s),this.isManaged=!!c.getIsManaged(),this.isManagedEvent=a._getIsManagedEvent(u,c),this.isUnmanagedEvent=a._getIsUnmanagedEvent(u,c),this.isForwardingDisabled=a._getIsForwardingDisabled(c),this.isForwardingDisabledEvent=a._getIsForwardingDisabledEvent(u,c),this.isForwardingEnabledEvent=a._getIsForwardingEnabledEvent(u,c),this.isOneClick=a._getIsOneClick(c),this.isOneClickEnabledEvent=a._getIsOneClickEnabledEvent(u,c),this.isOneClickDisabledEvent=a._getIsOneClickDisabledEvent(u,c),this.forwardLog=s.forwardLog||[],this.isForwardEvent=!!n&&a._getIsForwardEvent(u,c),this.isSendEvent=a._getIsSendEvent(u,c),this.children=s.children||[],this.isChildrenUpdatedEvent=!!n&&a._getIsChildrenUpdatedEvent(u,c)}static _getViolationData(e){const t=r.get(e,"dlpAuditRecord.violations",[]);let n=[],i=[];return Array.isArray(t)?(t.forEach(e=>{n.push(e.ruleId),i.push(e.displayName)}),{violatedRuleIds:n,violatedRuleNames:i}):{violatedRuleIds:Object.keys(t),violatedRuleNames:Object.keys(t)}}static _getIsOneClick(e){return(e.getAuthorizations()||[]).includes("no-auth")}static _getIsOneClickEnabledEvent(e,t){return!a._getIsOneClick(e)&&a._getIsOneClick(t)}static _getIsOneClickDisabledEvent(e,t){return a._getIsOneClick(e)&&!a._getIsOneClick(t)}static _getIsRevokeEvent(e,t){const n="active"!==e.getState();return"active"!==t.getState()&&!n}static _getIsReauthorizeEvent(e,t){const n="active"!==e.getState();return!("active"!==t.getState())&&n}static _getIsExpireEvent(e,t){const n=r.get(e,"simplePolicy.activeEnd"),i=r.get(t,"simplePolicy.activeEnd");return r.isEmpty(n)&&!r.isEmpty(i)}static _getIsUnexpireEvent(e,t){const n=r.get(e,"simplePolicy.activeEnd"),i=r.get(t,"simplePolicy.activeEnd");return!r.isEmpty(n)&&r.isEmpty(i)}static _getIsForwardingDisabled(e){const t=e.getAuthorizations();return Array.isArray(t)&&!t.includes("forward")}static _getIsForwardingDisabledEvent(e,t){const n=this._getIsForwardingDisabled(e);return!(!this._getIsForwardingDisabled(t)||n)}static _getIsForwardingEnabledEvent(e,t){const n=this._getIsForwardingDisabled(e);return!(this._getIsForwardingDisabled(t)||!n)}static _getIsManagedEvent(e,t){const n=e.getIsManaged();return!(!t.getIsManaged()||n)}static _getIsUnmanagedEvent(e,t){const n=e.getIsManaged();return!(t.getIsManaged()||!n)}static _getIsSendEvent(e,t){const n=!e.getPolicyType()&&"email"===t.getPolicyType(),r="draft"===e.getPolicyType()&&"email"===t.getPolicyType();return!(!n&&!r)}static _getIsForwardEvent(e,t){return!(!e||r.isEqual(e.forwardLog,t.forwardLog))}static _getIsChildrenUpdatedEvent(e,t){return!(!e||r.isEqual(e.children,t.children))}}e.exports=a},function(e,t,n){"use strict";const r=n(5),i=n(17),o=n(53);class a extends i{constructor(e){super(e);const t=r.get(e,"details.original",e.details),n=r.get(e,"details.updated",e.details),i=n.permissions;this.name=n.name,this.created=n.created,this.unitType=n.type,this.remoteId=n.remoteId,this.permissions=a._getPermissions(i)||[];const o=a._getAddedAndRemovedAdmins(t,n),s=a._getAdminPermissions(i);Object.assign(this,o,s)}static _getPermissions(e){const t=r.pick(e,(e,t)=>!a._isAdminPermission(e,t)&&e);return Object.keys(t)}static _getAddedAndRemovedAdmins(e,t){const n={};return r.each(o.Permissions.Admin,i=>{const o=e.permissions,a=t.permissions,s=r.difference(o[i],a[i])||[],u=r.difference(a[i],o[i])||[];n[`${i}Removed`]=s,n[`${i}Added`]=u}),n}static _getAdminPermissions(e){return r.pick(e,a._isAdminPermission)}static _isAdminPermission(e,t){return t.startsWith("admin")&&Array.isArray(e)}}e.exports=a},function(e,t,n){"use strict";const r=n(5),i=n(17),o=n(55);class a extends i{constructor(e){super(e);const t=r.get(e,"details.updated",e.details),n=o.create(t);if(this.userSettingsId=r.get(t,"userId"),this.permissions=a._getPermissions(t),this.created=r.get(t,"created"),this.userSettingsOus=r.uniq(n.organizationalUnitsValues())||[],this.userSettingsPrimaryOu=n.getPrimaryOrgUnitId(),this.userSettingsGroups=n.groupValues()||[],this.userSettingsIsSuperAdmin=n.isSuperAdmin(),"update"===e.action){const t=o.create(r.get(e,"details.original",{}));this.isSuperAdminToggledEvent=a._getIsSuperAdminToggledEvent(t,n)}}static _getPermissions(e={}){const t=e.permissions,n=r.pick(t,e=>e);return Object.keys(n)}static _getIsSuperAdminToggledEvent(e,t){return e.isSuperAdmin()!==t.isSuperAdmin()}}e.exports=a},function(e,t,n){"use strict";var r=n(22),i=n(1),o=n(16).ServiceBase,a=n(6);function s(e){o.call(this,e)}i(s,o),s.setup=function(e){return a.checkIsObject(e),a.checkIsFunction(e.request),new s(e)},s.prototype.checkTaskStatus=function(e,t){var n=r.defer();return this.buildRequest("GET",e,t).end(this.end(200,n,void 0)),n.promise},t.TasksService=s},function(e,t,n){"use strict";(function(e){var r=n(22),i=n(1),o=n(16).ServiceBase,a=n(697).Binary,s=n(6),u=n(103).storageConversionMap;function c(e){o.call(this,e)}i(c,o),c.setup=function(e){return s.checkIsObject(e),s.checkIsFunction(e.request),new c(e)},c.prototype._get=function(e){return this._sendRequest(e)},c.prototype._sendRequest=function(e,t){var n=r.defer(),i=r.defer(),o=this,s=this._convertToSingleEndpoint(e,u);return this._getUrlForCompatRequest(s).then(function(e){var n=e.url;t&&(n=n+"?"+Math.random().toString().substr(2));var r=o._request("GET",n);r.responseType&&r.responseType("arraybuffer"),r.end(o.end(200,i,function(e){return e.response instanceof ArrayBuffer?a.fromArrayBuffer(e.response):!e.response&&e.body instanceof ArrayBuffer?a.fromArrayBuffer(e.body):Array.isArray(e.text||e.body)?a.fromByteArray(e.text||e.body):void 0===r.responseType&&"function"==typeof e.on?o.processBinaryStream(e):a.fromString(e.text||e.body)}))}).catch(function(e){i.reject(e)}),i.promise.then(function(e){n.resolve(e)}).catch(function(e){t||"NetworkConnectionError"!==e.name?n.reject(e):(n.notify({message:"retrying"}),o._sendRequest(s,!0).then(function(e){n.resolve(e)}).catch(function(e){n.reject(e)}))}),n.promise},c.prototype.processBinaryStream=function(t){var n=r.defer(),i=[];return t.on("data",function(e){i.push(e)}).on("end",function(){var t=e.concat(i);n.resolve(a.fromArrayBuffer(new Uint8Array(t).buffer))}),n.promise},c.prototype._getUrlForCompatRequest=function(e){var t=r.defer(),n=this.buildRequest("GET",e);return n.set("X-No-Redirect","true"),n.end(this.end(200,t)),t.promise},c.prototype._generateCORSCompatUrl=function(e){var t=e.split("/");return t.splice(t.length-1),t.join("/")+"/compat-cross-domain-xhr"},c.prototype.getRemoteManifest=c.prototype._get,c.prototype.getRemoteContent=c.prototype._get,t.StorageService=c}).call(this,n(7).Buffer)},function(e,t,n){var r=n(698);e.exports=r},function(e,t,n){(function(e){function n(e,t){this._data=e,this._type=t}function r(e,t,n){try{return o[e][t](n)}catch(r){if(r.message.indexOf("cloneInto()")>=0&&"function"==typeof cloneInto&&"undefined"!=typeof window)return o[e][t](cloneInto(n,window));throw r}}n.ARRAY_BUFFER="arrayBuffer",n.BUFFER="buffer",n.STRING="string",n.BYTE_ARRAY="byteArray",n.fromString=function(e){return new n(e,n.STRING)},n.fromArrayBuffer=function(e){return new n(e,n.ARRAY_BUFFER)},n.fromByteArray=function(e){return new n(e,n.BYTE_ARRAY)},n.fromBuffer=function(e){return new n(e,n.BUFFER)},n.prototype.asArrayBuffer=function(){return o[this._type][n.ARRAY_BUFFER](this._data)},n.prototype.asString=function(){return r(this._type,n.STRING,this._data)},n.prototype.asByteArray=function(){return r(this._type,n.BYTE_ARRAY,this._data)},n.prototype.asBuffer=function(){var e,t=o[this._type][n.BUFFER];try{e=t(this._data)}catch(n){e=t(new Uint8Array(this._data))}return e},n.prototype.isBuffer=function(){return this._type===n.BUFFER},n.prototype.isString=function(){return this._type===n.STRING},n.prototype.isArrayBuffer=function(){return this._type===n.ARRAY_BUFFER},n.prototype.isBuffer=function(){return this._type===n.BUFFER},n.prototype.slice=function(e,t){return a[this._type](this._data,e,t)},n.prototype.length=function(){return this._data.length?this._data.length:this._data.byteLength};Math.pow(2,16);var i={arrayBuffer:function(e){return e},string:function(e){for(var t=new Uint8Array(e),n="",r=0;r<t.length;r++)n+=String.fromCharCode(t[r]);return n},byteArray:function(e){for(var t=new Uint8Array(e),n=new Array(t.length),r=0;r<n.length;r++)n[r]=t[r];return n},buffer:function(t){return new e(t)}},o={string:{byteArray:function(e){for(var t=[],n=0;n<e.length;n++)t.push(e.charCodeAt(n));return t},arrayBuffer:function(e){for(var t=e.length,n=new ArrayBuffer(t),r=new Uint8Array(n),i=0;i<t;i++)r[i]=e.charCodeAt(i);return n},string:function(e){return e},buffer:function(t){return new e(t,"binary")}},arrayBuffer:i,byteArray:{byteArray:function(e){return e},string:function(e){for(var t="",n=0;n<e.length;n++)t+=String.fromCharCode(e[n]);return t},arrayBuffer:function(e){for(var t=e.length,n=new ArrayBuffer(t),r=new Uint8Array(n),i=0;i<t;i++)r[i]=e[i];return n},buffer:function(t){return new e(t)}},buffer:{arrayBuffer:function(e){if(e.buffer)return e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength);for(var t=new ArrayBuffer(e.length),n=new Uint8Array(t),r=0;r<e.length;r++)n[r]=e[r];return t},buffer:function(e){return e},string:function(e){return e.toString("binary")},byteArray:function(e){for(var t=new Array(e.length),n=0;n<t.length;n++)t[n]=e[n];return t}}},a={string:function(e,t,r){t<0&&(t=e.length+t);r&&r<0&&(r=e.length+r);return n.fromString(arguments[2]?e.substring(t,r):e.substring(t))},arrayBuffer:function(e,t,r){return ArrayBuffer.prototype.slice?n.fromArrayBuffer(arguments[2]?e.slice(t,r):e.slice(t)):s(i.byteArray(e),t,r)},byteArray:s};function s(e,t,r){return n.fromByteArray(arguments[2]?e.slice(t,r):e.slice(t))}t.Binary=n}).call(this,n(7).Buffer)},function(e,t,n){"use strict";var r=n(34),i=n(22),o=n(1),a=n(16).ServiceBase,s=n(6);function u(e){a.call(this,e)}o(u,a),u.setup=function(e){return s.checkIsObject(e),s.checkIsFunction(e.request),new u(e)},u.prototype.getDlpPolicy=function(e,t,n){var o=i.defer(),a=r.sprintf("%s/api/rules",this._getAccountsUrl(e)),s=this.buildRequest("GET",a,e);return!1===t&&s.query({filter:!1}),e.tokenId&&e.tokenSecret&&n&&s.query({userId:n}),s.end(this.end(200,o,void 0)),o.promise},u.prototype.updateDlpPolicy=function(e,t){var n=i.defer(),o=r.sprintf("%s/api/rules",this._getAccountsUrl(e));return this.buildRequest("POST",o,e).send(t).end(this.end(200,n,void 0)),n.promise},u.prototype.saveDlpRule=function(e,t,n){var o=i.defer();s.checkIsObject(t,"Rule is not an object."),s.checkIsArray(t.scopes,"Rule scopes array is required"),s.checkIsObject(t.definition,"Rule definition is not an object."),s.checkIsArray(t.definition.labels,"Rule labels array is required."),s.checkIsArray(t.definition.conditions,"Rule conditions array is required.");var a=r.sprintf("%s/api/rules/%s",this._getAccountsUrl(e),n);return this.buildRequest("POST",a,e).send(t).end(this.end(200,o,void 0)),o.promise},u.prototype.deleteDlpRule=function(e,t){var n=i.defer();s.checkIsString(t,"Rule ID must be a string.");var o=r.sprintf("%s/api/rules/%s",this._getAccountsUrl(e),t);return this.buildRequest("DELETE",o,e).end(this.end(200,n,void 0)),n.promise},u.prototype.getRuleHistory=function(e,t){var n=i.defer();s.checkIsString(t,"Rule ID must be a string.");var o=r.sprintf("%s/api/rules/history/%s",this._getAccountsUrl(e),t);return this.buildRequest("GET",o,e).end(this.end(200,n,void 0)),n.promise},e.exports=u},function(e,t,n){"use strict";var r=n(22),i=n(1),o=n(6),a=n(16).ServiceBase;function s(e){o.checkIsObject(e),o.checkIsFunction(e.request),a.call(this,e)}i(s,a),s.postAuditRecord=function(e,t){var n=r.defer();o.checkIsObject(t,"Audit Record is not an object");var i=this._getAccountsUrl(e)+"/api/audit/record";return this.buildRequest("POST",i,e).send(t).end(this.end(200,n,function(e){return e})),n.promise},e.exports=s},function(e,t,n){"use strict";var r=n(34),i=n(22),o=n(1),a=n(16).ServiceBase,s=n(6);function u(e){a.call(this,e)}o(u,a),u.setup=function(e){return s.checkIsObject(e),s.checkIsFunction(e.request),new u(e)},u.prototype.getTags=function(e){var t=i.defer(),n=r.sprintf("%s/api/tags",this._getAccountsUrl(e));return this.buildRequest("GET",n,e).end(this.end(200,t,void 0)),t.promise},u.prototype.addTag=function(e,t){var n=i.defer(),o=r.sprintf("%s/api/tags",this._getAccountsUrl(t));return this.buildRequest("POST",o,t).send(e).end(this.end(200,n,void 0)),n.promise},t.TagsService=u},function(e,t,n){"use strict";var r=n(34),i=n(52),o=n(1),a=n(16).ServiceBase,s=n(6);function u(e){a.call(this,e)}o(u,a),u.setup=function(e){return s.checkIsObject(e),s.checkIsFunction(e.request),new u(e)},u.prototype.getOrgSearchKey=function(e){var t=this;return new i(function(n,i){var o=r.sprintf("%s/api/search-key",t._getAcmUrl(e));t.buildRequest("GET",o,e).end(t.end(200,{resolve:n,reject:i},void 0))})},u.prototype.getSearchKey=function(e,t){var n=this;return new i(function(i,o){var a=r.sprintf("%s/api/search-key",n._getAcmUrl(e));a+="/"+t,n.buildRequest("GET",a,e).end(n.end(200,{resolve:i,reject:o},void 0))})},u.prototype.postSearchKey=function(e,t){var n=this;return new i(function(i,o){var a={key:t},s=r.sprintf("%s/api/search-key",n._getAcmUrl(e));n.buildRequest("POST",s,e).send(a).end(n.end(201,{resolve:i,reject:o},void 0))})},u.prototype.deleteSearchKey=function(e){var t=this;return new i(function(n,i){var o=r.sprintf("%s/api/search-key",t._getAcmUrl(e));t.buildRequest("DELETE",o,e).end(t.end(200,{resolve:n,reject:i},void 0))})},e.exports=u},function(e,t,n){"use strict";var r=n(52),i=n(704),o=n(1),a=n(16).ServiceBase,s=n(6);function u(e){a.call(this,e),this.requestStack=e.requestStack||new i}function c(e,t,n,i,o){var a=e.buildRequest(t,n,i);o&&(a=a.send(o));var s=new r(function(t,n){a.end(e.end(200,{resolve:t,reject:n},void 0))});return a.then=function(e){s.then(e)},e.requestStack.push(a),s}o(u,a),u.setup=function(e){return s.checkIsObject(e),s.checkIsFunction(e.request),void 0!==e.requestStack&&s.checkIsObject(e.requestStack),new u(e)},u.prototype._getAccountsUrl=function(e){return this._features.singleEndpoint?e.apiUrl+"/accounts":e.accountsUrl},u.prototype.getOrgMemberships=function(e,t){return c(this,"GET",this._getAccountsUrl(e)+"/api/membership/units?fields="+(t||[]).join(","),e)},u.prototype.getAllOrgUnits=function(e,t){return c(this,"GET",this._getAccountsUrl(e)+"/api/membership/ous/all?fields="+(t||[]).join(","),e)},u.prototype.getGroups=function(e,t){var n=this._getAccountsUrl(e)+"/api/membership/groups";return t&&(n+="?q="+t),c(this,"GET",n,e)},u.prototype.getUnitById=function(e,t){return c(this,"GET",this._getAccountsUrl(e)+"/api/membership/"+encodeURIComponent(t),e)},u.prototype.updatePermissions=function(e,t,n){return c(this,"PATCH",this._getAccountsUrl(e)+"/api/membership/"+encodeURIComponent(t),e,n)},u.prototype.getPotentialAdmins=function(e,t){var n=this._getAccountsUrl(e)+"/api/membership/users";return t&&(n=n+"?email="+t),c(this,"GET",n,e)},u.prototype.abort=function(){var e=this.requestStack.pop();e&&e.abort()},e.exports=u},function(e,t,n){"use strict";function r(){this.stack=[]}e.exports=r,r.prototype.push=function(e){var t=this.stack,n=this.stack.push(e);return e.then(function(){t.length===n?t.pop():t.splice(n-1,1)}),n},r.prototype.pop=function(){return this.stack.pop()}},function(e,t,n){"use strict";var r=n(34),i=n(22),o=n(1),a=n(16).ServiceBase,s=n(6);function u(e){a.call(this,e)}o(u,a),u.setup=function(e){return new u(e)},u.prototype.getOrgKeys=function(e,t){var n=i.defer();t=t||{};var o=r.sprintf("%s/api/org/public-keys",this._getAcmUrl(e)),a=this.buildRequest("GET",o,e);return t.totalPolicies&&a.query({totalPolicies:t.totalPolicies}),a.withCredentials().end(this.end(200,n,void 0)),n.promise},u.prototype.setActiveKey=function(e,t){s.checkIsString(e);var n=i.defer(),o=r.sprintf("%s/api/org/public-keys/%s",this._getAcmUrl(t),e);return this.buildRequest("POST",o,t).withCredentials().end(this.end(200,n,void 0)),n.promise},u.prototype.retryRotation=function(e,t){s.checkIsString(e);var n=i.defer(),o=r.sprintf("%s/api/org/public-keys/%s/retry",this._getAcmUrl(t),e);return this.buildRequest("POST",o,t).withCredentials().end(this.end(200,n,void 0)),n.promise},u.prototype.compromiseKey=function(e,t){s.checkIsString(e);var n=i.defer(),o=r.sprintf("%s/api/org/public-keys/%s/compromised",this._getAcmUrl(t),e);return this.buildRequest("POST",o,t).withCredentials().end(this.end(200,n,void 0)),n.promise},u.prototype.updateKey=function(e,t,n){s.checkIsString(e),s.checkIsObject(t);var o=i.defer(),a=r.sprintf("%s/api/org/public-keys/%s",this._getAcmUrl(n),e);return this.buildRequest("PATCH",a,n).withCredentials().send(t).end(this.end(200,o,void 0)),o.promise},u.prototype.completeRotation=function(e,t){s.checkIsString(e);var n=i.defer(),o=r.sprintf("%s/api/org/public-keys/rotation/%s",this._getAcmUrl(t),e);return this.buildRequest("DELETE",o,t).withCredentials().end(this.end(200,n,void 0)),n.promise},t.OrgKeysService=u},function(e,t,n){"use strict";const r=n(113),i=n(707),o=n(109);function a(e,t){let n=o.config.env[e];return t&&(n=(n=JSON.stringify(n)).replace(/virtru\.com/g,t),n=JSON.parse(n)),n}e.exports={buildActivationUrl:function(e,t,n){const o=e.userId,s=e.provider||"google",u=!1===e.redirectUrl?"":encodeURIComponent(e.redirectUrl||window.location.href);return a(t,n).accountsUrl+i(r.activationUrl,o,s,u)},getEnvConfig:a,getEnvironment:function(e){let t=o.config.env[e];if(!(t=""===t?"production01":t))throw new Error("Environment not valid");return t=t.name.toLowerCase()},buildEmailLoginUrl:function(e,t,n){return a(t,n).accountsUrl+i(r.emailLoginUrl)},buildCodeActivationUrl:function(e,t,n){return a(t,n).accountsUrl+i(r.codeActivationUrl)}}},function(e,t,n){!function(){var t;function n(e){for(var t,n,r,i,o=1,a=[].slice.call(arguments),s=0,u=e.length,c="",d=!1,l=!1,f=function(){return a[o++]},p=function(){for(var n="";/\d/.test(e[s]);)n+=e[s++],t=e[s];return n.length>0?parseInt(n):null};s<u;++s)if(t=e[s],d)switch(d=!1,"."==t?(l=!1,t=e[++s]):"0"==t&&"."==e[s+1]?(l=!0,t=e[s+=2]):l=!0,i=p(),t){case"b":c+=parseInt(f(),10).toString(2);break;case"c":"string"==typeof(n=f())||n instanceof String?c+=n:c+=String.fromCharCode(parseInt(n,10));break;case"d":c+=parseInt(f(),10);break;case"f":r=String(parseFloat(f()).toFixed(i||6)),c+=l?r:r.replace(/^0/,"");break;case"j":c+=JSON.stringify(f());break;case"o":c+="0"+parseInt(f(),10).toString(8);break;case"s":c+=f();break;case"x":c+="0x"+parseInt(f(),10).toString(16);break;case"X":c+="0x"+parseInt(f(),10).toString(16).toUpperCase();break;default:c+=t}else"%"===t?d=!0:c+=t;return c}(t=e.exports=n).format=n,t.vsprintf=function(e,t){return n.apply(null,[e].concat(t))},"undefined"!=typeof console&&"function"==typeof console.log&&(t.printf=function(){console.log(n.apply(null,arguments))})}()},function(e,t,n){"use strict";const r=n(71),i=n(70),o=n(709),a=n(710);class s{static getEntityObjectUrl(e){const t={urlString:"accountsUrl"};return e&&e.environment&&(t.environment=e.environment),r.getUrlByEnvironment(t)+i.entityObjectUrl}static async getEntityObject(e){if(!e)throw new Error('You must supply a valid "opts" object containing an email and an entity public key');if(!e.publicKey)throw new Error('A valid "publicKey" must be found in order to successfully request an Entity Object');if(!e.email)throw new Error("You must supply a valid email in order to request an Entity Object");const t=e.publicKey,n=o.getVirtruAuthHeader(e),r=s.getEntityObjectUrl(e);try{return(await a.post(r,{publicKey:t},{headers:n})).data}catch(e){throw new Error("An error occurred fetching the entity object from Virtru "+e.toString())}}}e.exports=s},function(e,t,n){"use strict";const r=n(112);e.exports=class{static getVirtruAuthHeader(e){const t=e.email;if(!t)throw new Error("An email must be provided in order to construct the Virtru Auth header");if(!r.isAppIdCreatedForEmail(t))throw new Error("User "+t+" must be authenticated in order to construct the Virtru Auth header.");return{Authorization:'Virtru [["'+r.getAppIdBundle(t).appId+'","'+t+'"]]',"Content-Type":"application/json"}}}},function(e,t,n){e.exports=n(711)},function(e,t,n){"use strict";var r=n(18),i=n(344),o=n(713),a=n(108);function s(e){var t=new o(e),n=i(o.prototype.request,t);return r.extend(n,o.prototype,t),r.extend(n,t),n}var u=s(a);u.Axios=o,u.create=function(e){return s(r.merge(a,e))},u.Cancel=n(348),u.CancelToken=n(727),u.isCancel=n(347),u.all=function(e){return Promise.all(e)},u.spread=n(728),e.exports=u,e.exports.default=u},function(e,t){function n(e){return!!e.constructor&&"function"==typeof e.constructor.isBuffer&&e.constructor.isBuffer(e)}
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
e.exports=function(e){return null!=e&&(n(e)||function(e){return"function"==typeof e.readFloatLE&&"function"==typeof e.slice&&n(e.slice(0,0))}(e)||!!e._isBuffer)}},function(e,t,n){"use strict";var r=n(108),i=n(18),o=n(722),a=n(723);function s(e){this.defaults=e,this.interceptors={request:new o,response:new o}}s.prototype.request=function(e){"string"==typeof e&&(e=i.merge({url:arguments[0]},arguments[1])),(e=i.merge(r,{method:"get"},this.defaults,e)).method=e.method.toLowerCase();var t=[a,void 0],n=Promise.resolve(e);for(this.interceptors.request.forEach(function(e){t.unshift(e.fulfilled,e.rejected)}),this.interceptors.response.forEach(function(e){t.push(e.fulfilled,e.rejected)});t.length;)n=n.then(t.shift(),t.shift());return n},i.forEach(["delete","get","head","options"],function(e){s.prototype[e]=function(t,n){return this.request(i.merge(n||{},{method:e,url:t}))}}),i.forEach(["post","put","patch"],function(e){s.prototype[e]=function(t,n,r){return this.request(i.merge(r||{},{method:e,url:t,data:n}))}}),e.exports=s},function(e,t,n){"use strict";var r=n(18);e.exports=function(e,t){r.forEach(e,function(n,r){r!==t&&r.toUpperCase()===t.toUpperCase()&&(e[t]=n,delete e[r])})}},function(e,t,n){"use strict";var r=n(346);e.exports=function(e,t,n){var i=n.config.validateStatus;n.status&&i&&!i(n.status)?t(r("Request failed with status code "+n.status,n.config,null,n.request,n)):e(n)}},function(e,t,n){"use strict";e.exports=function(e,t,n,r,i){return e.config=t,n&&(e.code=n),e.request=r,e.response=i,e}},function(e,t,n){"use strict";var r=n(18);function i(e){return encodeURIComponent(e).replace(/%40/gi,"@").replace(/%3A/gi,":").replace(/%24/g,"$").replace(/%2C/gi,",").replace(/%20/g,"+").replace(/%5B/gi,"[").replace(/%5D/gi,"]")}e.exports=function(e,t,n){if(!t)return e;var o;if(n)o=n(t);else if(r.isURLSearchParams(t))o=t.toString();else{var a=[];r.forEach(t,function(e,t){null!=e&&(r.isArray(e)?t+="[]":e=[e],r.forEach(e,function(e){r.isDate(e)?e=e.toISOString():r.isObject(e)&&(e=JSON.stringify(e)),a.push(i(t)+"="+i(e))}))}),o=a.join("&")}return o&&(e+=(-1===e.indexOf("?")?"?":"&")+o),e}},function(e,t,n){"use strict";var r=n(18),i=["age","authorization","content-length","content-type","etag","expires","from","host","if-modified-since","if-unmodified-since","last-modified","location","max-forwards","proxy-authorization","referer","retry-after","user-agent"];e.exports=function(e){var t,n,o,a={};return e?(r.forEach(e.split("\n"),function(e){if(o=e.indexOf(":"),t=r.trim(e.substr(0,o)).toLowerCase(),n=r.trim(e.substr(o+1)),t){if(a[t]&&i.indexOf(t)>=0)return;a[t]="set-cookie"===t?(a[t]?a[t]:[]).concat([n]):a[t]?a[t]+", "+n:n}}),a):a}},function(e,t,n){"use strict";var r=n(18);e.exports=r.isStandardBrowserEnv()?function(){var e,t=/(msie|trident)/i.test(navigator.userAgent),n=document.createElement("a");function i(e){var r=e;return t&&(n.setAttribute("href",r),r=n.href),n.setAttribute("href",r),{href:n.href,protocol:n.protocol?n.protocol.replace(/:$/,""):"",host:n.host,search:n.search?n.search.replace(/^\?/,""):"",hash:n.hash?n.hash.replace(/^#/,""):"",hostname:n.hostname,port:n.port,pathname:"/"===n.pathname.charAt(0)?n.pathname:"/"+n.pathname}}return e=i(window.location.href),function(t){var n=r.isString(t)?i(t):t;return n.protocol===e.protocol&&n.host===e.host}}():function(){return!0}},function(e,t,n){"use strict";var r="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";function i(){this.message="String contains an invalid character"}i.prototype=new Error,i.prototype.code=5,i.prototype.name="InvalidCharacterError",e.exports=function(e){for(var t,n,o=String(e),a="",s=0,u=r;o.charAt(0|s)||(u="=",s%1);a+=u.charAt(63&t>>8-s%1*8)){if((n=o.charCodeAt(s+=.75))>255)throw new i;t=t<<8|n}return a}},function(e,t,n){"use strict";var r=n(18);e.exports=r.isStandardBrowserEnv()?{write:function(e,t,n,i,o,a){var s=[];s.push(e+"="+encodeURIComponent(t)),r.isNumber(n)&&s.push("expires="+new Date(n).toGMTString()),r.isString(i)&&s.push("path="+i),r.isString(o)&&s.push("domain="+o),!0===a&&s.push("secure"),document.cookie=s.join("; ")},read:function(e){var t=document.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));return t?decodeURIComponent(t[3]):null},remove:function(e){this.write(e,"",Date.now()-864e5)}}:{write:function(){},read:function(){return null},remove:function(){}}},function(e,t,n){"use strict";var r=n(18);function i(){this.handlers=[]}i.prototype.use=function(e,t){return this.handlers.push({fulfilled:e,rejected:t}),this.handlers.length-1},i.prototype.eject=function(e){this.handlers[e]&&(this.handlers[e]=null)},i.prototype.forEach=function(e){r.forEach(this.handlers,function(t){null!==t&&e(t)})},e.exports=i},function(e,t,n){"use strict";var r=n(18),i=n(724),o=n(347),a=n(108),s=n(725),u=n(726);function c(e){e.cancelToken&&e.cancelToken.throwIfRequested()}e.exports=function(e){return c(e),e.baseURL&&!s(e.url)&&(e.url=u(e.baseURL,e.url)),e.headers=e.headers||{},e.data=i(e.data,e.headers,e.transformRequest),e.headers=r.merge(e.headers.common||{},e.headers[e.method]||{},e.headers||{}),r.forEach(["delete","get","head","post","put","patch","common"],function(t){delete e.headers[t]}),(e.adapter||a.adapter)(e).then(function(t){return c(e),t.data=i(t.data,t.headers,e.transformResponse),t},function(t){return o(t)||(c(e),t&&t.response&&(t.response.data=i(t.response.data,t.response.headers,e.transformResponse))),Promise.reject(t)})}},function(e,t,n){"use strict";var r=n(18);e.exports=function(e,t,n){return r.forEach(n,function(n){e=n(e,t)}),e}},function(e,t,n){"use strict";e.exports=function(e){return/^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(e)}},function(e,t,n){"use strict";e.exports=function(e,t){return t?e.replace(/\/+$/,"")+"/"+t.replace(/^\/+/,""):e}},function(e,t,n){"use strict";var r=n(348);function i(e){if("function"!=typeof e)throw new TypeError("executor must be a function.");var t;this.promise=new Promise(function(e){t=e});var n=this;e(function(e){n.reason||(n.reason=new r(e),t(n.reason))})}i.prototype.throwIfRequested=function(){if(this.reason)throw this.reason},i.source=function(){var e;return{token:new i(function(t){e=t}),cancel:e}},e.exports=i},function(e,t,n){"use strict";e.exports=function(e){return function(t){return e.apply(null,t)}}}]);
},{}]},{},[9]);