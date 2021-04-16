/* eslint-disable */
// import * as util from '../src/utils.js'

const { PI: PI$1, atan, atan2, cos, floor, log, pow, sin, sinh, sqrt, tan } = Math;
const radians = degrees => (degrees * PI$1) / 180;
const degrees = radians => (radians * 180) / PI$1;

// Tile Helpers http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function lon2x(lon, z) {
    return floor(((lon + 180) / 360) * pow(2, z))
}
function lat2y(lat, z) {
    const latRads = radians(lat);
    return floor(
        (1 - log(tan(latRads) + 1 / cos(latRads)) / PI$1) * pow(2, z - 1)
    )
}
function lonlat2xy(lon, lat, z) {
    return [this.lon2x(lon, z), this.lat2y(lat, z)]
}

function x2lon(x, z) {
    return (x / pow(2, z)) * 360 - 180
}
function y2lat(y, z) {
    const rads = atan(sinh(PI$1 - (2 * PI$1 * y) / pow(2, z)));
    return degrees(rads)
}
function xy2lonlat(x, y, z) {
    return [this.x2lon(x, z), this.y2lat(y, z)]
}
// Return two lon/lat points for bbox of tile
// We use the usual convention of
//   [minX, minY, maxX, maxY] or [west, south, east, north]
function xy2bbox(x, y, z) {
    // REMIND: error check at 180, 0 etc
    // const [lon0, lat0] = this.xy2lonlat(x, y, z)
    const [west, north] = this.xy2lonlat(x, y, z);
    // console.log('west, north', west, north)
    // tile Y increases "down" like pixel coords
    // const [lon1, lat1] = this.xy2lonlat(x + 1, y + 1, z)
    const [east, south] = this.xy2lonlat(x + 1, y + 1, z);
    // console.log('south, east', south, east)
    // west, south, east, north
    // lon0, lat1, lon1, lat0
    return [west, south, east, north]
    // return [
    //     [lon0, lat0],
    //     [lon1, lat1],
    // ]
}
function lonLat2bbox(lon, lat, z) {
    const [x, y] = this.lonlat2xy(lon, lat, z);
    return this.xy2bbox(x, y, z)
}

function bboxCenter(bbox) {
    const [west, south, east, north] = bbox;
    return [(west + east) / 2, (south + north) / 2]
}
function bboxCoords(bbox) {
    const [west, south, east, north] = bbox;
    return [
        [west, north],
        [east, north],
        [east, south],
        [west, south],
    ]
}

// Create a url for OSM json data.
// https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
// south, west, north, east = minLat, minLon, maxLat, maxLon
function getOsmURL(south, west, north, east) {
    const url = 'https://overpass-api.de/api/interpreter?data=';
    const params = `\
[out:json][timeout:180][bbox:${south}${west}${north}${east}];
way[highway];
(._;>;);
out;`;
    return url + encodeURIComponent(params)
}

// https://stackoverflow.com/questions/639695/how-to-convert-latitude-or-longitude-to-meters
// Explanation: https://en.wikipedia.org/wiki/Haversine_formula
function lonLat2meters(pt1, pt2) {
    const [lon1, lat1] = pt1.map(val => radians(val)); // lon/lat radians
    const [lon2, lat2] = pt2.map(val => radians(val));

    // generally used geo measurement function
    const R = 6378.137; // Radius of earth in KM
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = sin(dLat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dLon / 2) ** 2;
    // pow(sin(dLat / 2), 2) +
    // cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2)
    const c = 2 * atan2(sqrt(a), sqrt(1 - a));
    const d = R * c;
    return d * 1000 // meters
}

// geojson utilities
function cloneJson(json) {
    return JSON.parse(JSON.stringify(json))
}
function areEqual(json0, json1) {
    return JSON.stringify(json0) === JSON.stringify(json1)
}
// bin/minifyjson
function minify(json) {
    const str = JSON.stringify(json); // compact form
    // newline for each feature
    return str.replace(/,{"type":"Feature"/g, '\n,\n{"type":"Feature"')
}

var gis = /*#__PURE__*/Object.freeze({
    __proto__: null,
    lon2x: lon2x,
    lat2y: lat2y,
    lonlat2xy: lonlat2xy,
    x2lon: x2lon,
    y2lat: y2lat,
    xy2lonlat: xy2lonlat,
    xy2bbox: xy2bbox,
    lonLat2bbox: lonLat2bbox,
    bboxCenter: bboxCenter,
    bboxCoords: bboxCoords,
    getOsmURL: getOsmURL,
    lonLat2meters: lonLat2meters,
    cloneJson: cloneJson,
    areEqual: areEqual,
    minify: minify
});

// ### Async

// Return Promise for getting an image.
// - use: imagePromise('./path/to/img').then(img => imageFcn(img))
function imagePromise(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        // img.onerror = () => reject(Error(`Could not load image ${url}`))
        img.onerror = () => reject(`Could not load image ${url}`);
        img.src = url;
    })
}
async function imageBitmapPromise(url) {
    const blob = await xhrPromise(url, 'blob');
    return createImageBitmap(blob)
}

// Convert canvas.toBlob to a promise
function canvasBlobPromise(can, mimeType = 'image/png', quality = 0.95) {
    return new Promise(resolve => {
        can.toBlob(blob => resolve(blob), mimeType, quality);
    })
}
// Convert canvas to .png File blob
function canvasFilePromise(can, name = 'canvas.png') {
    return new Promise(resolve => {
        can.toBlob(blob => {
            var file = new File([blob], name, { type: 'image/png' });
            resolve(file);
        });
    })
}
// Convert File blob (actually any blob) to Image
function blobImagePromise(blob) {
    const url = URL.createObjectURL(blob);
    return imagePromise(url)
}

// Return Promise for ajax/xhr data.
// - type: 'arraybuffer', 'blob', 'document', 'json', 'text'.
// - method: 'GET', 'POST'
// - use: xhrPromise('./path/to/data').then(data => dataFcn(data))
function xhrPromise(url, type = 'text', method = 'GET') {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url); // POST mainly for security and large files
        xhr.responseType = type;
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () =>
            reject(Error(`Could not load ${url}: ${xhr.status}`));
        xhr.send();
    })
}

// Return promise for pause of ms. Use:
// timeoutPromise(2000).then(()=>console.log('foo'))
function timeoutPromise(ms = 1000) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    })
}
// Use above for an animation loop.
// steps < 0: forever (default), steps === 0 is no-op
// Returns a promise for when done. If forever, no need to use it.
async function timeoutLoop(fcn, steps = -1, ms = 0) {
    let i = 0;
    while (i++ !== steps) {
        fcn(i - 1);
        await timeoutPromise(ms);
    }
}

function waitPromise(done, ms = 10) {
    return new Promise(resolve => {
        function waitOn() {
            if (done()) return resolve()
            else setTimeout(waitOn, ms);
        }
        waitOn();
    })
}

// type = "arrayBuffer" "blob" "formData" "json" "text"
async function fetchType(url, type = 'text') {
    const response = await fetch(url);
    if (!response.ok) throw Error(`Not found: ${url}`)
    const value = await response[type]();
    return value
}

// // Similar pair for requestAnimationFrame
// export function rafPromise() {
//     return new Promise(resolve => requestAnimationFrame(resolve))
// }
// export async function rafLoop(fcn, steps = -1) {
//     let i = 0
//     while (i++ !== steps) {
//         fcn(i - 1)
//         await rafPromise()
//     }
// }
//

// ### Canvas

// import { inWorker } from './dom.js'

function offscreenOK() {
    // return !!self.OffscreenCanvas
    // return typeof OffscreenCanvas !== 'undefined'
    return inWorker()
}

// Create a blank 2D canvas of a given width/height
// width/height defaulted so can be modified later by caller
// Default to off-screen canvas.
// export function createCanvas(width = 0, height = 0, offscreen = true) {
function createCanvas(width, height, offscreen = offscreenOK()) {
    if (offscreen) return new OffscreenCanvas(width, height)
    const can = document.createElement('canvas');
    can.width = width;
    can.height = height;
    return can
}
// As above, but returing the 2D context object.
// NOTE: ctx.canvas is the canvas for the ctx, and can be use as an image.
function createCtx(width, height, offscreen = offscreenOK()) {
    const can = createCanvas(width, height, offscreen);
    return can.getContext('2d')
}

// Duplicate a canvas, preserving it's current image/drawing
function cloneCanvas(can, offscreen = offscreenOK()) {
    const ctx = createCtx(can.width, can.height, offscreen);
    ctx.drawImage(can, 0, 0);
    return ctx.canvas
}
// Resize a ctx in-place and preserve image.
function resizeCtx(ctx, width, height) {
    const copy = cloneCanvas(ctx.canvas);
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.drawImage(copy, 0, 0);
}
// Return new canvas scaled by width, height and preserve image.
function resizeCanvas(
    can,
    width,
    height = (width / can.width) * can.height
) {
    const ctx = createCtx(width, height);
    ctx.drawImage(can, 0, 0, width, height);
    return ctx.canvas
}

// Set the ctx/canvas size if differs from width/height.
// It does not install a transform and assumes there is not one currently installed.
// The World object can do that for AgentSets.
function setCanvasSize(can, width, height) {
    if (can.width !== width || can.height != height) {
        can.width = width;
        can.height = height;
    }
}

// Install identity transform for this context.
// Call ctx.restore() to revert to previous transform.
function setIdentity(ctx) {
    ctx.save(); // NOTE: Does not change state, only saves current state.
    ctx.setTransform(1, 0, 0, 1, 0, 0); // or ctx.resetTransform()
}
// Set the text font, align and baseline drawing parameters.
// Ctx can be either a canvas context or a DOM element
// See [reference](http://goo.gl/AvEAq) for details.
// * font is a HTML/CSS string like: "9px sans-serif"
// * align is left right center start end
// * baseline is top hanging middle alphabetic ideographic bottom
function setTextProperties(
    ctx,
    font,
    textAlign = 'center',
    textBaseline = 'middle'
) {
    Object.assign(ctx, { font, textAlign, textBaseline });
}

// Draw string of the given color at the xy location, in ctx pixel coords.
// Use setIdentity .. reset if a transform is being used by caller.
function drawText(ctx, string, x, y, color, useIdentity = true) {
    if (useIdentity) setIdentity(ctx);
    ctx.fillStyle = color.css || color; // OK to use Color.typedColor
    ctx.fillText(string, x, y);
    if (useIdentity) ctx.restore();
}

// # Draw string of the given color at the xy location, in ctx pixel coords.
// # Use setIdentity .. reset if a transform is being used by caller.
// ctxDrawText: (ctx, string, x, y, color, setIdentity = true) ->
//   @setIdentity(ctx) if setIdentity
//   ctx.fillStyle = color.css # @colorStr color
//   ctx.fillText(string, x, y)
//   ctx.restore() if setIdentity

// Return the (complete) ImageData object for this context object
function ctxImageData(ctx) {
    return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
}
// Clear this context using the cssColor.
// If no color or if color === 'transparent', clear to transparent.
function clearCtx(ctx, cssColor) {
    const { width, height } = ctx.canvas;

    setIdentity(ctx);
    if (!cssColor || cssColor === 'transparent') {
        ctx.clearRect(0, 0, width, height);
    } else {
        cssColor = cssColor.css || cssColor;
        ctx.fillStyle = cssColor;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
}

// These image functions use "imagable" objects: Image, ImageBitmap, Canvas ...
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasImageSource

// Fill this context with the given image. Will scale image to fit ctx size.
function fillCtxWithImage(ctx, img) {
    setIdentity(ctx); // set/restore identity
    ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
}
// Fill this context with the given image, resizing it to img size if needed.
function setCtxImage(ctx, img) {
    setCanvasSize(ctx.canvas, img.width, img.height);
    fillCtxWithImage(ctx, img);
}

// ### Debug

// Print a message just once.
const logOnceMsgSet = new Set();
function logOnce(msg, useWarn = false) {
    if (!logOnceMsgSet.has(msg)) {
        if (useWarn) {
            console.warn(msg);
        } else {
            console.log(msg);
        }
        logOnceMsgSet.add(msg);
    }
}
function warn(msg) {
    logOnce(msg, true);
}

// Use chrome/ffox/ie console.time()/timeEnd() performance functions
function timeit(f, runs = 1e5, name = 'test') {
    name = name + '-' + runs;
    console.time(name);
    for (let i = 0; i < runs; i++) f(i);
    console.timeEnd(name);
}

// simple performance function.
// Records start & current time, steps, fps
// Each call bumps steps, current time, fps
// Use:
//    const perf = fps()
//    while (perf.steps != 100) {}
//        model.step()
//        perf()
//    }
//    console.log(`Done, steps: ${perf.steps} fps: ${perf.fps}`)
function fps() {
    const timer = typeof performance === 'undefined' ? Date : performance;
    // const start = performance.now()
    const start = timer.now();
    let steps = 0;
    function perf() {
        steps++;
        // const ms = performance.now() - start
        const ms = timer.now() - start;
        const fps = parseFloat((steps / (ms / 1000)).toFixed(2));
        Object.assign(perf, { fps, ms, start, steps });
    }
    perf.steps = 0;
    return perf
}

// Print Prototype Stack: see your vars all the way down!
function pps(obj, title = '') {
    if (title) console.log(title); // eslint-disable-line
    let count = 1;
    let str = '';
    while (obj) {
        if (typeof obj === 'function') {
            str = obj.constructor.toString();
        } else {
            const okeys = Object.keys(obj);
            str =
                okeys.length > 0
                    ? `[${okeys.join(', ')}]`
                    : `[${obj.constructor.name}]`;
        }
        console.log(`[${count++}]: ${str}`);
        obj = Object.getPrototypeOf(obj);
    }
}

// Merge from's key/val pairs into to the global/window namespace
function toWindow(obj, logToo = false) {
    Object.assign(window, obj);
    console.log('toWindow:', Object.keys(obj).join(', '));
    if (logToo) {
        Object.keys(obj).forEach(key => console.log('  ', key, obj[key]));
    }
}

// Dump model's patches turtles links to window
function dump(model = window.model) {
    let { patches: ps, turtles: ts, links: ls } = model;
    Object.assign(window, { ps, ts, ls });
    window.p = ps.length > 0 ? ps.oneOf() : {};
    window.t = ts.length > 0 ? ts.oneOf() : {};
    window.l = ls.length > 0 ? ls.oneOf() : {};
    console.log('debug: ps, ts, ls, p, t, l dumped to window');
}

// export function logHistogram(name, array) {
//     // const hist = AgentArray.fromArray(dataset.data).histogram()
//     const hist = histogram(array)
//     const { min, max } = hist.parameters
//     console.log(
//         `${name}:`, // name + ':'
//         hist.toString(),
//         'min/max:',
//         min.toFixed(3),
//         max.toFixed(3)
//     )
// }
// Use JSON to return pretty, printable string of an object, array, other
// Remove ""s around keys. Will fail on circular structures.
// export function objectToString(obj) {
//     return JSON.stringify(obj, null, '  ')
//         .replace(/ {2}"/g, '  ')
//         .replace(/": /g, ': ')
// }
// // Like above, but a single line for small objects.
// export function objectToString1(obj) {
//     return JSON.stringify(obj)
//         .replace(/{"/g, '{')
//         .replace(/,"/g, ',')
//         .replace(/":/g, ':')
// }
// import { isObject } from './types.js' // see printToPage

// ### Dom

// export function setCssStyle(url) {
//     document.head.innerHTML += `<link rel="stylesheet" href="${url}" type="text/css" />`
// }
async function setCssStyle(url) {
    const response = await fetch(url);
    if (!response.ok) throw Error(`Not found: ${url}`)
    const css = await response.text();
    document.head.innerHTML += `<style>${css}</style>`;
}

// REST:
// Parse the query, returning an object of key / val pairs.
function getQueryString() {
    return window.location.search.substr(1)
}
function parseQueryString(
    // paramsString = window.location.search.substr(1)
    paramsString = getQueryString()
) {
    const results = {};
    const searchParams = new URLSearchParams(paramsString);
    for (var pair of searchParams.entries()) {
        let [key, val] = pair;
        if (val.match(/^[0-9.]+$/) || val.match(/^[0-9.]+e[0-9]+$/))
            val = Number(val);
        if (['true', 't', ''].includes(val)) val = true;
        if (['false', 'f'].includes(val)) val = false;

        results[key] = val;
    }
    return results
}
// Merge the querystring into the default parameters
function RESTapi(parameters) {
    return Object.assign(parameters, parseQueryString())
}

function inWorker() {
    return !inNode() && typeof self.window === 'undefined'
}

function inNode() {
    return typeof global !== 'undefined'
}

function inDeno() {
    return !!Deno
}

// Print a message to an html element
// Default to document.body if in browser.
// If msg is an object, convert to JSON
// (object canot have cycles etc)
// If element is string, find element by ID
function printToPage(msg, element = document.body) {
    // if (isObject(msg)) {
    if (typeof msg === 'object') {
        msg = JSON.stringify(msg, null, 2);
        // msg = '<pre>' + msg + '</pre>'
    }
    msg = '<pre>' + msg + '</pre>';

    if (typeof element === 'string') {
        element = document.getElementById(element);
    }

    element.style.fontFamily = 'monospace';
    element.innerHTML += msg; //+ '<br />'
}

// Get element (i.e. canvas) relative x,y position from event/mouse position.
function getEventXY(element, evt) {
    // http://goo.gl/356S91
    const rect = element.getBoundingClientRect();
    return [evt.clientX - rect.left, evt.clientY - rect.top]
}

// Convert a function into a worker via blob url.
// Adds generic error handler. Scripts only, not modules.
function fcnToWorker(fcn) {
    const href = document.location.href;
    const root = href.replace(/\/[^\/]+$/, '/');
    const fcnStr = `(${fcn.toString(root)})("${root}")`;
    const objUrl = URL.createObjectURL(
        new Blob([fcnStr], { type: 'text/javascript' })
    );
    const worker = new Worker(objUrl);
    worker.onerror = function (e) {
        console.log('Worker ERROR: Line ', e.lineno, ': ', e.message);
    };
    return worker
}

// export function workerScript(script, worker) {
//     const srcBlob = new Blob([script], { type: 'text/javascript' })
//     const srcURL = URL.createObjectURL(srcBlob)
//     worker.postMessage({ cmd: 'script', url: srcURL })
// }

// Create dynamic `<script>` tag, appending to `<head>`
//   <script src="./test/src/three0.js" type="module"></script>
// NOTE: Use import(path) for es6 modules.
// I.e. this is legacy, for umd's only.
// export function loadScript(path, props = {}) {
//     const scriptTag = document.createElement('script')
//     scriptTag.src = path
//     Object.assign(scriptTag, props)
//     document.querySelector('head').appendChild(scriptTag)
// }
// export function loadScript(path, props = {}) {
//     return new Promise((resolve, reject) => {
//         const scriptTag = document.createElement('script')
//         scriptTag.onload = () => resolve(scriptTag)
//         scriptTag.src = path
//         Object.assign(scriptTag, props)
//         document.querySelector('head').appendChild(scriptTag)
//     })
// }

// ### Math

// const { PI, floor, cos, sin, atan2, log, log2, sqrt } = Math
const PI = Math.PI;

// Return random int/float in [0,max) or [min,max) or [-r/2,r/2)
/** Returns a random int in [0, max) */
const randomInt = max => Math.floor(Math.random() * max);
/** Returns a random int in [min, max) */
const randomInt2 = (min, max) =>
    min + Math.floor(Math.random() * (max - min));
/** Returns a random float in [0, max) */
const randomFloat = max => Math.random() * max;
/** Returns a random float in [min, max) */
const randomFloat2 = (min, max) => min + Math.random() * (max - min);
const randomCentered = r => randomFloat2(-r / 2, r / 2);

// Return float Gaussian normal with given mean, std deviation.
function randomNormal(mean = 0.0, sigma = 1.0) {
    // Box-Muller
    const [u1, u2] = [1.0 - Math.random(), Math.random()]; // ui in 0,1
    const norm = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * PI * u2);
    return norm * sigma + mean
}

function randomSeed(seed = 123456) {
    // doesn't repeat b4 JS dies.
    // https://gist.github.com/blixt/f17b47c62508be59987b
    seed = seed % 2147483647;
    Math.random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646
    };
}

// num can be numeric array
function precision(num, digits = 4) {
    if(num === -0) return 0
    if (Array.isArray(num)) return num.map(val => precision(val, digits))
    const mult = 10 ** digits;
    return Math.round(num * mult) / mult
}

// Return whether num is [Power of Two](http://goo.gl/tCfg5). Very clever!
const isPowerOf2 = num => (num & (num - 1)) === 0; // twgl library
// Return next greater power of two. There are faster, see:
// [Stack Overflow](https://goo.gl/zvD78e)
const nextPowerOf2 = num => Math.pow(2, Math.ceil(Math.log2(num)));

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
// The modulus is defined as: x - y * floor(x / y)
// It is not %, the remainder function.
const mod = (v, n) => ((v % n) + n) % n; // v - n * Math.floor(v / n)
// Wrap v around min, max values if v outside min, max
const wrap = (v, min, max) => min + mod(v - min, max - min);
// Clamp a number to be between min/max.
// Much faster than Math.max(Math.min(v, max), min)
function clamp(v, min, max) {
    if (v < min) return min
    if (v > max) return max
    return v
}
// Return true is val in [min, max] enclusive
const isBetween = (val, min, max) => min <= val && val <= max;

// Return a linear interpolation between lo and hi.
// Scale is in [0-1], a percentage, and the result is in [lo,hi]
// If lo>hi, scaling is from hi end of range.
// [Why the name `lerp`?](http://goo.gl/QrzMc)
const lerp = (lo, hi, scale) =>
    lo <= hi ? lo + (hi - lo) * scale : lo - (lo - hi) * scale;
// Calculate the lerp scale given lo/hi pair and a number between them.
// Clamps number to be between lo & hi.
function lerpScale(number, lo, hi) {
    if (lo === hi) throw Error('lerpScale: lo === hi')
    number = clamp(number, lo, hi);
    return (number - lo) / (hi - lo)
}

// ### Geometry

// Degrees & Radians
// Note: quantity, not coord system xfm
const toDegrees = 180 / PI;
const toRadians = PI / 180;

// Better names and format for arrays. Change above?
const degToRad = degrees => mod2pi(degrees * toRadians);
const radToDeg = radians => mod360(radians * toDegrees);

// Heading & Radians: coord system
// * Heading is 0-up (y-axis), clockwise angle measured in degrees.
// * Rad is euclidean: 0-right (x-axis), counterclockwise in radians
function radToHeading(radians) {
    const deg = radians * toDegrees;
    return mod360(90 - deg)
}
function headingToRad(heading) {
    const deg = mod360(90 - heading);
    return deg * toRadians
}
// Relative angles in heading space: deg Heading => -deg Eucledian
function radToHeadingAngle(radians) {
    return -radToDeg(radians)
}
function headingAngleToRad(headingAngle) {
    return -degToRad(headingAngle)
}

// Wow. surprise: headingToDeg = degToHeading! Just like above.
// deg is absolute eucledian degrees direction
const degToHeading = degrees => mod360(90 - degrees);
const headingToDeg = heading => mod360(90 - heading);

function mod360(degrees) {
    return mod(degrees, 360)
}
function mod2pi(radians) {
    return mod(radians, 2 * PI)
}
function modpipi(radians) {
    return mod(radians, 2 * PI) - PI
}
function mod180180(degrees) {
    return mod360(degrees) - 180
}

// headingsEq === degreesEq
function degreesEqual(deg1, deg2) {
    return mod360(deg1) === mod360(deg2)
}
function radsEqual(rads1, rads2) {
    return mod2pi(rads1) === mod2pi(rads2)
}
const headingsEq = degreesEqual;

// Return angle (radians) in (-pi,pi] that added to rad0 = rad1
// See NetLogo's [subtract-headings](http://goo.gl/CjoHuV) for explanation
function subtractRadians(rad1, rad0) {
    let dr = mod2pi(rad1 - rad0); // - PI
    if (dr > PI) dr = dr - 2 * PI;
    return dr
}
// Above using headings (degrees) returning degrees in (-180, 180]
function subtractDegrees(deg1, deg0) {
    let dAngle = mod360(deg1 - deg0); // - 180
    if (dAngle > 180) dAngle = dAngle - 360;
    return dAngle
}
// export const subtractHeadings = (head1, head0) =>
//     degToHeading(subtractDegrees(headingToDeg(head1), headingToDeg(head0)))
const subtractHeadings = (head1, head0) => -subtractDegrees(head1, head0);

// Return angle in [-pi,pi] radians from (x,y) to (x1,y1)
// [See: Math.atan2](http://goo.gl/JS8DF)
function radiansTowardXY(x, y, x1, y1) {
    return Math.atan2(y1 - y, x1 - x)
}
// Above using headings (degrees) returning degrees in [-90, 90]
function headingTowardXY(x, y, x1, y1) {
    return radToHeading(radiansTowardXY(x, y, x1, y1))
}
// Above using degrees returning degrees in [-90, 90]
function degreesTowardXY(x, y, x1, y1) {
    return radToDeg(radiansTowardXY(x, y, x1, y1))
}

const toDeg$1 = 180 / Math.PI;
const toRad$1 = Math.PI / 180;
const geometries = {
    radians: {
        toRads: rads => rads,
        fromRads: rads => rads,
        toAngleRads: rads => rads,
        fromAngleRads: rads => rads,
        toCCW: angle => angle,
    },
    degrees: {
        toRads: deg => deg * toRad$1,
        fromRads: rads => rads * toDeg$1,
        toAngleRads: deg => deg * toRad$1,
        fromAngleRads: rads => rads * toDeg$1,
        toCCW: angle => angle,
    },
    heading: {
        toRads: deg => (90 - deg) * toRad$1,
        fromRads: rads => 90 - rads * toDeg$1,
        toAngleRads: deg => deg * toRad$1,
        fromAngleRads: rads => rads * toDeg$1,
        toCCW: angle => -angle,
    },
};
function setGeometry(model, name) {
    const geometry = geometries[name];
    if (!geometry) throw Error(`util.setGeometry: ${name} geometry not defined`)
    Object.assign(model, geometry);
    model.geometry = name;
}

// AltAz: Alt is deg from xy plane, 180 up, -180 down, Az is heading
// We choose Phi radians from xy plane, "math" is often from Z axis
// REMIND: some prefer -90, 90
// export function altAzToAnglePhi(alt, az) {
//     const angle = headingToRad(az)
//     const phi = modpipi(alt * toRadians)
//     return [angle, phi]
// }
// export function anglePhiToAltAz(angle, phi) {
//     const az = radToHeading(angle)
//     const alt = mod180180(phi * toDegrees)
//     return [alt, az]
// }
// export function mod180180(degrees) {
//     return mod360(degrees) - 180
// }
// export function modpipi(radians) {
//     return mod2pi(radians) - PI
// }

// Return distance between (x, y), (x1, y1)
const sqDistance = (x, y, x1, y1) => (x - x1) ** 2 + (y - y1) ** 2;
const distance = (x, y, x1, y1) => Math.sqrt(sqDistance(x, y, x1, y1));

const sqDistance3 = (x, y, z, x1, y1, z1) =>
    (x - x1) ** 2 + (y - y1) ** 2 + (z - z1) ** 2;
const distance3 = (x, y, z, x1, y1, z1) =>
    Math.sqrt(sqDistance3(x, y, z, x1, y1, z1));

// Return true if x,y is within cone.
// Cone: origin x0,y0 in direction angle, with coneAngle width in radians.
// All angles in radians
function inCone(x, y, radius, coneAngle, direction, x0, y0) {
    if (sqDistance(x0, y0, x, y) > radius * radius) return false
    const angle12 = radiansTowardXY(x0, y0, x, y); // angle from 1 to 2
    return coneAngle / 2 >= Math.abs(subtractRadians(direction, angle12))
}

// export const radians = degrees => mod2pi(degrees * toRadians)
// export const degrees = radians => mod360(radians * toDegrees)

// export function precision(num, digits = 4) {
//     const mult = 10 ** digits
//     return Math.round(num * mult) / mult
// }

// Two seedable random number generators
// export function randomSeedSin(seed = PI / 4) {
//     // ~3.4 million b4 repeat.
//     // https://stackoverflow.com/a/19303725/1791917
//     return () => {
//         const x = Math.sin(seed++) * 10000
//         return x - Math.floor(x)
//     }
// }
// export function randomSeedParkMiller(seed = 123456) {
//     // doesn't repeat b4 JS dies.
//     // https://gist.github.com/blixt/f17b47c62508be59987b
//     seed = seed % 2147483647
//     return () => {
//         seed = (seed * 16807) % 2147483647
//         return (seed - 1) / 2147483646
//     }
// }
// // Replace Math.random with one of these
// export function randomSeed(seed, useParkMiller = true) {
//     Math.random = useParkMiller
//         ? randomSeedParkMiller(seed)
//         : randomSeedSin(seed)
// }

// ### Models

// import { loadScript, inWorker } from './dom.js'
// import { randomSeed } from './math.js'
// import { repeat } from './objects.js'
// import { timeoutLoop } from './async.js'

function toJSON(obj, indent = 0, topLevelArrayOK = true) {
    let firstCall = topLevelArrayOK;
    const blackList = ['rectCache'];
    const json = JSON.stringify(
        obj,
        (key, val) => {
            if (blackList.includes(key)) {
                // if (key === 'rectCache') return val.length
                return undefined
            }
            const isAgentArray =
                Array.isArray(val) &&
                val.length > 0 &&
                Number.isInteger(val[0].id);

            if (isAgentArray && !firstCall) {
                return val.map(v => v.id)
            }

            firstCall = false;
            return val
        },
        indent
    );
    return json
}

function sampleModel(model) {
    const obj = {
        ticks: model.ticks,
        model: Object.keys(model),
        patches: model.patches.length,
        patch: model.patches.oneOf(),
        turtles: model.turtles.length,
        turtle: model.turtles.oneOf(),
        links: model.links.length,
        link: model.links.oneOf(),
    };
    const json = toJSON(obj);
    return JSON.parse(json)
}

// // params; classPath, steps, seed,
// export async function runModel(params) {
//     var worker = inWorker() // fails in test/models.js
//     const prefix = worker ? 'worker ' : 'main '
//     console.log(prefix + 'params', params)

//     if (worker) importScripts(params.classPath)
//     else await loadScript(params.classPath)

//     if (params.seed) randomSeed()

//     // const Model = eval(params.className)
//     const model = new defaultModel()
//     console.log(prefix + 'model', model)

//     await model.startup()
//     model.setup()
//     if (worker) {
//         repeat(params.steps, () => {
//             model.step()
//         })
//     } else {
//         await timeoutLoop(() => {
//             model.step()
//         }, params.steps)
//     }
//     console.log(prefix + 'done, model', model)

//     return sampleModel(model)
// }

// import { randomInt } from './math.js'
// import { convertArrayType } from './types.js'

// ### Arrays, Objects and Iteration

// Three handy functions for defaults & properties
// Identity fcn, returning its argument unchanged. Used in callbacks
const identityFcn = o => o;
// No-op function, does nothing. Used for default callback.
const noopFcn = () => {};
// Return function returning an object's property.  Property in fcn closure.
const propFcn = prop => o => o[prop];

