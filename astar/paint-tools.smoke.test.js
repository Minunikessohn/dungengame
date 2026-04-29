const fs = require("fs")
const path = require("path")
const vm = require("vm")

function createClassList() {
    const classes = new Set()

    return {
        add(...tokens) {
            for (const token of tokens) {
                classes.add(token)
            }
        },
        remove(...tokens) {
            for (const token of tokens) {
                classes.delete(token)
            }
        },
        toggle(token, force) {
            if (force === undefined) {
                if (classes.has(token)) {
                    classes.delete(token)
                    return false
                }

                classes.add(token)
                return true
            }

            if (force) {
                classes.add(token)
                return true
            }

            classes.delete(token)
            return false
        },
        contains(token) {
            return classes.has(token)
        }
    }
}

function createElement(id, extra = {}) {
    return {
        id,
        value: "",
        textContent: "",
        checked: false,
        disabled: false,
        style: {},
        classList: createClassList(),
        listeners: {},
        attributes: {},
        clientWidth: 640,
        clientHeight: 480,
        scrollTop: 0,
        scrollHeight: 0,
        addEventListener(type, handler) {
            this.listeners[type] = handler
        },
        getBoundingClientRect() {
            return { left: 0, top: 0 }
        },
        setAttribute(name, value) {
            this.attributes[name] = value
        },
        getAttribute(name) {
            return this.attributes[name]
        },
        ...extra
    }
}

function createCanvasContext() {
    return {
        fillStyle: "#000000",
        strokeStyle: "#000000",
        lineWidth: 1,
        setTransform() {},
        clearRect() {},
        fillRect() {},
        save() {},
        restore() {},
        translate() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {}
    }
}

function loadAStarContext() {
    const canvasContext = createCanvasContext()
    const toolBrush = createElement("tool-brush")
    const toolEraser = createElement("tool-eraser")

    toolBrush.setAttribute("data-tool", "brush")
    toolEraser.setAttribute("data-tool", "eraser")

    const elements = {
        "output-log": createElement("output-log"),
        "labyrinth-canvas": createElement("labyrinth-canvas", {
            width: 0,
            height: 0,
            getContext() {
                return canvasContext
            }
        }),
        "labyrinth-wrapper": createElement("labyrinth-wrapper", {
            clientWidth: 720,
            clientHeight: 520
        }),
        "search-speed": createElement("search-speed", { value: "5000" }),
        "visited-toggle": createElement("visited-toggle", { checked: true }),
        "brush-size": createElement("brush-size", { value: "3" }),
        "eraser-size": createElement("eraser-size", { value: "3" }),
        "brush-size-value": createElement("brush-size-value"),
        "eraser-size-value": createElement("eraser-size-value"),
        "clear-labyrinth": createElement("clear-labyrinth"),
        "fill-labyrinth": createElement("fill-labyrinth"),
        "editor-status": createElement("editor-status"),
        "tool-brush": toolBrush,
        "tool-eraser": toolEraser
    }

    const document = {
        getElementById(id) {
            return elements[id] || null
        },
        querySelectorAll(selector) {
            if (selector === "[data-tool-button]") {
                return [toolBrush, toolEraser]
            }

            return []
        }
    }

    const windowListeners = {}
    const windowObject = {
        devicePixelRatio: 1,
        document,
        addEventListener(type, handler) {
            windowListeners[type] = handler
        },
        requestAnimationFrame(handler) {
            return setTimeout(handler, 0)
        }
    }

    const context = {
        console,
        Math,
        Number,
        String,
        Boolean,
        Array,
        Set,
        Map,
        JSON,
        Date,
        performance: { now: () => Date.now() },
        document,
        window: windowObject,
        setTimeout,
        clearTimeout,
        globalThis: null
    }

    context.globalThis = context

    vm.createContext(context)

    const kilabyrinthSource = fs.readFileSync(path.join(__dirname, "kilabyrinth.js"), "utf8")
    const astarSource = fs.readFileSync(path.join(__dirname, "a star.js"), "utf8")

    vm.runInContext(kilabyrinthSource, context, { filename: "kilabyrinth.js" })
    vm.runInContext(astarSource, context, { filename: "a star.js" })

    return { context, elements }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message)
    }
}

