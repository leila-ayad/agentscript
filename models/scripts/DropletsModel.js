// import * as util from '../src/utils.js'
var World = AS.World
var Model = AS.Model
// Current tile dataSet functions:
//   redfishUSDataSet
//   redfishWorldDataSet
//   mapzenDataSet
//   mapboxDataSet
// import { mapzen as provider } from '../src/TileData.js'
import { mapzen as provider } from '../src/TileData.js'

class DropletsModel extends Model {
    killOffworld = false // Kill vs clamp turtles when offworld.
    speed = 0.2
    puddleDepth = 5
    // stepType choices:
    //    'minNeighbor',
    //    'patchAspect',
    //    'dataSetAspectNearest',
    //    'dataSetAspectBilinear',
    // stepType = 'dataSetAspectNearest'
    stepType = 'minNeighbor'
    // Installed datasets:
    elevation
    dzdx
    dzdy
    slope
    aspect

    // ======================

    constructor(worldOptions = World.defaultOptions(50)) {
        super(worldOptions)
    }

    // data can be gis zxy or a DataSet
    async startup(data = [13, 1594, 3339]) {
        const elevation = data.width
            ? data
            : await provider.zxyToDataSet(...data)
        // const elevation = await mapzen.zxyToDataSet(...this.zxy)
        this.installDataSets(elevation)
    }
    installDataSets(elevation) {
        const slopeAndAspect = elevation.slopeAndAspect()
        const { dzdx, dzdy, slope, aspect } = slopeAndAspect
        Object.assign(this, { elevation, dzdx, dzdy, slope, aspect })

        this.patches.importDataSet(elevation, 'elevation', true)
        this.patches.importDataSet(aspect, 'aspect', true)
    }
    setup() {
        // Kill if droplet moves off world/tile.
        // Otherwise use 'clamp' (bunch up on edge)
        if (this.killOffworld) {
            this.turtles.setDefault('atEdge', turtle => turtle.die())
        }

        this.localMins = []
        this.patches.ask(p => {
            if (p.neighbors.minOneOf('elevation').elevation > p.elevation) {
                this.localMins.push(p)
            }
            p.sprout(1, this.turtles)
        })
    }

    step() {
        this.turtles.ask(t => {
            const stepType = this.stepType

            if (stepType === 'minNeighbor') {
                const n = t.patch.neighbors.minOneOf('elevation')
                t.face(n) // Face the best neighbor if better than me
            } else if (stepType === 'patchAspect') {
                t.theta = t.patch.aspect
            } else if (stepType.includes('dataSet')) {
                // Move in direction of aspect DataSet:
                const { minXcor, maxYcor, numX, numY } = this.world
                // bilinear many more minima
                const nearest = stepType === 'dataSetAspectNearest'
                t.theta = this.aspect.coordSample(
                    t.x,
                    t.y,
                    minXcor,
                    maxYcor,
                    numX,
                    numY,
                    nearest
                )
            } else {
                throw Error('bad stepType: ' + stepType)
            }

            let neighbors = t.patch.neighbors
            let nAhead = t.patchAtHeadingAndDistance(t.heading, this.speed)

            if (nAhead.turtlesHere.length < this.puddleDepth)
                t.forward(this.speed)
        })
    }
    turtlesOnLocalMins() {
        return this.localMins.reduce((acc, p) => acc + p.turtlesHere.length, 0)
    }
}
const defaultModel = DropletsModel