function arraysEqual(a1, a2) {
    if (a1.length !== a2.length) return false
    for (let i = 0; i < a1.length; i++) {
        if (a1[i] !== a2[i]) return false
    }
    return true
}
function removeArrayItem(array, item) {
    const ix = array.indexOf(item);
    if (ix !== -1) array.splice(ix, 1);
    // else throw Error(`removeArrayItem: ${item} not in array`)
    else console.log(`removeArrayItem: ${item} not in array`);
    return array // for chaining
}
// Return a string representation of an array of arrays
const arraysToString = arrays => arrays.map(a => `${a}`).join(',');

// Execute fcn for all own member of an obj or array (typed OK).
// Return input arrayOrObj, transformed by fcn.
// - Unlike forEach, does not skip undefines.
// - Like map, forEach, etc, fcn = fcn(item, key/index, obj).
// - Alternatives are: `for..of`, array map, reduce, filter etc
function forLoop(arrayOrObj, fcn) {
    if (arrayOrObj.slice) {
        // typed & std arrays
        for (let i = 0, len = arrayOrObj.length; i < len; i++) {
            fcn(arrayOrObj[i], i, arrayOrObj);
        }
    } else {
        // obj
        Object.keys(arrayOrObj).forEach(k => fcn(arrayOrObj[k], k, arrayOrObj));
    }
    // return arrayOrObj
}
// Repeat function f(i, a) n times, i in 0, n-1
// a is optional array, default a new Array.
// Return a.
function repeat(n, f, a = []) {
    for (let i = 0; i < n; i++) f(i, a);
    return a
}
// Repeat function n times, incrementing i by step each call.
function step(n, step, f) {
    for (let i = 0; i < n; i += step) f(i);
}
// Return range [0, length-1]. Note: 6x faster than Array.from!
function range(length) {
    return repeat(length, (i, a) => {
        a[i] = i;
    })
}

// REMIND: use set function on object keys
// export function override(defaults, options) {
//     return assign(defaults, options, Object.keys(defaults))
// }
function override(defaults, options) {
    const overrides = defaults;
    forLoop(defaults, (val, key) => {
        if (options[key]) {
            overrides[key] = options[key];
        }
    });
    return overrides
}

// Get subset of object by it's keys
// export function getObjectValues(obj, keys) {}

// Return a new array that is the concatination two arrays.
// The resulting Type is that of the first array.
function concatArrays(array1, array2) {
    const Type = array1.constructor;
    if (Type === Array) {
        return array1.concat(convertArrayType(array2, Array))
    }
    const array = new Type(array1.length + array2.length);
    // NOTE: typedArray.set() allows any Array or TypedArray arg
    array.set(array1);
    array.set(array2, array1.length);
    return array
}

// Convert obj to string via JSON. Use indent = 0 for one-liner
// jsKeys true removes the jsonKeys quotes
function objectToString(obj, indent = 2, jsKeys = true) {
    let str = JSON.stringify(obj, null, indent);
    if (jsKeys) str = str.replace(/"([^"]+)":/gm, '$1:');
    return str
}

// Compare Objects or Arrays via JSON string. Note: TypedArrays !== Arrays
const objectsEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Return random one of array items.
const oneOf = array => array[randomInt(array.length)];
function otherOneOf(array, item) {
    if (array.length < 2) throw Error('otherOneOf: array.length < 2')
    do {
        var other = oneOf(array);
    } while (item === other) // note var use
    return other
}

// Random key/val of object
const oneKeyOf = obj => oneOf(Object.keys(obj));
const oneValOf = obj => obj[oneKeyOf(obj)];
// export function oneKeyOf(obj) {
//     return oneOf(Object.keys(obj))
// }
// export function oneValOf(obj) {
//     return obj[oneKeyOf(obj)]
// }

// You'd think this wasn't necessary, but I always forget. Damn.
// NOTE: this, like sort, sorts in place. Clone array if needed.
function sortNums(array, ascending = true) {
    return array.sort((a, b) => (ascending ? a - b : b - a))
}
// Sort an array of objects w/ fcn(obj) as compareFunction.
// If fcn is a string, convert to propFcn.
function sortObjs(array, fcn, ascending = true) {
    if (typeof fcn === 'string') fcn = propFcn(fcn);
    const comp = (a, b) => fcn(a) - fcn(b);
    return array.sort((a, b) => (ascending ? comp(a, b) : -comp(a, b)))
}
// Randomize array in-place. Use clone() first if new array needed
// The array is returned for chaining; same as input array.
// See [Durstenfeld / Fisher-Yates-Knuth shuffle](https://goo.gl/mfbdPh)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array
}

// Set operations on arrays
// union: elements in a1 or a2
function union(a1, a2) {
    return Array.from(new Set(a1.concat(a2)))
}
// intersection: elements in a1 and a2
function intersection(a1, a2) {
    // intersection = new Set([...set1].filter(x => set2.has(x)))
    const set2 = new Set(a2);
    return a1.filter(x => set2.has(x))
}
// Difference: elements from a1 not in a2
function difference(a1, a2) {
    // difference = new Set([...set1].filter(x => !set2.has(x)))
    const set2 = new Set(a2);
    return a1.filter(x => !set2.has(x))
}

// Return a "ramp" (array of uniformly ascending/descending floats)
// in [start,stop] with numItems (positive integer > 1).
// OK for start>stop. Will always include start/stop w/in float accuracy.
function floatRamp(start, stop, numItems) {
    // NOTE: start + step*i, where step is (stop-start)/(numItems-1),
    // has float accuracy problems, must recalc step each iteration.
    if (numItems <= 1) throw Error('floatRamp: numItems must be > 1')
    const a = [];
    for (let i = 0; i < numItems; i++) {
        a.push(start + (stop - start) * (i / (numItems - 1)));
    }
    return a
}
// Integer version of floatRamp, start & stop integers, rounding each element.
// Default numItems yields unit step between start & stop.
function integerRamp(
    start,
    stop,
    numItems = Math.abs(stop - start) + 1
) {
    return floatRamp(start, stop, numItems).map(a => Math.round(a))
}

// Return an array normalized (lerp) between lo/hi values
// export function normalize(array, lo = 0, hi = 1) {
//     const [min, max] = [arrayMin(array), arrayMax(array)]
//     const scale = 1 / (max - min)
//     return array.map(n => lerp(lo, hi, scale * (n - min)))
// }
// // Return Uint8ClampedArray normalized in 0-255
// export function normalize8(array) {
//     return new Uint8ClampedArray(normalize(array, -0.5, 255.5))
// }
// // Return Array normalized to integers in lo-hi
// export function normalizeInt(array, lo, hi) {
//     return normalize(array, lo, hi).map(n => Math.round(n))
// }

// // get nested property like obj.foo.bar.baz:
// //   const val = nestedProperty(obj, 'foo.bar.baz')
// // Optimized for path length up to 4, else uses path.reduce()
// export function nestedProperty(obj, path) {
//     if (typeof path === 'string') path = path.split('.')
//     switch (path.length) {
//         case 1:
//             return obj[path[0]]
//         case 2:
//             return obj[path[0]][path[1]]
//         case 3:
//             return obj[path[0]][path[1]][path[2]]
//         case 4:
//             return obj[path[0]][path[1]][path[2]][path[3]]
//         default:
//             return path.reduce((obj, param) => obj[param], obj)
//     }
// }

// // Assign values from one object to another.
// // keys is an array of keys or a string of space separated keys.
// // Similar to Object.assign:
// //    util.assign(model, controls, 'speed wiggle population')
// // is equivalent to
// //    {
// //        const { speed, wiggle, population } = controls
// //        Object.assign(model, { speed, wiggle, population })
// //    }
// export function assign(to, from, keys) {
//     if (typeof keys === 'string') keys = keys.split(' ')
//     forLoop(keys, key => {
//         to[key] = from[key]
//     })
//     return to
// }

// // Function <> String for Cap F functions
// export function functionToStrings(fcn, simplify = true) {
//     const str = fcn.toString()
//     const args = str.replace(/.*\(/, '').replace(/\).*/s, '')
//     let body = str.replace(/.*\) {/, '').replace(/}$/, '')
//     if (simplify) body = simplifyFunctionString(body)
//     return [args, body]
// }
// export function stringsToFunction(args, body) {
//     return new Function(args, body)
// }
// export function simplifyFunctionString(str) {
//     // str = str.replace(/\n/g, ' ')
//     // str = str.replace(/^ */, '')
//     // str = str.replace(/ *$/g, '')
//     // str = str.replace(/  */g, ' ')

//     // str = str.replace(/^ */gm, '')
//     // str = str.replace(/ *$/gm, '')
//     // str = str.replace(/  */g, ' ')

//     str = str.replace(/^ */gm, '')
//     str = str.replace(/^\n/, '')
//     str = str.replace(/\n$/, '')

//     return str
// }

// // Create a histogram, given an array, a bin size, and a
// // min bin defaulting to min of of the array.
// // Return an object with:
// // - min/maxBin: the first/last bin with data
// // - min/maxVal: the min/max values in the array
// // - bins: the number of bins
// // - hist: the array of bins
// export function histogram(
//     array,
//     bins = 10,
//     min = arrayMin(array),
//     max = arrayMax(array)
// ) {
//     const binSize = (max - min) / bins
//     const hist = new Array(bins)
//     hist.fill(0)
//     forLoop(array, val => {
//         // const val = key ? a[key] : a
//         if (val < min || val > max) {
//             throw Error(`histogram bounds error: ${val}: ${min}-${max}`)
//         } else {
//             let bin = Math.floor((val - min) / binSize)
//             if (bin === bins) bin-- // val is max, round down
//             hist[bin]++
//         }
//     })
//     hist.parameters = { bins, min, max, binSize, arraySize: array.length }
//     return hist
// }

// export const arrayFirst = array => array[0]
const arrayLast = array => array[array.length - 1];
// export const arrayMax = array => array.reduce((a, b) => Math.max(a, b))
// export const arrayMin = array => array.reduce((a, b) => Math.min(a, b))
// export const arrayExtent = array => [arrayMin(array), arrayMax(array)]

// // Return a new shallow of array (either Array or TypedArray)
// export function clone(array) {
//     return array.slice(0)
// }

// // Simple uniq on sorted or unsorted array.
// export const uniq = array => Array.from(new Set(array))

// import { isObject, isTypedArray } from './types.js'
// import { forLoop } from './objects.js'

// ### OofA/AofO

function isOofA(data) {
    if (!isObject(data)) return false
    return Object.values(data).every(v => isTypedArray(v))
}
function toOofA(aofo, spec) {
    const length = aofo.length;
    const keys = Object.keys(spec);
    const oofa = {};
    keys.forEach(k => {
        oofa[k] = new spec[k](length);
    });
    forLoop(aofo, (o, i) => {
        keys.forEach(key => (oofa[key][i] = o[key]));
    });
    return oofa
}
function oofaObject(oofa, i, keys) {
    const obj = {};
    keys.forEach(key => {
        obj[key] = oofa[key][i];
    });
    return obj
}
function toAofO(oofa, keys = Object.keys(oofa)) {
    const length = oofa[keys[0]].length;
    const aofo = new Array(length);
    forLoop(aofo, (val, i) => {
        aofo[i] = oofaObject(oofa, i, keys);
    });
    return aofo
}
function oofaBuffers(postData) {
    const buffers = [];
    forLoop(postData, obj => forLoop(obj, a => buffers.push(a.buffer)));
    return buffers
}
// ### Types

// Fix the javascript typeof operator https://goo.gl/Efdzk5
const typeOf = obj =>
    ({}.toString
        .call(obj)
        .match(/\s(\w+)/)[1]
        .toLowerCase());
const isType = (obj, string) => typeOf(obj) === string;
const isOneOfTypes = (obj, array) => array.includes(typeOf(obj));

const isString = obj => isType(obj, 'string');
const isObject = obj => isType(obj, 'object');
// export const isArray = obj => isType(obj, 'array')
const isArray = obj => Array.isArray(obj);
const isNumber = obj => isType(obj, 'number');
const isInteger = n => Number.isInteger(n);
// export const isFloat = n => isNumber(n) && n % 1 !== 0 // https://goo.gl/6MS0Tm
const isFunction = obj => isType(obj, 'function');
const isImage = obj => isType(obj, 'image');

// Is a number an integer (rather than a float w/ non-zero fractional part)
const isCanvas = obj =>
    isOneOfTypes(obj, ['htmlcanvaselement', 'offscreencanvas']);
const isImageable = obj =>
    isOneOfTypes(obj, [
        'image',
        'htmlimageelement',
        'htmlcanvaselement',
        'offscreencanvas',
        'imagebitmap',
    ]);

// Typed Arrays:
const isTypedArray = obj => typeOf(obj.buffer) === 'arraybuffer';
const isUintArray = obj => /^uint.*array$/.test(typeOf(obj));
const isIntArray = obj => /^int.*array$/.test(typeOf(obj));
const isFloatArray = obj => /^float.*array$/.test(typeOf(obj));

function isLittleEndian() {
    const d32 = new Uint32Array([0x01020304]);
    return new Uint8ClampedArray(d32.buffer)[0] === 4
}

// Convert Array or TypedArray to given Type (Array or TypedArray).
// Result same length as array, precision may be lost.
function convertArrayType(array, Type) {
    const Type0 = array.constructor;
    if (Type0 === Type) return array // return array if already same Type
    return Type.from(array) // Use .from (both TypedArrays and Arrays)
}

// Unused:
// export const isWebglArray = obj =>
//     Array.isArray(obj) && obj.length === 3 && util.arrayMax(obj) <= 1
// isHtmlElement: obj => /^html.*element$/.test(typeOf(obj))
// isImage: obj => isType(obj, 'image')
// isImageBitmap: obj => isType(obj, 'imagebitmap')
// // Is undefined, null, bool, number, string, symbol
// isPrimitive: obj => obj == null || 'object' != typeof obj
// Return array's type (Array or TypedArray variant)
// typeName: obj => obj.constructor.name

var utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    imagePromise: imagePromise,
    imageBitmapPromise: imageBitmapPromise,
    canvasBlobPromise: canvasBlobPromise,
    canvasFilePromise: canvasFilePromise,
    blobImagePromise: blobImagePromise,
    xhrPromise: xhrPromise,
    timeoutPromise: timeoutPromise,
    timeoutLoop: timeoutLoop,
    waitPromise: waitPromise,
    fetchType: fetchType,
    createCanvas: createCanvas,
    createCtx: createCtx,
    cloneCanvas: cloneCanvas,
    resizeCtx: resizeCtx,
    resizeCanvas: resizeCanvas,
    setCanvasSize: setCanvasSize,
    setIdentity: setIdentity,
    setTextProperties: setTextProperties,
    drawText: drawText,
    ctxImageData: ctxImageData,
    clearCtx: clearCtx,
    fillCtxWithImage: fillCtxWithImage,
    setCtxImage: setCtxImage,
    logOnce: logOnce,
    warn: warn,
    timeit: timeit,
    fps: fps,
    pps: pps,
    toWindow: toWindow,
    dump: dump,
    setCssStyle: setCssStyle,
    getQueryString: getQueryString,
    parseQueryString: parseQueryString,
    RESTapi: RESTapi,
    inWorker: inWorker,
    inNode: inNode,
    inDeno: inDeno,
    printToPage: printToPage,
    getEventXY: getEventXY,
    fcnToWorker: fcnToWorker,
    PI: PI,
    randomInt: randomInt,
    randomInt2: randomInt2,
    randomFloat: randomFloat,
    randomFloat2: randomFloat2,
    randomCentered: randomCentered,
    randomNormal: randomNormal,
    randomSeed: randomSeed,
    precision: precision,
    isPowerOf2: isPowerOf2,
    nextPowerOf2: nextPowerOf2,
    mod: mod,
    wrap: wrap,
    clamp: clamp,
    isBetween: isBetween,
    lerp: lerp,
    lerpScale: lerpScale,
    degToRad: degToRad,
    radToDeg: radToDeg,
    radToHeading: radToHeading,
    headingToRad: headingToRad,
    radToHeadingAngle: radToHeadingAngle,
    headingAngleToRad: headingAngleToRad,
    degToHeading: degToHeading,
    headingToDeg: headingToDeg,
    mod360: mod360,
    mod2pi: mod2pi,
    modpipi: modpipi,
    mod180180: mod180180,
    degreesEqual: degreesEqual,
    radsEqual: radsEqual,
    headingsEq: headingsEq,
    subtractRadians: subtractRadians,
    subtractDegrees: subtractDegrees,
    subtractHeadings: subtractHeadings,
    radiansTowardXY: radiansTowardXY,
    headingTowardXY: headingTowardXY,
    degreesTowardXY: degreesTowardXY,
    toDeg: toDeg$1,
    toRad: toRad$1,
    setGeometry: setGeometry,
    sqDistance: sqDistance,
    distance: distance,
    sqDistance3: sqDistance3,
    distance3: distance3,
    inCone: inCone,
    sampleModel: sampleModel,
    identityFcn: identityFcn,
    noopFcn: noopFcn,
    propFcn: propFcn,
    arraysEqual: arraysEqual,
    removeArrayItem: removeArrayItem,
    arraysToString: arraysToString,
    forLoop: forLoop,
    repeat: repeat,
    step: step,
    range: range,
    override: override,
    concatArrays: concatArrays,
    objectToString: objectToString,
    objectsEqual: objectsEqual,
    oneOf: oneOf,
    otherOneOf: otherOneOf,
    oneKeyOf: oneKeyOf,
    oneValOf: oneValOf,
    sortNums: sortNums,
    sortObjs: sortObjs,
    shuffle: shuffle,
    union: union,
    intersection: intersection,
    difference: difference,
    floatRamp: floatRamp,
    integerRamp: integerRamp,
    arrayLast: arrayLast,
    isOofA: isOofA,
    toOofA: toOofA,
    oofaObject: oofaObject,
    toAofO: toAofO,
    oofaBuffers: oofaBuffers,
    typeOf: typeOf,
    isType: isType,
    isOneOfTypes: isOneOfTypes,
    isString: isString,
    isObject: isObject,
    isArray: isArray,
    isNumber: isNumber,
    isInteger: isInteger,
    isFunction: isFunction,
    isImage: isImage,
    isCanvas: isCanvas,
    isImageable: isImageable,
    isTypedArray: isTypedArray,
    isUintArray: isUintArray,
    isIntArray: isIntArray,
    isFloatArray: isFloatArray,
    isLittleEndian: isLittleEndian,
    convertArrayType: convertArrayType
});

const _lut = [];

for ( let i = 0; i < 256; i ++ ) {

	_lut[ i ] = ( i < 16 ? '0' : '' ) + ( i ).toString( 16 );

}

let _seed = 1234567;

const MathUtils = {

	DEG2RAD: Math.PI / 180,
	RAD2DEG: 180 / Math.PI,

	generateUUID: function () {

		// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136

		const d0 = Math.random() * 0xffffffff | 0;
		const d1 = Math.random() * 0xffffffff | 0;
		const d2 = Math.random() * 0xffffffff | 0;
		const d3 = Math.random() * 0xffffffff | 0;
		const uuid = _lut[ d0 & 0xff ] + _lut[ d0 >> 8 & 0xff ] + _lut[ d0 >> 16 & 0xff ] + _lut[ d0 >> 24 & 0xff ] + '-' +
			_lut[ d1 & 0xff ] + _lut[ d1 >> 8 & 0xff ] + '-' + _lut[ d1 >> 16 & 0x0f | 0x40 ] + _lut[ d1 >> 24 & 0xff ] + '-' +
			_lut[ d2 & 0x3f | 0x80 ] + _lut[ d2 >> 8 & 0xff ] + '-' + _lut[ d2 >> 16 & 0xff ] + _lut[ d2 >> 24 & 0xff ] +
			_lut[ d3 & 0xff ] + _lut[ d3 >> 8 & 0xff ] + _lut[ d3 >> 16 & 0xff ] + _lut[ d3 >> 24 & 0xff ];

		// .toUpperCase() here flattens concatenated strings to save heap memory space.
		return uuid.toUpperCase();

	},

	clamp: function ( value, min, max ) {

		return Math.max( min, Math.min( max, value ) );

	},

	// compute euclidian modulo of m % n
	// https://en.wikipedia.org/wiki/Modulo_operation

	euclideanModulo: function ( n, m ) {

		return ( ( n % m ) + m ) % m;

	},

	// Linear mapping from range <a1, a2> to range <b1, b2>

	mapLinear: function ( x, a1, a2, b1, b2 ) {

		return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );

	},

	// https://en.wikipedia.org/wiki/Linear_interpolation

	lerp: function ( x, y, t ) {

		return ( 1 - t ) * x + t * y;

	},

	// http://en.wikipedia.org/wiki/Smoothstep

	smoothstep: function ( x, min, max ) {

		if ( x <= min ) return 0;
		if ( x >= max ) return 1;

		x = ( x - min ) / ( max - min );

		return x * x * ( 3 - 2 * x );

	},

	smootherstep: function ( x, min, max ) {

		if ( x <= min ) return 0;
		if ( x >= max ) return 1;

		x = ( x - min ) / ( max - min );

		return x * x * x * ( x * ( x * 6 - 15 ) + 10 );

	},

	// Random integer from <low, high> interval

	randInt: function ( low, high ) {

		return low + Math.floor( Math.random() * ( high - low + 1 ) );

	},

	// Random float from <low, high> interval

	randFloat: function ( low, high ) {

		return low + Math.random() * ( high - low );

	},

	// Random float from <-range/2, range/2> interval

	randFloatSpread: function ( range ) {

		return range * ( 0.5 - Math.random() );

	},

	// Deterministic pseudo-random float in the interval [ 0, 1 ]

	seededRandom: function ( s ) {

		if ( s !== undefined ) _seed = s % 2147483647;

		// Park-Miller algorithm

		_seed = _seed * 16807 % 2147483647;

		return ( _seed - 1 ) / 2147483646;

	},

	degToRad: function ( degrees ) {

		return degrees * MathUtils.DEG2RAD;

	},

	radToDeg: function ( radians ) {

		return radians * MathUtils.RAD2DEG;

	},

	isPowerOfTwo: function ( value ) {

		return ( value & ( value - 1 ) ) === 0 && value !== 0;

	},

	ceilPowerOfTwo: function ( value ) {

		return Math.pow( 2, Math.ceil( Math.log( value ) / Math.LN2 ) );

	},

	floorPowerOfTwo: function ( value ) {

		return Math.pow( 2, Math.floor( Math.log( value ) / Math.LN2 ) );

	},

	setQuaternionFromProperEuler: function ( q, a, b, c, order ) {

		// Intrinsic Proper Euler Angles - see https://en.wikipedia.org/wiki/Euler_angles

		// rotations are applied to the axes in the order specified by 'order'
		// rotation by angle 'a' is applied first, then by angle 'b', then by angle 'c'
		// angles are in radians

		const cos = Math.cos;
		const sin = Math.sin;

		const c2 = cos( b / 2 );
		const s2 = sin( b / 2 );

		const c13 = cos( ( a + c ) / 2 );
		const s13 = sin( ( a + c ) / 2 );

		const c1_3 = cos( ( a - c ) / 2 );
		const s1_3 = sin( ( a - c ) / 2 );

		const c3_1 = cos( ( c - a ) / 2 );
		const s3_1 = sin( ( c - a ) / 2 );

		switch ( order ) {

			case 'XYX':
				q.set( c2 * s13, s2 * c1_3, s2 * s1_3, c2 * c13 );
				break;

			case 'YZY':
				q.set( s2 * s1_3, c2 * s13, s2 * c1_3, c2 * c13 );
				break;

			case 'ZXZ':
				q.set( s2 * c1_3, s2 * s1_3, c2 * s13, c2 * c13 );
				break;

			case 'XZX':
				q.set( c2 * s13, s2 * s3_1, s2 * c3_1, c2 * c13 );
				break;

			case 'YXY':
				q.set( s2 * c3_1, c2 * s13, s2 * s3_1, c2 * c13 );
				break;

			case 'ZYZ':
				q.set( s2 * s3_1, s2 * c3_1, c2 * s13, c2 * c13 );
				break;

			default:
				console.warn( 'THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: ' + order );

		}

	}

};

class Quaternion {

	constructor( x = 0, y = 0, z = 0, w = 1 ) {

		Object.defineProperty( this, 'isQuaternion', { value: true } );

		this._x = x;
		this._y = y;
		this._z = z;
		this._w = w;

	}

	static slerp( qa, qb, qm, t ) {

		return qm.copy( qa ).slerp( qb, t );

	}

	static slerpFlat( dst, dstOffset, src0, srcOffset0, src1, srcOffset1, t ) {

		// fuzz-free, array-based Quaternion SLERP operation

		let x0 = src0[ srcOffset0 + 0 ],
			y0 = src0[ srcOffset0 + 1 ],
			z0 = src0[ srcOffset0 + 2 ],
			w0 = src0[ srcOffset0 + 3 ];

		const x1 = src1[ srcOffset1 + 0 ],
			y1 = src1[ srcOffset1 + 1 ],
			z1 = src1[ srcOffset1 + 2 ],
			w1 = src1[ srcOffset1 + 3 ];

		if ( w0 !== w1 || x0 !== x1 || y0 !== y1 || z0 !== z1 ) {

			let s = 1 - t;
			const cos = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1,
				dir = ( cos >= 0 ? 1 : - 1 ),
				sqrSin = 1 - cos * cos;

			// Skip the Slerp for tiny steps to avoid numeric problems:
			if ( sqrSin > Number.EPSILON ) {

				const sin = Math.sqrt( sqrSin ),
					len = Math.atan2( sin, cos * dir );

				s = Math.sin( s * len ) / sin;
				t = Math.sin( t * len ) / sin;

			}

			const tDir = t * dir;

			x0 = x0 * s + x1 * tDir;
			y0 = y0 * s + y1 * tDir;
			z0 = z0 * s + z1 * tDir;
			w0 = w0 * s + w1 * tDir;

			// Normalize in case we just did a lerp:
			if ( s === 1 - t ) {

				const f = 1 / Math.sqrt( x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0 );

				x0 *= f;
				y0 *= f;
				z0 *= f;
				w0 *= f;

			}

		}

		dst[ dstOffset ] = x0;
		dst[ dstOffset + 1 ] = y0;
		dst[ dstOffset + 2 ] = z0;
		dst[ dstOffset + 3 ] = w0;

	}

	static multiplyQuaternionsFlat( dst, dstOffset, src0, srcOffset0, src1, srcOffset1 ) {

		const x0 = src0[ srcOffset0 ];
		const y0 = src0[ srcOffset0 + 1 ];
		const z0 = src0[ srcOffset0 + 2 ];
		const w0 = src0[ srcOffset0 + 3 ];

		const x1 = src1[ srcOffset1 ];
		const y1 = src1[ srcOffset1 + 1 ];
		const z1 = src1[ srcOffset1 + 2 ];
		const w1 = src1[ srcOffset1 + 3 ];

		dst[ dstOffset ] = x0 * w1 + w0 * x1 + y0 * z1 - z0 * y1;
		dst[ dstOffset + 1 ] = y0 * w1 + w0 * y1 + z0 * x1 - x0 * z1;
		dst[ dstOffset + 2 ] = z0 * w1 + w0 * z1 + x0 * y1 - y0 * x1;
		dst[ dstOffset + 3 ] = w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1;

		return dst;

	}

	get x() {

		return this._x;

	}

	set x( value ) {

		this._x = value;
		this._onChangeCallback();

	}

	get y() {

		return this._y;

	}

	set y( value ) {

		this._y = value;
		this._onChangeCallback();

	}

	get z() {

		return this._z;

	}

	set z( value ) {

		this._z = value;
		this._onChangeCallback();

	}

	get w() {

		return this._w;

	}

	set w( value ) {

		this._w = value;
		this._onChangeCallback();

	}

	set( x, y, z, w ) {

		this._x = x;
		this._y = y;
		this._z = z;
		this._w = w;

		this._onChangeCallback();

		return this;

	}

	clone() {

		return new this.constructor( this._x, this._y, this._z, this._w );

	}

	copy( quaternion ) {

		this._x = quaternion.x;
		this._y = quaternion.y;
		this._z = quaternion.z;
		this._w = quaternion.w;

		this._onChangeCallback();

		return this;

	}

	setFromEuler( euler, update ) {

		if ( ! ( euler && euler.isEuler ) ) {

			throw new Error( 'THREE.Quaternion: .setFromEuler() now expects an Euler rotation rather than a Vector3 and order.' );

		}

		const x = euler._x, y = euler._y, z = euler._z, order = euler._order;

		// http://www.mathworks.com/matlabcentral/fileexchange/
		// 	20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
		//	content/SpinCalc.m

		const cos = Math.cos;
		const sin = Math.sin;

		const c1 = cos( x / 2 );
		const c2 = cos( y / 2 );
		const c3 = cos( z / 2 );

		const s1 = sin( x / 2 );
		const s2 = sin( y / 2 );
		const s3 = sin( z / 2 );

		switch ( order ) {

			case 'XYZ':
				this._x = s1 * c2 * c3 + c1 * s2 * s3;
				this._y = c1 * s2 * c3 - s1 * c2 * s3;
				this._z = c1 * c2 * s3 + s1 * s2 * c3;
				this._w = c1 * c2 * c3 - s1 * s2 * s3;
				break;

			case 'YXZ':
				this._x = s1 * c2 * c3 + c1 * s2 * s3;
				this._y = c1 * s2 * c3 - s1 * c2 * s3;
				this._z = c1 * c2 * s3 - s1 * s2 * c3;
				this._w = c1 * c2 * c3 + s1 * s2 * s3;
				break;

			case 'ZXY':
				this._x = s1 * c2 * c3 - c1 * s2 * s3;
				this._y = c1 * s2 * c3 + s1 * c2 * s3;
				this._z = c1 * c2 * s3 + s1 * s2 * c3;
				this._w = c1 * c2 * c3 - s1 * s2 * s3;
				break;

			case 'ZYX':
				this._x = s1 * c2 * c3 - c1 * s2 * s3;
				this._y = c1 * s2 * c3 + s1 * c2 * s3;
				this._z = c1 * c2 * s3 - s1 * s2 * c3;
				this._w = c1 * c2 * c3 + s1 * s2 * s3;
				break;

			case 'YZX':
				this._x = s1 * c2 * c3 + c1 * s2 * s3;
				this._y = c1 * s2 * c3 + s1 * c2 * s3;
				this._z = c1 * c2 * s3 - s1 * s2 * c3;
				this._w = c1 * c2 * c3 - s1 * s2 * s3;
				break;

			case 'XZY':
				this._x = s1 * c2 * c3 - c1 * s2 * s3;
				this._y = c1 * s2 * c3 - s1 * c2 * s3;
				this._z = c1 * c2 * s3 + s1 * s2 * c3;
				this._w = c1 * c2 * c3 + s1 * s2 * s3;
				break;

			default:
				console.warn( 'THREE.Quaternion: .setFromEuler() encountered an unknown order: ' + order );

		}

		if ( update !== false ) this._onChangeCallback();

		return this;

	}

	setFromAxisAngle( axis, angle ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm

		// assumes axis is normalized

		const halfAngle = angle / 2, s = Math.sin( halfAngle );

		this._x = axis.x * s;
		this._y = axis.y * s;
		this._z = axis.z * s;
		this._w = Math.cos( halfAngle );

		this._onChangeCallback();

		return this;

	}