function readLabyrinth(context) {
    return JSON.parse(vm.runInContext("JSON.stringify(labyrinth)", context))
}

function exec(context, code) {
    return vm.runInContext(code, context)
}

async function main() {
    const { context, elements } = loadAStarContext()

    exec(context, `
        labyrinth = [
            [2,0,0,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,0,0,3]
        ]
        start = [0, 0]
        end = [4, 4]
        output2 = []
        isGenerating = false
        isPathfinding = false
    `)

    context.syncEditorUi()
    assert(elements["editor-status"].textContent.includes("Stift aktiv"), "Editor status should show active brush")

    context.setBrushSize(5)
    context.setActiveEditTool("brush")
    assert(context.paintLabyrinthArea(2, 2, true) === true, "Brush should paint walls")

    let labyrinthState = readLabyrinth(context)
    assert(labyrinthState[0][0] === 2, "Brush must not overwrite the start cell")
    assert(labyrinthState[4][4] === 3, "Brush must not overwrite the end cell")
    assert(labyrinthState[2][2] === 1, "Brush should paint the center cell black")
    assert(labyrinthState[0][1] === 1, "Large brush should affect neighboring cells")

    context.setEraserSize(3)
    context.setActiveEditTool("eraser")
    assert(context.paintLabyrinthArea(2, 2, false) === true, "Eraser should clear cells")

    labyrinthState = readLabyrinth(context)
    assert(labyrinthState[2][2] === 0, "Eraser should make the center cell white")
    assert(labyrinthState[0][1] === 1, "Eraser size should not clear cells outside its radius")

    context.paintWholeLabyrinth(true)
    labyrinthState = readLabyrinth(context)
    assert(labyrinthState[1][1] === 1, "Fill-black should paint interior cells black")
    assert(labyrinthState[0][0] === 2 && labyrinthState[4][4] === 3, "Fill-black must preserve start and end")

    context.paintWholeLabyrinth(false)
    labyrinthState = readLabyrinth(context)
    assert(labyrinthState[1][1] === 0, "Clear-all should paint interior cells white")
    assert(labyrinthState[0][0] === 2 && labyrinthState[4][4] === 3, "Clear-all must preserve start and end")

    exec(context, "isPathfinding = true")
    const beforeLockedPaint = JSON.stringify(readLabyrinth(context))
    assert(context.paintLabyrinthArea(1, 1, true) === false, "Painting should be blocked while A* is running")
    context.syncEditorUi()
    assert(elements["editor-status"].textContent.includes("gesperrt"), "Editor status should show locked state")
    assert(elements["tool-brush"].disabled === true, "Tool buttons should be disabled while A* runs")
    assert(JSON.stringify(readLabyrinth(context)) === beforeLockedPaint, "Locked painting must not modify the labyrinth")

    exec(context, "isPathfinding = false")
    context.syncEditorUi()
    assert(elements["tool-brush"].disabled === false, "Tool buttons should re-enable after unlocking")

    exec(context, `
        labyrinth = [
            [2,0,0,0,0],
            [0,1,1,1,0],
            [0,0,0,1,0],
            [1,1,0,1,0],
            [0,0,0,0,3]
        ]
        start = [0, 0]
        end = [4, 4]
    `)

    await context.startPathfinding()

    const pathLength = exec(context, "output2.length")
    const lastLog = elements["output-log"].value

    assert(pathLength > 0, "Pathfinding should produce a non-empty path on an edited maze")
    assert(lastLog.includes("fertig") || lastLog.includes("generation complete"), "Output log should report pathfinding completion")

    console.log("Smoke tests passed: paint tools, lock state, fill actions, and pathfinding all succeeded.")
}

main().catch(error => {
    console.error(error.stack || String(error))
    process.exitCode = 1
})