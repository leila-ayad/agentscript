// import * as util from '../src/utils.js'

const { PI, atan, atan2, cos, floor, log, pow, sin, sinh, sqrt, tan, abs } =
    Math
const radians = degrees => (degrees * PI) / 180
const degrees = radians => (radians * 180) / PI

// Current gis and geoJson uses lon/lat coords, i.e. x,y.
// This converts to latlon, i.e. y,x.
export function latlon(lonlat) {
    if (typeof lonlat[0] !== 'number') return lonlat.map(val => latlon(val))
    return [lonlat[1], lonlat[0]]
}

// Tiles use a ZXY corrd system. We use lower case below.
// Tile Helpers http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
// Convert lon,lats to tile X,Ys
export function lonz2x(lon, z) {
    return floor(((lon + 180) / 360) * pow(2, z))
}
export function latz2y(lat, z, roundInt = false) {
    const latRads = radians(lat)
    let y = (1 - log(tan(latRads) + 1 / cos(latRads)) / PI) * pow(2, z - 1)
    if (roundInt && Number.isInteger(y)) return y - 1
    return floor(y)
}
export function lonlatz2xy(lon, lat, z, roundLat = false) {
    return [lonz2x(lon, z), latz2y(lat, z, roundLat)]
}
// export function lonlatz2xyz(lon, lat, z) {
//     return [lonz2x(lon, z), latz2y(lat, z), z]
// }

// returns top-left, or north-west lon, lat of given tile X Y Z's
// adding 1 to either x,y or both gives other corner lonlats
export function xz2lon(x, z) {
    return (x / pow(2, z)) * 360 - 180
}
export function yz2lat(y, z) {
    const rads = atan(sinh(PI - (2 * PI * y) / pow(2, z)))
    return degrees(rads)
}
export function xyz2lonlat(x, y, z) {
    return [xz2lon(x, z), yz2lat(y, z)]
}
// adding 0.5 to x,y returns lonlat of center of tile
export function xyz2centerLonlat(x, y, z) {
    return [xz2lon(x + 0.5, z), yz2lat(y + 0.5, z)]
}

// Return a tile bbox for xyz tile.
// x,y any point within the tile like center etc.
// We use the usual bbox convention of
//   [minX, minY, maxX, maxY] or [west, south, east, north]
export function xyz2bbox(x, y, z) {
    const [west, north] = xyz2lonlat(x, y, z)
    const [east, south] = xyz2lonlat(x + 1, y + 1, z)
    return [west, south, east, north]
    // return [west, south, (east * 256) / 257, (north * 256) / 257]
    // const dWidth = (east - west) / 256
    // const dHeight = (north - south) / 256
    // console.log('std', [west, south, east, north])
    // console.log('clipped', [west, south, east - dWidth, north - dHeight])
    // return [west, south, east - dWidth, north - dHeight]
}

// export function bbox2xyz(bbox) {
//     const [west, south, east, north] = bbox
//     const [x0, y0] = lonlatz2xy(west,)
// }
// export function lonLatz2bbox(lon, lat, z) {
//     const [x, y] = lonlatz2xy(lon, lat, z)
//     return xyz2bbox(x, y, z) ???
// }
// export function xyz2zxy(xyz) {
//     const [x, y, z] = xyz
//     return [z, x, y]
// }

// Leaflet style latlon corners to bbox
// "bouonds" uses leaflet's latlon while "bbox" uses our lonlat
export function bounds2bbox(leafletBounds) {
    let { lng: east, lat: north } = leafletBounds.getNorthEast()
    let { lng: west, lat: south } = leafletBounds.getSouthWest()
    return [west, south, east, north]
}
// export function bbox2Lbounds(L, bbox) {
//     const [west, south, east, north] = bbox
//     const corner1 = L.latLng(north, west),
//         corner2 = L.latLng(south, east)
//     return L.latLngBounds(corner1, corner2)
// }
// All Leaflet methods that accept LatLngBounds objects also accept
// them in a simple Array form (unless noted otherwise),
// So the bounds example above can be passed like this:
// Note this usees leaflet's latlon rather than lonlat
export function bbox2bounds(bbox) {
    const [west, south, east, north] = bbox
    return [
        [north, west], // latlon topLeft
        [south, east], //latlon botRight
    ]
}
export function tilesBBox(bbox, z) {
    const [west, south, east, north] = bbox
    const [westX, northY] = lonlatz2xy(west, north, z)
    let [eastX, southY] = lonlatz2xy(east, south, z, true)
    // if (Number.isInteger(eastX)) eastX--
    // if (Number.isInteger(southY)) southY--
    return [westX, southY, eastX, northY]
}
export function bboxCoords(bbox) {
    const [west, south, east, north] = bbox
    return [
        [west, north], // topLeft
        [east, north], // topRight
        [east, south], // botRight
        [west, south], // botLeft
    ]
}