	setFromRotationMatrix( m ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		const te = m.elements,

			m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ],
			m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ],
			m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ],

			trace = m11 + m22 + m33;

		if ( trace > 0 ) {

			const s = 0.5 / Math.sqrt( trace + 1.0 );

			this._w = 0.25 / s;
			this._x = ( m32 - m23 ) * s;
			this._y = ( m13 - m31 ) * s;
			this._z = ( m21 - m12 ) * s;

		} else if ( m11 > m22 && m11 > m33 ) {

			const s = 2.0 * Math.sqrt( 1.0 + m11 - m22 - m33 );

			this._w = ( m32 - m23 ) / s;
			this._x = 0.25 * s;
			this._y = ( m12 + m21 ) / s;
			this._z = ( m13 + m31 ) / s;

		} else if ( m22 > m33 ) {

			const s = 2.0 * Math.sqrt( 1.0 + m22 - m11 - m33 );

			this._w = ( m13 - m31 ) / s;
			this._x = ( m12 + m21 ) / s;
			this._y = 0.25 * s;
			this._z = ( m23 + m32 ) / s;

		} else {

			const s = 2.0 * Math.sqrt( 1.0 + m33 - m11 - m22 );

			this._w = ( m21 - m12 ) / s;
			this._x = ( m13 + m31 ) / s;
			this._y = ( m23 + m32 ) / s;
			this._z = 0.25 * s;

		}

		this._onChangeCallback();

		return this;

	}

	setFromUnitVectors( vFrom, vTo ) {

		// assumes direction vectors vFrom and vTo are normalized

		const EPS = 0.000001;

		let r = vFrom.dot( vTo ) + 1;

		if ( r < EPS ) {

			r = 0;

			if ( Math.abs( vFrom.x ) > Math.abs( vFrom.z ) ) {

				this._x = - vFrom.y;
				this._y = vFrom.x;
				this._z = 0;
				this._w = r;

			} else {

				this._x = 0;
				this._y = - vFrom.z;
				this._z = vFrom.y;
				this._w = r;

			}

		} else {

			// crossVectors( vFrom, vTo ); // inlined to avoid cyclic dependency on Vector3

			this._x = vFrom.y * vTo.z - vFrom.z * vTo.y;
			this._y = vFrom.z * vTo.x - vFrom.x * vTo.z;
			this._z = vFrom.x * vTo.y - vFrom.y * vTo.x;
			this._w = r;

		}

		return this.normalize();

	}

	angleTo( q ) {

		return 2 * Math.acos( Math.abs( MathUtils.clamp( this.dot( q ), - 1, 1 ) ) );

	}

	rotateTowards( q, step ) {

		const angle = this.angleTo( q );

		if ( angle === 0 ) return this;

		const t = Math.min( 1, step / angle );

		this.slerp( q, t );

		return this;

	}

	identity() {

		return this.set( 0, 0, 0, 1 );

	}

	inverse() {

		// quaternion is assumed to have unit length

		return this.conjugate();

	}

	conjugate() {

		this._x *= - 1;
		this._y *= - 1;
		this._z *= - 1;

		this._onChangeCallback();

		return this;

	}

	dot( v ) {

		return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;

	}

	lengthSq() {

		return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;

	}

	length() {

		return Math.sqrt( this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w );

	}

	normalize() {

		let l = this.length();

		if ( l === 0 ) {

			this._x = 0;
			this._y = 0;
			this._z = 0;
			this._w = 1;

		} else {

			l = 1 / l;

			this._x = this._x * l;
			this._y = this._y * l;
			this._z = this._z * l;
			this._w = this._w * l;

		}

		this._onChangeCallback();

		return this;

	}

	multiply( q, p ) {

		if ( p !== undefined ) {

			console.warn( 'THREE.Quaternion: .multiply() now only accepts one argument. Use .multiplyQuaternions( a, b ) instead.' );
			return this.multiplyQuaternions( q, p );

		}

		return this.multiplyQuaternions( this, q );

	}

	premultiply( q ) {

		return this.multiplyQuaternions( q, this );

	}

	multiplyQuaternions( a, b ) {

		// from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm

		const qax = a._x, qay = a._y, qaz = a._z, qaw = a._w;
		const qbx = b._x, qby = b._y, qbz = b._z, qbw = b._w;

		this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
		this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
		this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
		this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

		this._onChangeCallback();

		return this;

	}

	slerp( qb, t ) {

		if ( t === 0 ) return this;
		if ( t === 1 ) return this.copy( qb );

		const x = this._x, y = this._y, z = this._z, w = this._w;

		// http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/

		let cosHalfTheta = w * qb._w + x * qb._x + y * qb._y + z * qb._z;

		if ( cosHalfTheta < 0 ) {

			this._w = - qb._w;
			this._x = - qb._x;
			this._y = - qb._y;
			this._z = - qb._z;

			cosHalfTheta = - cosHalfTheta;

		} else {

			this.copy( qb );

		}

		if ( cosHalfTheta >= 1.0 ) {

			this._w = w;
			this._x = x;
			this._y = y;
			this._z = z;

			return this;

		}

		const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;

		if ( sqrSinHalfTheta <= Number.EPSILON ) {

			const s = 1 - t;
			this._w = s * w + t * this._w;
			this._x = s * x + t * this._x;
			this._y = s * y + t * this._y;
			this._z = s * z + t * this._z;

			this.normalize();
			this._onChangeCallback();

			return this;

		}

		const sinHalfTheta = Math.sqrt( sqrSinHalfTheta );
		const halfTheta = Math.atan2( sinHalfTheta, cosHalfTheta );
		const ratioA = Math.sin( ( 1 - t ) * halfTheta ) / sinHalfTheta,
			ratioB = Math.sin( t * halfTheta ) / sinHalfTheta;

		this._w = ( w * ratioA + this._w * ratioB );
		this._x = ( x * ratioA + this._x * ratioB );
		this._y = ( y * ratioA + this._y * ratioB );
		this._z = ( z * ratioA + this._z * ratioB );

		this._onChangeCallback();

		return this;

	}

	equals( quaternion ) {

		return ( quaternion._x === this._x ) && ( quaternion._y === this._y ) && ( quaternion._z === this._z ) && ( quaternion._w === this._w );

	}

	fromArray( array, offset ) {

		if ( offset === undefined ) offset = 0;

		this._x = array[ offset ];
		this._y = array[ offset + 1 ];
		this._z = array[ offset + 2 ];
		this._w = array[ offset + 3 ];

		this._onChangeCallback();

		return this;

	}

	toArray( array, offset ) {

		if ( array === undefined ) array = [];
		if ( offset === undefined ) offset = 0;

		array[ offset ] = this._x;
		array[ offset + 1 ] = this._y;
		array[ offset + 2 ] = this._z;
		array[ offset + 3 ] = this._w;

		return array;

	}

	fromBufferAttribute( attribute, index ) {

		this._x = attribute.getX( index );
		this._y = attribute.getY( index );
		this._z = attribute.getZ( index );
		this._w = attribute.getW( index );

		return this;

	}

	_onChange( callback ) {

		this._onChangeCallback = callback;

		return this;

	}

	_onChangeCallback() {}

}

class Vector3 {

	constructor( x = 0, y = 0, z = 0 ) {

		Object.defineProperty( this, 'isVector3', { value: true } );

		this.x = x;
		this.y = y;
		this.z = z;

	}

	set( x, y, z ) {

		if ( z === undefined ) z = this.z; // sprite.scale.set(x,y)

		this.x = x;
		this.y = y;
		this.z = z;

		return this;

	}

	setScalar( scalar ) {

		this.x = scalar;
		this.y = scalar;
		this.z = scalar;

		return this;

	}

	setX( x ) {

		this.x = x;

		return this;

	}

	setY( y ) {

		this.y = y;

		return this;

	}

	setZ( z ) {

		this.z = z;

		return this;

	}

	setComponent( index, value ) {

		switch ( index ) {

			case 0: this.x = value; break;
			case 1: this.y = value; break;
			case 2: this.z = value; break;
			default: throw new Error( 'index is out of range: ' + index );

		}

		return this;

	}

	getComponent( index ) {

		switch ( index ) {

			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			default: throw new Error( 'index is out of range: ' + index );

		}

	}

	clone() {

		return new this.constructor( this.x, this.y, this.z );

	}

	copy( v ) {

		this.x = v.x;
		this.y = v.y;
		this.z = v.z;

		return this;

	}

	add( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'THREE.Vector3: .add() now only accepts one argument. Use .addVectors( a, b ) instead.' );
			return this.addVectors( v, w );

		}

		this.x += v.x;
		this.y += v.y;
		this.z += v.z;

		return this;

	}

	addScalar( s ) {

		this.x += s;
		this.y += s;
		this.z += s;

		return this;

	}

	addVectors( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;
		this.z = a.z + b.z;

		return this;

	}

	addScaledVector( v, s ) {

		this.x += v.x * s;
		this.y += v.y * s;
		this.z += v.z * s;

		return this;

	}

	sub( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'THREE.Vector3: .sub() now only accepts one argument. Use .subVectors( a, b ) instead.' );
			return this.subVectors( v, w );

		}

		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;

		return this;

	}

	subScalar( s ) {

		this.x -= s;
		this.y -= s;
		this.z -= s;

		return this;

	}

	subVectors( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;

		return this;

	}

	multiply( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'THREE.Vector3: .multiply() now only accepts one argument. Use .multiplyVectors( a, b ) instead.' );
			return this.multiplyVectors( v, w );

		}

		this.x *= v.x;
		this.y *= v.y;
		this.z *= v.z;

		return this;

	}

	multiplyScalar( scalar ) {

		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;

		return this;

	}

	multiplyVectors( a, b ) {

		this.x = a.x * b.x;
		this.y = a.y * b.y;
		this.z = a.z * b.z;

		return this;

	}

	applyEuler( euler ) {

		if ( ! ( euler && euler.isEuler ) ) {

			console.error( 'THREE.Vector3: .applyEuler() now expects an Euler rotation rather than a Vector3 and order.' );

		}

		return this.applyQuaternion( _quaternion$2.setFromEuler( euler ) );

	}

	applyAxisAngle( axis, angle ) {

		return this.applyQuaternion( _quaternion$2.setFromAxisAngle( axis, angle ) );

	}

	applyMatrix3( m ) {

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 3 ] * y + e[ 6 ] * z;
		this.y = e[ 1 ] * x + e[ 4 ] * y + e[ 7 ] * z;
		this.z = e[ 2 ] * x + e[ 5 ] * y + e[ 8 ] * z;

		return this;

	}

	applyNormalMatrix( m ) {

		return this.applyMatrix3( m ).normalize();

	}

	applyMatrix4( m ) {

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		const w = 1 / ( e[ 3 ] * x + e[ 7 ] * y + e[ 11 ] * z + e[ 15 ] );

		this.x = ( e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z + e[ 12 ] ) * w;
		this.y = ( e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z + e[ 13 ] ) * w;
		this.z = ( e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z + e[ 14 ] ) * w;

		return this;

	}

	applyQuaternion( q ) {

		const x = this.x, y = this.y, z = this.z;
		const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

		// calculate quat * vector

		const ix = qw * x + qy * z - qz * y;
		const iy = qw * y + qz * x - qx * z;
		const iz = qw * z + qx * y - qy * x;
		const iw = - qx * x - qy * y - qz * z;

		// calculate result * inverse quat

		this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
		this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
		this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;

		return this;

	}

	project( camera ) {

		return this.applyMatrix4( camera.matrixWorldInverse ).applyMatrix4( camera.projectionMatrix );

	}

	unproject( camera ) {

		return this.applyMatrix4( camera.projectionMatrixInverse ).applyMatrix4( camera.matrixWorld );

	}

	transformDirection( m ) {

		// input: THREE.Matrix4 affine matrix
		// vector interpreted as a direction

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z;
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z;
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z;

		return this.normalize();

	}

	divide( v ) {

		this.x /= v.x;
		this.y /= v.y;
		this.z /= v.z;

		return this;

	}

	divideScalar( scalar ) {

		return this.multiplyScalar( 1 / scalar );

	}

	min( v ) {

		this.x = Math.min( this.x, v.x );
		this.y = Math.min( this.y, v.y );
		this.z = Math.min( this.z, v.z );

		return this;

	}

	max( v ) {

		this.x = Math.max( this.x, v.x );
		this.y = Math.max( this.y, v.y );
		this.z = Math.max( this.z, v.z );

		return this;

	}

	clamp( min, max ) {

		// assumes min < max, componentwise

		this.x = Math.max( min.x, Math.min( max.x, this.x ) );
		this.y = Math.max( min.y, Math.min( max.y, this.y ) );
		this.z = Math.max( min.z, Math.min( max.z, this.z ) );

		return this;

	}

	clampScalar( minVal, maxVal ) {

		this.x = Math.max( minVal, Math.min( maxVal, this.x ) );
		this.y = Math.max( minVal, Math.min( maxVal, this.y ) );
		this.z = Math.max( minVal, Math.min( maxVal, this.z ) );

		return this;

	}

	clampLength( min, max ) {

		const length = this.length();

		return this.divideScalar( length || 1 ).multiplyScalar( Math.max( min, Math.min( max, length ) ) );

	}

	floor() {

		this.x = Math.floor( this.x );
		this.y = Math.floor( this.y );
		this.z = Math.floor( this.z );

		return this;

	}

	ceil() {

		this.x = Math.ceil( this.x );
		this.y = Math.ceil( this.y );
		this.z = Math.ceil( this.z );

		return this;

	}

	round() {

		this.x = Math.round( this.x );
		this.y = Math.round( this.y );
		this.z = Math.round( this.z );

		return this;

	}

	roundToZero() {

		this.x = ( this.x < 0 ) ? Math.ceil( this.x ) : Math.floor( this.x );
		this.y = ( this.y < 0 ) ? Math.ceil( this.y ) : Math.floor( this.y );
		this.z = ( this.z < 0 ) ? Math.ceil( this.z ) : Math.floor( this.z );

		return this;

	}

	negate() {

		this.x = - this.x;
		this.y = - this.y;
		this.z = - this.z;

		return this;

	}

	dot( v ) {

		return this.x * v.x + this.y * v.y + this.z * v.z;

	}

	// TODO lengthSquared?

	lengthSq() {

		return this.x * this.x + this.y * this.y + this.z * this.z;

	}

	length() {

		return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z );

	}

	manhattanLength() {

		return Math.abs( this.x ) + Math.abs( this.y ) + Math.abs( this.z );

	}

	normalize() {

		return this.divideScalar( this.length() || 1 );

	}

	setLength( length ) {

		return this.normalize().multiplyScalar( length );

	}

	lerp( v, alpha ) {

		this.x += ( v.x - this.x ) * alpha;
		this.y += ( v.y - this.y ) * alpha;
		this.z += ( v.z - this.z ) * alpha;

		return this;

	}

	lerpVectors( v1, v2, alpha ) {

		this.x = v1.x + ( v2.x - v1.x ) * alpha;
		this.y = v1.y + ( v2.y - v1.y ) * alpha;
		this.z = v1.z + ( v2.z - v1.z ) * alpha;

		return this;

	}

	cross( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'THREE.Vector3: .cross() now only accepts one argument. Use .crossVectors( a, b ) instead.' );
			return this.crossVectors( v, w );

		}

		return this.crossVectors( this, v );

	}

	crossVectors( a, b ) {

		const ax = a.x, ay = a.y, az = a.z;
		const bx = b.x, by = b.y, bz = b.z;

		this.x = ay * bz - az * by;
		this.y = az * bx - ax * bz;
		this.z = ax * by - ay * bx;

		return this;

	}

	projectOnVector( v ) {

		const denominator = v.lengthSq();

		if ( denominator === 0 ) return this.set( 0, 0, 0 );

		const scalar = v.dot( this ) / denominator;

		return this.copy( v ).multiplyScalar( scalar );

	}

	projectOnPlane( planeNormal ) {

		_vector.copy( this ).projectOnVector( planeNormal );

		return this.sub( _vector );

	}

	reflect( normal ) {

		// reflect incident vector off plane orthogonal to normal
		// normal is assumed to have unit length

		return this.sub( _vector.copy( normal ).multiplyScalar( 2 * this.dot( normal ) ) );

	}

	angleTo( v ) {

		const denominator = Math.sqrt( this.lengthSq() * v.lengthSq() );

		if ( denominator === 0 ) return Math.PI / 2;

		const theta = this.dot( v ) / denominator;

		// clamp, to handle numerical problems

		return Math.acos( MathUtils.clamp( theta, - 1, 1 ) );

	}

	distanceTo( v ) {

		return Math.sqrt( this.distanceToSquared( v ) );

	}

	distanceToSquared( v ) {

		const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;

		return dx * dx + dy * dy + dz * dz;

	}

	manhattanDistanceTo( v ) {

		return Math.abs( this.x - v.x ) + Math.abs( this.y - v.y ) + Math.abs( this.z - v.z );

	}

	setFromSpherical( s ) {

		return this.setFromSphericalCoords( s.radius, s.phi, s.theta );

	}

	setFromSphericalCoords( radius, phi, theta ) {

		const sinPhiRadius = Math.sin( phi ) * radius;

		this.x = sinPhiRadius * Math.sin( theta );
		this.y = Math.cos( phi ) * radius;
		this.z = sinPhiRadius * Math.cos( theta );

		return this;

	}

	setFromCylindrical( c ) {

		return this.setFromCylindricalCoords( c.radius, c.theta, c.y );

	}

	setFromCylindricalCoords( radius, theta, y ) {

		this.x = radius * Math.sin( theta );
		this.y = y;
		this.z = radius * Math.cos( theta );

		return this;

	}

	setFromMatrixPosition( m ) {

		const e = m.elements;

		this.x = e[ 12 ];
		this.y = e[ 13 ];
		this.z = e[ 14 ];

		return this;

	}

	setFromMatrixScale( m ) {

		const sx = this.setFromMatrixColumn( m, 0 ).length();
		const sy = this.setFromMatrixColumn( m, 1 ).length();
		const sz = this.setFromMatrixColumn( m, 2 ).length();

		this.x = sx;
		this.y = sy;
		this.z = sz;

		return this;

	}

	setFromMatrixColumn( m, index ) {

		return this.fromArray( m.elements, index * 4 );

	}

	setFromMatrix3Column( m, index ) {

		return this.fromArray( m.elements, index * 3 );

	}

	equals( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) && ( v.z === this.z ) );

	}

	fromArray( array, offset ) {

		if ( offset === undefined ) offset = 0;

		this.x = array[ offset ];
		this.y = array[ offset + 1 ];
		this.z = array[ offset + 2 ];

		return this;

	}

	toArray( array, offset ) {

		if ( array === undefined ) array = [];
		if ( offset === undefined ) offset = 0;

		array[ offset ] = this.x;
		array[ offset + 1 ] = this.y;
		array[ offset + 2 ] = this.z;

		return array;

	}

	fromBufferAttribute( attribute, index, offset ) {

		if ( offset !== undefined ) {

			console.warn( 'THREE.Vector3: offset has been removed from .fromBufferAttribute().' );

		}

		this.x = attribute.getX( index );
		this.y = attribute.getY( index );
		this.z = attribute.getZ( index );

		return this;

	}

	random() {

		this.x = Math.random();
		this.y = Math.random();
		this.z = Math.random();

		return this;

	}

}

const _vector = new Vector3();
const _quaternion$2 = new Quaternion();

class Matrix4 {

	constructor() {

		Object.defineProperty( this, 'isMatrix4', { value: true } );

		this.elements = [

			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		];

		if ( arguments.length > 0 ) {

			console.error( 'THREE.Matrix4: the constructor no longer reads arguments. use .set() instead.' );

		}

	}

	set( n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44 ) {

		const te = this.elements;

		te[ 0 ] = n11; te[ 4 ] = n12; te[ 8 ] = n13; te[ 12 ] = n14;
		te[ 1 ] = n21; te[ 5 ] = n22; te[ 9 ] = n23; te[ 13 ] = n24;
		te[ 2 ] = n31; te[ 6 ] = n32; te[ 10 ] = n33; te[ 14 ] = n34;
		te[ 3 ] = n41; te[ 7 ] = n42; te[ 11 ] = n43; te[ 15 ] = n44;

		return this;

	}

	identity() {

		this.set(

			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		);

		return this;

	}

	clone() {

		return new Matrix4().fromArray( this.elements );

	}

	copy( m ) {

		const te = this.elements;
		const me = m.elements;

		te[ 0 ] = me[ 0 ]; te[ 1 ] = me[ 1 ]; te[ 2 ] = me[ 2 ]; te[ 3 ] = me[ 3 ];
		te[ 4 ] = me[ 4 ]; te[ 5 ] = me[ 5 ]; te[ 6 ] = me[ 6 ]; te[ 7 ] = me[ 7 ];
		te[ 8 ] = me[ 8 ]; te[ 9 ] = me[ 9 ]; te[ 10 ] = me[ 10 ]; te[ 11 ] = me[ 11 ];
		te[ 12 ] = me[ 12 ]; te[ 13 ] = me[ 13 ]; te[ 14 ] = me[ 14 ]; te[ 15 ] = me[ 15 ];

		return this;

	}

	copyPosition( m ) {

		const te = this.elements, me = m.elements;

		te[ 12 ] = me[ 12 ];
		te[ 13 ] = me[ 13 ];
		te[ 14 ] = me[ 14 ];

		return this;

	}

	extractBasis( xAxis, yAxis, zAxis ) {

		xAxis.setFromMatrixColumn( this, 0 );
		yAxis.setFromMatrixColumn( this, 1 );
		zAxis.setFromMatrixColumn( this, 2 );

		return this;

	}

	makeBasis( xAxis, yAxis, zAxis ) {

		this.set(
			xAxis.x, yAxis.x, zAxis.x, 0,
			xAxis.y, yAxis.y, zAxis.y, 0,
			xAxis.z, yAxis.z, zAxis.z, 0,
			0, 0, 0, 1
		);

		return this;

	}

	extractRotation( m ) {

		// this method does not support reflection matrices

		const te = this.elements;
		const me = m.elements;

		const scaleX = 1 / _v1$1.setFromMatrixColumn( m, 0 ).length();
		const scaleY = 1 / _v1$1.setFromMatrixColumn( m, 1 ).length();
		const scaleZ = 1 / _v1$1.setFromMatrixColumn( m, 2 ).length();

		te[ 0 ] = me[ 0 ] * scaleX;
		te[ 1 ] = me[ 1 ] * scaleX;
		te[ 2 ] = me[ 2 ] * scaleX;
		te[ 3 ] = 0;

		te[ 4 ] = me[ 4 ] * scaleY;
		te[ 5 ] = me[ 5 ] * scaleY;
		te[ 6 ] = me[ 6 ] * scaleY;
		te[ 7 ] = 0;

		te[ 8 ] = me[ 8 ] * scaleZ;
		te[ 9 ] = me[ 9 ] * scaleZ;
		te[ 10 ] = me[ 10 ] * scaleZ;
		te[ 11 ] = 0;

		te[ 12 ] = 0;
		te[ 13 ] = 0;
		te[ 14 ] = 0;
		te[ 15 ] = 1;

		return this;

	}

	makeRotationFromEuler( euler ) {

		if ( ! ( euler && euler.isEuler ) ) {

			console.error( 'THREE.Matrix4: .makeRotationFromEuler() now expects a Euler rotation rather than a Vector3 and order.' );

		}

		const te = this.elements;

		const x = euler.x, y = euler.y, z = euler.z;
		const a = Math.cos( x ), b = Math.sin( x );
		const c = Math.cos( y ), d = Math.sin( y );
		const e = Math.cos( z ), f = Math.sin( z );

		if ( euler.order === 'XYZ' ) {

			const ae = a * e, af = a * f, be = b * e, bf = b * f;

			te[ 0 ] = c * e;
			te[ 4 ] = - c * f;
			te[ 8 ] = d;

			te[ 1 ] = af + be * d;
			te[ 5 ] = ae - bf * d;
			te[ 9 ] = - b * c;

			te[ 2 ] = bf - ae * d;
			te[ 6 ] = be + af * d;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'YXZ' ) {

			const ce = c * e, cf = c * f, de = d * e, df = d * f;

			te[ 0 ] = ce + df * b;
			te[ 4 ] = de * b - cf;
			te[ 8 ] = a * d;

			te[ 1 ] = a * f;
			te[ 5 ] = a * e;
			te[ 9 ] = - b;

			te[ 2 ] = cf * b - de;
			te[ 6 ] = df + ce * b;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'ZXY' ) {

			const ce = c * e, cf = c * f, de = d * e, df = d * f;

			te[ 0 ] = ce - df * b;
			te[ 4 ] = - a * f;
			te[ 8 ] = de + cf * b;

			te[ 1 ] = cf + de * b;
			te[ 5 ] = a * e;
			te[ 9 ] = df - ce * b;

			te[ 2 ] = - a * d;
			te[ 6 ] = b;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'ZYX' ) {

			const ae = a * e, af = a * f, be = b * e, bf = b * f;

			te[ 0 ] = c * e;
			te[ 4 ] = be * d - af;
			te[ 8 ] = ae * d + bf;

			te[ 1 ] = c * f;
			te[ 5 ] = bf * d + ae;
			te[ 9 ] = af * d - be;

			te[ 2 ] = - d;
			te[ 6 ] = b * c;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'YZX' ) {

			const ac = a * c, ad = a * d, bc = b * c, bd = b * d;

			te[ 0 ] = c * e;
			te[ 4 ] = bd - ac * f;
			te[ 8 ] = bc * f + ad;

			te[ 1 ] = f;
			te[ 5 ] = a * e;
			te[ 9 ] = - b * e;

			te[ 2 ] = - d * e;
			te[ 6 ] = ad * f + bc;
			te[ 10 ] = ac - bd * f;

		} else if ( euler.order === 'XZY' ) {

			const ac = a * c, ad = a * d, bc = b * c, bd = b * d;

			te[ 0 ] = c * e;
			te[ 4 ] = - f;
			te[ 8 ] = d * e;

			te[ 1 ] = ac * f + bd;
			te[ 5 ] = a * e;
			te[ 9 ] = ad * f - bc;

			te[ 2 ] = bc * f - ad;
			te[ 6 ] = b * e;
			te[ 10 ] = bd * f + ac;

		}

		// bottom row
		te[ 3 ] = 0;
		te[ 7 ] = 0;
		te[ 11 ] = 0;

		// last column
		te[ 12 ] = 0;
		te[ 13 ] = 0;
		te[ 14 ] = 0;
		te[ 15 ] = 1;

		return this;

	}

	makeRotationFromQuaternion( q ) {

		return this.compose( _zero, q, _one );

	}

	lookAt( eye, target, up ) {

		const te = this.elements;

		_z.subVectors( eye, target );

		if ( _z.lengthSq() === 0 ) {

			// eye and target are in the same position

			_z.z = 1;

		}

		_z.normalize();
		_x.crossVectors( up, _z );

		if ( _x.lengthSq() === 0 ) {

			// up and z are parallel

			if ( Math.abs( up.z ) === 1 ) {

				_z.x += 0.0001;

			} else {

				_z.z += 0.0001;

			}

			_z.normalize();
			_x.crossVectors( up, _z );

		}

		_x.normalize();
		_y.crossVectors( _z, _x );

		te[ 0 ] = _x.x; te[ 4 ] = _y.x; te[ 8 ] = _z.x;
		te[ 1 ] = _x.y; te[ 5 ] = _y.y; te[ 9 ] = _z.y;
		te[ 2 ] = _x.z; te[ 6 ] = _y.z; te[ 10 ] = _z.z;

		return this;

	}

	multiply( m, n ) {

		if ( n !== undefined ) {

			console.warn( 'THREE.Matrix4: .multiply() now only accepts one argument. Use .multiplyMatrices( a, b ) instead.' );
			return this.multiplyMatrices( m, n );

		}

		return this.multiplyMatrices( this, m );

	}

	premultiply( m ) {

		return this.multiplyMatrices( m, this );

	}

	multiplyMatrices( a, b ) {

		const ae = a.elements;
		const be = b.elements;
		const te = this.elements;

		const a11 = ae[ 0 ], a12 = ae[ 4 ], a13 = ae[ 8 ], a14 = ae[ 12 ];
		const a21 = ae[ 1 ], a22 = ae[ 5 ], a23 = ae[ 9 ], a24 = ae[ 13 ];
		const a31 = ae[ 2 ], a32 = ae[ 6 ], a33 = ae[ 10 ], a34 = ae[ 14 ];
		const a41 = ae[ 3 ], a42 = ae[ 7 ], a43 = ae[ 11 ], a44 = ae[ 15 ];

		const b11 = be[ 0 ], b12 = be[ 4 ], b13 = be[ 8 ], b14 = be[ 12 ];
		const b21 = be[ 1 ], b22 = be[ 5 ], b23 = be[ 9 ], b24 = be[ 13 ];
		const b31 = be[ 2 ], b32 = be[ 6 ], b33 = be[ 10 ], b34 = be[ 14 ];
		const b41 = be[ 3 ], b42 = be[ 7 ], b43 = be[ 11 ], b44 = be[ 15 ];

		te[ 0 ] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
		te[ 4 ] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
		te[ 8 ] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
		te[ 12 ] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

		te[ 1 ] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
		te[ 5 ] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
		te[ 9 ] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
		te[ 13 ] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

		te[ 2 ] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
		te[ 6 ] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
		te[ 10 ] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
		te[ 14 ] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

		te[ 3 ] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
		te[ 7 ] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
		te[ 11 ] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
		te[ 15 ] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

		return this;

	}

	multiplyScalar( s ) {

		const te = this.elements;

		te[ 0 ] *= s; te[ 4 ] *= s; te[ 8 ] *= s; te[ 12 ] *= s;
		te[ 1 ] *= s; te[ 5 ] *= s; te[ 9 ] *= s; te[ 13 ] *= s;
		te[ 2 ] *= s; te[ 6 ] *= s; te[ 10 ] *= s; te[ 14 ] *= s;
		te[ 3 ] *= s; te[ 7 ] *= s; te[ 11 ] *= s; te[ 15 ] *= s;

		return this;

	}

	determinant() {

		const te = this.elements;

		const n11 = te[ 0 ], n12 = te[ 4 ], n13 = te[ 8 ], n14 = te[ 12 ];
		const n21 = te[ 1 ], n22 = te[ 5 ], n23 = te[ 9 ], n24 = te[ 13 ];
		const n31 = te[ 2 ], n32 = te[ 6 ], n33 = te[ 10 ], n34 = te[ 14 ];
		const n41 = te[ 3 ], n42 = te[ 7 ], n43 = te[ 11 ], n44 = te[ 15 ];

		//TODO: make this more efficient
		//( based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm )

		return (
			n41 * (
				+ n14 * n23 * n32
				 - n13 * n24 * n32
				 - n14 * n22 * n33
				 + n12 * n24 * n33
				 + n13 * n22 * n34
				 - n12 * n23 * n34
			) +
			n42 * (
				+ n11 * n23 * n34
				 - n11 * n24 * n33
				 + n14 * n21 * n33
				 - n13 * n21 * n34
				 + n13 * n24 * n31
				 - n14 * n23 * n31
			) +
			n43 * (
				+ n11 * n24 * n32
				 - n11 * n22 * n34
				 - n14 * n21 * n32
				 + n12 * n21 * n34
				 + n14 * n22 * n31
				 - n12 * n24 * n31
			) +
			n44 * (
				- n13 * n22 * n31
				 - n11 * n23 * n32
				 + n11 * n22 * n33
				 + n13 * n21 * n32
				 - n12 * n21 * n33
				 + n12 * n23 * n31
			)

		);

	}

