
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
let visitedToggleCache
let renderScheduled = false
let visitedHighlights = new Map()
let visitedHistory = new Map()
let viewZoom = 1
let viewPanX = 0
let viewPanY = 0
let isCanvasDragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartPanX = 0
let dragStartPanY = 0
let canvasInteractionsInitialized = false
let activeExpansion = null
let forceNextProgressLog = false
let visitedTrailEnabled = true
let stopGenerationRequested = false
let stopPathfindingRequested = false

const DEFAULT_SEARCH_SPEED = 600
const VISITED_HIGHLIGHT_FADE_MS = 1400
const VISITED_HIGHLIGHT_FRESH_MS = 180
const VISITED_HIGHLIGHT_DARK_MS = 950
const SEARCH_BATCH_INTERVAL_MS = 50
const GENERATION_UI_CHUNK_WITH_OUTPUT = 4096
const GENERATION_UI_CHUNK_WITHOUT_OUTPUT = 32768
const MIN_ZOOM = 0.25
const MAX_ZOOM = 24

const CELL_COLORS = {
    empty: "#ffffff",
    wall: "#000000",
    start: "#1fa34a",
    end: "#d83b01",
    path: "#2d7ff9",
    visitedPersistent: "#ffd84d",
    visitedFresh: "#ffe45c",
    visitedFreshAccent: "#ff9f1c",
    visitedSettled: "#ff8c00"
}