export function bboxCenter(bbox) {
    const [west, south, east, north] = bbox
    return [(west + east) / 2, (south + north) / 2]
}

export function bboxSize(bbox) {
    const [west, south, east, north] = bbox
    const width = abs(west - east)
    const height = abs(north - south)
    return [width, height]
}
export function bboxAspect(bbox) {
    const [width, height] = bboxSize(bbox)
    return width / height
}
export function bboxMetricSize(bbox) {
    const [west, south, east, north] = bbox
    const topLeft = [west, north]
    const botLeft = [west, south]
    const topRight = [east, north]
    const width = lonLat2meters(topLeft, topRight)
    const height = lonLat2meters(topLeft, botLeft)
    return [width, height]
}
export function bboxMetricAspect(bbox) {
    const [width, height] = bboxMetricSize(bbox)
    return width / height
}

// Create a url for OSM json data.
// https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
// south, west, north, east = minLat, minLon, maxLat, maxLon
export function getOsmURL(south, west, north, east) {
    const url = 'https://overpass-api.de/api/interpreter?data='
    const params = `\
[out:json][timeout:180][bbox:${south},${west},${north},${east}];
way[highway];
(._;>;);
out;`
    return url + encodeURIComponent(params)
}

// https://stackoverflow.com/questions/639695/how-to-convert-latitude-or-longitude-to-meters
// Explanation: https://en.wikipedia.org/wiki/Haversine_formula
export function lonLat2meters(pt1, pt2) {
    const [lon1, lat1] = pt1.map(val => radians(val)) // lon/lat radians
    const [lon2, lat2] = pt2.map(val => radians(val))

    // generally used geo measurement function
    const R = 6378.137 // Radius of earth in KM
    const dLat = lat2 - lat1
    const dLon = lon2 - lon1
    const a = sin(dLat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dLon / 2) ** 2
    // pow(sin(dLat / 2), 2) +
    // cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2)
    const c = 2 * atan2(sqrt(a), sqrt(1 - a))
    const d = R * c
    return d * 1000 // meters
}

// const terrainLayer = L.tileLayer(
//     'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { // zoom 18
//     // 'http://tile.stamen.com/watercolor/{z}/{x}/{y}.jpg', {  // zoom 17
//     // 'http://tile.stamen.com/terrain/{z}/{x}/{y}.jpg', { // zoom 18
//     // 'http://tile.stamen.com/toner/{z}/{x}/{y}.png', { // zoom 17
//     // 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png', { // zoom 18
//     // 'https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', { // zoom 18

// https://github.com/leaflet-extras/leaflet-providers
// https://github.com/leaflet-extras/leaflet-providers/blob/master/leaflet-providers.js
export function attribution(who = 'osm') {
    const prefix = 'Map data &copy; '
    switch (who) {
        case 'osm':
            return (
                prefix + '<a href="https://openstreetmap.org">OpenStreetMap</a>'
            )
        case 'topo':
            return prefix + '<a https://opentopomap.org">OpenTopoMap</a>'
        case 'smooth':
            return prefix + '<a href="https://stadiamaps.com/">Stadia Maps</a>'
        case 'usgs':
            return (
                prefix +
                'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
            )
    }
}
export function template(who = 'osm') {
    switch (who) {
        case 'osm':
            return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        case 'topo':
            return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
        case 'smooth':
            return 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png'
        case 'usgs':
            return 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}'
    }
}