	transpose() {

		const te = this.elements;
		let tmp;

		tmp = te[ 1 ]; te[ 1 ] = te[ 4 ]; te[ 4 ] = tmp;
		tmp = te[ 2 ]; te[ 2 ] = te[ 8 ]; te[ 8 ] = tmp;
		tmp = te[ 6 ]; te[ 6 ] = te[ 9 ]; te[ 9 ] = tmp;

		tmp = te[ 3 ]; te[ 3 ] = te[ 12 ]; te[ 12 ] = tmp;
		tmp = te[ 7 ]; te[ 7 ] = te[ 13 ]; te[ 13 ] = tmp;
		tmp = te[ 11 ]; te[ 11 ] = te[ 14 ]; te[ 14 ] = tmp;

		return this;

	}

	setPosition( x, y, z ) {

		const te = this.elements;

		if ( x.isVector3 ) {

			te[ 12 ] = x.x;
			te[ 13 ] = x.y;
			te[ 14 ] = x.z;

		} else {

			te[ 12 ] = x;
			te[ 13 ] = y;
			te[ 14 ] = z;

		}

		return this;

	}

	getInverse( m, throwOnDegenerate ) {

		if ( throwOnDegenerate !== undefined ) {

			console.warn( "THREE.Matrix4: .getInverse() can no longer be configured to throw on degenerate." );

		}

		// based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
		const te = this.elements,
			me = m.elements,

			n11 = me[ 0 ], n21 = me[ 1 ], n31 = me[ 2 ], n41 = me[ 3 ],
			n12 = me[ 4 ], n22 = me[ 5 ], n32 = me[ 6 ], n42 = me[ 7 ],
			n13 = me[ 8 ], n23 = me[ 9 ], n33 = me[ 10 ], n43 = me[ 11 ],
			n14 = me[ 12 ], n24 = me[ 13 ], n34 = me[ 14 ], n44 = me[ 15 ],

			t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44,
			t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44,
			t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44,
			t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

		const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

		if ( det === 0 ) return this.set( 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 );

		const detInv = 1 / det;

		te[ 0 ] = t11 * detInv;
		te[ 1 ] = ( n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44 ) * detInv;
		te[ 2 ] = ( n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44 ) * detInv;
		te[ 3 ] = ( n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43 ) * detInv;

		te[ 4 ] = t12 * detInv;
		te[ 5 ] = ( n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44 ) * detInv;
		te[ 6 ] = ( n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44 ) * detInv;
		te[ 7 ] = ( n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43 ) * detInv;

		te[ 8 ] = t13 * detInv;
		te[ 9 ] = ( n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44 ) * detInv;
		te[ 10 ] = ( n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44 ) * detInv;
		te[ 11 ] = ( n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43 ) * detInv;

		te[ 12 ] = t14 * detInv;
		te[ 13 ] = ( n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34 ) * detInv;
		te[ 14 ] = ( n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34 ) * detInv;
		te[ 15 ] = ( n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33 ) * detInv;

		return this;

	}

	scale( v ) {

		const te = this.elements;
		const x = v.x, y = v.y, z = v.z;

		te[ 0 ] *= x; te[ 4 ] *= y; te[ 8 ] *= z;
		te[ 1 ] *= x; te[ 5 ] *= y; te[ 9 ] *= z;
		te[ 2 ] *= x; te[ 6 ] *= y; te[ 10 ] *= z;
		te[ 3 ] *= x; te[ 7 ] *= y; te[ 11 ] *= z;

		return this;

	}

	getMaxScaleOnAxis() {

		const te = this.elements;

		const scaleXSq = te[ 0 ] * te[ 0 ] + te[ 1 ] * te[ 1 ] + te[ 2 ] * te[ 2 ];
		const scaleYSq = te[ 4 ] * te[ 4 ] + te[ 5 ] * te[ 5 ] + te[ 6 ] * te[ 6 ];
		const scaleZSq = te[ 8 ] * te[ 8 ] + te[ 9 ] * te[ 9 ] + te[ 10 ] * te[ 10 ];

		return Math.sqrt( Math.max( scaleXSq, scaleYSq, scaleZSq ) );

	}

	makeTranslation( x, y, z ) {

		this.set(

			1, 0, 0, x,
			0, 1, 0, y,
			0, 0, 1, z,
			0, 0, 0, 1

		);

		return this;

	}

	makeRotationX( theta ) {

		const c = Math.cos( theta ), s = Math.sin( theta );

		this.set(

			1, 0, 0, 0,
			0, c, - s, 0,
			0, s, c, 0,
			0, 0, 0, 1

		);

		return this;

	}

	makeRotationY( theta ) {

		const c = Math.cos( theta ), s = Math.sin( theta );

		this.set(

			 c, 0, s, 0,
			 0, 1, 0, 0,
			- s, 0, c, 0,
			 0, 0, 0, 1

		);

		return this;

	}

	makeRotationZ( theta ) {

		const c = Math.cos( theta ), s = Math.sin( theta );

		this.set(

			c, - s, 0, 0,
			s, c, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		);

		return this;

	}

	makeRotationAxis( axis, angle ) {

		// Based on http://www.gamedev.net/reference/articles/article1199.asp

		const c = Math.cos( angle );
		const s = Math.sin( angle );
		const t = 1 - c;
		const x = axis.x, y = axis.y, z = axis.z;
		const tx = t * x, ty = t * y;

		this.set(

			tx * x + c, tx * y - s * z, tx * z + s * y, 0,
			tx * y + s * z, ty * y + c, ty * z - s * x, 0,
			tx * z - s * y, ty * z + s * x, t * z * z + c, 0,
			0, 0, 0, 1

		);

		return this;

	}

	makeScale( x, y, z ) {

		this.set(

			x, 0, 0, 0,
			0, y, 0, 0,
			0, 0, z, 0,
			0, 0, 0, 1

		);

		return this;

	}

	makeShear( x, y, z ) {

		this.set(

			1, y, z, 0,
			x, 1, z, 0,
			x, y, 1, 0,
			0, 0, 0, 1

		);

		return this;

	}

	compose( position, quaternion, scale ) {

		const te = this.elements;

		const x = quaternion._x, y = quaternion._y, z = quaternion._z, w = quaternion._w;
		const x2 = x + x,	y2 = y + y, z2 = z + z;
		const xx = x * x2, xy = x * y2, xz = x * z2;
		const yy = y * y2, yz = y * z2, zz = z * z2;
		const wx = w * x2, wy = w * y2, wz = w * z2;

		const sx = scale.x, sy = scale.y, sz = scale.z;

		te[ 0 ] = ( 1 - ( yy + zz ) ) * sx;
		te[ 1 ] = ( xy + wz ) * sx;
		te[ 2 ] = ( xz - wy ) * sx;
		te[ 3 ] = 0;

		te[ 4 ] = ( xy - wz ) * sy;
		te[ 5 ] = ( 1 - ( xx + zz ) ) * sy;
		te[ 6 ] = ( yz + wx ) * sy;
		te[ 7 ] = 0;

		te[ 8 ] = ( xz + wy ) * sz;
		te[ 9 ] = ( yz - wx ) * sz;
		te[ 10 ] = ( 1 - ( xx + yy ) ) * sz;
		te[ 11 ] = 0;

		te[ 12 ] = position.x;
		te[ 13 ] = position.y;
		te[ 14 ] = position.z;
		te[ 15 ] = 1;

		return this;

	}

	decompose( position, quaternion, scale ) {

		const te = this.elements;

		let sx = _v1$1.set( te[ 0 ], te[ 1 ], te[ 2 ] ).length();
		const sy = _v1$1.set( te[ 4 ], te[ 5 ], te[ 6 ] ).length();
		const sz = _v1$1.set( te[ 8 ], te[ 9 ], te[ 10 ] ).length();

		// if determine is negative, we need to invert one scale
		const det = this.determinant();
		if ( det < 0 ) sx = - sx;

		position.x = te[ 12 ];
		position.y = te[ 13 ];
		position.z = te[ 14 ];

		// scale the rotation part
		_m1$1.copy( this );

		const invSX = 1 / sx;
		const invSY = 1 / sy;
		const invSZ = 1 / sz;

		_m1$1.elements[ 0 ] *= invSX;
		_m1$1.elements[ 1 ] *= invSX;
		_m1$1.elements[ 2 ] *= invSX;

		_m1$1.elements[ 4 ] *= invSY;
		_m1$1.elements[ 5 ] *= invSY;
		_m1$1.elements[ 6 ] *= invSY;

		_m1$1.elements[ 8 ] *= invSZ;
		_m1$1.elements[ 9 ] *= invSZ;
		_m1$1.elements[ 10 ] *= invSZ;

		quaternion.setFromRotationMatrix( _m1$1 );

		scale.x = sx;
		scale.y = sy;
		scale.z = sz;

		return this;

	}

	makePerspective( left, right, top, bottom, near, far ) {

		if ( far === undefined ) {

			console.warn( 'THREE.Matrix4: .makePerspective() has been redefined and has a new signature. Please check the docs.' );

		}

		const te = this.elements;
		const x = 2 * near / ( right - left );
		const y = 2 * near / ( top - bottom );

		const a = ( right + left ) / ( right - left );
		const b = ( top + bottom ) / ( top - bottom );
		const c = - ( far + near ) / ( far - near );
		const d = - 2 * far * near / ( far - near );

		te[ 0 ] = x;	te[ 4 ] = 0;	te[ 8 ] = a;	te[ 12 ] = 0;
		te[ 1 ] = 0;	te[ 5 ] = y;	te[ 9 ] = b;	te[ 13 ] = 0;
		te[ 2 ] = 0;	te[ 6 ] = 0;	te[ 10 ] = c;	te[ 14 ] = d;
		te[ 3 ] = 0;	te[ 7 ] = 0;	te[ 11 ] = - 1;	te[ 15 ] = 0;

		return this;

	}

	makeOrthographic( left, right, top, bottom, near, far ) {

		const te = this.elements;
		const w = 1.0 / ( right - left );
		const h = 1.0 / ( top - bottom );
		const p = 1.0 / ( far - near );

		const x = ( right + left ) * w;
		const y = ( top + bottom ) * h;
		const z = ( far + near ) * p;

		te[ 0 ] = 2 * w;	te[ 4 ] = 0;	te[ 8 ] = 0;	te[ 12 ] = - x;
		te[ 1 ] = 0;	te[ 5 ] = 2 * h;	te[ 9 ] = 0;	te[ 13 ] = - y;
		te[ 2 ] = 0;	te[ 6 ] = 0;	te[ 10 ] = - 2 * p;	te[ 14 ] = - z;
		te[ 3 ] = 0;	te[ 7 ] = 0;	te[ 11 ] = 0;	te[ 15 ] = 1;

		return this;

	}

	equals( matrix ) {

		const te = this.elements;
		const me = matrix.elements;

		for ( let i = 0; i < 16; i ++ ) {

			if ( te[ i ] !== me[ i ] ) return false;

		}

		return true;

	}

	fromArray( array, offset ) {

		if ( offset === undefined ) offset = 0;

		for ( let i = 0; i < 16; i ++ ) {

			this.elements[ i ] = array[ i + offset ];

		}

		return this;

	}

	toArray( array, offset ) {

		if ( array === undefined ) array = [];
		if ( offset === undefined ) offset = 0;

		const te = this.elements;

		array[ offset ] = te[ 0 ];
		array[ offset + 1 ] = te[ 1 ];
		array[ offset + 2 ] = te[ 2 ];
		array[ offset + 3 ] = te[ 3 ];

		array[ offset + 4 ] = te[ 4 ];
		array[ offset + 5 ] = te[ 5 ];
		array[ offset + 6 ] = te[ 6 ];
		array[ offset + 7 ] = te[ 7 ];

		array[ offset + 8 ] = te[ 8 ];
		array[ offset + 9 ] = te[ 9 ];
		array[ offset + 10 ] = te[ 10 ];
		array[ offset + 11 ] = te[ 11 ];

		array[ offset + 12 ] = te[ 12 ];
		array[ offset + 13 ] = te[ 13 ];
		array[ offset + 14 ] = te[ 14 ];
		array[ offset + 15 ] = te[ 15 ];

		return array;

	}

}

const _v1$1 = new Vector3();
const _m1$1 = new Matrix4();
const _zero = new Vector3( 0, 0, 0 );
const _one = new Vector3( 1, 1, 1 );
const _x = new Vector3();
const _y = new Vector3();
const _z = new Vector3();

/**
 * https://github.com/mrdoob/eventdispatcher.js/
 */

function EventDispatcher() {}

Object.assign( EventDispatcher.prototype, {

	addEventListener: function ( type, listener ) {

		if ( this._listeners === undefined ) this._listeners = {};

		const listeners = this._listeners;

		if ( listeners[ type ] === undefined ) {

			listeners[ type ] = [];

		}

		if ( listeners[ type ].indexOf( listener ) === - 1 ) {

			listeners[ type ].push( listener );

		}

	},

	hasEventListener: function ( type, listener ) {

		if ( this._listeners === undefined ) return false;

		const listeners = this._listeners;

		return listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1;

	},

	removeEventListener: function ( type, listener ) {

		if ( this._listeners === undefined ) return;

		const listeners = this._listeners;
		const listenerArray = listeners[ type ];

		if ( listenerArray !== undefined ) {

			const index = listenerArray.indexOf( listener );

			if ( index !== - 1 ) {

				listenerArray.splice( index, 1 );

			}

		}

	},

	dispatchEvent: function ( event ) {

		if ( this._listeners === undefined ) return;

		const listeners = this._listeners;
		const listenerArray = listeners[ event.type ];

		if ( listenerArray !== undefined ) {

			event.target = this;

			// Make a copy, in case listeners are removed while iterating.
			const array = listenerArray.slice( 0 );

			for ( let i = 0, l = array.length; i < l; i ++ ) {

				array[ i ].call( this, event );

			}

		}

	}

} );

class Euler {

	constructor( x = 0, y = 0, z = 0, order = Euler.DefaultOrder ) {

		Object.defineProperty( this, 'isEuler', { value: true } );

		this._x = x;
		this._y = y;
		this._z = z;
		this._order = order;

	}

	get x() {

		return this._x;

	}

	set x( value ) {

		this._x = value;
		this._onChangeCallback();

	}

	get y() {

		return this._y;

	}

	set y( value ) {

		this._y = value;
		this._onChangeCallback();

	}

	get z() {

		return this._z;

	}

	set z( value ) {

		this._z = value;
		this._onChangeCallback();

	}

	get order() {

		return this._order;

	}

	set order( value ) {

		this._order = value;
		this._onChangeCallback();

	}

	set( x, y, z, order ) {

		this._x = x;
		this._y = y;
		this._z = z;
		this._order = order || this._order;

		this._onChangeCallback();

		return this;

	}

	clone() {

		return new this.constructor( this._x, this._y, this._z, this._order );

	}

	copy( euler ) {

		this._x = euler._x;
		this._y = euler._y;
		this._z = euler._z;
		this._order = euler._order;

		this._onChangeCallback();

		return this;

	}

	setFromRotationMatrix( m, order, update ) {

		const clamp = MathUtils.clamp;

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		const te = m.elements;
		const m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ];
		const m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ];
		const m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ];

		order = order || this._order;

		switch ( order ) {

			case 'XYZ':

				this._y = Math.asin( clamp( m13, - 1, 1 ) );

				if ( Math.abs( m13 ) < 0.9999999 ) {

					this._x = Math.atan2( - m23, m33 );
					this._z = Math.atan2( - m12, m11 );

				} else {

					this._x = Math.atan2( m32, m22 );
					this._z = 0;

				}

				break;

			case 'YXZ':

				this._x = Math.asin( - clamp( m23, - 1, 1 ) );

				if ( Math.abs( m23 ) < 0.9999999 ) {

					this._y = Math.atan2( m13, m33 );
					this._z = Math.atan2( m21, m22 );

				} else {

					this._y = Math.atan2( - m31, m11 );
					this._z = 0;

				}

				break;

			case 'ZXY':

				this._x = Math.asin( clamp( m32, - 1, 1 ) );

				if ( Math.abs( m32 ) < 0.9999999 ) {

					this._y = Math.atan2( - m31, m33 );
					this._z = Math.atan2( - m12, m22 );

				} else {

					this._y = 0;
					this._z = Math.atan2( m21, m11 );

				}

				break;

			case 'ZYX':

				this._y = Math.asin( - clamp( m31, - 1, 1 ) );

				if ( Math.abs( m31 ) < 0.9999999 ) {

					this._x = Math.atan2( m32, m33 );
					this._z = Math.atan2( m21, m11 );

				} else {

					this._x = 0;
					this._z = Math.atan2( - m12, m22 );

				}

				break;

			case 'YZX':

				this._z = Math.asin( clamp( m21, - 1, 1 ) );

				if ( Math.abs( m21 ) < 0.9999999 ) {

					this._x = Math.atan2( - m23, m22 );
					this._y = Math.atan2( - m31, m11 );

				} else {

					this._x = 0;
					this._y = Math.atan2( m13, m33 );

				}

				break;

			case 'XZY':

				this._z = Math.asin( - clamp( m12, - 1, 1 ) );

				if ( Math.abs( m12 ) < 0.9999999 ) {

					this._x = Math.atan2( m32, m22 );
					this._y = Math.atan2( m13, m11 );

				} else {

					this._x = Math.atan2( - m23, m33 );
					this._y = 0;

				}

				break;

			default:

				console.warn( 'THREE.Euler: .setFromRotationMatrix() encountered an unknown order: ' + order );

		}

		this._order = order;

		if ( update !== false ) this._onChangeCallback();

		return this;

	}

	setFromQuaternion( q, order, update ) {

		_matrix.makeRotationFromQuaternion( q );

		return this.setFromRotationMatrix( _matrix, order, update );

	}

	setFromVector3( v, order ) {

		return this.set( v.x, v.y, v.z, order || this._order );

	}

	reorder( newOrder ) {

		// WARNING: this discards revolution information -bhouston

		_quaternion$1.setFromEuler( this );

		return this.setFromQuaternion( _quaternion$1, newOrder );

	}

	equals( euler ) {

		return ( euler._x === this._x ) && ( euler._y === this._y ) && ( euler._z === this._z ) && ( euler._order === this._order );

	}

	fromArray( array ) {

		this._x = array[ 0 ];
		this._y = array[ 1 ];
		this._z = array[ 2 ];
		if ( array[ 3 ] !== undefined ) this._order = array[ 3 ];

		this._onChangeCallback();

		return this;

	}

	toArray( array, offset ) {

		if ( array === undefined ) array = [];
		if ( offset === undefined ) offset = 0;

		array[ offset ] = this._x;
		array[ offset + 1 ] = this._y;
		array[ offset + 2 ] = this._z;
		array[ offset + 3 ] = this._order;

		return array;

	}

	toVector3( optionalResult ) {

		if ( optionalResult ) {

			return optionalResult.set( this._x, this._y, this._z );

		} else {

			return new Vector3( this._x, this._y, this._z );

		}

	}

	_onChange( callback ) {

		this._onChangeCallback = callback;

		return this;

	}

	_onChangeCallback() {}

}

Euler.DefaultOrder = 'XYZ';
Euler.RotationOrders = [ 'XYZ', 'YZX', 'ZXY', 'XZY', 'YXZ', 'ZYX' ];

const _matrix = new Matrix4();
const _quaternion$1 = new Quaternion();

class Layers {

	constructor() {

		this.mask = 1 | 0;

	}

	set( channel ) {

		this.mask = 1 << channel | 0;

	}

	enable( channel ) {

		this.mask |= 1 << channel | 0;

	}

	enableAll() {

		this.mask = 0xffffffff | 0;

	}

	toggle( channel ) {

		this.mask ^= 1 << channel | 0;

	}

	disable( channel ) {

		this.mask &= ~ ( 1 << channel | 0 );

	}

	disableAll() {

		this.mask = 0;

	}

	test( layers ) {

		return ( this.mask & layers.mask ) !== 0;

	}

}

class Matrix3 {

	constructor() {

		Object.defineProperty( this, 'isMatrix3', { value: true } );

		this.elements = [

			1, 0, 0,
			0, 1, 0,
			0, 0, 1

		];

		if ( arguments.length > 0 ) {

			console.error( 'THREE.Matrix3: the constructor no longer reads arguments. use .set() instead.' );

		}

	}

	set( n11, n12, n13, n21, n22, n23, n31, n32, n33 ) {

		const te = this.elements;

		te[ 0 ] = n11; te[ 1 ] = n21; te[ 2 ] = n31;
		te[ 3 ] = n12; te[ 4 ] = n22; te[ 5 ] = n32;
		te[ 6 ] = n13; te[ 7 ] = n23; te[ 8 ] = n33;

		return this;

	}

	identity() {

		this.set(

			1, 0, 0,
			0, 1, 0,
			0, 0, 1

		);

		return this;

	}

	clone() {

		return new this.constructor().fromArray( this.elements );

	}

	copy( m ) {

		const te = this.elements;
		const me = m.elements;

		te[ 0 ] = me[ 0 ]; te[ 1 ] = me[ 1 ]; te[ 2 ] = me[ 2 ];
		te[ 3 ] = me[ 3 ]; te[ 4 ] = me[ 4 ]; te[ 5 ] = me[ 5 ];
		te[ 6 ] = me[ 6 ]; te[ 7 ] = me[ 7 ]; te[ 8 ] = me[ 8 ];

		return this;

	}

	extractBasis( xAxis, yAxis, zAxis ) {

		xAxis.setFromMatrix3Column( this, 0 );
		yAxis.setFromMatrix3Column( this, 1 );
		zAxis.setFromMatrix3Column( this, 2 );

		return this;

	}

	setFromMatrix4( m ) {

		const me = m.elements;

		this.set(

			me[ 0 ], me[ 4 ], me[ 8 ],
			me[ 1 ], me[ 5 ], me[ 9 ],
			me[ 2 ], me[ 6 ], me[ 10 ]

		);

		return this;

	}

	multiply( m ) {

		return this.multiplyMatrices( this, m );

	}

	premultiply( m ) {

		return this.multiplyMatrices( m, this );

	}

	multiplyMatrices( a, b ) {

		const ae = a.elements;
		const be = b.elements;
		const te = this.elements;

		const a11 = ae[ 0 ], a12 = ae[ 3 ], a13 = ae[ 6 ];
		const a21 = ae[ 1 ], a22 = ae[ 4 ], a23 = ae[ 7 ];
		const a31 = ae[ 2 ], a32 = ae[ 5 ], a33 = ae[ 8 ];

		const b11 = be[ 0 ], b12 = be[ 3 ], b13 = be[ 6 ];
		const b21 = be[ 1 ], b22 = be[ 4 ], b23 = be[ 7 ];
		const b31 = be[ 2 ], b32 = be[ 5 ], b33 = be[ 8 ];

		te[ 0 ] = a11 * b11 + a12 * b21 + a13 * b31;
		te[ 3 ] = a11 * b12 + a12 * b22 + a13 * b32;
		te[ 6 ] = a11 * b13 + a12 * b23 + a13 * b33;

		te[ 1 ] = a21 * b11 + a22 * b21 + a23 * b31;
		te[ 4 ] = a21 * b12 + a22 * b22 + a23 * b32;
		te[ 7 ] = a21 * b13 + a22 * b23 + a23 * b33;

		te[ 2 ] = a31 * b11 + a32 * b21 + a33 * b31;
		te[ 5 ] = a31 * b12 + a32 * b22 + a33 * b32;
		te[ 8 ] = a31 * b13 + a32 * b23 + a33 * b33;

		return this;

	}

	multiplyScalar( s ) {

		const te = this.elements;

		te[ 0 ] *= s; te[ 3 ] *= s; te[ 6 ] *= s;
		te[ 1 ] *= s; te[ 4 ] *= s; te[ 7 ] *= s;
		te[ 2 ] *= s; te[ 5 ] *= s; te[ 8 ] *= s;

		return this;

	}

	determinant() {

		const te = this.elements;

		const a = te[ 0 ], b = te[ 1 ], c = te[ 2 ],
			d = te[ 3 ], e = te[ 4 ], f = te[ 5 ],
			g = te[ 6 ], h = te[ 7 ], i = te[ 8 ];

		return a * e * i - a * f * h - b * d * i + b * f * g + c * d * h - c * e * g;

	}

	getInverse( matrix, throwOnDegenerate ) {

		if ( throwOnDegenerate !== undefined ) {

			console.warn( "THREE.Matrix3: .getInverse() can no longer be configured to throw on degenerate." );

		}

		const me = matrix.elements,
			te = this.elements,

			n11 = me[ 0 ], n21 = me[ 1 ], n31 = me[ 2 ],
			n12 = me[ 3 ], n22 = me[ 4 ], n32 = me[ 5 ],
			n13 = me[ 6 ], n23 = me[ 7 ], n33 = me[ 8 ],

			t11 = n33 * n22 - n32 * n23,
			t12 = n32 * n13 - n33 * n12,
			t13 = n23 * n12 - n22 * n13,

			det = n11 * t11 + n21 * t12 + n31 * t13;

		if ( det === 0 ) return this.set( 0, 0, 0, 0, 0, 0, 0, 0, 0 );

		const detInv = 1 / det;

		te[ 0 ] = t11 * detInv;
		te[ 1 ] = ( n31 * n23 - n33 * n21 ) * detInv;
		te[ 2 ] = ( n32 * n21 - n31 * n22 ) * detInv;

		te[ 3 ] = t12 * detInv;
		te[ 4 ] = ( n33 * n11 - n31 * n13 ) * detInv;
		te[ 5 ] = ( n31 * n12 - n32 * n11 ) * detInv;

		te[ 6 ] = t13 * detInv;
		te[ 7 ] = ( n21 * n13 - n23 * n11 ) * detInv;
		te[ 8 ] = ( n22 * n11 - n21 * n12 ) * detInv;

		return this;

	}

	transpose() {

		let tmp;
		const m = this.elements;

		tmp = m[ 1 ]; m[ 1 ] = m[ 3 ]; m[ 3 ] = tmp;
		tmp = m[ 2 ]; m[ 2 ] = m[ 6 ]; m[ 6 ] = tmp;
		tmp = m[ 5 ]; m[ 5 ] = m[ 7 ]; m[ 7 ] = tmp;

		return this;

	}

	getNormalMatrix( matrix4 ) {

		return this.setFromMatrix4( matrix4 ).getInverse( this ).transpose();

	}

	transposeIntoArray( r ) {

		const m = this.elements;

		r[ 0 ] = m[ 0 ];
		r[ 1 ] = m[ 3 ];
		r[ 2 ] = m[ 6 ];
		r[ 3 ] = m[ 1 ];
		r[ 4 ] = m[ 4 ];
		r[ 5 ] = m[ 7 ];
		r[ 6 ] = m[ 2 ];
		r[ 7 ] = m[ 5 ];
		r[ 8 ] = m[ 8 ];

		return this;

	}

	setUvTransform( tx, ty, sx, sy, rotation, cx, cy ) {

		const c = Math.cos( rotation );
		const s = Math.sin( rotation );

		this.set(
			sx * c, sx * s, - sx * ( c * cx + s * cy ) + cx + tx,
			- sy * s, sy * c, - sy * ( - s * cx + c * cy ) + cy + ty,
			0, 0, 1
		);

	}

	scale( sx, sy ) {

		const te = this.elements;

		te[ 0 ] *= sx; te[ 3 ] *= sx; te[ 6 ] *= sx;
		te[ 1 ] *= sy; te[ 4 ] *= sy; te[ 7 ] *= sy;

		return this;

	}

	rotate( theta ) {

		const c = Math.cos( theta );
		const s = Math.sin( theta );

		const te = this.elements;

		const a11 = te[ 0 ], a12 = te[ 3 ], a13 = te[ 6 ];
		const a21 = te[ 1 ], a22 = te[ 4 ], a23 = te[ 7 ];

		te[ 0 ] = c * a11 + s * a21;
		te[ 3 ] = c * a12 + s * a22;
		te[ 6 ] = c * a13 + s * a23;

		te[ 1 ] = - s * a11 + c * a21;
		te[ 4 ] = - s * a12 + c * a22;
		te[ 7 ] = - s * a13 + c * a23;

		return this;

	}

	translate( tx, ty ) {

		const te = this.elements;

		te[ 0 ] += tx * te[ 2 ]; te[ 3 ] += tx * te[ 5 ]; te[ 6 ] += tx * te[ 8 ];
		te[ 1 ] += ty * te[ 2 ]; te[ 4 ] += ty * te[ 5 ]; te[ 7 ] += ty * te[ 8 ];

		return this;

	}

	equals( matrix ) {

		const te = this.elements;
		const me = matrix.elements;

		for ( let i = 0; i < 9; i ++ ) {

			if ( te[ i ] !== me[ i ] ) return false;

		}

		return true;

	}

	fromArray( array, offset ) {

		if ( offset === undefined ) offset = 0;

		for ( let i = 0; i < 9; i ++ ) {

			this.elements[ i ] = array[ i + offset ];

		}

		return this;

	}

	toArray( array, offset ) {

		if ( array === undefined ) array = [];
		if ( offset === undefined ) offset = 0;

		const te = this.elements;

		array[ offset ] = te[ 0 ];
		array[ offset + 1 ] = te[ 1 ];
		array[ offset + 2 ] = te[ 2 ];

		array[ offset + 3 ] = te[ 3 ];
		array[ offset + 4 ] = te[ 4 ];
		array[ offset + 5 ] = te[ 5 ];

		array[ offset + 6 ] = te[ 6 ];
		array[ offset + 7 ] = te[ 7 ];
		array[ offset + 8 ] = te[ 8 ];

		return array;

	}

}

let _object3DId = 0;

const _v1 = new Vector3();
const _q1 = new Quaternion();
const _m1 = new Matrix4();
const _target = new Vector3();

const _position = new Vector3();
const _scale = new Vector3();
const _quaternion = new Quaternion();

const _xAxis = new Vector3( 1, 0, 0 );
const _yAxis = new Vector3( 0, 1, 0 );
const _zAxis = new Vector3( 0, 0, 1 );

const _addedEvent = { type: 'added' };
const _removedEvent = { type: 'removed' };

