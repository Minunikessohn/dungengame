
let labyrinth
let start
let end
let output1
let output2
let usedpoints
let openHeap
let openSet
let closedSet
let nodeByKey
let isGenerating = false
let isPathfinding = false
let loggingEnabled = true
let outputFieldCache

function getOutputField() {
    if (!loggingEnabled || typeof document === "undefined") {
        return null
    }

    if (!outputFieldCache) {
        outputFieldCache = document.getElementById("output-log")
    }

    return outputFieldCache
}

function isLoggingEnabled() {
    return loggingEnabled
}

function setLoggingEnabled(enabled) {
    loggingEnabled = Boolean(enabled)

    if (!loggingEnabled) {
        clearOutput()
    }
}

function formatOutputPart(value) {
    if (typeof value === "string") {
        return value
    }

    if (typeof value === "number" || typeof value === "boolean" || value == null) {
        return String(value)
    }

    return JSON.stringify(value)
}

function writeOutputLine(...parts) {
    if (!isLoggingEnabled()) {
        return
    }

    const outputField = getOutputField()

    if (!outputField) {
        return
    }

    if (outputField.value.length > 0) {
        outputField.value += "\n"
    }

    outputField.value += parts.map(formatOutputPart).join(" ")
    outputField.scrollTop = outputField.scrollHeight
}

function clearOutput() {
    const outputField = outputFieldCache || (typeof document !== "undefined" ? document.getElementById("output-log") : null)

    if (!outputField) {
        return
    }

    outputField.value = ""
}

function yieldToUi() {
    if (!isLoggingEnabled()) {
        return Promise.resolve()
    }

    return new Promise(resolve => {
        setTimeout(resolve, 0)
    })
}

async function startgenerateLab(size) {
    const parsedSize = Number.parseInt(size, 10)

    if (!Number.isInteger(parsedSize) || parsedSize < 2) {
        writeOutputLine("Fehler:", "Die Labyrinth-Groesse muss eine ganze Zahl ab 2 sein.")
        return
    }

    if (isGenerating) {
        writeOutputLine("Die Labyrinth-Generierung laeuft bereits.")
        return
    }

    if (isPathfinding) {
        writeOutputLine("Bitte warte, bis das aktuelle Pathfinding beendet ist.")
        return
    }

    clearOutput()
    writeOutputLine("Labyrinth-Generierung gestartet fuer Groesse", parsedSize)

    isGenerating = true

    try {
        labyrinth = await generateLab(parsedSize)
    } finally {
        isGenerating = false
    }

    const { startCoord, endCoord } = findStartAndEnd()
    start = startCoord
    end = endCoord

    output1 = JSON.parse(JSON.stringify(labyrinth))
    output2 = []
    usedpoints = []
    openHeap = new MinHeap()
    openSet = new Set()
    closedSet = new Set()
    nodeByKey = new Map()
    foundziel = false

    const startNode = {
        coords: start,
        g: 0,
        f: geth(start),
        pointer: []
    }

    openHeap.push(startNode)
    openSet.add(key(start[0], start[1]))
    nodeByKey.set(key(start[0], start[1]), startNode)

    writeOutputLine("Labyrinth bereit.")
}

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
        writeOutputLine("Endpunkt nicht in Map gefunden")
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

    writeOutputLine("generation complete")
    return end
}

function nowMs() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now()
    }

    return Date.now()
}

function formatDuration(ms) {
    if (ms < 1000) {
        return Math.round(ms) + " ms"
    }

    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    if (minutes === 0) {
        return seconds + " s"
    }

    return minutes + " min " + seconds + " s"
}

function createProgressTracker() {
    const startedAt = nowMs()
    let lastLogAt = startedAt
    let visitedNodes = 0

    function tick() {
        visitedNodes += 1

        if (!isLoggingEnabled()) {
            return
        }

        const currentTime = nowMs()
        if (currentTime - lastLogAt < 1000) {
            return
        }

        writeOutputLine(
            "[astar] vergangen:",
            formatDuration(currentTime - startedAt),
            "| besuchte Knoten:",
            visitedNodes
        )

        lastLogAt = currentTime
    }

    function finish() {
        if (!isLoggingEnabled()) {
            return
        }

        writeOutputLine(
            "[astar] fertig | vergangen:",
            formatDuration(nowMs() - startedAt),
            "| besuchte Knoten:",
            visitedNodes
        )
    }

    return { tick, finish }
}

async function startPathfinding() {
    if (!labyrinth || !openHeap || !start || !end) {
        writeOutputLine("Bitte zuerst ein Labyrinth generieren.")
        return
    }

    if (isGenerating) {
        writeOutputLine("Bitte warte, bis die Labyrinth-Generierung beendet ist.")
        return
    }

    if (isPathfinding) {
        writeOutputLine("Das Pathfinding laeuft bereits.")
        return
    }

    let found = false
    const progressTracker = createProgressTracker()
    const startedAt = nowMs()
    let processedNodesSinceYield = 0

    isPathfinding = true

    try {
        while (openHeap.size > 0) {
            const current = openHeap.pop()
            const currentKey = key(current.coords[0], current.coords[1])

            if (closedSet.has(currentKey)) {
                continue
            }

            progressTracker.tick()
            processedNodesSinceYield += 1

            if (current.coords[0] === end[0] && current.coords[1] === end[1]) {
                openSet.delete(currentKey)
                closedSet.add(currentKey)
                usedpoints.push(current)
                found = true
                break
            }

            generatenewpoints(current)

            if (foundziel) {
                writeOutputLine("Ziel gefunden!")
                found = true
                break
            }

            if (isLoggingEnabled() && processedNodesSinceYield >= 1024) {
                processedNodesSinceYield = 0
                await yieldToUi()
            }
        }
    } finally {
        isPathfinding = false
    }

    writeOutputLine("astar:", formatDuration(nowMs() - startedAt))
    progressTracker.finish()

    if (found) {
        reconstructPath()
    } else {
        writeOutputLine("Kein Weg moeglich.")
    }
}
