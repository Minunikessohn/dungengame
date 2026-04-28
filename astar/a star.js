
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
let labyrinthCanvasCache
let labyrinthContextCache
let labyrinthWrapperCache
let searchSpeedInputCache
let renderScheduled = false
let visitedHighlights = new Map()

const DEFAULT_SEARCH_SPEED = 600
const VISITED_HIGHLIGHT_FADE_MS = 1400
const MAX_BATCHES_PER_SECOND = 30

const CELL_COLORS = {
    empty: "#ffffff",
    wall: "#000000",
    start: "#1fa34a",
    end: "#d83b01",
    path: "#2d7ff9",
    visited: "#f5c542"
}

function getOutputField() {
    if (!loggingEnabled || typeof document === "undefined") {
        return null
    }

    if (!outputFieldCache) {
        outputFieldCache = document.getElementById("output-log")
    }

    return outputFieldCache
}

function getLabyrinthCanvas() {
    if (typeof document === "undefined") {
        return null
    }

    if (!labyrinthCanvasCache) {
        labyrinthCanvasCache = document.getElementById("labyrinth-canvas")
    }

    return labyrinthCanvasCache
}

function getLabyrinthWrapper() {
    if (typeof document === "undefined") {
        return null
    }

    if (!labyrinthWrapperCache) {
        labyrinthWrapperCache = document.getElementById("labyrinth-wrapper")
    }

    return labyrinthWrapperCache
}

function getSearchSpeedInput() {
    if (typeof document === "undefined") {
        return null
    }

    if (!searchSpeedInputCache) {
        searchSpeedInputCache = document.getElementById("search-speed")
    }

    return searchSpeedInputCache
}

function getLabyrinthContext() {
    const canvas = getLabyrinthCanvas()

    if (!canvas) {
        return null
    }

    if (!labyrinthContextCache) {
        labyrinthContextCache = canvas.getContext("2d")
    }

    return labyrinthContextCache
}

function getCanvasLayout(rowCount, columnCount) {
    const wrapper = getLabyrinthWrapper()
    const defaultWidth = 900
    const defaultHeight = 620
    const availableWidth = wrapper ? Math.max(120, wrapper.clientWidth || defaultWidth) : defaultWidth
    const availableHeight = wrapper ? Math.max(120, wrapper.clientHeight || defaultHeight) : defaultHeight
    const cellSize = Math.min(availableWidth / columnCount, availableHeight / rowCount)
    const width = Math.max(1, columnCount * cellSize)
    const height = Math.max(1, rowCount * cellSize)

    return { cellSize, width, height }
}

function resizeCanvas(width, height) {
    const canvas = getLabyrinthCanvas()
    const context = getLabyrinthContext()

    if (!canvas || !context) {
        return null
    }

    const pixelRatio = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1

    canvas.width = Math.max(1, Math.round(width * pixelRatio))
    canvas.height = Math.max(1, Math.round(height * pixelRatio))
    canvas.style.width = width + "px"
    canvas.style.height = height + "px"
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    return context
}