function Object3D() {

	Object.defineProperty( this, 'id', { value: _object3DId ++ } );

	this.uuid = MathUtils.generateUUID();

	this.name = '';
	this.type = 'Object3D';

	this.parent = null;
	this.children = [];

	this.up = Object3D.DefaultUp.clone();

	const position = new Vector3();
	const rotation = new Euler();
	const quaternion = new Quaternion();
	const scale = new Vector3( 1, 1, 1 );

	function onRotationChange() {

		quaternion.setFromEuler( rotation, false );

	}

	function onQuaternionChange() {

		rotation.setFromQuaternion( quaternion, undefined, false );

	}

	rotation._onChange( onRotationChange );
	quaternion._onChange( onQuaternionChange );

	Object.defineProperties( this, {
		position: {
			configurable: true,
			enumerable: true,
			value: position
		},
		rotation: {
			configurable: true,
			enumerable: true,
			value: rotation
		},
		quaternion: {
			configurable: true,
			enumerable: true,
			value: quaternion
		},
		scale: {
			configurable: true,
			enumerable: true,
			value: scale
		},
		modelViewMatrix: {
			value: new Matrix4()
		},
		normalMatrix: {
			value: new Matrix3()
		}
	} );

	this.matrix = new Matrix4();
	this.matrixWorld = new Matrix4();

	this.matrixAutoUpdate = Object3D.DefaultMatrixAutoUpdate;
	this.matrixWorldNeedsUpdate = false;

	this.layers = new Layers();
	this.visible = true;

	this.castShadow = false;
	this.receiveShadow = false;

	this.frustumCulled = true;
	this.renderOrder = 0;

	this.userData = {};

}

Object3D.DefaultUp = new Vector3( 0, 1, 0 );
Object3D.DefaultMatrixAutoUpdate = true;

Object3D.prototype = Object.assign( Object.create( EventDispatcher.prototype ), {

	constructor: Object3D,

	isObject3D: true,

	onBeforeRender: function () {},
	onAfterRender: function () {},

	applyMatrix4: function ( matrix ) {

		if ( this.matrixAutoUpdate ) this.updateMatrix();

		this.matrix.premultiply( matrix );

		this.matrix.decompose( this.position, this.quaternion, this.scale );

	},

	applyQuaternion: function ( q ) {

		this.quaternion.premultiply( q );

		return this;

	},

	setRotationFromAxisAngle: function ( axis, angle ) {

		// assumes axis is normalized

		this.quaternion.setFromAxisAngle( axis, angle );

	},

	setRotationFromEuler: function ( euler ) {

		this.quaternion.setFromEuler( euler, true );

	},

	setRotationFromMatrix: function ( m ) {

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		this.quaternion.setFromRotationMatrix( m );

	},

	setRotationFromQuaternion: function ( q ) {

		// assumes q is normalized

		this.quaternion.copy( q );

	},

	rotateOnAxis: function ( axis, angle ) {

		// rotate object on axis in object space
		// axis is assumed to be normalized

		_q1.setFromAxisAngle( axis, angle );

		this.quaternion.multiply( _q1 );

		return this;

	},

	rotateOnWorldAxis: function ( axis, angle ) {

		// rotate object on axis in world space
		// axis is assumed to be normalized
		// method assumes no rotated parent

		_q1.setFromAxisAngle( axis, angle );

		this.quaternion.premultiply( _q1 );

		return this;

	},

	rotateX: function ( angle ) {

		return this.rotateOnAxis( _xAxis, angle );

	},

	rotateY: function ( angle ) {

		return this.rotateOnAxis( _yAxis, angle );

	},

	rotateZ: function ( angle ) {

		return this.rotateOnAxis( _zAxis, angle );

	},

	translateOnAxis: function ( axis, distance ) {

		// translate object by distance along axis in object space
		// axis is assumed to be normalized

		_v1.copy( axis ).applyQuaternion( this.quaternion );

		this.position.add( _v1.multiplyScalar( distance ) );

		return this;

	},

	translateX: function ( distance ) {

		return this.translateOnAxis( _xAxis, distance );

	},

	translateY: function ( distance ) {

		return this.translateOnAxis( _yAxis, distance );

	},

	translateZ: function ( distance ) {

		return this.translateOnAxis( _zAxis, distance );

	},

	localToWorld: function ( vector ) {

		return vector.applyMatrix4( this.matrixWorld );

	},

	worldToLocal: function ( vector ) {

		return vector.applyMatrix4( _m1.getInverse( this.matrixWorld ) );

	},

	lookAt: function ( x, y, z ) {

		// This method does not support objects having non-uniformly-scaled parent(s)

		if ( x.isVector3 ) {

			_target.copy( x );

		} else {

			_target.set( x, y, z );

		}

		const parent = this.parent;

		this.updateWorldMatrix( true, false );

		_position.setFromMatrixPosition( this.matrixWorld );

		if ( this.isCamera || this.isLight ) {

			_m1.lookAt( _position, _target, this.up );

		} else {

			_m1.lookAt( _target, _position, this.up );

		}

		this.quaternion.setFromRotationMatrix( _m1 );

		if ( parent ) {

			_m1.extractRotation( parent.matrixWorld );
			_q1.setFromRotationMatrix( _m1 );
			this.quaternion.premultiply( _q1.inverse() );

		}

	},

	add: function ( object ) {

		if ( arguments.length > 1 ) {

			for ( let i = 0; i < arguments.length; i ++ ) {

				this.add( arguments[ i ] );

			}

			return this;

		}

		if ( object === this ) {

			console.error( "THREE.Object3D.add: object can't be added as a child of itself.", object );
			return this;

		}

		if ( ( object && object.isObject3D ) ) {

			if ( object.parent !== null ) {

				object.parent.remove( object );

			}

			object.parent = this;
			this.children.push( object );

			object.dispatchEvent( _addedEvent );

		} else {

			console.error( "THREE.Object3D.add: object not an instance of THREE.Object3D.", object );

		}

		return this;

	},

	remove: function ( object ) {

		if ( arguments.length > 1 ) {

			for ( let i = 0; i < arguments.length; i ++ ) {

				this.remove( arguments[ i ] );

			}

			return this;

		}

		const index = this.children.indexOf( object );

		if ( index !== - 1 ) {

			object.parent = null;
			this.children.splice( index, 1 );

			object.dispatchEvent( _removedEvent );

		}

		return this;

	},

	attach: function ( object ) {

		// adds object as a child of this, while maintaining the object's world transform

		this.updateWorldMatrix( true, false );

		_m1.getInverse( this.matrixWorld );

		if ( object.parent !== null ) {

			object.parent.updateWorldMatrix( true, false );

			_m1.multiply( object.parent.matrixWorld );

		}

		object.applyMatrix4( _m1 );

		object.updateWorldMatrix( false, false );

		this.add( object );

		return this;

	},

	getObjectById: function ( id ) {

		return this.getObjectByProperty( 'id', id );

	},

	getObjectByName: function ( name ) {

		return this.getObjectByProperty( 'name', name );

	},

	getObjectByProperty: function ( name, value ) {

		if ( this[ name ] === value ) return this;

		for ( let i = 0, l = this.children.length; i < l; i ++ ) {

			const child = this.children[ i ];
			const object = child.getObjectByProperty( name, value );

			if ( object !== undefined ) {

				return object;

			}

		}

		return undefined;

	},

	getWorldPosition: function ( target ) {

		if ( target === undefined ) {

			console.warn( 'THREE.Object3D: .getWorldPosition() target is now required' );
			target = new Vector3();

		}

		this.updateMatrixWorld( true );

		return target.setFromMatrixPosition( this.matrixWorld );

	},

	getWorldQuaternion: function ( target ) {

		if ( target === undefined ) {

			console.warn( 'THREE.Object3D: .getWorldQuaternion() target is now required' );
			target = new Quaternion();

		}

		this.updateMatrixWorld( true );

		this.matrixWorld.decompose( _position, target, _scale );

		return target;

	},

	getWorldScale: function ( target ) {

		if ( target === undefined ) {

			console.warn( 'THREE.Object3D: .getWorldScale() target is now required' );
			target = new Vector3();

		}

		this.updateMatrixWorld( true );

		this.matrixWorld.decompose( _position, _quaternion, target );

		return target;

	},

	getWorldDirection: function ( target ) {

		if ( target === undefined ) {

			console.warn( 'THREE.Object3D: .getWorldDirection() target is now required' );
			target = new Vector3();

		}

		this.updateMatrixWorld( true );

		const e = this.matrixWorld.elements;

		return target.set( e[ 8 ], e[ 9 ], e[ 10 ] ).normalize();

	},

	raycast: function () {},

	traverse: function ( callback ) {

		callback( this );

		const children = this.children;

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			children[ i ].traverse( callback );

		}

	},

	traverseVisible: function ( callback ) {

		if ( this.visible === false ) return;

		callback( this );

		const children = this.children;

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			children[ i ].traverseVisible( callback );

		}

	},

	traverseAncestors: function ( callback ) {

		const parent = this.parent;

		if ( parent !== null ) {

			callback( parent );

			parent.traverseAncestors( callback );

		}

	},

	updateMatrix: function () {

		this.matrix.compose( this.position, this.quaternion, this.scale );

		this.matrixWorldNeedsUpdate = true;

	},

	updateMatrixWorld: function ( force ) {

		if ( this.matrixAutoUpdate ) this.updateMatrix();

		if ( this.matrixWorldNeedsUpdate || force ) {

			if ( this.parent === null ) {

				this.matrixWorld.copy( this.matrix );

			} else {

				this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

			}

			this.matrixWorldNeedsUpdate = false;

			force = true;

		}

		// update children

		const children = this.children;

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			children[ i ].updateMatrixWorld( force );

		}

	},

	updateWorldMatrix: function ( updateParents, updateChildren ) {

		const parent = this.parent;

		if ( updateParents === true && parent !== null ) {

			parent.updateWorldMatrix( true, false );

		}

		if ( this.matrixAutoUpdate ) this.updateMatrix();

		if ( this.parent === null ) {

			this.matrixWorld.copy( this.matrix );

		} else {

			this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

		}

		// update children

		if ( updateChildren === true ) {

			const children = this.children;

			for ( let i = 0, l = children.length; i < l; i ++ ) {

				children[ i ].updateWorldMatrix( false, true );

			}

		}

	},

	toJSON: function ( meta ) {

		// meta is a string when called from JSON.stringify
		const isRootObject = ( meta === undefined || typeof meta === 'string' );

		const output = {};

		// meta is a hash used to collect geometries, materials.
		// not providing it implies that this is the root object
		// being serialized.
		if ( isRootObject ) {

			// initialize meta obj
			meta = {
				geometries: {},
				materials: {},
				textures: {},
				images: {},
				shapes: {}
			};

			output.metadata = {
				version: 4.5,
				type: 'Object',
				generator: 'Object3D.toJSON'
			};

		}

		// standard Object3D serialization

		const object = {};

		object.uuid = this.uuid;
		object.type = this.type;

		if ( this.name !== '' ) object.name = this.name;
		if ( this.castShadow === true ) object.castShadow = true;
		if ( this.receiveShadow === true ) object.receiveShadow = true;
		if ( this.visible === false ) object.visible = false;
		if ( this.frustumCulled === false ) object.frustumCulled = false;
		if ( this.renderOrder !== 0 ) object.renderOrder = this.renderOrder;
		if ( JSON.stringify( this.userData ) !== '{}' ) object.userData = this.userData;

		object.layers = this.layers.mask;
		object.matrix = this.matrix.toArray();

		if ( this.matrixAutoUpdate === false ) object.matrixAutoUpdate = false;

		// object specific properties

		if ( this.isInstancedMesh ) {

			object.type = 'InstancedMesh';
			object.count = this.count;
			object.instanceMatrix = this.instanceMatrix.toJSON();

		}

		//

		function serialize( library, element ) {

			if ( library[ element.uuid ] === undefined ) {

				library[ element.uuid ] = element.toJSON( meta );

			}

			return element.uuid;

		}

		if ( this.isMesh || this.isLine || this.isPoints ) {

			object.geometry = serialize( meta.geometries, this.geometry );

			const parameters = this.geometry.parameters;

			if ( parameters !== undefined && parameters.shapes !== undefined ) {

				const shapes = parameters.shapes;

				if ( Array.isArray( shapes ) ) {

					for ( let i = 0, l = shapes.length; i < l; i ++ ) {

						const shape = shapes[ i ];

						serialize( meta.shapes, shape );

					}

				} else {

					serialize( meta.shapes, shapes );

				}

			}

		}

		if ( this.material !== undefined ) {

			if ( Array.isArray( this.material ) ) {

				const uuids = [];

				for ( let i = 0, l = this.material.length; i < l; i ++ ) {

					uuids.push( serialize( meta.materials, this.material[ i ] ) );

				}

				object.material = uuids;

			} else {

				object.material = serialize( meta.materials, this.material );

			}

		}

		//

		if ( this.children.length > 0 ) {

			object.children = [];

			for ( let i = 0; i < this.children.length; i ++ ) {

				object.children.push( this.children[ i ].toJSON( meta ).object );

			}

		}

		if ( isRootObject ) {

			const geometries = extractFromCache( meta.geometries );
			const materials = extractFromCache( meta.materials );
			const textures = extractFromCache( meta.textures );
			const images = extractFromCache( meta.images );
			const shapes = extractFromCache( meta.shapes );

			if ( geometries.length > 0 ) output.geometries = geometries;
			if ( materials.length > 0 ) output.materials = materials;
			if ( textures.length > 0 ) output.textures = textures;
			if ( images.length > 0 ) output.images = images;
			if ( shapes.length > 0 ) output.shapes = shapes;

		}

		output.object = object;

		return output;

		// extract data from the cache hash
		// remove metadata on each item
		// and return as array
		function extractFromCache( cache ) {

			const values = [];
			for ( const key in cache ) {

				const data = cache[ key ];
				delete data.metadata;
				values.push( data );

			}

			return values;

		}

	},

	clone: function ( recursive ) {

		return new this.constructor().copy( this, recursive );

	},

	copy: function ( source, recursive ) {

		if ( recursive === undefined ) recursive = true;

		this.name = source.name;

		this.up.copy( source.up );

		this.position.copy( source.position );
		this.rotation.order = source.rotation.order;
		this.quaternion.copy( source.quaternion );
		this.scale.copy( source.scale );

		this.matrix.copy( source.matrix );
		this.matrixWorld.copy( source.matrixWorld );

		this.matrixAutoUpdate = source.matrixAutoUpdate;
		this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate;

		this.layers.mask = source.layers.mask;
		this.visible = source.visible;

		this.castShadow = source.castShadow;
		this.receiveShadow = source.receiveShadow;

		this.frustumCulled = source.frustumCulled;
		this.renderOrder = source.renderOrder;

		this.userData = JSON.parse( JSON.stringify( source.userData ) );

		if ( recursive === true ) {

			for ( let i = 0; i < source.children.length; i ++ ) {

				const child = source.children[ i ];
				this.add( child.clone() );

			}

		}

		return this;

	}

} );

/**
 * Subclass of Array with convenience methods used by NetLogo.
 * Tipically the items in the array are Objects but can be any type.
 */
class AgentArray extends Array {
    /**
     * Magic to return AgentArrays rather than AgentList
     * or other AgentArray subclasses when using AA methods
     * [Symbol.species](https://goo.gl/Zsxwxd)
     *
     * @readonly
     */
    static get [Symbol.species]() {
        return AgentArray
    }

    /**
     * Convert an existing Array to an AgentArray "in place".
     * Use array.slice() if a new array is wanted
     *
     * @param {Array} array Array to convert to AgentArray
     * @returns {AgentArray} array converted to AgentArray
     */
    static fromArray(array) {
        const aarray = Object.setPrototypeOf(array, AgentArray.prototype);
        return aarray
    }

    /**
     * Creates an instance of AgentArray. Simply pass-through to super()
     * now, but may add initialization code later.
     * @param {*} args Zero or more items in Array
     * @example
     * let aa = new AgentArray({x:0,y:0}, {x:0,y:1}, {x:1,y:0})
     *  //=>  [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }]
     */
    constructor(...args) {
        super(...args);
        // maybe do some initialization later
    }

    /**
     * See {@link World} and [MyClass's foo property]{@link World#bboxTransform}.
     * Convert this AgentArray to Array in-place
     *
     * @returns {Array} This AgentArray converted to Array
     */
    toArray() {
        Object.setPrototypeOf(this, Array.prototype);
        return this
    }

    // NL: Return true if reporter true for all of this set's objects
    // Use Array.every(). Also Array.some()
    // all (reporter) { return this.every(reporter) }
    // // Return !isEmpty()
    // any () { return this.length !== 0 }
    // NL: Return AgentArray with reporter(agent) true. Use Array.filter()
    // with (reporter) { return this.filter(reporter) }

    /**
     * Return true if there are no items in this Array
     *
     * @returns {boolean}
     * @example
     *  new AgentArray().isEmpty()
     *  //=> true
     * @example
     *  aa.isEmpty()
     *  //=> false
     */
    isEmpty() {
        return this.length === 0
    }
    /**
     * Return first item in this array. Returns undefined if empty.
     *
     * @returns {any}
     * @example
     *  aa.first()
     *  //=> { x: 0, y: 0 }
     */
    first() {
        return this[0]
    }
    /**
     * Return last item in this array. Returns undefined if empty.
     *
     * @returns {any}
     * @example
     *  aa.last()
     *  //=>  { x: 1, y: 0 }
     */
    last() {
        return this[this.length - 1]
    }
    /**
     * Return at index. Returns undefined if empty.
     * Wrap the index to be within the array.
     *
     * @returns {any}
     * @example
     *  aa.atIndex(aa.length)
     *  //=>  { x: 0, y: 0 }
     */
    atIndex(i) {
        if (this.length === 0) return undefined
        const index = mod(i, this.length);
        return this[index]
    }

    /**
     * Return true if fcn(element) returns true for each element in this array.
     * Same as Array.every, using NetLogo's name
     *
     * @param {Function} fcn fcn(element) return boolean
     * @returns {boolean} true if fcn returns true for all elements
     */
    all(fcn) {
        return this.every(fcn)
    }

    /**
     * Return array of property values from this array's objects.
     * Array type is specified, defaults to AgentArray
     *
     * @param {String} key Property name
     * @param {Array} [type=AgentArray] Type of array (Array, Uint8Array, ...)
     * @returns {Array} Array of given type
     * @example
     *  aa.props('x')
     *  //=> [0, 0, 1]
     * @example
     *  aa.props('y')
     *  //=> [0, 1, 0]
     */
    props(key, type = AgentArray) {
        const result = new type(this.length);
        for (let i = 0; i < this.length; i++) {
            result[i] = this[i][key];
        }
        return result
    }
    // Creates an OofA for several sets of props.
    // Obj is key, arrayType pairs: x: Float32Array
    // Result is this.props(key, arrayType) for each key
    /**
     * Creates an Object of Arrays, one Array per each property in obj.
     * Obj is key, arrayType pairs: x: Float32Array
     * This is advanced, used for web workers, very large data sets, and remote communication
     *
     * @param {Object} obj Object of prop, array type pairs
     * @returns {Object}
     * @example
     *  aa.typedSample({x: Uint8Array, y: Uint8Array})
     *  //=> {x: new Uint8Array([0, 0, 1]), y: new Uint8Array([0, 1, 0])}
     */
    typedSample(obj) {
        // const length = this.length
        const result = {};
        // note: use util's forLoop, does not iterate over this agent array.
        forLoop(obj, (val, key) => {
            result[key] = this.props(key, val);
        });
        return result
    }

    // Return AgentArray of results of the function fcn
    // Similar to "props" but can return computation over all keys
    // Odd: as.props('type') twice as fast as as.results(p => p.type)?
    // results(fcn) {
    //     const result = new AgentArray(this.length)
    //     for (let i = 0; i < this.length; i++) {
    //         result[i] = fcn(this[i])
    //     }
    //     return result
    // }

    /**
     * Return new AgentArray of the unique values of this array
     *
     * @returns {AgentArray}
     */
    uniq() {
        // return AgentArray.fromArray(Array.from(new Set(this)))
        return AgentArray.from(new Set(this))
    }

    /**
     * Call fcn(agent, index, array) for each item in AgentArray.
     * Index & array optional.
     * Array assumed not mutable.
     * Note: 5x+ faster than this.forEach(fcn)
     *
     * @param {Function} fcn fcn(agent, [index], [array])
     * @returns {this} Return this for chaining.
     */
    forLoop(fcn) {
        for (let i = 0, len = this.length; i < len; i++) {
            fcn(this[i], i, this);
        }
        return this
    }

    /**
     * Call fcn(agent, index, array) for each item in AgentArray.
     * Index & array optional.
     * Array can shrink. If it grows, will not visit beyond original length.
     * "ask" is NetLogo term.
     *
     * @param {Function} fcn fcn(agent, [index], [array])
     */
    ask(fcn) {
        const length = this.length;
        // for (let i = 0; i < length || i < this.length; i++) {
        for (let i = 0; i < Math.min(length, this.length); i++) {
            fcn(this[i], i, this);
        }
        if (length != this.length) {
            const name = this.name || this.constructor.name;
            const direction = this.length < length ? 'decreasing' : 'increasing';
            warn(`AgentArray.ask array mutation: ${name}: ${direction}`);
        }
        // return this
    }
    /**
     * Return all elements returning f(obj, index, array) true.
     * NetLogo term, simply calls this.filter(fcn)
     *
     * @param {Function} fcn fcn(agent, [index], [array])
     * @returns {AgentArray}
     * @description
     * Use: turtles.with(t => t.foo > 20).ask(t => t.bar = true)
     */
    with(fcn) {
        return this.filter(fcn)
    }
    // Return all other than me.
    other(t) {
        return this.filter(o => o !== t)
    }

    // Return count of agents with reporter(agent) true
    count(reporter) {
        return this.reduce((prev, o) => prev + (reporter(o) ? 1 : 0), 0)
    }

    sum(key) {
        return this.reduce((prev, o) => prev + (key ? o[key] : o), 0)
    }
    avg(key) {
        return this.sum(key) / this.length
    }
    min(key) {
        return this.reduce(
            (prev, o) => Math.min(prev, key ? o[key] : o),
            Infinity
        )
    }
    max(key) {
        return this.reduce(
            (prev, o) => Math.max(prev, key ? o[key] : o),
            -Infinity
        )
    }
    extent(key) {
        return [this.min(key), this.max(key)]
    }
    histogram(key, bins = 10, min = this.min(key), max = this.max(key)) {
        const binSize = (max - min) / bins;
        const aa = new AgentArray(bins);
        aa.fill(0);
        this.ask(a => {
            const val = key ? a[key] : a;
            if (val < min || val > max) {
                warn(`histogram bounds error: ${val}: ${min}-${max}`);
            } else {
                let bin = Math.floor((val - min) / binSize);
                if (bin === bins) bin--; // val is max, round down
                aa[bin]++;
            }
        });
        // Object.assign(aa, {bins, min, max, binSize, key})
        aa.parameters = { key, bins, min, max, binSize, arraySize: this.length };
        // console.log(key, bins, min, max, binSize, aa)
        return aa
    }

    /**
     * Create copy of this AgentArray
     * @returns AgentArray
     */
    clone() {
        return this.slice(0) // Returns an AgentArray rather than Array!
    }
    // Randomize the AgentArray in place. Use clone first if new AgentArray needed.
    // Return "this" for chaining.
    shuffle() {
        return shuffle(this)
    }
    // Return this AgentArray sorted by the reporter in ascending/descending order.
    // If reporter is a string, convert to a fcn returning that property.
    // Use clone if you don't want to mutate this array.
    /**
     * Return this AgentArray sorted by the reporter in ascending/descending order.
     * If reporter is a string, convert to a fcn returning that property.
     *
     * @param {function} reporter
     * @param {boolean} [ascending=true]
     * @returns {AgentArray}
     */
    sortBy(reporter, ascending = true) {
        sortObjs(this, reporter, ascending);
        return this
    }

    // Remove an item from an array. Binary search if f given
    // Array unchanged if item not found.
    remove(o, f) {
        const i = this.agentIndex(o, f);
        if (i !== -1) this.splice(i, 1);
        else warn(`remove: ${o} not in AgentArray`);
        return this // chaining
    }
    insert(o, f) {
        const i = this.sortedIndex(o, f);
        if (this[i] === o) throw Error('insert: item already in AgentArray')
        this.splice(i, 0, o); // copyWithin?
    }

    // Binary search:
    // Return array index of item, where array is sorted.
    // If item not found, return index for item for array to remain sorted.
    // f is used to return an integer for sorting, defaults to identity.
    // If f is a string, it is the object property to sort by.
    // Adapted from underscore's _.sortedIndex.
    sortedIndex(item, f = identityFcn) {
        if (isString(f)) f = propFcn(f);
        const value = f(item);
        // Why not array.length - 1? Because we can insert 1 after end of array.
        // let [low, high] = [0, array.length]
        let low = 0;
        let high = this.length;
        while (low < high) {
            const mid = (low + high) >>> 1; // floor (low+high)/2
            if (f(this[mid]) < value) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return low
    }
    // Return index of value in array with given property or -1 if not found.
    // Binary search if property isnt null
    // Property can be string or function.
    // Use property = identity to compare objs directly.
    agentIndex(item, property) {
        if (!property) return this.indexOf(item)
        const i = this.sortedIndex(item, property);
        return this[i] === item ? i : -1
    }
    // True if item is in array. Binary search if f given
    contains(item, f) {
        return this.agentIndex(item, f) >= 0
    }

    // Return a random agent. Return undefined if empty.
    oneOf() {
        return oneOf(this)
    }
    // Return a random agent, not equal to agent
    otherOneOf(agent) {
        return otherOneOf(this, agent)
    }
    // Return n other random agents from this array
    // otherNOf (n, agent) { return util.otherNOf(n, this, agent) }
    otherNOf(n, item) {
        if (this.length < n) throw Error('AgentArray: otherNOf: length < N')
        return this.clone().remove(item).shuffle().slice(0, n)
    }

    // Return the first agent having the min/max of given value of f(agent).
    // If reporter is a string, convert to a fcn returning that property
    minOrMaxOf(min, reporter, valueToo = false) {
        if (this.isEmpty()) throw Error('min/max OneOf: empty array')
        if (typeof reporter === 'string') reporter = propFcn(reporter);
        let o = null;
        let val = min ? Infinity : -Infinity;
        for (let i = 0; i < this.length; i++) {
            const a = this[i];
            const aval = reporter(a);
            if ((min && aval < val) || (!min && aval > val)) {
[o, val] = [a, aval];
            }
        }
        return valueToo ? [o, val] : o
    }
    // The min version of the above
    minOneOf(reporter) {
        return this.minOrMaxOf(true, reporter)
    }
    // The max version of the above
    maxOneOf(reporter) {
        return this.minOrMaxOf(false, reporter)
    }
    // Like the pair above, but return both the object and its value in an array.
    // const [obj, value] = minValOf(...)
    minValOf(reporter) {
        return this.minOrMaxOf(true, reporter, true)
    }
    maxValOf(reporter) {
        return this.minOrMaxOf(false, reporter, true)
    }

    // Return n random agents as AgentArray.
    // See [Fisher-Yates-Knuth shuffle](https://goo.gl/fWNFf)
    // for better approach for large n.
    nOf(n) {
        if (n > this.length) throw Error('nOf: n larger than AgentArray')
        if (n === this.length) return this
        const result = new AgentArray();
        while (result.length < n) {
            const o = this.oneOf();
            if (!(o in result)) result.push(o);
        }
        return result
    }
    // Return a new AgentArray of the n min/max agents of the value of reporter,
    // in ascending order.
    // If reporter is a string, convert to a fcn returning that property
    // NOTE: we do not manage ties, see NetLogo docs.
    minOrMaxNOf(min, n, reporter) {
        if (n > this.length) {
            throw Error('min/max nOf: n larger than AgentArray')
        }
        const as = this.clone().sortBy(reporter);
        return min ? as.clone(0, n) : as.clone(as.length - n)
    }
    minNOf(n, reporter) {
        return this.minOrMaxNOf(true, n, reporter)
    }
    maxNOf(n, reporter) {
        return this.minOrMaxNOf(false, n, reporter)
    }
}

// export default AgentArray

// // Return shallow copy of a portion of this AgentArray
// // [See Array.slice](https://goo.gl/Ilgsok)
// // Default is to clone entire AgentArray
// cloneRange(begin = 0, end = this.length) {
//     return this.slice(begin, end) // Returns an AgentArray rather than Array!
// }

/**
 * A model's {@link Patches}, {@link Turtles}, {@link Links},
 * are all subclasses of AgentSet.
 *
 * AgentSets are {@link AgentArray}s that are factories for their own Agents.
 * That means you do *not* call `new Turtle()`, rather Turtles
 * will create the Turtle instances, adding them to itself.
 *
 * Finally, a Breed is simply a subarray of Patches, Turtles, Links.
 * Patches could have a Streets breed, Turtles could have Cops and Robbers
 * breeds, and Links Spokes and Rim breeds
 *
 * AgentSets are not created directly by modelers.
 * Instead, class {@link Model} creates them along with their Breeds.
 * You can easily skip this initially, instead simply understand AgentSets
 * are the basis for Patches, Turtles, Links & Breeds
 *
 * @param {Model} model Instance of Class Model to which I belong
 * @param {(Patch|Turtle|Link)} AgentClass Class of items stored in this AgentSet
 * @param {String} name Name of this AgentSet. Ex: Patches
 * @param {(Patches|Turtles|Links)} [baseSet=null] If a Breed, it's parent AgentSet
 */

class AgentSet extends AgentArray {
    // Inherited by Patches, Turtles, Links
    model
    name
    baseSet
    AgentClass

    /**
     * Magic to return AgentArrays rather than AgentSets
     * [Symbol.species](https://goo.gl/Zsxwxd)
     *
     * @readonly
     */
    static get [Symbol.species]() {
        return AgentArray
    }

    constructor(model, AgentClass, name, baseSet = null) {
        super(); // create empty AgentArray
        baseSet = baseSet || this; // if not a breed, set baseSet to this
        Object.assign(this, { model, name, baseSet, AgentClass });
        // BaseSets know their breeds and keep the ID global
        if (this.isBaseSet()) {
            this.breeds = {}; // will contain breedname: breed entries
            this.ID = 0;
            // Breeds inherit frm their baseSet and add themselves to baseSet
        } else {
            Object.setPrototypeOf(this, Object.getPrototypeOf(baseSet));
            this.baseSet.breeds[name] = this;
        }
        // Keep a list of this set's variables; see `own` below
        // REMIND: not really used. Remove? Create after setup()?
        this.ownVariables = [];
        // Create a proto for our agents by having a defaults and instance layer
        // this.AgentClass = AgentClass
        this.agentProto = new AgentClass(this);
        this.protoMixin(this.agentProto, AgentClass);
        // }
    }
    /**
     * Add common variables to an Agent being added to this AgentSet.
     *
     * Each Agent has it's AgentSet and the Model instance.
     * It also has an id, set by the AgentSet's global ID.
     *
     * The Agent also has three methods added: setBreed, getBreed, isBreed.
     *
     * @param {Object} agentProto A new instance of the Agent being added
     * @param {(Patch|Turtle|Link)} AgentClass It's Class
     */
    protoMixin(agentProto, AgentClass) {
        Object.assign(agentProto, {
            agentSet: this,
            model: this.model,
            // world: this.world
        });
        agentProto[this.baseSet.name] = this.baseSet;

        // if (this.isBaseSet()) {
        // Model.reset should not redefine these.
        if (!AgentClass.prototype.setBreed) {
            Object.assign(AgentClass.prototype, {
                setBreed(breed) {
                    breed.setBreed(this);
                },
                getBreed() {
                    return this.agentSet
                },
                isBreed(breed) {
                    return this.agentSet === breed
                },
            });
            Object.defineProperty(AgentClass.prototype, 'breed', {
                get: function () {
                    return this.agentSet
                },
            });
        }
    }