function getOutputField() {
    if (typeof document === "undefined") {
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

function getVisitedToggle() {
    if (typeof document === "undefined") {
        return null
    }

    if (!visitedToggleCache) {
        visitedToggleCache = document.getElementById("visited-toggle")
    }

    return visitedToggleCache
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
    const baseCellSize = Math.min(availableWidth / columnCount, availableHeight / rowCount)
    const width = Math.max(1, availableWidth)
    const height = Math.max(1, availableHeight)

    return { baseCellSize, width, height }
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

function shouldStopGeneration() {
    return stopGenerationRequested
}

function shouldStopPathfinding() {
    return stopPathfindingRequested
}

function drawGridLines(context, rowCount, columnCount, cellSize) {
    if (cellSize < 4) {
        return
    }

    const gridWidth = columnCount * cellSize
    const gridHeight = rowCount * cellSize

    context.save()
    context.strokeStyle = "#111111"
    context.lineWidth = 0.5
    context.beginPath()

    for (let rowIndex = 0; rowIndex <= rowCount; rowIndex++) {
        const y = Math.min(gridHeight, rowIndex * cellSize)
        context.moveTo(0, y)
        context.lineTo(gridWidth, y)
    }

    for (let columnIndex = 0; columnIndex <= columnCount; columnIndex++) {
        const x = Math.min(gridWidth, columnIndex * cellSize)
        context.moveTo(x, 0)
        context.lineTo(x, gridHeight)
    }

    context.stroke()
    context.restore()
}

function drawCell(context, rowIndex, columnIndex, cellSize, color) {
    context.fillStyle = color
    context.fillRect(columnIndex * cellSize, rowIndex * cellSize, cellSize, cellSize)
}

function drawInsetCell(context, rowIndex, columnIndex, cellSize, color, insetRatio) {
    const inset = cellSize * insetRatio
    context.fillStyle = color
    context.fillRect(
        (columnIndex * cellSize) + inset,
        (rowIndex * cellSize) + inset,
        Math.max(1, cellSize - (2 * inset)),
        Math.max(1, cellSize - (2 * inset))
    )
}

function clamp(value, minValue, maxValue) {
    return Math.min(maxValue, Math.max(minValue, value))
}

function resetViewport() {
    viewZoom = 1
    viewPanX = 0
    viewPanY = 0
}

function getViewportState(rowCount, columnCount) {
    const { baseCellSize, width, height } = getCanvasLayout(rowCount, columnCount)
    const cellSize = baseCellSize * viewZoom
    const labyrinthWidth = columnCount * cellSize
    const labyrinthHeight = rowCount * cellSize
    const originX = ((width - labyrinthWidth) / 2) + viewPanX
    const originY = ((height - labyrinthHeight) / 2) + viewPanY

    return {
        width,
        height,
        cellSize,
        labyrinthWidth,
        labyrinthHeight,
        originX,
        originY
    }
}

function resizeViewportZoom(nextZoom, anchorX, anchorY, rowCount, columnCount) {
    const previousState = getViewportState(rowCount, columnCount)
    const worldX = (anchorX - previousState.originX) / previousState.cellSize
    const worldY = (anchorY - previousState.originY) / previousState.cellSize

    viewZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)

    const nextState = getViewportState(rowCount, columnCount)
    viewPanX += anchorX - (nextState.originX + (worldX * nextState.cellSize))
    viewPanY += anchorY - (nextState.originY + (worldY * nextState.cellSize))
}

function initializeCanvasInteractions() {
    if (canvasInteractionsInitialized || typeof window === "undefined") {
        return
    }

    const wrapper = getLabyrinthWrapper()

    if (!wrapper || typeof wrapper.addEventListener !== "function") {
        return
    }

    wrapper.addEventListener("wheel", event => {
        if (!labyrinth || labyrinth.length === 0) {
            return
        }

        event.preventDefault()

        const zoomFactor = event.deltaY < 0 ? 1.12 : 1 / 1.12
        const nextZoom = viewZoom * zoomFactor
        const rect = typeof wrapper.getBoundingClientRect === "function"
            ? wrapper.getBoundingClientRect()
            : { left: 0, top: 0 }

        resizeViewportZoom(nextZoom, event.clientX - rect.left, event.clientY - rect.top, labyrinth.length, labyrinth[0].length)
        scheduleLabyrinthRender()
    }, { passive: false })

    wrapper.addEventListener("mousedown", event => {
        isCanvasDragging = true
        dragStartX = event.clientX
        dragStartY = event.clientY
        dragStartPanX = viewPanX
        dragStartPanY = viewPanY

        if (typeof wrapper.classList !== "undefined") {
            wrapper.classList.add("dragging")
        }
    })

    const stopDragging = () => {
        isCanvasDragging = false

        if (typeof wrapper.classList !== "undefined") {
            wrapper.classList.remove("dragging")
        }
    }

    wrapper.addEventListener("mouseleave", stopDragging)

    if (typeof window.addEventListener === "function") {
        window.addEventListener("mouseup", stopDragging)
        window.addEventListener("mousemove", event => {
            if (!isCanvasDragging) {
                return
            }

            viewPanX = dragStartPanX + (event.clientX - dragStartX)
            viewPanY = dragStartPanY + (event.clientY - dragStartY)
            scheduleLabyrinthRender()
        })
    }

    canvasInteractionsInitialized = true
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
    const pointKey = key(point[0], point[1])

    visitedHighlights.set(pointKey, {
        row: point[0],
        column: point[1],
        markedAt: nowMs()
    })

    visitedHistory.set(pointKey, {
        row: point[0],
        column: point[1]
    })
}

function clearVisitedHighlights() {
    visitedHighlights = new Map()
    visitedHistory = new Map()
}

function drawVisitedHighlights(context, cellSize) {
    let hasActiveHighlights = false

    if (!visitedTrailEnabled) {
        if (visitedHistory.size === 0) {
            return false
        }

        for (const visitedCell of visitedHistory.values()) {
            drawCell(context, visitedCell.row, visitedCell.column, cellSize, CELL_COLORS.visitedPersistent)
        }

        for (const highlight of visitedHighlights.values()) {
            const age = nowMs() - highlight.markedAt

            if (age <= VISITED_HIGHLIGHT_FRESH_MS && cellSize > 3) {
                drawInsetCell(context, highlight.row, highlight.column, cellSize, CELL_COLORS.visitedFreshAccent, 0.2)
            }
        }

        return false
    }

    const currentTime = nowMs()

    if (visitedHighlights.size === 0) {
        return false
    }

    for (const [pointKey, highlight] of visitedHighlights) {
        const age = currentTime - highlight.markedAt

        if (age >= VISITED_HIGHLIGHT_FADE_MS) {
            visitedHighlights.delete(pointKey)
            continue
        }

        if (age <= VISITED_HIGHLIGHT_FRESH_MS) {
            drawCell(context, highlight.row, highlight.column, cellSize, CELL_COLORS.visitedFresh)

            if (cellSize > 3) {
                drawInsetCell(context, highlight.row, highlight.column, cellSize, CELL_COLORS.visitedFreshAccent, 0.2)
            }

            hasActiveHighlights = true
            continue
        }

        let color = CELL_COLORS.visitedSettled

        if (age > VISITED_HIGHLIGHT_DARK_MS) {
            const fadeRatio = (age - VISITED_HIGHLIGHT_DARK_MS) / (VISITED_HIGHLIGHT_FADE_MS - VISITED_HIGHLIGHT_DARK_MS)
            color = blendColorToWhite(CELL_COLORS.visitedSettled, fadeRatio)
        }

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
    const { width, height, cellSize, originX, originY } = getViewportState(rowCount, columnCount)
    const resizedContext = resizeCanvas(width, height)

    if (!resizedContext) {
        return
    }

    resizedContext.clearRect(0, 0, width, height)
    resizedContext.save()
    resizedContext.translate(originX, originY)

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

    drawGridLines(resizedContext, rowCount, columnCount, cellSize)
    resizedContext.restore()

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

function setVisitedTrailEnabled(enabled) {
    visitedTrailEnabled = Boolean(enabled)

    const toggle = getVisitedToggle()
    if (toggle) {
        toggle.checked = visitedTrailEnabled
    }

    scheduleLabyrinthRender()
}

function setLoggingEnabled(enabled) {
    loggingEnabled = Boolean(enabled)

    if (!loggingEnabled) {
        clearOutput()
    } else {
        forceNextProgressLog = true
    }
}

function consumeForcedProgressLog() {
    if (!forceNextProgressLog) {
        return false
    }

    forceNextProgressLog = false
    return true
}

function stopAllProcesses() {
    stopGenerationRequested = true
    stopPathfindingRequested = true
    activeExpansion = null
    isCanvasDragging = false

    const wrapper = getLabyrinthWrapper()
    if (wrapper && typeof wrapper.classList !== "undefined") {
        wrapper.classList.remove("dragging")
    }

    writeOutputLine("Stopp angefordert.")
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
    stopGenerationRequested = false
    stopPathfindingRequested = false

    isGenerating = true

    try {
        labyrinth = await generateLab(parsedSize)
    } finally {
        isGenerating = false
    }

    if (!labyrinth) {
        writeOutputLine("Labyrinth-Generierung gestoppt.")
        scheduleLabyrinthRender()
        return
    }

    const { startCoord, endCoord } = findStartAndEnd()
    start = startCoord
    end = endCoord

    output1 = JSON.parse(JSON.stringify(labyrinth))
    output2 = []
    usedpoints = []
    clearVisitedHighlights()
    resetViewport()
    activeExpansion = null
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
    let inspectedNeighbors = 0

    function tryNeighbor(nx, ny) {
        inspectedNeighbors += 1

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

    return inspectedNeighbors
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
        const forceLogNow = consumeForcedProgressLog()

        if (!forceLogNow && currentTime - lastLogAt < 1000) {
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
    if (shouldStopPathfinding()) {
        activeExpansion = null
        return { found: false, finished: true, inspectedNeighbors: 0, stopped: true }
    }

    while (!activeExpansion) {
        if (openHeap.size === 0) {
            return { found: false, finished: true, inspectedNeighbors: 0 }
        }

        const current = openHeap.pop()
        const currentKey = key(current.coords[0], current.coords[1])

        if (closedSet.has(currentKey)) {
            continue
        }

        progressTracker.tick()
        markVisitedCell(current.coords)

        if (current.coords[0] === end[0] && current.coords[1] === end[1]) {
            openSet.delete(currentKey)
            closedSet.add(currentKey)
            usedpoints.push(current)
            return { found: true, finished: true, inspectedNeighbors: 0 }
        }

        activeExpansion = {
            current,
            currentKey,
            nextNeighborIndex: 0,
            neighbors: [
                [current.coords[0] - 1, current.coords[1]],
                [current.coords[0] + 1, current.coords[1]],
                [current.coords[0], current.coords[1] - 1],
                [current.coords[0], current.coords[1] + 1]
            ]
        }
    }

    const expansion = activeExpansion
    const [nx, ny] = expansion.neighbors[expansion.nextNeighborIndex]
    expansion.nextNeighborIndex += 1

    if (nx >= 0 && nx < labyrinth.length && ny >= 0 && ny < labyrinth[nx].length) {
        if (labyrinth[nx][ny] !== 1) {
            const nodeKey = key(nx, ny)
            const newG = expansion.current.g + 1
            
            // Prüfen ob Knoten bereits in openSet
            if (openSet.has(nodeKey)) {
                const existingNode = nodeByKey.get(nodeKey)
                // Nur aktualisieren wenn besserer Pfad gefunden
                if (newG < existingNode.g) {
                    existingNode.g = newG
                    existingNode.f = newG + geth([nx, ny])
                    existingNode.pointer = [expansion.current.coords[0], expansion.current.coords[1]]
                }
            } else if (!closedSet.has(nodeKey)) {
                const node = {
                    coords: [nx, ny],
                    g: newG,
                    f: newG + geth([nx, ny]),
                    pointer: [expansion.current.coords[0], expansion.current.coords[1]]
                }

                openHeap.push(node)
                openSet.add(nodeKey)
                nodeByKey.set(nodeKey, node)

                if (labyrinth[nx][ny] === 3) {
                    foundziel = true
                }
            }
        }
    }

    if (expansion.nextNeighborIndex >= expansion.neighbors.length) {
        usedpoints.push(expansion.current)
        openSet.delete(expansion.currentKey)
        closedSet.add(expansion.currentKey)
        activeExpansion = null
    }

    if (foundziel) {
        writeOutputLine("Ziel gefunden!")
        return { found: true, finished: true, inspectedNeighbors: 1 }
    }

    return { found: false, finished: false, inspectedNeighbors: 1 }
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
    let remainingNeighborBudget = 0

    output2 = []
    clearVisitedHighlights()
    activeExpansion = null
    stopPathfindingRequested = false
    scheduleLabyrinthRender()

    isPathfinding = true

    try {
        while (openHeap.size > 0 || activeExpansion) {
            remainingNeighborBudget += (searchSpeed * SEARCH_BATCH_INTERVAL_MS) / 1000

            while (remainingNeighborBudget >= 1 && (openHeap.size > 0 || activeExpansion)) {
                const stepResult = processPathfindingStep(progressTracker)

                remainingNeighborBudget -= Math.max(1, stepResult.inspectedNeighbors)
                remainingNeighborBudget = Math.max(0, remainingNeighborBudget)

                if (stepResult.stopped) {
                    break
                }

                if (stepResult.finished) {
                    found = stepResult.found
                    break
                }
            }

            scheduleLabyrinthRender()

            if (shouldStopPathfinding() || found || (!activeExpansion && openHeap.size === 0)) {
                break
            }

            await sleepMs(SEARCH_BATCH_INTERVAL_MS)
            await yieldToUi()
        }
    } finally {
        isPathfinding = false
    }

    writeOutputLine("astar:", formatDuration(nowMs() - startedAt))
    progressTracker.finish()

    if (shouldStopPathfinding()) {
        writeOutputLine("Pathfinding gestoppt.")
        scheduleLabyrinthRender()
    } else if (found) {
        reconstructPath()
    } else {
        writeOutputLine("Kein Weg moeglich.")
        scheduleLabyrinthRender()
    }
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    initializeCanvasInteractions()
    window.addEventListener("resize", scheduleLabyrinthRender)
}