function clearLabyrinthCanvas() {
    const context = getLabyrinthContext()
    const canvas = getLabyrinthCanvas()

    if (!context || !canvas) {
        return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
}

function drawGridLines(context, rowCount, columnCount, cellSize, width, height) {
    if (cellSize < 4) {
        return
    }

    context.save()
    context.strokeStyle = "#111111"
    context.lineWidth = 0.5
    context.beginPath()

    for (let rowIndex = 0; rowIndex <= rowCount; rowIndex++) {
        const y = Math.min(height, rowIndex * cellSize)
        context.moveTo(0, y)
        context.lineTo(width, y)
    }

    for (let columnIndex = 0; columnIndex <= columnCount; columnIndex++) {
        const x = Math.min(width, columnIndex * cellSize)
        context.moveTo(x, 0)
        context.lineTo(x, height)
    }

    context.stroke()
    context.restore()
}

function drawCell(context, rowIndex, columnIndex, cellSize, color) {
    context.fillStyle = color
    context.fillRect(columnIndex * cellSize, rowIndex * cellSize, cellSize, cellSize)
}

function blendColorToWhite(hexColor, ratio) {
    const safeRatio = Math.max(0, Math.min(1, ratio))
    const red = Number.parseInt(hexColor.slice(1, 3), 16)
    const green = Number.parseInt(hexColor.slice(3, 5), 16)
    const blue = Number.parseInt(hexColor.slice(5, 7), 16)
    const blendedRed = Math.round(red + ((255 - red) * safeRatio))
    const blendedGreen = Math.round(green + ((255 - green) * safeRatio))
    const blendedBlue = Math.round(blue + ((255 - blue) * safeRatio))

    return "rgb(" + blendedRed + ", " + blendedGreen + ", " + blendedBlue + ")"
}

function markVisitedCell(point) {
    visitedHighlights.set(key(point[0], point[1]), {
        row: point[0],
        column: point[1],
        markedAt: nowMs()
    })
}

function clearVisitedHighlights() {
    visitedHighlights = new Map()
}

function drawVisitedHighlights(context, cellSize) {
    if (visitedHighlights.size === 0) {
        return false
    }

    const currentTime = nowMs()
    let hasActiveHighlights = false

    for (const [pointKey, highlight] of visitedHighlights) {
        const age = currentTime - highlight.markedAt

        if (age >= VISITED_HIGHLIGHT_FADE_MS) {
            visitedHighlights.delete(pointKey)
            continue
        }

        const fadeRatio = age / VISITED_HIGHLIGHT_FADE_MS
        const color = blendColorToWhite(CELL_COLORS.visited, fadeRatio)
        drawCell(context, highlight.row, highlight.column, cellSize, color)
        hasActiveHighlights = true
    }

    return hasActiveHighlights
}

function renderLabyrinth() {
    const context = getLabyrinthContext()

    if (!context) {
        return
    }

    if (!labyrinth || labyrinth.length === 0 || labyrinth[0].length === 0) {
        clearLabyrinthCanvas()
        return
    }

    const rowCount = labyrinth.length
    const columnCount = labyrinth[0].length
    const { cellSize, width, height } = getCanvasLayout(rowCount, columnCount)
    const resizedContext = resizeCanvas(width, height)

    if (!resizedContext) {
        return
    }

    resizedContext.clearRect(0, 0, width, height)

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
            const cellValue = labyrinth[rowIndex][columnIndex]
            const color = cellValue === 1 ? CELL_COLORS.wall : CELL_COLORS.empty
            drawCell(resizedContext, rowIndex, columnIndex, cellSize, color)
        }
    }

    const hasActiveHighlights = drawVisitedHighlights(resizedContext, cellSize)

    if (output2 && output2.length > 0) {
        for (const point of output2) {
            drawCell(resizedContext, point[0], point[1], cellSize, CELL_COLORS.path)
        }
    }

    if (start) {
        drawCell(resizedContext, start[0], start[1], cellSize, CELL_COLORS.start)
    }

    if (end) {
        drawCell(resizedContext, end[0], end[1], cellSize, CELL_COLORS.end)
    }

    drawGridLines(resizedContext, rowCount, columnCount, cellSize, width, height)

    if (hasActiveHighlights) {
        scheduleLabyrinthRender()
    }
}

function scheduleLabyrinthRender() {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        renderLabyrinth()
        return
    }

    if (renderScheduled) {
        return
    }

    renderScheduled = true

    window.requestAnimationFrame(() => {
        renderScheduled = false
        renderLabyrinth()
    })
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

function getSearchSpeed() {
    const input = getSearchSpeedInput()

    if (!input) {
        return DEFAULT_SEARCH_SPEED
    }

    const parsedValue = Number.parseInt(input.value, 10)

    if (!Number.isInteger(parsedValue) || parsedValue < 1) {
        input.value = String(DEFAULT_SEARCH_SPEED)
        return DEFAULT_SEARCH_SPEED
    }

    return parsedValue
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

function sleepMs(durationMs) {
    return new Promise(resolve => {
        setTimeout(resolve, durationMs)
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
    clearVisitedHighlights()
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
    scheduleLabyrinthRender()
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
    scheduleLabyrinthRender()
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

function processPathfindingStep(progressTracker) {
    if (openHeap.size === 0) {
        return { found: false, finished: true }
    }

    const current = openHeap.pop()
    const currentKey = key(current.coords[0], current.coords[1])

    if (closedSet.has(currentKey)) {
        return { found: false, finished: false, skipped: true }
    }

    progressTracker.tick()
    markVisitedCell(current.coords)

    if (current.coords[0] === end[0] && current.coords[1] === end[1]) {
        openSet.delete(currentKey)
        closedSet.add(currentKey)
        usedpoints.push(current)
        return { found: true, finished: true }
    }

    generatenewpoints(current)

    if (foundziel) {
        writeOutputLine("Ziel gefunden!")
        return { found: true, finished: true }
    }

    return { found: false, finished: false }
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
    const searchSpeed = getSearchSpeed()
    const nodesPerBatch = Math.max(1, Math.ceil(searchSpeed / MAX_BATCHES_PER_SECOND))
    const batchDelayMs = (nodesPerBatch * 1000) / searchSpeed

    output2 = []
    clearVisitedHighlights()
    scheduleLabyrinthRender()

    isPathfinding = true

    try {
        while (openHeap.size > 0) {
            let processedInBatch = 0

            while (processedInBatch < nodesPerBatch && openHeap.size > 0) {
                const stepResult = processPathfindingStep(progressTracker)

                if (stepResult.skipped) {
                    continue
                }

                processedInBatch += 1

                if (stepResult.finished) {
                    found = stepResult.found
                    break
                }
            }

            scheduleLabyrinthRender()

            if (found || openHeap.size === 0) {
                break
            }

            await sleepMs(batchDelayMs)

            if (isLoggingEnabled()) {
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
        scheduleLabyrinthRender()
    }
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("resize", scheduleLabyrinthRender)
}