    /**
     * Create a subarray of this AgentSet.
     * Example: create a people breed of Turtles:
     *
     * `people = turtles.newBreed('people')`
     *
     * @param {String} name The name of the new breed AgentSet
     * @returns {AgentSet} A subarray of me
     */
    newBreed(name) {
        return new AgentSet(this.model, this.AgentClass, name, this)
    }

    /**
     * @returns {boolean} true if I am a baseSet subarray
     */
    isBreedSet() {
        return this.baseSet !== this
    }
    /**
     * @returns {boolean} true if I am a Patches, Turtles or Links AgentSet
     */
    isBaseSet() {
        return this.baseSet === this
    }

    /**
     * Return breeds in a subset of an AgentSet
     *
     * Ex: patches.inRect(5).withBreed(houses)
     *
     * @param {AgentSet} breed A breed AgentSet
     * @returns {AgentArray}
     */
    withBreed(breed) {
        return this.filter(a => a.agentSet === breed)
    }

    // Abstract method used by subclasses to create and add their instances.
    create() {
        console.log(`AgentSet: Abstract method called: ${this}`);
    }

    /**
     * @param {Object} o An Agent to be added to this AgentSet
     * @returns {Object} The input Agent, bound to this AgentSet.
     * @description
     * Add an Agent to this AgentSet.  Only used by factory methods.
     * Adds the `id` property to Agent. Increment AgentSet `ID`.
     */
    addAgent(o = undefined) {
        // o only for breeds adding themselves to their baseSet
        o = o || Object.create(this.agentProto); // REMIND: Simplify! Too slick.
        if (this.isBreedSet()) {
            this.baseSet.addAgent(o);
        } else {
            o.id = this.ID++;
            if (o.agentConstructor) o.agentConstructor();
        }
        this.push(o);
        return o
    }
    /**
     * Remove all Agents from this AgentSet using agent.die() for each agent.
     *
     */
    clear() {
        // die() is an agent method. sets it's id to -1
        while (!this.isEmpty()) this.last().die();
    }
    /**
     * Remove an Agent from this AgentSet
     *
     * @param {Object} o The Agent to be removed
     * @returns {AgentSet} This AgentSet with the Agent removed
     */
    removeAgent(o) {
        // Note removeAgent(agent) different than remove(agent) which
        // simply removes the agent from it's array

        // Remove me from my baseSet
        if (this.isBreedSet()) this.baseSet.remove(o, 'id');
        // Remove me from my set.
        this.remove(o, 'id');
        return this
    }

    /**
     * Set a default value shared by all Agents in this AgentSet
     *
     * @param {String} name The name of the shared value
     * @param {any} value
     * @returns {AgentSet} This AgentSet
     */
    setDefault(name, value) {
        this.agentProto[name] = value;
        return this
    }
    /**
     * Return a default, shared value
     *
     * @param {String} name The name of the default
     * @returns {any} The default value
     */
    getDefault(name) {
        return this.agentProto[name]
    }
    // Used when getter/setter's need to know if get/set default
    // settingDefault(agent) {
    //     return agent.id == null
    // }

    // Declare variables of an agent class. May deprecate if not needed.
    // `varnames` is a string of space separated names
    // own(varnames) {
    //     // if (this.isBreedSet())
    //     //   this.ownVariables = util.clone(this.baseSet.ownVariables)
    //     for (const name of varnames.split(' ')) {
    //         this.setDefault(name, null)
    //         this.ownVariables.push(name)
    //     }
    // }

    /**
     * Move an agent from its AgentSet/breed to be in this AgentSet/breed
     *
     * @param {Agent} a An agent, a member of another AgentSet
     * @returns {Agent} The updated agent
     */
    setBreed(a) {
        // change agent a to be in this breed
        // Return if `a` is already of my breed
        if (a.agentSet === this) return
        // Remove/insert breeds (not baseSets) from their agentsets
        if (a.agentSet.isBreedSet()) a.agentSet.remove(a, 'id');
        if (this.isBreedSet()) this.insert(a, 'id');

        // Make list of `a`'s vars and my ownvars.
        const avars = a.agentSet.ownVariables;
        // First remove `a`'s vars not in my ownVariables
        for (const avar of avars) {
            if (!this.ownVariables.includes(avar)) delete a[avar];
        }
        // Now add ownVariables to `a`'s vars, default to 0.
        // If ownvar already in avars, it is not modified.
        for (const ownvar of this.ownVariables) {
            if (!avars.includes(ownvar)) a[ownvar] = 0;
        } // NOTE: NL uses 0, maybe we should use null?

        // Give `a` my defaults/statics
        return Object.setPrototypeOf(a, this.agentProto)
    }

    /**
     * Call fcn(agent, index, array) for each item in AgentArray.
     * Index & array optional. Overrides AgentArray's ask with
     * additional guards for modifications in AgentSet's array.
     *
     * @param {Function} fcn fcn(agent, index?, array?)
     */
    ask(fcn) {
        if (this.length === 0) return
        const lastID = this.last().id; // would fail w/o 0 check above
        // for (let i = 0; this[i].id <= lastID; i++) { // nope.
        for (let i = 0; i < this.length && this[i].id <= lastID; i++) {
            fcn(this[i], i, this);
        }
    }

    /**
     * A much stronger version of ask(fcn) with stronger mutability guards.
     *
     * @param {Function} fcn fcn(agent, index?, array?)
     */
    askSet(fcn) {
        // Manages immutability reasonably well.
        if (this.length === 0) return
        // Patches are static
        if (this.name === 'patches') super.forLoop(fcn);
        else if (this.isBaseSet()) this.baseSetAsk(fcn);
        else if (this.isBreedSet()) this.cloneAsk(fcn);
    }

    // An ask function for mutable baseSets.
    // BaseSets can only add past the end of the array.
    // This allows us to manage mutations by allowing length change,
    // and managing deletions only within the original length.
    baseSetAsk(fcn) {
        if (this.length === 0) return
        const lastID = this.last().id;

        // Added obj's have id > lastID. Just check for deletions.
        // There Be Dragons:
        // - AgentSet can become length 0 if all deleted
        // - For loop tricky:
        //   - i can become negative w/in loop:
        //   - i can become bigger than current AgentSet
        //   - Guard w/ i<len & i>=0
        for (let i = 0; i < this.length; i++) {
            const obj = this[i];
            const id = obj.id;
            if (id > lastID) break
            fcn(obj, i, this);
            if (i >= this.length) break
            if (this[i].id > id) {
                while (i >= 0 && this[i].id > id) i--; // ok if -1
            }
        }
    }

    // For breeds, mutations can occur in many ways.
    // This solves this by cloning the initial array and
    // managing agents that have died or changed breed.
    // In other words, we can be concerned only with mutations
    // of the agents themselves.
    cloneAsk(fcn) {
        const clone = this.clone();
        for (let i = 0; i < clone.length; i++) {
            const obj = clone[i];
            // obj.id > 0: obj.die() sets id to -1
            if (obj.breed == this && obj.id > 0) {
                fcn(obj, i, clone);
            }
        }
    }
}

// export default AgentSet

class AgentList extends AgentArray {
    // /**
    //  * Magic to return AgentArrays rather than AgentList
    //  * [Symbol.species](https://goo.gl/Zsxwxd)
    //  *
    //  * @readonly
    //  */
    // static get [Symbol.species]() {
    //     return AgentArray
    // }

    constructor(model, ...args) {
        if (!model) throw Error('AgentList requires model')
        super(...args);
        this.model = model;
    }

    // Geometry methods for patches, turtles, and other AgentArrays which have x,y.
    // Return all agents within rect, radius, cone from given agent o.
    // If meToo, include given object, default excludes it
    // Typically the AgentArray is a subset of larger sets, reducing
    // the size, then uses these inRect, inRadius or inCone methods

    // Return all agents within rectangle from given agent o.
    // dx & dy are (float) half width/height of rect
    inRect(o, dx, dy = dx, meToo = false) {
        const agents = new AgentList(this.model);
        const minX = o.x - dx; // ok if max/min off-world, o, a are in-world
        const maxX = o.x + dx;
        const minY = o.y - dy;
        const maxY = o.y + dy;
        this.ask(a => {
            if (minX <= a.x && a.x <= maxX && minY <= a.y && a.y <= maxY) {
                if (meToo || o !== a) agents.push(a);
            }
        });
        return agents
    }

    // Return all agents in AgentArray within d distance from given object.
    inRadius(o, radius, meToo = false) {
        const agents = new AgentList(this.model);
        // const {x, y} = o // perf?
        const d2 = radius * radius;
        const sqDistance$1 = sqDistance; // Local function 2-3x faster, inlined?
        this.ask(a => {
            if (sqDistance$1(o.x, o.y, a.x, a.y) <= d2) {
                if (meToo || o !== a) agents.push(a);
            }
        });
        return agents
    }

    // As above, but also limited to the angle `coneAngle` around
    // a `angle` from object `o`. coneAngle and direction in radians.
    inCone(o, radius, coneAngle, heading, meToo = false) {
        heading = this.model.toRads(heading);
        coneAngle = this.model.toAngleRads(coneAngle);

        const agents = new AgentList(this.model);
        this.ask(a => {
            if (inCone(a.x, a.y, radius, coneAngle, heading, o.x, o.y)) {
                if (meToo || o !== a) agents.push(a);
            }
        });
        return agents
    }
}

/**
 * A DataSet is an object with width/height and an array
 * of numbers of length = width * height.
 *
 * The array can be a TypedArray or a JavaScript Array.
 */

class DataSet {
    // **Static methods:** called via DataSet.foo(), similar to Math.foo().
    // Generally useful utilities for use with TypedArrays & JS Arrays

    // Return an empty dataset of given width, height, dataType
    /**
     * Factory method returning an empty dataset of given
     * width, height, dataType
     *
     * @static
     * @param {number} width The integer width of the array
     * @param {number} height The integer height of the array
     * @param {Object} Type Array or one of the typed array types
     * @returns {DataSet} The resulting DataSet with no values assigned
     */
    static emptyDataSet(width, height, Type) {
        return new DataSet(width, height, new Type(width * height))
    }

    /**
     * Creates an instance of DataSet.
     * Checks data is right size, throws an error if not.
     *
     * @param {number} width The integer width of the array
     * @param {number} height The integer height of the array
     * @param {array} data The array of numbers of length width * height
     */
    constructor(width, height, data) {
        if (data.length !== width * height) {
            throw Error(
                `new DataSet length: ${data.length} !== ${width} * ${height}`
            )
        }
        Object.assign(this, { width, height, data });
    }

    // Checks x,y are within DataSet. Throw error if not.
    checkXY(x, y) {
        if (!this.inBounds(x, y)) {
            throw Error(`DataSet: x,y out of range: ${x}, ${y}`)
        }
    }
    // true if x,y in dataset bounds
    inBounds(x, y) {
        return (
            isBetween(x, 0, this.width - 1) &&
            isBetween(y, 0, this.height - 1)
        )
    }

    dataType() {
        return this.data.constructor
    }
    type() {
        return this.constructor
    }

    // Given x,y in data space, return index into data
    toIndex(x, y) {
        return x + y * this.width
    }

    // Given index into data, return dataset [x, y] position
    toXY(i) {
        return [i % this.width, Math.floor(i / this.width)]
    }

    // Get dataset value at x,y, assuming that x,y valididated previously
    // getXY (x, y) { return this.data[this.toIndex(Math.floor(x), Math.floor(y))] }
    getXY(x, y) {
        return this.data[this.toIndex(x, y)]
    }

    // Set the data value at x,y to num. assume x,y valid
    // setXY (x, y, num) { this.data[this.toIndex(Math.floor(x), Math.floor(y))] = num }
    setXY(x, y, num) {
        this.data[this.toIndex(x, y)] = num;
    }

    // Wrapper for sampling, defaults to "nearest". Checks x,y valid as well.
    // Use this for individual sampling.
    sample(x, y, useNearest = true) {
        this.checkXY(x, y);
        return useNearest ? this.nearest(x, y) : this.bilinear(x, y)
    }

    // Nearest neighbor sampling, w/o x,y validity check, i.e. our inner loops
    nearest(x, y) {
        return this.getXY(Math.round(x), Math.round(y))
    }

    // Billinear sampling w/o x,y validity check, i.e. our inner loops
    bilinear(x, y) {
        // Billinear sampling works by making two linear interpolations (lerps)
        // in the x direction, and a third in the y direction, between the
        // two x results. See wikipedia:
        // [bilinear sampling](http://en.wikipedia.org/wiki/Bilinear_interpolation)
        // The diagram shows the three lerps

        // const [x0, y0] = [Math.floor(x), Math.floor(y)] // replaced by next line for speed
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const i = this.toIndex(x0, y0);
        const w = this.width;
        const dx = x - x0;
        const dy = y - y0;
        const dx1 = 1 - dx;
        const dy1 = 1 - dy;
        const f00 = this.data[i];
        // Edge case: fij is 0 if beyond data array; undefined -> 0.
        // This cancels the given component's factor in the result.
        const f10 = this.data[i + 1] || 0; // 0 at bottom right corner
        const f01 = this.data[i + w] || 0; // 0 at all bottom row
        const f11 = this.data[i + 1 + w] || 0; // 0 at end of next to bottom row
        // This is a bit involved but:
        // ```
        // If dx = 0; dx1 = 1, dy != 0
        // -> vertical linear interpolation
        // fxy = f00(1-dy) + f01(dy) i.e. y-lerp
        //
        // If dx != 0; dy = 0, dx !=0
        // -> horizontal linear interpolation
        // fxy = f00(1-dx) + f10(dx) i.e. x-lerp
        // ```
        return f00 * dx1 * dy1 + f10 * dx * dy1 + f01 * dx1 * dy + f11 * dx * dy
    }

    // Return a copy of this, with new data array
    clone() {
        return new DataSet(this.width, this.height, this.data.slice(0))
    }

    // Return new (empty) dataset, defaulting to this type
    emptyDataSet(width, height, type = this.dataType()) {
        return DataSet.emptyDataSet(width, height, type) // see static above
    }

    // Return new (empty) array of this type
    emptyArray(length) {
        const Type = this.type();
        return new Type(length)
    }

    // Create new dataset of size width/height/type by resampling each point.
    // Type is not this.type() due to integer/float differences. Default Array.
    // If same size, return a copy of this.
    // NOTE: This used to calc an x & y scale and apply it:
    //      const xScale = (this.width - 1) / (width - 1)
    //      const yScale = (this.height - 1) / (height - 1)
    //      ...
    //      ds.setXY(x, y, this.sample(x * xScale, y * yScale, useNearest))
    // .. which had precision errors.
    // Multiplying first, then dividing more accurate.
    resample(width, height, useNearest = true, Type = Array) {
        if (width === this.width && height === this.height) return this.copy()
        const ds = DataSet.emptyDataSet(width, height, Type);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                ds.setXY(
                    x,
                    y,
                    this.sample(
                        (x * (this.width - 1)) / (width - 1),
                        (y * (this.height - 1)) / (height - 1),
                        useNearest
                    )
                );
            }
        }
        return ds
    }

    // Scale each data element to be between min/max
    // This is a linear scale from this dataset's min/max
    // y = mx + b
    // utils.objects.js:
    // export function normalize(array, lo = 0, hi = 1) {
    //     const [min, max] = [arrayMin(array), arrayMax(array)]
    //     const scale = 1 / (max - min)
    //     return array.map(n => lerp(lo, hi, scale * (n - min)))
    // }

    scale(min, max) {
        // const data = ds.data
        const dsMin = this.min();
        const dsMax = this.max();
        const dsDelta = dsMax - dsMin;
        const delta = max - min;
        const m = delta / dsDelta;
        const b = min - m * dsMin;
        // const scaledData = data.map((x) => m * x + b)
        // return new DataSet(ds.width, ds.height, scaledData)
        return this.map(x => m * x + b)
    }

    // Return a rectangular subset of the dataset.
    // Returned dataset is of same array type as this.
    subset(x, y, width, height) {
        if (x + width > this.width || y + height > this.height) {
            throw Error('DataSet.subSet: params out of range')
        }
        const ds = this.emptyDataSet(width, height);
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                ds.setXY(i, j, this.getXY(i + x, j + y));
            }
        }
        return ds
    }

    // Return maped dataset by applying f to each dataset element
    map(f) {
        return new DataSet(this.width, this.height, this.data.map(f))
    }

    // Return the column of data at position x as this array's type
    col(x) {
        const [w, h, data] = [this.width, this.height, this.data];
        if (x >= w) throw Error(`col: x out of range width: ${w} x: ${x}`)
        const colData = this.emptyArray(h);
        for (let i = 0; i < h; i++) colData[i] = data[x + i * w];
        return colData
    }

    // Return the row of data at position y as this array's type
    row(y) {
        const [w, h] = [this.width, this.height];
        if (y >= h) throw Error(`row: y out of range height: ${h} x: ${y}`)
        return this.data.slice(y * w, (y + 1) * w)
    }

    // Convert this dataset's data to new type. Precision may be lost.
    // Does nothing if current data is already of this Type.
    convertType(type) {
        this.data = convertArrayType(this.data, type);
    }

    // Concatinate a dataset of equal height to my right to my east.
    // New DataSet is of same type as this.
    //
    // NOTE: concatWest is dataset.concatEast(this)
    concatEast(ds) {
        const [w, h] = [this.width, this.height];
        const [w1, h1] = [ds.width, ds.height];
        if (h !== h1) throw Error(`concatEast: heights not equal ${h}, ${h1}`)
        const ds1 = this.emptyDataSet(w + w1, h);
        // copy this into new dataset
        for (let x = 0; x < h; x++) {
            for (let y = 0; y < w; y++) {
                ds1.setXY(x, y, this.getXY(x, y));
            }
        }
        // copy ds to the left side
        for (let x = 0; x < h1; x++) {
            for (let y = 0; y < w1; y++) {
                ds1.setXY(x + w, y, ds.getXY(x, y));
            }
        }
        return ds1
    }

    // Concatinate a dataset of equal width to my south, returning new DataSet.
    // New DataSet is of same type as this.
    //
    // NOTE: concatNorth is dataset.concatSouth(this)
    concatSouth(dataset) {
        const [w, h, data] = [this.width, this.height, this.data];
        if (w !== dataset.width) {
            throw Error(`concatSouth: widths not equal ${w}, ${dataset.width}`)
        }
        const data1 = concatArrays(data, dataset.data);
        return new DataSet(w, h + dataset.height, data1)
    }

    // return dataset x,y given x,y in a euclidean space defined by tlx, tly, w, h
    // x,y is in topleft-bottomright box: [tlx,tly,tlx+w,tly-h], y positive util.
    // Ex: NetLogo's coords: x, y, minXcor, maxYcor, numX, numY
    transformCoords(x, y, tlx, tly, w, h) {
        const xs = ((x - tlx) * (this.width - 1)) / w;
        const ys = ((tly - y) * (this.height - 1)) / h;
        return [xs, ys]
    }

    // get a sample using a transformed euclidean coord system; see above
    coordSample(x, y, tlx, tly, w, h, useNearest = true) {
        const [xs, ys] = this.transformCoords(x, y, tlx, tly, w, h);
        return this.sample(xs, ys, useNearest)
    }

    // Return Array 3x3 neighbor values of the given x,y of the dataset.
    // Off-edge neighbors revert to nearest edge value.
    neighborhood(x, y, array = []) {
        array.length = 0; // in case user supplied an array to reduce GC
        const clampNeeded =
            x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1;
        for (let dy = -1; dy <= +1; dy++) {
            for (let dx = -1; dx <= +1; dx++) {
                let x0 = x + dx;
                let y0 = y + dy;
                if (clampNeeded) {
                    x0 = clamp(x0, 0, this.width - 1);
                    y0 = clamp(y0, 0, this.height - 1);
                }
                array.push(this.data[this.toIndex(x0, y0)]);
            }
        }
        return array
    }

    // Return a new dataset of this array type convolved with the
    // given kernel 3x3 matrix.
    // See [Convolution](https://en.wikipedia.org/wiki/Kernel_(image_processing))
    //
    // If cropped, do not convolve the edges, returning a smaller dataset.
    // If not, convolve the edges by extending edge values, returning
    // dataset of same size.
    convolve(kernel, factor = 1, crop = false) {
        const [x0, y0, h, w] = crop // optimization not needed, only called once
            ? [1, 1, this.height - 1, this.width - 1]
            : [0, 0, this.height, this.width];
        const newDS = this.emptyDataSet(w, h);
        const newData = newDS.data;
        let i = 0;
        for (let y = y0; y < h; y++) {
            for (let x = x0; x < w; x++) {
                const nei = this.neighborhood(x, y);
                // remind: use reduce if performant
                let sum2 = 0;
                for (let i2 = 0; i2 < kernel.length; i2++) {
                    // sum2 += kernel[i2] * nei[i2] // Chrome can't optimize compound let
                    sum2 = sum2 + kernel[i2] * nei[i2];
                }
                newData[i++] = sum2 * factor; // newDS.data[newDS.toIndex(x, y)] = sum2 * factor
            }
        }
        return newDS
    }

    // A few common convolutions.  dzdx/y are also called horiz/vert Sobel
    dzdx(n = 2, factor = 1 / 8) {
        return this.convolve([-1, 0, 1, -n, 0, n, -1, 0, 1], factor)
    }
    dzdy(n = 2, factor = 1 / 8) {
        return this.convolve([1, n, 1, 0, 0, 0, -1, -n, -1], factor)
    }
    laplace8() {
        return this.convolve([-1, -1, -1, -1, 8, -1, -1, -1, -1])
    }
    laplace4() {
        return this.convolve([0, -1, 0, -1, 4, -1, 0, -1, 0])
    }
    blur(factor = 0.0625) {
        // 1/16 = 0.0625
        return this.convolve([1, 2, 1, 2, 4, 2, 1, 2, 1], factor)
    }
    edge() {
        return this.convolve([1, 1, 1, 1, -7, 1, 1, 1, 1])
    }

    // Create two new Array convolved datasets, slope and aspect, common in
    // the use of an elevation data set. See Esri tutorials for
    // [slope](http://goo.gl/ZcOl08) and [aspect](http://goo.gl/KoI4y5)
    //
    // It also returns the two derivitive DataSets, dzdx, dzdy for
    // those wanting to use the results of the two convolutions.
    //
    // Use this.convertType to convert to typed array
    slopeAndAspect(cellSize = 1, posAngle = true) {
        const dzdx = this.dzdx(); // sub left z from right
        const dzdy = this.dzdy(); // sub bottom z from top
        let [aspect, slope] = [[], []];
        const [h, w] = [dzdx.height, dzdx.width];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const [gx, gy] = [dzdx.getXY(x, y), dzdy.getXY(x, y)];
                // slope.push(Math.atan(util.distance(gx, gy)) / cellSize) // radians
                slope.push(Math.atan(distance(0, 0, gx, gy)) / cellSize);
                // if (noNaNs)
                //   while (gx === gy) {
                //     gx += util.randomNormal(0, 0.0001)
                //     gy += util.randomNormal(0, 0.0001)
                //   }
                // radians in [-PI,PI], downhill
                // let rad = (gx === gy && gy === 0) ? NaN : Math.atan2(-gy, -gx)
                let rad = Math.atan2(-gy, -gx);
                // positive radians in [0,2PI] if desired
                if (posAngle && rad < 0) rad += 2 * Math.PI;
                aspect.push(rad);
            }
        }
        slope = new DataSet(w, h, slope);
        aspect = new DataSet(w, h, aspect);
        return { slope, aspect, dzdx, dzdy }
    }

    // Return max/min/extent/sum of data
    max() {
        // return util.arrayMax(this.data)
        return this.data.reduce((a, b) => Math.max(a, b))
    }
    min() {
        // return util.arrayMin(this.data)
        return this.data.reduce((a, b) => Math.min(a, b))
    }
    extent() {
        return [this.min(), this.max()]
    }
    sum() {
        return this.data.reduce((a, b) => a + b, 0)
    }

    // Return new dataset scaled between lo, hi values
    normalize(lo = 0, hi = 1) {
        const [min, max] = this.extent();
        const scale = 1 / (max - min);
        const data = this.data.map(n => lerp(lo, hi, scale * (n - min)));
        return new DataSet(this.width, this.height, data)
    }

    // Test that this has same width, height, data as dataset.
    // Note: does not require equal array type (Array or TypedArray)
    equals(dataset) {
        return (
            this.width === dataset.width &&
            this.height === dataset.height &&
            arraysEqual(this.data, dataset.data)
        )
    }
}

// export default DataSet

// REMIND: limit to data that can be 24 bit. Error otherwise.
// DataType of Int8, 16, Int24 OK, others need testing.
// Possibly use precision to minimize byte size to 3, rgb?
//
// Convert dataset to an image context object.
//
// This can be used to "visualize" the data by normalizing
// which will scale the data to use the entire RGB space.
// It can also be used to create tiles or image-as-data if
// the defaults are used.
//
// Due to
// [alpha-premultiply](https://en.wikipedia.org/wiki/Alpha_compositing),
// the best we can do as data is 24 bit ints.
// You can simulate floats/fixed by multiplying the dataset
// the dividing on conversion back.
//
// Our preferred transport is in the works, likely in the
// tile datasets via blobs or arraybuffers. Sigh.
// toContext (normalize = false, gray = false, alpha = 255) {
//   const [w, h, data] = [this.width, this.height, this.data]
//   let idata
//   if (normalize) {
//     idata = gray
//       ? util.normalize8(data) : util.normalizeInt(data, 0, Math.pow(2, 24) - 1)
//   } else {
//     idata = data.map((a) => Math.round(a))
//   }
//   const ctx = util.createCtx(w, h)
//   const id = ctx.getImageData(0, 0, w, h)
//   const ta = id.data // ta short for typed array
//   for (let i = 0; i < idata.length; i++) {
//     const [num, j] = [idata[i], 4 * i] // j = byte index into ta
//     if (gray) {
//       ta[j] = ta[j + 1] = ta[j + 2] = Math.floor(num); ta[j + 3] = alpha
//     } else {
//       ta[j] = (num >> 16) & 0xff
//       ta[j + 1] = (num >> 8) & 0xff
//       ta[j + 2] = num & 0xff
//       ta[j + 3] = alpha // if not 255, image will be premultiplied.
//     }
//   }
//   ctx.putImageData(id, 0, 0)
//   return ctx
// }
//
// // Convert dataset to a canvas, which can be used as an image
// toCanvas (normalize = false, gray = false, alpha = 255) {
//   return this.toContext(gray, normalize, alpha).canvas
// }
// // Convert dataset to a base64 string
// toDataUrl (normalize = false, gray = false, alpha = 255) {
//   return util.ctxToDataUrl(this.toContext(gray, normalize, alpha))
// }

// // Get/Set name, useful for storage key.
// setName(string) {
//     this.name = string
//     return this
// }
// getName() {
//     return this.name ? this.name : this.makeName()
// }
// makeName() {
//     const { width, height } = this
//     const sum = this.sum().toFixed(2)
//     return `${this.dataType().name}-${width}-${height}-${sum}`
// }

// Class Link instances form a link between two turtles, forming a graph.
// Flyweight object creation, see Patch/Patches.
// https://medium.com/dailyjs/two-headed-es6-classes-fe369c50b24
/**
 * Class Link instances form a link between two {@link Turtle}s, forming a graph
 * with the Turtles being the nodes, and the Links the edges.
 *
 * **TODO: Document Link properties and methods.**
 */
class Link {
    // Set by AgentSet
    agentSet
    model
    name

    // The core default variables needed by a Link.
    // Use links.setDefault(name, val) to change
    // Modelers add additional "own variables" as needed.
    static defaultVariables() {
        // Core variables for patches. Not 'own' variables.
        return {
            end0: null, // Turtles: end0 & 1 are turtle ends of the link
            end1: null,
            width: 1, // THREE: must be 1. Canvas2D (unsupported) has widths.
        }
    }
    // Initialize a Link
    constructor() {
        Object.assign(this, Link.defaultVariables());
    }
    init(from, to) {
        this.end0 = from;
        this.end1 = to;
        from.links.push(this);
        to.links.push(this);
    }
    // Remove this link from its agentset
    die() {
        this.agentSet.removeAgent(this);
        removeArrayItem(this.end0.links, this);
        removeArrayItem(this.end1.links, this);
        // Set id to -1, indicates that I've died.
        this.id = -1;
    }

    bothEnds() {
        return AgentArray.fromArray([this.end0, this.end1])
    }
    length() {
        return this.end0.distance(this.end1)
    }
    // use getter, all the other headings are getters
    get heading() {
        const { x0, x1, y0, y1 } = this;
        const rads = Math.atan2(y1 - y0, x1 - x0);
        return this.model.fromRads(rads)
    }
    otherEnd(turtle) {
        if (turtle === this.end0) return this.end1
        if (turtle === this.end1) return this.end0
        throw Error(`Link.otherEnd: turtle not a link turtle: ${turtle}`)
    }
    distanceXY(x, y) {
        return (
            this.bothEnds()
                .map(t => t.distanceXY(x, y))
                .sum() - this.length()
        )
    }

    get x0() {
        return this.end0.x
    }
    get y0() {
        return this.end0.y
    }
    get z0() {
        return this.end0.z ? this.end0.z : 0 // REMIND: move to turtles
    }
    get x1() {
        return this.end1.x
    }
    get y1() {
        return this.end1.y
    }
    get z1() {
        return this.end1.z ? this.end1.z : 0
    }
}

// export default Link

// Links are a collection of all the Link objects between turtles.
/**
 * Links are a collection of all the {@link Link} objects between turtles.
 *
 */
class Links extends AgentSet {
    // Use AgentSeet ctor: constructor (model, AgentClass, name)

    // Factories:
    // Add 1 or more links from the from turtle to the to turtle(s) which
    // can be a single turtle or an array of turtles. The optional init
    // proc is called on the new link after inserting in the agentSet.

    // Return a single link
    createOne(from, to, initFcn = link => {}) {
        const link = this.addAgent();
        link.init(from, to);
        initFcn(link);
        return link
    }

    // Return an array of links.
    // To can be an array or a single turtle (returning an array of 1 link)
    create(from, to, initFcn = link => {}) {
        // if (!Array.isArray(to)) return this.createOne(from, to, initFcn)
        if (!Array.isArray(to)) to = [to];
        // Return array of new links. REMIND: should be agentarray?
        return to.map(t => {
            // REMIND: skip dups
            // const link = this.addAgent()
            // link.init(from, t)
            // initFcn(link)
            // return link
            return this.createOne(from, t, initFcn)
        }) // REMIND: return single link if to not an array?
    }
}

// export default Links

// class World defines the coordinate system for the model.
// It will be  upgraded with methods converting from other
// transforms like  GIS and DataSets.

// const defaultZ = (maxX, maxY) => Math.max(maxX, maxY)

/**
 * @private
 * @typedef {Object} WorldOptions
 * @property {number} minX Max world patch x integer value
 * @property {number} minY Max world patch y integer value
 * @property {number} minZ Max world patch z integer value
 * @property {number} maxX Min world patch x integer value
 * @property {number} maxY Min world patch y integer value
 * @property {number} maxZ Min world patch z integer value
 */

