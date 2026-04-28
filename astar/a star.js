let labyrinth = generateLab(7000)

class MinHeap {
    constructor() {
        this.data = []
    }

    push(node) {
        this.data.push(node)
        this._siftUp(this.data.length - 1)
    }

    pop() {
        if (this.data.length === 0) {
            return undefined
        }

        const top = this.data[0]
        const last = this.data.pop()

        if (this.data.length > 0) {
            this.data[0] = last
            this._siftDown(0)
        }

        return top
    }

    get size() {
        return this.data.length
    }

    _siftUp(index) {
        while (index > 0) {
            const parent = (index - 1) >> 1

            if (this.data[index].f < this.data[parent].f) {
                [this.data[index], this.data[parent]] = [this.data[parent], this.data[index]]
                index = parent
            } else {
                break
            }
        }
    }

    _siftDown(index) {
        const size = this.data.length

        while (true) {
            const left = (2 * index) + 1
            const right = (2 * index) + 2
            let smallest = index

            if (left < size && this.data[left].f < this.data[smallest].f) {
                smallest = left
            }

            if (right < size && this.data[right].f < this.data[smallest].f) {
                smallest = right
            }

            if (smallest === index) {
                break
            }

            [this.data[index], this.data[smallest]] = [this.data[smallest], this.data[index]]
            index = smallest
        }
    }
}

function key(x, y) {
    return x + "," + y
}

function findStartAndEnd() {
    let startCoord
    let endCoord

    for (let i = 0; i < labyrinth.length; i++) {
        for (let j = 0; j < labyrinth[i].length; j++) {
            if (labyrinth[i][j] === 2) {
                startCoord = [i, j]
            } else if (labyrinth[i][j] === 3) {
                endCoord = [i, j]
            }

            if (startCoord && endCoord) {
                return { startCoord, endCoord }
            }
        }
    }

    return { startCoord, endCoord }
}

const { startCoord, endCoord } = findStartAndEnd()
let start = startCoord
let end = endCoord

function geth(point) {
    return Math.abs(end[0] - point[0]) + Math.abs(end[1] - point[1])
}

function pointgeneratet(point) {
    const pointKey = key(point[0], point[1])
    return openSet.has(pointKey) || closedSet.has(pointKey)
}

function generatenewpoints(current) {
    const xx = current.coords[0]
    const yy = current.coords[1]

    function tryNeighbor(nx, ny) {
        if (nx < 0 || nx >= labyrinth.length) {
            return
        }

        if (ny < 0 || ny >= labyrinth[nx].length) {
            return
        }

        if (labyrinth[nx][ny] === 1 || pointgeneratet([nx, ny])) {
            return
        }

        const node = {
            coords: [nx, ny],
            g: current.g + 1,
            f: current.g + 1 + geth([nx, ny]),
            pointer: [xx, yy]
        }

        openHeap.push(node)

        const nodeKey = key(nx, ny)
        openSet.add(nodeKey)
        nodeByKey.set(nodeKey, node)

        if (labyrinth[nx][ny] === 3) {
            foundziel = true
        }
    }

    tryNeighbor(xx - 1, yy)
    tryNeighbor(xx + 1, yy)
    tryNeighbor(xx, yy - 1)
    tryNeighbor(xx, yy + 1)

    usedpoints.push(current)

    const currentKey = key(xx, yy)
    openSet.delete(currentKey)
    closedSet.add(currentKey)
}

let foundziel = false

function reconstructPath() {
    let node = nodeByKey.get(key(end[0], end[1]))

    if (!node) {
        console.log("Endpunkt nicht in Map gefunden")
        return end
    }

    output1[node.coords[0]][node.coords[1]] = 3
    output2.unshift(node.coords)

    while (node.pointer.length > 0) {
        node = nodeByKey.get(key(node.pointer[0], node.pointer[1]))

        if (!node) {
            break
        }

        output1[node.coords[0]][node.coords[1]] = 8
        output2.unshift(node.coords)
    }

    console.log("generation complete")
    return end
}

function startPathfinding() {
    let found = false

    console.time("astar")

    while (openHeap.size > 0) {
        const current = openHeap.pop()
        const currentKey = key(current.coords[0], current.coords[1])

        if (closedSet.has(currentKey)) {
            continue
        }

        if (current.coords[0] === end[0] && current.coords[1] === end[1]) {
            openSet.delete(currentKey)
            closedSet.add(currentKey)
            usedpoints.push(current)
            found = true
            break
        }

        generatenewpoints(current)

        if (foundziel) {
            console.log("Ziel gefunden!")
            found = true
            break
        }
    }

    console.timeEnd("astar")

    if (found) {
        reconstructPath()
    } else {
        console.log("Kein Weg möglich.")
    }
}

let output1 = JSON.parse(JSON.stringify(labyrinth))
let output2 = []
let usedpoints = []
let openHeap = new MinHeap()
let openSet = new Set()
let closedSet = new Set()
let nodeByKey = new Map()

const startNode = {
    coords: start,
    g: 0,
    f: geth(start),
    pointer: []
}

openHeap.push(startNode)
openSet.add(key(start[0], start[1]))
nodeByKey.set(key(start[0], start[1]), startNode)