/**
 * @description
 * Class World defines the coordinate system for the model.
 * It has transforms for multiple coordinate systems.
 *
 * The world is defined by an object with 6 properties:
 *
 *          WorldOptions = {
 *              minX: integer,
 *              maxX: integer,
 *              minY: integer,
 *              maxY: integer,
 *              minZ: integer,
 *              maxZ: integer,
 *          }
 */
class World {
    maxX = 16
    maxY = 16
    maxZ = 16
    minX = -16
    minY = -16
    minZ = -16

    /**
     * Create a new World object given an Object with optional
     * minX, maxX, minY, maxY, minZ, maxZ overriding class properties.
     * @param {World|WorldOptions|Object} options Object with overrides for class properties
     */
    constructor(options = {}) {
        Object.assign(this, options); // set the option override values
        this.setWorld(); // convert these to rest of world parameters
    }

    // Until class properties universally, this approach is used:
    // setClassProperties() {
    //     this.maxX = 16
    //     this.maxY = 16
    //     this.maxZ = 16
    //     this.minX = -this.maxX
    //     this.minY = -this.maxY
    //     this.minZ = -this.maxZ
    // }

    /**
     * Return a default options object, origin at center.
     *
     * @param {number} [maxX=16] Integer max X value
     * @param {number} [maxY=maxX] Integer max Y value
     * @param {number} [maxZ=Math.max(maxX, maxY)] Integer max Z value
     * @returns {WorldOptions}
     */
    static defaultOptions(maxX = 16, maxY = maxX, maxZ = Math.max(maxX, maxY)) {
        return {
            minX: -maxX,
            maxX: maxX,
            minY: -maxY,
            maxY: maxY,
            minZ: -maxZ,
            maxZ: maxZ,
        }
    }
    /**
     * Factory to create a default World instance.
     *
     * @param {number} [maxX=16] Integer max X value
     * @param {number} [maxY=maxX] Integer max Y value
     * @param {number} [maxZ=Math.max(maxX, maxY)] Integer max Z value
     * @returns {World}
     */
    static defaultWorld(maxX = 16, maxY = maxX, maxZ = maxX) {
        return new World(World.defaultOptions(maxX, maxY, maxZ))
    }

    // ======================

    setWorld() {
        // Complete properties derived from minX/Y, maxX/Y (patchSize === 1)

        let { minX, maxX, minY, maxY, minZ, maxZ } = this;

        forLoop({ minX, maxX, minY, maxY, minZ, maxZ }, (val, key) => {
            if (!Number.isInteger(val))
                throw Error(`${key}:${val} must be an integer`)
        });

        this.numX = this.width = maxX - minX + 1;
        this.numY = this.height = maxY - minY + 1;
        // if (maxZ == null) maxZ = this.maxZ = Math.max(this.width, this.height)
        this.numZ = this.depth = maxZ - minZ + 1;

        this.minXcor = minX - 0.5;
        this.maxXcor = maxX + 0.5;
        this.minYcor = minY - 0.5;
        this.maxYcor = maxY + 0.5;
        this.minZcor = minZ - 0.5;
        this.maxZcor = maxZ + 0.5;

        // The midpoints of the world, in world coords.
        this.centerX = (minX + maxX) / 2;
        this.centerY = (minY + maxY) / 2;
        this.centerZ = (minZ + maxZ) / 2;

        this.numPatches = this.numX * this.numY;
    }

    /**
     * Return a random 2D point within the World
     *
     * @returns {Array} A random x,y float array
     */
    randomPoint() {
        return [
            randomFloat2(this.minXcor, this.maxXcor),
            randomFloat2(this.minYcor, this.maxYcor),
        ]
    }

    /**
     * Return a random 3D point within the World
     *
     * @returns {Array} A random x,y,z float array
     */
    random3DPoint() {
        return [
            randomFloat2(this.minXcor, this.maxXcor),
            randomFloat2(this.minYcor, this.maxYcor),
            randomFloat2(this.minZcor, this.maxZcor),
        ]
    }

    /**
     * Return a random Patch 2D integer point
     *
     * @returns {Array}  A random x,y integer array
     */
    randomPatchPoint() {
        return [
            randomInt2(this.minX, this.maxX),
            randomInt2(this.minY, this.maxY),
        ]
    }

    /**
     * Given x,y,z values return true if within the world
     *
     * @param {number} x x value
     * @param {number} y y value
     * @param {number} [z=this.centerZ] z value
     * @returns {boolean} Whether or not on-world
     */
    isOnWorld(x, y, z = this.centerZ) {
        return (
            this.minXcor <= x &&
            x <= this.maxXcor &&
            //
            this.minYcor <= y &&
            y <= this.maxYcor &&
            //
            this.minZcor <= z &&
            z <= this.maxZcor
        )
    }
    // cropToWorld(x, y) {}

    // Note minX etc NOT the world's but of the coord sys we want to use.
    /**
     * Return an instance of a bounding box 2D transform.
     * It linearly interpolates between the given minX, minY, maxX, maxY,
     * and the world's values of the same properties.
     *
     * The parameters are in the popular geojson order: west, south, east, north
     *
     * Useful for Canvas top-left transforms and geojson transforms.
     *
     * @param {number} minX min bounding box x value
     * @param {number} minY min bounding box y value
     * @param {number} maxX max bounding box x value
     * @param {number} maxY max bounding box y value
     * @returns {BBoxTransform} Instance of the BBoxTransform
     */
    bboxTransform(minX, minY, maxX, maxY) {
        return new BBoxTransform(minX, minY, maxX, maxY, this)
    }

    // ### Following use PatchSize

    // Get the world size in pixels. PatchSize is optional, defalting to 1
    getWorldSize(patchSize = 1) {
        return [this.numX * patchSize, this.numY * patchSize]
    }

    // Convert a canvas context to world euclidean coordinates
    // Change the ctx.canvas size, determined by patchSize.
    setEuclideanTransform(ctx, patchSize) {
        // ctx.canvas.width = this.numX * patchSize
        // ctx.canvas.height = this.numY * patchSize
        this.setCanvasSize(ctx.canvas, patchSize);
        ctx.restore(); // close earlier save(). OK if no save called yet.
        ctx.save();
        ctx.scale(patchSize, -patchSize);
        ctx.translate(-this.minXcor, -this.maxYcor);
    }
    // Return patch size for given canvas.
    // Error if canvas patch width/height differ.
    patchSize(canvas) {
        const { numX, numY } = this;
        const { clientWidth: width, clientHeight: height } = canvas;
        const xSize = width / numX;
        const ySize = height / numY;
        if (xSize !== ySize) {
            throw Error(`World patchSize: x/y sizes differ ${xSize}, ${ySize}`)
        }
        return xSize
    }
    // Change canvas size to this world's size.
    // Does not change size if already the same, preserving the ctx content.
    setCanvasSize(canvas, patchSize) {
        const [width, height] = this.getWorldSize(patchSize);
        setCanvasSize(canvas, width, height);
    }

    // Convert pixel location (top/left offset i.e. mouse) to patch coords (float)
    pixelXYtoPatchXY(x, y, patchSize) {
        return [this.minXcor + x / patchSize, this.maxYcor - y / patchSize]
    }
    // Convert patch coords (float) to pixel location (top/left offset i.e. mouse)
    patchXYtoPixelXY(x, y, patchSize) {
        return [(x - this.minXcor) * patchSize, (this.maxYcor - y) * patchSize]
    }

    xyToPatchIndex(x, y) {
        if (!this.isOnWorld(x, y)) return undefined
        const { minX, maxX, maxY, numX, maxXcor, maxYcor } = this;
        x = x === maxXcor ? maxX : Math.round(x);
        y = y === maxYcor ? maxY : Math.round(y);
        return x - minX + numX * (maxY - y)
    }
    // patchIndexToXY(index) {}
}

/**
 * A linear transformer between world coords and the given bounding box.
 *
 * @class
 * @private
 */
class BBoxTransform {
    // geo bbox definition:
    //    https://tools.ietf.org/html/rfc7946#section-5
    //    [west, south, east, north]
    /**
     * Creates an instance of BBoxTransform.
     * @param {number} minX min bounding box x value
     * @param {number} minY max bounding box x value
     * @param {number} maxX min bounding box y value
     * @param {number} maxY max bounding box y value
     * @param {World} world instance of a World object
     */
    constructor(minX, minY, maxX, maxY, world) {
        if (minX < maxX) console.log('flipX');
        if (maxY < minY) console.log('flipY');

        if (minX < maxX) [minX, maxX] = [maxX, minX];
        if (maxY < minY) [maxY, minY] = [minY, maxY];
        const { maxXcor, maxYcor, minXcor, minYcor } = world;

        const mx = (minX - maxX) / (maxXcor - minXcor);
        const my = (maxY - minY) / (maxYcor - minYcor);

        const bx = (minX + maxX - mx * (maxXcor + minXcor)) / 2;
        const by = (maxY + minY - my * (maxYcor + minYcor)) / 2;

        // Object.assign(this, { mx, my, bx, by })
        this.setClassProperties({ mx, my, bx, by });
    }
    setClassProperties(obj) {
        this.mx = obj.mx;
        this.my = obj.my;
        this.bx = obj.bx;
        this.by = obj.by;
    }

    /**
     * Convert from bbox point to world point
     *
     * @param {Array} bboxPoint A point in the bbox coordinates
     * @returns {Array} A point in the world coordinates
     */
    toWorld(bboxPoint) {
        const { mx, my, bx, by } = this;
        const [bboxX, bboxY] = bboxPoint;
        const x = (bboxX - bx) / mx;
        const y = (bboxY - by) / my;
        return [x, y]
    }

    /**
     * Convert from world point to bbox point
     *
     * @param {Array} worldPoint A point in the world coordinates
     * @returns {Array} A point in the bbox coordinates
     */
    toBBox(worldPoint) {
        const { mx, my, bx, by } = this;
        const [worldX, worldY] = worldPoint;
        const x = mx * worldX + bx;
        const y = my * worldY + by;
        return [x, y]
    }
}

// export default World

// The midpoints of the world, in world coords.
// (0, 0) for the centered default worlds. REMIND: remove?
// this.centerX = (this.minX + this.maxX) / 2
// this.centerY = (this.minY + this.maxY) / 2

// Calculate patchSize from canvas (any imagable) dimensions
// canvasPatchSize(canvas) {
//     // const [width, height] = canvas
//     return canvas.width / this.numX
// }
// canvasSize(patchSize) {
//     return [this.numX * patchSize, this.numY * patchSize]
// }

// Other ways to specify class properties:
// maxX = 16
// maxY = 16
// maxZ = 16
// minX = -this.maxX
// minY = -this.maxY
// minZ = -this.maxZ

// Note: this is es7 class properties.
// /** @type {number} Max patch x value */ maxX = 16
// /** @type {number} */ maxY = this.maxX
// /** @type {number} */ maxZ = Math.max(this.maxX, this.maxY)
// /** @type {number} */ minX = -this.maxX
// /** @type {number} */ minY = -this.maxY
// /** @type {number} */ minZ = -this.maxZ

//  * @property {number} maxX = 16
//  * @property {number} maxY = this.maxX
//  * @property {number} maxZ = Math.max(this.maxX, this.maxY)
//  * @property {number} minX = -this.maxX
//  * @property {number} minY = -this.maxY
//  * @property {number} minZ = -this.maxZ

// Note: this is es7 class properties.
// /** @type {number} */ mx
// /** @type {number} */ my
// /** @type {number} */ bx
// /** @type {number} */ by

/**
 * Patches are the world other AgentSets live on.
 * They define a coord system from the Model's World values:
 * minX, maxX, minY, maxY, (minZ, maxZ) (z optional)
 * Patches form a grid of Patch objects which can store world data
 * (elevation, fires, ant pheromones, buildings, roads, gis spatial data, water and so on)
 *
 * Created by class Model. Used by modeler in their Model subclass
 */
class Patches extends AgentSet {
    /**
     * Creates an instance of Patches.
     * @param {Model} model An instance of class Model
     * @param {Patch} AgentClass The Patch class managed by Patches
     * @param {string} name Name of the AgentSet
     */
    constructor(model, AgentClass, name) {
        // AgentSet sets these variables:
        // model, name, baseSet, world: model.world, agentProto: new AgentClass
        // REMIND: agentProto: defaults, agentSet, world, [name]=agentSet.baseSet
        super(model, AgentClass, name);

        // Skip if a breedSet (don't rebuild patches!).
        if (this.isBreedSet()) return

        this.populate();
        // this.setPixels()
        this.labels = []; // sparse array for labels
    }
    // Set up all the patches.
    populate() {
        repeat(this.model.world.numX * this.model.world.numY, i => {
            this.addAgent(); // Object.create(this.agentProto))
        });
    }

    // Return the offsets from a patch for its 8 element neighbors.
    // Specialized to be faster than inRect below.
    neighborsOffsets(x, y) {
        const { minX, maxX, minY, maxY, numX } = this.model.world;
        if (x === minX) {
            if (y === minY) return [-numX, -numX + 1, 1]
            if (y === maxY) return [1, numX + 1, numX]
            return [-numX, -numX + 1, 1, numX + 1, numX]
        }
        if (x === maxX) {
            if (y === minY) return [-numX - 1, -numX, -1]
            if (y === maxY) return [numX, numX - 1, -1]
            return [-numX - 1, -numX, numX, numX - 1, -1]
        }
        if (y === minY) return [-numX - 1, -numX, -numX + 1, 1, -1]
        if (y === maxY) return [1, numX + 1, numX, numX - 1, -1]
        return [-numX - 1, -numX, -numX + 1, 1, numX + 1, numX, numX - 1, -1]
    }
    // Return the offsets from a patch for its 4 element neighbors (N,S,E,W)
    neighbors4Offsets(x, y) {
        const numX = this.model.world.numX;
        return this.neighborsOffsets(x, y).filter(
            n => Math.abs(n) === 1 || Math.abs(n) === numX
        ) // slightly faster
        // .filter((n) => [1, -1, numX, -numX].indexOf(n) >= 0)
        // .filter((n) => [1, -1, numX, -numX].includes(n)) // slower than indexOf
    }

    /**
     * Return the 8 patch
     * ["Moore" neighbors](https://en.wikipedia.org/wiki/Moore_neighborhood)
     * of the given patch.
     * Will be less than 8 on the edge of the patches
     *
     * @param {Patch} patch a Patch instance
     * @returns {AgentList} An array of the neighboring patches
     */
    neighbors(patch) {
        const { id, x, y } = patch;
        const offsets = this.neighborsOffsets(x, y);
        // const as = new AgentArray(offsets.length)
        const as = new AgentList(this.model, offsets.length);
        offsets.forEach((o, i) => {
            as[i] = this[o + id];
        });
        return as
    }

    /**
     * Return the 4 patch
     * ["Van Neumann" neighbors](https://en.wikipedia.org/wiki/Von_Neumann_neighborhood)
     * of the given patch.
     * Will be less than 4 on the edge of the patches
     *
     * @param {Patch} patch a Patch instance
     * @returns {AgentList} An array of the neighboring patches
     */
    neighbors4(patch) {
        const { id, x, y } = patch;
        const offsets = this.neighbors4Offsets(x, y);
        // const as = new AgentArray(offsets.length)
        const as = new AgentList(this.model, offsets.length);
        offsets.forEach((o, i) => {
            as[i] = this[o + id];
        });
        return as
    }

    /**
     * Assign a DataSet's values into the patches as the given property name
     *
     * @param {DataSet} dataSet An instance of [DataSet](./DataSet.html)
     * @param {string} property A Patch property name
     * @param {boolean} [useNearest=false] Resample to nearest dataset value?
     */
    importDataSet(dataSet, property, useNearest = false) {
        if (this.isBreedSet()) {
            // REMIND: error
            warn('Patches: exportDataSet called with breed, using patches');
            this.baseSet.importDataSet(dataSet, property, useNearest);
            return
        }
        const { numX, numY } = this.model.world;
        const dataset = dataSet.resample(numX, numY, useNearest);
        this.ask(p => {
            p[property] = dataset.data[p.id];
        });
    }
    /**
     * Extract a property from each Patch as a DataSet
     *
     * @param {string} property The patch numeric property to extract
     * @param {Type} [Type=Array] The DataSet array's type
     * @returns {DataSet} A DataSet of the patche's values
     */
    exportDataSet(property, Type = Array) {
        if (this.isBreedSet()) {
            warn('Patches: exportDataSet called with breed, using patches');
            return this.baseSet.exportDataSet(property, Type)
        }
        const { numX, numY } = this.model.world;
        // let data = util.arrayProps(this, property)
        let data = this.props(property);
        data = convertArrayType(data, Type);
        return new DataSet(numX, numY, data)
    }

    // Return id/index given valid x,y integers
    /**
     * Return index into Patches given valid x,y integers
     *
     * @param {number} x Integer X value
     * @param {number} y Integer Y value
     * @returns {number} Integer index into Patches array
     */
    patchIndex(x, y) {
        const { minX, maxY, numX } = this.model.world;
        return x - minX + numX * (maxY - y)
    }

    // Return patch at x,y float values
    // Return undefined if off-world
    patch(x, y) {
        if (!this.model.world.isOnWorld(x, y)) return undefined
        const intX =
            x === this.model.world.maxXcor
                ? this.model.world.maxX
                : Math.round(x); // handle n.5 round up to n + 1
        const intY =
            y === this.model.world.maxYcor
                ? this.model.world.maxY
                : Math.round(y);
        return this.patchXY(intX, intY)
    }
    // Return the patch at x,y where both are valid integer patch coordinates.
    patchXY(x, y) {
        return this[this.patchIndex(x, y)]
    }

    // Patches in rectangle dx, dy from p, dx, dy integers.
    // Both dx & dy are half width/height of rect
    patchRect(p, dx, dy = dx, meToo = true) {
        // Return cached rect if one exists.
        if (p.rectCache) {
            const index = this.cacheIndex(dx, dy, meToo);
            const rect = p.rectCache[index];
            if (rect) return rect
        }
        // const rect = new AgentArray()
        const rect = new AgentList(this.model);
        let { minX, maxX, minY, maxY } = this.model.world;
        minX = Math.max(minX, p.x - dx);
        maxX = Math.min(maxX, p.x + dx);
        minY = Math.max(minY, p.y - dy);
        maxY = Math.min(maxY, p.y + dy);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const pnext = this.patchXY(x, y);
                if (p !== pnext || meToo) rect.push(pnext);
            }
        }
        return rect
    }
    // Return patchRect given legal x, y values
    patchRectXY(x, y, dx, dy = dx, meToo = true) {
        return this.patchRect(this.patch(x, y), dx, dy, meToo)
    }

    // Performance: create a cached rect of this size in sparse array.
    // Index of cached rect is dx * dy + meToo ? 0 : -1.
    // This works for edge rects that are not that full size.
    // patchRect will use this if matches dx, dy, meToo.
    cacheIndex(dx, dy = dx, meToo = true) {
        return (2 * dx + 1) * (2 * dy + 1) + (meToo ? 0 : -1)
    }
    cacheRect(dx, dy = dx, meToo = true, clear = true) {
        const index = this.cacheIndex(dx, dy, meToo);
        this.ask(p => {
            if (!p.rectCache || clear) p.rectCache = [];
            const rect = this.inRect(p, dx, dy, meToo);
            p.rectCache[index] = rect;
        });
    }

    // Return patches within the patch rect, dx, dy integers
    // default is square & meToo
    inRect(patch, dx, dy = dx, meToo = true) {
        const pRect = this.patchRect(patch, dx, dy, meToo);
        if (this.isBaseSet()) return pRect
        return pRect.withBreed(this)
    }
    // Return patches within float radius distance of patch
    inRadius(patch, radius, meToo = true) {
        const dxy = Math.ceil(radius);
        const pRect = this.inRect(patch, dxy, dxy, meToo);
        return pRect.inRadius(patch, radius, meToo)
    }
    // Patches in cone from patch in direction `heading`,
    // with `coneAngle` width and within float `radius`
    inCone(patch, radius, coneAngle, heading, meToo = true) {
        const dxy = Math.ceil(radius);
        const pRect = this.inRect(patch, dxy, dxy, meToo);
        // // Using AgentArray's inCone, using radians
        // heading = this.model.toRads(heading)
        // coneAngle = this.model.toAngleRads(coneAngle)
        // return pRect.inCone(patch, radius, coneAngle, heading, meToo)
        return pRect.inCone(patch, radius, coneAngle, heading, meToo)
    }

    // Return patch at distance and angle from obj's (patch or turtle)
    // x, y (floats). If off world, return undefined.
    // Does not take into account the angle of the agent.
    patchAtHeadingAndDistance(agent, heading, distance) {
        heading = this.model.toRads(heading);
        let { x, y } = agent;
        x = x + distance * Math.cos(heading);
        y = y + distance * Math.sin(heading);
        return this.patch(x, y)
    }

    // Return true if patch on edge of world
    isOnEdge(patch) {
        const { x, y } = patch;
        const { minX, maxX, minY, maxY } = this.model.world;
        return x === minX || x === maxX || y === minY || y === maxY
    }
    // returns the edge patches for this breed.
    // generally called with patches.baseSet/model.patches.
    edgePatches() {
        return this.filter(p => this.isOnEdge(p))
    }

    // Diffuse the value of patch variable `p.v` by distributing `rate` percent
    // of each patch's value of `v` to its neighbors.
    // If the patch has less than 4/8 neighbors, return the extra to the patch.
    diffuse(v, rate) {
        this.diffuseN(8, v, rate);
    }
    diffuse4(v, rate) {
        this.diffuseN(4, v, rate);
    }
    diffuseN(n, v, rate) {
        // Note: for-of loops removed: chrome can't optimize them
        // test/apps/patches.js 22fps -> 60fps
        // zero temp variable if not yet set
        if (this[0]._diffuseNext === undefined) {
            // for (const p of this) p._diffuseNext = 0
            for (let i = 0; i < this.length; i++) this[i]._diffuseNext = 0;
        }

        // pass 1: calculate contribution of all patches to themselves and neighbors
        // for (const p of this) {
        for (let i = 0; i < this.length; i++) {
            const p = this[i];
            const dv = p[v] * rate;
            const dvn = dv / n;
            const neighbors = n === 8 ? p.neighbors : p.neighbors4;
            const nn = neighbors.length;
            p._diffuseNext += p[v] - dv + (n - nn) * dvn;
            // for (const n of neighbors) n._diffuseNext += dvn
            for (let i = 0; i < neighbors.length; i++) {
                neighbors[i]._diffuseNext += dvn;
            }
        }
        // pass 2: set new value for all patches, zero temp,
        // for (const p of this) {
        for (let i = 0; i < this.length; i++) {
            const p = this[i];
            p[v] = p._diffuseNext;
            p._diffuseNext = 0;
        }
    }
}

// Class Patch instances represent a rectangle on a grid.  They hold variables
// that are in the patches the turtles live on.  The set of all patches
// is the world on which the turtles live and the model runs.

// Flyweight object creation:
// Objects within AgentSets use "prototypal inheritance" via Object.create().
// Here, the Patch class is given to Patches for use creating Proto objects
// (new Patch(agentSet)), but only once per model/breed.
// The flyweight Patch objects are created via Object.create(protoObject),
// This lets the new Patch(agentset) object be "defaults".
// https://medium.com/dailyjs/two-headed-es6-classes-fe369c50b24

/**
 * Class Patch instances represent a square on the Patches grid.  They hold variables
 * that are in the patches the turtles live on.  The set of all patches
 * is the world on which the turtles live and the model runs.
 *
 * **TODO: Document Patch properties and methods.**
 *
 * @export
 * @class
 */
class Patch {
    // Set by AgentSet
    agentSet
    model
    name

    static defaultVariables() {
        // Core variables for patches.
        return {
            turtles: undefined, // the turtles on me. Lazy evalued, see turtlesHere
            z: 0, // default shared z val. Can be overridden
        }
    }
    // Initialize a Patch given its Patches AgentSet.
    constructor() {
        Object.assign(this, Patch.defaultVariables());
    }
    // Getter for x,y derived from patch id, thus no setter.
    get x() {
        return (this.id % this.model.world.width) + this.model.world.minX
    }
    get y() {
        return (
            this.model.world.maxY - Math.floor(this.id / this.model.world.width)
        )
    }
    // get z() {
    //     return 0
    // }
    // set z(z) {}
    isOnEdge() {
        return this.patches.isOnEdge(this)
    }

    // Getter for neighbors of this patch.
    // Uses lazy evaluation to promote neighbors to instance variables.
    // To avoid promotion, use `patches.neighbors(this)`.
    // Promotion makes getters accessed only once.
    // defineProperty required: can't set this.neighbors when getter defined.
    /**
     * A list of this patch's 8
     * [Moore neighbors](https://en.wikipedia.org/wiki/Moore_neighborhood).
     */
    get neighbors() {
        // lazy promote neighbors from getter to instance prop.
        const n = this.patches.neighbors(this);
        Object.defineProperty(this, 'neighbors', { value: n, enumerable: true });
        return n
    }
    /**
     * A list of this patch's 4
     * [Von Neumann neighbors](https://en.wikipedia.org/wiki/Von_Neumann_neighborhood)
     * (north, south, east, west).
     */
    get neighbors4() {
        const n = this.patches.neighbors4(this);
        Object.defineProperty(this, 'neighbors4', {
            value: n,
            enumerable: true,
        });
        return n
    }

    // Promote this.turtles on first call to turtlesHere.
    turtlesHere() {
        if (this.turtles == null) {
            this.patches.ask(p => {
                // p.turtles = new AgentArray()
                p.turtles = new AgentList(this.model);
            });
            this.model.turtles.ask(t => {
                t.patch.turtles.push(t);
            });
        }
        return this.turtles
    }
    // Returns above but returning only turtles of this breed.
    breedsHere(breed) {
        const turtles = this.turtlesHere();
        return turtles.withBreed(breed)
    }

    // 6 methods in both Patch & Turtle modules
    // Distance from me to x, y.
    // 2.5D: use z too if both z & this.z exist.
    // REMIND: No off-world test done
    distanceXY(x, y, z = null) {
        const useZ = z != null && this.z != null;
        return useZ
            ? distance3(this.x, this.y, this.z, x, y, z)
            : distance(this.x, this.y, x, y)
    }
    // Return distance from me to object having an x,y pair (turtle, patch, ...)
    // 2.5D: use z too if both agent.z and this.z exist
    // distance (agent) { this.distanceXY(agent.x, agent.y) }
    distance(agent) {
        const { x, y, z } = agent;
        return this.distanceXY(x, y, z)
    }

    // distanceXY(x, y) {
    //     return util.distance(this.x, this.y, x, y)
    // }
    // // Return distance from me to object having an x,y pair (turtle, patch, ...)
    // distance(agent) {
    //     return this.distanceXY(agent.x, agent.y)
    // }

    // Return heading towards agent/x,y using current geometry
    towards(agent) {
        return this.towardsXY(agent.x, agent.y)
    }
    towardsXY(x, y) {
        // return util.radiansTowardXY(this.x, this.y, x, y)
        let rads = radiansTowardXY(this.x, this.y, x, y);
        return this.model.fromRads(rads)
    }
    // Return patch w/ given parameters. Return undefined if off-world.
    // Return patch dx, dy from my position.
    patchAt(dx, dy) {
        return this.patches.patch(this.x + dx, this.y + dy)
    }
    patchAtHeadingAndDistance(heading, distance) {
        return this.patches.patchAtHeadingAndDistance(this, heading, distance)
    }

    sprout(num = 1, breed = this.model.turtles, initFcn = turtle => {}) {
        return breed.create(num, turtle => {
            turtle.setxy(this.x, this.y);
            initFcn(turtle);
        })
    }
}

// export default Patch

/**
 * A {@link Turtle} is an object living on the {@link Patches} world.
 * Their coordinates are floats, unlike Patches with integer coordinates.
 * They can morph between types of turtles (breeds) and storee information,
 * both within themselves but also on Patches and Links.
 *
 * The Turtles (plural) array, (AgentSet) is a collection of Turtle objects
 * that the Turtles array creates and manages.
 *
 * You do not create either individual Turtle objects, the Turtles array does.
 * You also do not create the Turtles array, class {@link Model} does.
 *
 * You use both, however, using the methods they both provide.
 *
 * @extends {AgentSet}
 *
 * @param {Model} model The model I belong to
 * @param {Turtle|Turtle3d} AgentClass The Turtle class
 * @param {string} name The name of this new Turtles instance
 * @param {null|Turtles} [baseSet=null] Used to create a breed subclass
 */
class Turtles extends AgentSet {
    constructor(model, AgentClass, name, baseSet = null) {
        super(model, AgentClass, name, baseSet);
    }

    /**
     * Create a single Turtle, adding it to this Turtles array.
     * The init function is called to initialize the new Turtle.
     * Returns the new Turtle.
     *
     * @param {Function} [initFcn=turtle => {}]
     * @return {Turtle} The newly created Turtle
     */
    createOne(initFcn = turtle => {}) {
        const turtle = this.addAgent();
        // NetLogo docs: Creates number new turtles at the origin.
        // New turtles have random integer headings
        // turtle.theta = util.randomFloat(Math.PI * 2)
        turtle.heading = this.model.fromRads(randomFloat(Math.PI * 2));
        initFcn(turtle);
        return turtle
    }
    /**
     * Create num Turtles, adding them to this Turtles array.
     * The init function is called to initialize the new Turtle.
     * Returns an array of the new Turtles
     *
     * @param {Function} [initFcn=turtle => {}]
     * @return {Array} The newly created Turtles
     */
    create(num, initFcn = turtle => {}) {
        return repeat(num, (i, a) => {
            a.push(this.createOne(initFcn));
        })
    }

    /**
     * Return the closest turtle within radius distance of x,y.
     * Return null if no turtles within radius.
     * If I am a breed, return the closest fellow breed.
     *
     * @param {number} x X coordinate
     * @param {number} y Y coordinate
     * @param {number} radius Radius in patches units
     * @return {Turtle} The closest Turtle
     */
    closestTurtle(x, y, radius) {
        const ts = this.inPatchRectXY(x, y, radius);
        if (ts.length === 0) return null
        return ts.minOneOf(t => t.distanceXY(x, y))
        //pDisk.minOneOf(t => t.dist)
    }

    /**
     * Return an array of Turtles within the array of patchs.
     * If I am a breed, return only the Turtles of my breed.
     *
     * @param {Patch[]} patches Array of patches
     * @returns {AgentList} The turtles withn the Patches array.
     */
    inPatches(patches) {
        let array = new AgentList(this.model);
        for (const p of patches) array.push(...p.turtlesHere());
        // REMIND: can't use withBreed .. its not an AgentSet. Move to AgentArray?
        if (this.isBreedSet()) array = array.filter(a => a.agentSet === this);
        return array
    }

    /**
     * Return an array of Turtles within the dx,dy patchRect centered on turtle.
     * If I am a breed, return only the Turtles of my breed.
     *
     * @param {Turtle} turtle The Turtle at the patchRect center.
     * @param {number} dx The integer x radius of the patchRect
     * @param {number} [dy=dx] The integer y radius of the patchRect
     * @param {boolean} [meToo=false] Whether or not to return me as well
     * @return {AgentList} The turtles within the patchRect
     */
    inPatchRect(turtle, dx, dy = dx, meToo = false) {
        const agents = this.inPatchRectXY(turtle.x, turtle.y, dx, dy);
        if (!meToo) removeArrayItem(agents, turtle);
        return agents
    }
    /**
     * Return an array of Turtles within the dx,dy patchRect centered on x,y.
     * If I am a breed, return only the Turtles of my breed.
     *
     * @param {number} x the patchRect center's integer x value
     * @param {number} y the patchRect center's integer y value
     * @param {number} dx The integer x radius of the patchRect
     * @param {number} [dy=dx] The integer y radius of the patchRect
     * @param {boolean} [meToo=false] Whether or not to return me as well
     * @return {AgentList} The turtles within the patchRect
     */
    inPatchRectXY(x, y, dx, dy = dx) {
        const patches = this.model.patches.patchRectXY(x, y, dx, dy, true);
        return this.inPatches(patches)
    }

    /**
     * Return all the Turtles within radius of me.
     * If I am a breed, return only fellow breeds.
     *
     * @param {Turtle} turtle
     * @param {number} radius
     * @param {boolean} [meToo=false] Whether or not to return me as well
     * @return {AgentList} The turtles within radius of me
     */
    inRadius(turtle, radius, meToo = false) {
        const agents = this.inPatchRect(turtle, radius, radius, true);
        return agents.inRadius(turtle, radius, meToo)
    }
    /**
     * Return all the Turtles with a cone of me.
     * The cone is coneAngle wide, centered on my heading.
     * If I am a breed, return only fellow breeds.
     *
     * @param {Turtle} turtle
     * @param {number} radius
     * @param {boolean} [meToo=false] Whether or not to return me as well
     * @return {AgentList} The turtles within the cone.
     */
    inCone(turtle, radius, coneAngle, meToo = false) {
        const agents = this.inPatchRect(turtle, radius, radius, true);
        return agents.inCone(turtle, radius, coneAngle, turtle.heading, meToo)
    }

    /**
     * Position the Turtles in this breed in an equally spaced circle
     * of the given center and radius.
     * The turtle headings will be away from the center.
     *
     * @param {number} [radius=this.model.world.maxX * 0.9] The circle's radius
     * @param {Array} [center=[0, 0]] An x,y array
     */
    layoutCircle(radius = this.model.world.maxX * 0.9, center = [0, 0]) {
        const startAngle = Math.PI / 2; // up
        const direction = -1; // Clockwise
        const dTheta = (2 * Math.PI) / this.length;
        const [x0, y0] = center;
        this.ask((turtle, i) => {
            turtle.setxy(x0, y0);
            turtle.theta = startAngle + direction * dTheta * i;
            turtle.forward(radius);
        });
    }
}

// export default Turtles

/**
 * Class Turtle instances represent the dynamic, behavioral element of modeling.
 * Each turtle knows the patch it is on, and interacts with that and other
 * patches, as well as other turtles. They are also the end points of Links.
 *
 * You do not call `new Turtle()`, instead class Turtles
 * creates it's Turtle instances. I.e. class Turtles is a factory
 * for all of it's Turtle instances. So *don't* do this:
 */
class Turtle {
    atEdge = 'wrap'
    // Set by AgentSet
    agentSet
    model
    name

    // Alas doesn't work
    // /**
    //  * @ignore
    //  */
    constructor() {
        // this.agentSet = this.atEdge = this.model = null // needed by jsDoc
        // Object.assign(this, Turtle.defaultVariables())
    }
    agentConstructor() {
        this.theta = null;
        this.x = 0;
        this.y = 0;
        this.agentSet.setDefault('z', null);
    }

    /**
     * Ask this turtle to "die"
     * - Removes itself from the Turtles array
     * - Removes itself from any Turtles breeds
     * - Removes all my Links if any exist
     * - Removes me from my Patch list of turtles on it
     * - Set it's id to -1 to indicate to others it's gone
     */
    die() {
        this.agentSet.removeAgent(this); // remove me from my baseSet and breed
        // Remove my links if any exist.
        // Careful: don't promote links
        if (this.hasOwnProperty('links')) {
            while (this.links.length > 0) this.links[0].die();
        }
        // Remove me from patch.turtles cache if patch.turtles array exists
        // if (this.patch.turtles != null) {
        //     util.removeArrayItem(this.patch.turtles, this)
        // }
        if (this.patch && this.patch.turtles)
            removeArrayItem(this.patch.turtles, this);

        // Set id to -1, indicates that I've died.
        // Useful when other JS objects contain turtles. Views for example.
        this.id = -1;
    }

    /**
     * Factory method: create num new turtles at this turtle's location.
     *
     * @param {number} [num=1] The number of new turtles to create
     * @param {AgentSet} [breed=this.agentSet] The type of turtles to create,
     * defaults to my type
     * @param {Function} [init=turtle => {}] A function to initialize the new
     * turtles, defaults to no-op
     * @returns {Array} An Array of the new Turtles, generally ignored
     * due to the init function
     */
    hatch(num = 1, breed = this.agentSet, init = turtle => {}) {
        return breed.create(num, turtle => {
            // turtle.setxy(this.x, this.y)
            turtle.setxy(this.x, this.y, this.z);
            turtle.theta = this.theta;
            // hatched turtle inherits parents' ownVariables
            for (const key of breed.ownVariables) {
                if (turtle[key] == null) turtle[key] = this[key];
            }
            init(turtle);
        })
    }
    // Getter for links for this turtle.
    // Uses lazy evaluation to promote links to instance variables.
    /**
     * Returns an array of the Links that have this Turtle as one of the end points
     * @returns {Array} An AgentList Array of my Links
     */
    get links() {
        // lazy promote links from getter to instance prop.
        Object.defineProperty(this, 'links', {
            value: new AgentList(this.model),
            enumerable: true,
        });
        return this.links
    }
    /**
     * Return the patch this Turtle is on. Return null if Turtle off-world.
     */
    get patch() {
        return this.model.patches.patch(this.x, this.y)
    }

    /**
     * Return this Turtle's heading
     */
    get heading() {
        return this.model.fromRads(this.theta)
    }
    /**
     * Sets this Turtle's heading
     */
    set heading(heading) {
        this.theta = this.model.toRads(heading);
    }
    /**
     * Computes the difference between the my heading and the given heading,
     * the smallest angle by which t could be rotated to produce heading.
     *
     * @param {Angle} heading The heading I wish to be roated to.
     * @return {Angle}
     */
    subtractHeading(heading) {
        // // Using rads so will work with any geometry.
        // const rads1 = this.model.toRads(this.heading)
        // const rads2 = this.model.toRads(heading)
        // const diff = util.subtractRadians(rads2, rads1)
        // return this.model.fromRads(diff)
        return subtractHeadings(heading, this.heading)
    }

    /**
     * Set Turtles x, y position. If z given, override default z of 0.
     *
     * @param {number} x Turtle's x coord, a Float in patch space
     * @param {number} y Turtle's Y coord, a Float in patch space
     * @param {number|undefined} [z=undefined] Turtle's Z coord if given
     */
    setxy(x, y, z = undefined) {
        const p0 = this.patch;
        this.x = x;
        this.y = y;
        if (z != null) this.z = z;

        this.checkXYZ(p0);
    }
    checkXYZ(p0) {
        this.checkEdge();
        this.checkPatch(p0);
    }
    checkEdge() {
        const { x, y, z } = this;
        // if (!(this.model.world.isOnWorld(x, y, z) || this.atEdge === 'OK')) {
        if (!this.model.world.isOnWorld(x, y, z) && this.atEdge !== 'OK') {
            this.handleEdge(x, y, z);
        }
    }
    checkPatch(p0) {
        const p = this.patch;

        if (p != p0) {
            if (p0 && p0.turtles) removeArrayItem(p0.turtles, this);
            if (p && p.turtles) p.turtles.push(this);
        }
        // if (p && p.turtles != null && p !== p0) {
        //     // util.removeItem(p0.turtles, this)
        //     if (p0) util.removeArrayItem(p0.turtles, this)
        //     p.turtles.push(this)
        // }
    }
    /**
     * Handle turtle x,y,z if turtle off-world.
     * Uses the Turtle's atEdge property to determine how to manage the Turtle.
     * Defaults to 'wrap', wrapping the x,y,z to the opposite edge.
     *
     * atEdge can be:
     * - 'wrap'
     * - 'bounce'
     * - 'clamp'
     * - a function called with the Turtle as it's argument
     *
     * @param {number} x Turtle's x coord
     * @param {number} y Turtle's y coord
     * @param {number|undefined} [z=undefined] Turtle's z coord if not undefined
     */
    handleEdge(x, y, z = undefined) {
        let atEdge = this.atEdge;

        if (isString(atEdge)) {
            const {
                minXcor,
                maxXcor,
                minYcor,
                maxYcor,
                minZcor,
                maxZcor,
            } = this.model.world;

            if (atEdge === 'wrap') {
                this.x = wrap(x, minXcor, maxXcor);
                this.y = wrap(y, minYcor, maxYcor);
                if (z != null) this.z = wrap(z, minZcor, maxZcor);
            } else if (atEdge === 'clamp' || atEdge === 'bounce') {
                this.x = clamp(x, minXcor, maxXcor);
                this.y = clamp(y, minYcor, maxYcor);
                if (z != null) this.z = clamp(z, minZcor, maxZcor);

                if (atEdge === 'bounce') {
                    if (this.x === minXcor || this.x === maxXcor) {
                        this.theta = Math.PI - this.theta;
                    } else if (this.y === minYcor || this.y === maxYcor) {
                        this.theta = -this.theta;
                    } else if (this.z === minZcor || this.z === maxZcor) {
                        if (this.pitch) {
                            this.pitch = -this.pitch;
                        } else {
                            this.z = wrap(z, minZcor, maxZcor);
                        }
                    }
                }
            } else {
                throw Error(`turtle.handleEdge: bad atEdge: ${atEdge}`)
            }
        } else {
            this.atEdge(this);
        }
    }
    /**
     * Place the turtle at the given patch/turtle location
     *
     * @param {Patch|Turtle} agent A Patch or Turtle who's location is used
     */
    moveTo(agent) {
        // this.setxy(agent.x, agent.y)
        this.setxy(agent.x, agent.y, agent.z);
    }
    /**
     * Move forward, along the Turtle's heading d units in Patch coordinates
     *
     * @param {number} d The distance to move
     */
    forward(d) {
        this.setxy(
            this.x + d * Math.cos(this.theta),
            this.y + d * Math.sin(this.theta)
        );
    }

    /**
     * Change Turtle's heading by angle
     *
     * @param {number} angle The angle to rotate by
     */
    rotate(angle) {
        angle = this.model.toCCW(angle);
        this.heading += angle;
    }
    /**
     * Turn Turtle right by angle
     *
     * @param {number} angle The angle to rotate by
     */
    right(angle) {
        this.rotate(-angle);
    }
    /**
     * Turn Turtle left by angle
     *
     * @param {number} angle The angle to rotate by
     */
    left(angle) {
        this.rotate(angle);
    }

    /**
     * Turn turtle so at to be facing the given Turtle or Patch
     *
     * @param {Patch|Turtle} agent The agent to face towards
     */
    face(agent) {
        // this.theta = this.towards(agent)
        this.heading = this.towards(agent);
    }
    /**
     * Turn turtle so at to be facing the given x, y patch coordinate
     *
     * @param {number} x The x coordinate
     * @param {number} y The y coordinate
     */
    facexy(x, y) {
        // this.theta = this.towardsXY(x, y)
        this.heading = this.towardsXY(x, y);
    }

    /**
     * Return the patch ahead of this turtle by distance.
     * Return undefined if the distance puts the patch off-world
     * @param {number} distance The distance ahead
     * @return {Patch|undefined} The patch at the distance ahead of this Turtle
     */
    patchAhead(distance) {
        return this.patchAtHeadingAndDistance(this.heading, distance)
    }
    /**
     * Return the patch angle to the right and ahead by distance
     * Return undefined if the distance puts the patch off-world
     * @param {number} angle The angle to the right
     * @param {number} distance The distance ahead
     * @return {Patch|undefined} The patch found, or undefined if off-world
     */
    patchRightAndAhead(angle, distance) {
        // if (this.model.geometry === 'heading') angle = -angle
        angle = this.model.toCCW(angle);
        return this.patchAtHeadingAndDistance(this.heading - angle, distance)
    }
    /**
     * Return the patch angle to the left and ahead by distance
     * Return undefined if the distance puts the patch off-world
     * @param {number} angle The angle to the left
     * @param {number} distance The distance ahead
     * @return {Patch|undefined} The patch found, or undefined if off-world
     */
    patchLeftAndAhead(angle, distance) {
        return this.patchRightAndAhead(-angle, distance)
    }
    /**
     * Can I move forward by distance and not be off-world?
     * @param {number} distance The distance ahead
     * @return {Boolean} True if moving forward by distance is on-world
     */
    canMove(distance) {
        return this.patchAhead(distance) != null
    }

    /**
     * Distance from this turtle to x, y
     * No off-world test done.
     *
     * 2.5D: use z too if both z & this.z exist.
     * @param {number} x
     * @param {number} y
     * @param {number|undefined} [z=null]
     * @return {*}
     */
    distanceXY(x, y, z = null) {
        const useZ = z != null && this.z != null;
        return useZ
            ? distance3(this.x, this.y, this.z, x, y, z)
            : distance(this.x, this.y, x, y)
    }
    /**
     * Return distance from me to the Patch or Turtle
     *
     * 2.5D: use z too if both agent.z and this.z exist
     * @param {*} agent
     * @return {*}
     */
    distance(agent) {
        const { x, y, z } = agent;
        return this.distanceXY(x, y, z)
    }
    /**
     * A property for the x-increment if the turtle were to take one step
     * forward in its current heading.
     * @readonly
     */
    get dx() {
        return Math.cos(this.theta)
    }
    /**
     * A property for the y-increment if the turtle were to take one step
     * forward in its current heading.
     * @readonly
     */
    get dy() {
        return Math.sin(this.theta)
    }

    /**
     * Return the heading towards the Patch or Turtle given.
     * @param {Patch|Turtle} agent The agent who's angle from this Turtle we use
     * @return {number} The angle towards the agent
     */
    towards(agent) {
        return this.towardsXY(agent.x, agent.y)
    }
    /**
     * Return the heading towards the given x,y coordinates.
     * @param {number} x The x coordinarte
     * @param {number} y The y coordinarte
     * @return {number} The angle towards x,y
     */
    towardsXY(x, y) {
        // return util.radiansTowardXY(this.x, this.y, x, y)
        let rads = radiansTowardXY(this.x, this.y, x, y);
        // rads = this.model.toCCW(rads)
        return this.model.fromRads(rads)
    }
    /**
     * The patch at dx, dy from my current position.
     * Return undefined if off-world
     * @param {number} dx The delta x ahead
     * @param {number} dy The delta y ahead
     * @return {Patch|undefined} The patch dx, dy ahead; undefined if off-world
     */
    patchAt(dx, dy) {
        return this.model.patches.patch(this.x + dx, this.y + dy)
    }

    /**
     * Return the patch at the absolute, not relative heading and distance
     * from this turtle. Return undefined if off-world
     *
     * Use the Left/Right versions for relative heading.
     * @param {number} heading The absolute angle from this turtle
     * @param {number} distance The distance ahead
     * @return {Patch|undefined} The Patch, or undefined if off-world
     */
    patchAtHeadingAndDistance(heading, distance) {
        return this.model.patches.patchAtHeadingAndDistance(
            this,
            heading,
            distance
        )
    }

    /**
     * Return the other end of this link from me. Link must include me!
     *
     * See links property for all my links, if any.
     * @param {Link} l
     * @return {Turtle} The other turtle making this Link
     */
    otherEnd(l) {
        return l.end0 === this ? l.end1 : l.end0
    }
    // Return all turtles linked to me
    /**
     * Return all turtles linked to me. Basically me.otherEnd of all my links.
     * @return {Array} All the turtles linked to me
     */
    linkNeighbors() {
        return this.links.map(l => this.otherEnd(l))
    }
    /**
     * Is the given Turtle linked to me?
     * @param {Turtle} t
     * @return {Boolean}
     */
    isLinkNeighbor(t) {
        return t in this.linkNeighbors()
    }
}

class Turtle3D extends Turtle {
    static defaultVariables() {
        return {
            atEdge: 'wrap',
        }
    }
    // Initialize a Turtle given its Turtles AgentSet.
    constructor() {
        super();
        Object.assign(this, Turtle3D.defaultVariables());
        // this.obj3d = new Object3D()
        // this.obj3d.rotation.order = 'ZYX'
        // this.reset()
    }
    // Called by ctor factory for each new agent.
    // constructor above called only once per agentset due to two-headed agents.
    agentConstructor() {
        this.obj3d = new Object3D();
        this.obj3d.rotation.order = 'ZYX';
        this.reset();
    }
    reset() {
        this.obj3d.position.set(0, 0, 0);
        this.obj3d.rotation.set(0, 0, 0);
        this.heading = 0;
        // this.pitch = 0
        // this.roll = 0
    }

    setxyz(x, y, z) {
        super.setxy(x, y, z);
        // setxy sets this.x,y,z, includes us.
        // this.obj3d.position.set(x, y, z)
    }
    getxyz() {
        return this.obj3d.position.toArray()
    }
    setRotation(x, y, z) {
        this.obj3d.rotation.set(x, y, z);
        // super/this.theta = this.obj3d.rotation.z ????
    }
    getRotation() {
        const { x, y, z } = this.obj3d.rotation; // .reorder('ZYX')
        return [x, y, z]
    }
    getThetaPhiPsi() {
        return this.getRotation().reverse()
    }
    getHeadingPitchRoll() {
        const [psi, phi, theta] = this.getRotation();
        const heading = radToHeading(theta);
        const pitch = radToDeg(-phi);
        const roll = radToDeg(psi);
        return [heading, pitch, roll]
        // return [this.heading, this.pitch, this.roll] // ????
    }
    getDxDyDz() {
        return [this.dx, this.dy, this.dz]
    }
    // REMIND: temporary.
    // handleEdge(x, y, z) {
    //     super.handleEdge(x, y, z)
    //     this.setxyz(this.x, this.y, this.z)
    // }

    get x() {
        return this.obj3d.position.x
    }
    set x(d) {
        this.obj3d.position.x = d;
    }
    get y() {
        return this.obj3d.position.y
    }
    set y(d) {
        this.obj3d.position.y = d;
    }
    get z() {
        return this.obj3d.position.z
    }
    set z(d) {
        this.obj3d.position.z = d;
    }

    // Trap super's setting of theta
    get theta() {
        // util.warn('theta is deprecated, use heading instead')
        return this.obj3d.rotation.z
    }
    set theta(rad) {
        // util.warn('theta is deprecated, use heading instead')
        if (this.obj3d) this.obj3d.rotation.z = rad;
    }

    get heading() {
        return this.model.fromRads(this.obj3d.rotation.z)
    }
    set heading(angle) {
        this.obj3d.rotation.z = this.model.toRads(angle);
    }
    get pitch() {
        // return -this.model.fromRads(this.obj3d.rotation.y)
        // return -this.model.fromAngleRads(this.obj3d.rotation.y)
        return -this.model.fromAngleRads(this.obj3d.rotation.y)
    }
    set pitch(angle) {
        // this.obj3d.rotation.y = -this.model.toRads(angle)
        // this.obj3d.rotation.y = -this.model.toAngleRads(angle)
        this.obj3d.rotation.y = -this.model.toAngleRads(angle);
    }
    get roll() {
        // return this.model.fromRads(this.obj3d.rotation.x)
        // return this.model.fromAngleRads(this.obj3d.rotation.x)
        return this.model.fromAngleRads(this.obj3d.rotation.x)
    }
    set roll(angle) {
        // this.obj3d.rotation.x = this.model.toRads(angle)
        // this.obj3d.rotation.x = this.model.toAngleRads(angle)
        this.obj3d.rotation.x = this.model.toAngleRads(angle);
    }

    // Move along the turtle's X axis
    forward(d) {
        const p0 = this.patch;
        this.obj3d.translateX(d);
        super.checkXYZ(p0);
        // let [x, y, z] = this.getxyz()
        // super.setxy(x, y, z)
    }

    // Incremental rotation around given axis
    right(angle) {
        this.left(-angle);
        // this.obj3d.rotateZ(-this.model.toAngleRads(angle))
        // this.theta = this.obj3d.rotation.z
    }
    left(angle) {
        this.obj3d.rotateZ(this.model.toAngleRads(angle));
        // this.right(-angle)
    }
    tiltUp(angle) {
        // this.obj3d.rotateY(-this.model.toAngleRads(angle))
        this.tiltDown(-angle);
    }
    tiltDown(angle) {
        this.obj3d.rotateY(this.model.toAngleRads(angle));
        // this.tiltUp(-angle)
    }
    rollRight(angle) {
        this.obj3d.rotateX(this.model.toAngleRads(angle));
    }
    rollLeft(angle) {
        this.rollRight(-angle);
    }

    facexyz(x1, y1, z1) {
        // const headingTowards = this.model.toRads(this.towardsXY(x1, y1))
        // const pitchTowards = this.model.toRads(this.towardsPitchXYZ(x1, y1, z1)

        const headingTowards = this.towardsXY(x1, y1);
        const pitchTowards = this.towardsPitchXYZ(x1, y1, z1);

        // const roll = this.roll
        // this.obj3d.rotation.set(0, 0, 0)
        this.heading = headingTowards;
        this.pitch = pitchTowards;
        // this.roll = roll
    }
    face(agent) {
        const { x, y, z } = agent;
        this.facexyz(x, y, z);
    }
    towardsPitchXYZ(x1, y1, z1) {
        const [x, y, z] = this.getxyz();
        const [dx, dy, dz] = [x1 - x, y1 - y, z1 - z];
        const xyhypot = Math.hypot(dx, dy);
        const pitchRads = Math.atan2(dz, xyhypot);
        return this.model.fromAngleRads(pitchRads)
    }
    towardsPitch(agent) {
        const { x, y, z } = agent;
        this.towardsPitchXYZ(x, y, z);
    }

    distance(agent) {
        const { x, y, z } = agent;
        return this.distanceXYZ(x, y, z)
    }
    distanceXYZ(x1, y1, z1) {
        const { x, y, z } = this;
        return distance3(x, y, z, x1, y1, z1)
    }

    // From https://ccl.northwestern.edu/netlogo/docs/
    // Note: dx is simply the sine of the turtle's heading, and dy is simply the cosine. (If this is the reverse of what you expected, it's because in NetLogo a heading of 0 is north and 90 is east, which is the reverse of how angles are usually defined in geometry.)
    // Note: In earlier versions of NetLogo, these primitives were used in many situations where the new patch-ahead primitive is now more appropriate.
    // NOTE: dz is simply the sine of the turtle's pitch. Both dx and dy have changed in this case. So, dx = cos(pitch) * sin(heading) and dy = cos(pitch) * cos(heading).

    get dx() {
        const { y: pitch, z: heading } = this.obj3d.rotation;
        return Math.cos(pitch) * Math.cos(heading)
    }
    get dy() {
        const { y: pitch, z: heading } = this.obj3d.rotation;
        return Math.cos(pitch) * Math.sin(heading)
    }
    get dz() {
        const pitch = this.obj3d.rotation.y;
        return Math.sin(pitch)
    }
}

/**
 * Class Model is the primary interface for modelers, integrating
 * the Patches/Patch Turtles/Turtle and Links/Link AgentSets .. i.e.:
 *
 * - model.Patches: an array ({@link Patches}) of {@link Patch} instances
 * - model.Turtles: an array ({@link Turtles}) of {@link Turtle} instances
 * - model.Links: an array ({@link Links}) of {@link Link} instances
 * - model.breed: a sub-array of any of the three above.
 * - All of which are subclasses of ({@link AgentSet}).
 *
 * Convention: Three abstract methods are provided by the modeler
 *
 * - Startup(): (Optional) Called once to import images, data etc
 * - Setup(): Called to initialize the model state.
 * - Step(): Step the model. Will advance ticks if autoTick = true in constructor.
 *
 * @param {Object|World} [worldOptions=World.defaultOptions()]
 * Can be Object of min/max X,Y,Z values or an instance of World
 * @param {boolean} [autoTick=true] Automatically advancee tick count each step if true
 */
class Model {
    world
    patches
    turtles
    links
    ticks

    constructor(worldOptions = World.defaultOptions(), autoTick = true) {
        this.resetModel(worldOptions);
        if (autoTick) this.autoTick();
        // this.setGeometry(this.geometry)
    }

    initAgentSet(name, AgentsetClass, AgentClass) {
        this[name] = new AgentsetClass(this, AgentClass, name);
    }

    resetModel(worldOptions) {
        this.ticks = 0;
        this.world =
            worldOptions.maxXcor === undefined
                ? new World(worldOptions)
                : worldOptions;
        // Base AgentSets setup here. Breeds handled by setup
        this.initAgentSet('patches', Patches, Patch);
        this.initAgentSet('turtles', Turtles, Turtle3D);
        this.initAgentSet('links', Links, Link);
    }

    /**
     * Resets model to initial state w/ new Patches, Turtles, Links.
     * The worldOptions will default to initial values but can be
     * changed by modeler. Setup() often called after reset() to
     * re-initialize the model.
     *
     * @param {Object|World} [worldOptions=this.world] World object
     */
    reset(worldOptions = this.world) {
        this.resetModel(worldOptions);
    }

    /**
     * Increment the tick cound. Not needed if autoTick true
     */
    tick() {
        this.ticks++;
    }

    /**
     * An abstract method to perform one-time initialization.
     *
     * @abstract
     */
    async startup() {}

    /**
     * An abstract method for initializing the model
     *
     * Note: can be used with reset(). This will reinitialize
     * the Patches, Turtles, Links for re-running the model
     *  * reset()
     *  * setup()
     *
     * @abstract
     */
    setup() {}
    /**
     * An abstract method to run the model one step.
     *
     * @abstract
     */
    step() {}

    // A trick to auto advance ticks every step
    stepAndTick() {
        this.step0();
        this.tick();
    }
    autoTick() {
        this.step0 = this.step;
        this.step = this.stepAndTick;
    }

    /**
     * Create breeds (sub-arrays) of Patches. Used in the Exit model:
     * * this.patchBreeds('exits inside wall')
     *
     * @param {string} breedNames A string of space separated breeds names
     */
    patchBreeds(breedNames) {
        for (const breedName of breedNames.split(' ')) {
            this[breedName] = this.patches.newBreed(breedName);
        }
    }
    /**
     * Create breeds (sub-arrays) of Turtles. Used in Wallfollower model:
     * * this.turtleBreeds('lefty righty')
     *
     * @param {string} breedNames A string of space separated breeds names
     */
    turtleBreeds(breedNames) {
        for (const breedName of breedNames.split(' ')) {
            this[breedName] = this.turtles.newBreed(breedName);
        }
    }
    /**
     * Create breeds (sub-arrays) of Links. Used in Roads model:
     * * this.linkBreeds('trips')
     *
     * @param {string} breedNames A string of space separated breeds names
     */
    linkBreeds(breedNames) {
        for (const breedName of breedNames.split(' ')) {
            this[breedName] = this.links.newBreed(breedName);
        }
    }
    // /**
    //  * Set the Geometry of this Model
    //  * * radians: Set the model to use native Javascript angles.<br>
    //  *   [See Math module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math#converting_between_degrees_and_radians)
    //  * * degrees: Use degrees rather than radians. <br>
    //  *   The above with degree<>radian conversions done for you.
    //  * * heading: Use "Clock" geometry:<br>
    //  *   Degrees with 0 "up" and angles Clockwise.
    //  * @param {string} name One of 'radians', 'degrees', 'heading'
    //  */
    // setGeometry(name) {
    //     const geometry = geometries[name]
    //     if (!geometry)
    //         throw Error(`model.setGeometry: ${name} geometry not defined`)
    //     Object.assign(this, geometry)
    //     this.geometry = name
    // }

    toRads = deg => (90 - deg) * toRad
    fromRads = rads => 90 - rads * toDeg
    toAngleRads = deg => deg * toRad
    fromAngleRads = rads => rads * toDeg
    toCCW = angle => -angle
}

// Add mod2pi & mod360
const toDeg = 180 / Math.PI;
const toRad = Math.PI / 180;

// let toRads = deg => (90 - deg) * toRad
// let fromRads = rads => 90 - rads * toDeg
// let toAngleRads = deg => deg * toRad
// let toCCW = angle => -angle

// const geometries = {
//     radians: {
//         toRads: rads => rads,
//         fromRads: rads => rads,
//         toAngleRads: rads => rads,
//         toCCW: angle => angle,
//         // toDeltaRads: rads => rads,
//         // fromDeltaRads: rads => rads,
//     },
//     degrees: {
//         toRads: deg => deg * toRad,
//         fromRads: rads => rads * toDeg,
//         toAngleRads: deg => deg * toRad,
//         toCCW: angle => angle,
//         // toDeltaRads: deg => deg * toRad,
//         // fromDeltaRads: rads => rads * toDeg,
//     },
//     heading: {
//         toRads: deg => (90 - deg) * toRad,
//         fromRads: rads => 90 - rads * toDeg,
//         toAngleRads: deg => deg * toRad,
//         toCCW: angle => -angle,
//         // toDeltaRads: deg => -deg * toRad,
//         // fromDeltaRads: rads => -rads * toDeg,
//     },
// }

// export default Model

// The mapbox elevation formula:
// https://blog.mapbox.com/global-elevation-data-6689f1d0ba65
// mapbox: ((red * 256 * 256 + green * 256 + blue) * 0.1)  -10000
//      min = -10000; scale = 0.1
// mapzen/amazon: (red * 256 + green + blue / 256) - 32768
//      min = -32768; scale = 1/256

class RGBDataSet extends DataSet {
    static rgbToInt24(r, g, b) {
        return r * 256 * 256 + g * 256 + b
    }

    // Constructor args: (img, rgbToData, ArrayType)
    // where rgbToData(r,g,b) returns a number for the dataset.
    // For Redfish tiles, use
    //   new RGBDataSet(img, RGBDataSet.redfishElevation)
    // For Mapzen use
    //   new RGBDataSet(img, RGBDataSet.newMapzenElevation())
    // which constructs the r,g,b function from the mapzen min, scale values.
    // Similarly for mapbox using a min, scale function.
    constructor(
        img,
        rgbToData = RGBDataSet.rgbToInt24,
        ArrayType = Float32Array
    ) {
        super(img.width, img.height, new ArrayType(img.width * img.height));

        if (Array.isArray(rgbToData))
            rgbToData = RGBDataSet.newRgbDataFunction(rgbToData);

        const ctx = createCtx(img.width, img.height);
        fillCtxWithImage(ctx, img);
        const imgData = ctxImageData(ctx);

        const convertedData = this.data;
        for (var i = 0; i < convertedData.length; i++) {
            const r = imgData.data[4 * i];
            const g = imgData.data[4 * i + 1];
            const b = imgData.data[4 * i + 2];
            convertedData[i] = rgbToData(r, g, b);
        }
    }
}

// export default RGBDataSet

export { AgentArray, AgentList, AgentSet, DataSet, Link, Links, Model, Object3D, Patch, Patches, RGBDataSet, Turtle, Turtles, World, gis, utils as util };