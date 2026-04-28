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

async function generateLab(size) {
    let lab = Array.from({ length: size }, () => Array(size).fill(0))
    const startedAt = nowMs()
    let lastLogAt = startedAt
    let generatedCells = 0
    let generatedCellsSinceYield = 0

    function logProgress(force) {
        if (!isLoggingEnabled()) {
            return
        }

        const currentTime = nowMs()
        if (!force && currentTime - lastLogAt < 1000) {
            return
        }

        writeOutputLine(
            "[labyrinth] vergangen:",
            formatDuration(currentTime - startedAt),
            "| generierte Kästchen:",
            generatedCells
        )

        lastLogAt = currentTime
    }

    // Zufällige Wände (30% Dichte)
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            generatedCells += 1
            generatedCellsSinceYield += 1

            if (Math.random() < 0.3) {
                lab[i][j] = 1
            }

            logProgress(false)

            if (isLoggingEnabled() && generatedCellsSinceYield >= 4096) {
                generatedCellsSinceYield = 0
                await yieldToUi()
            }
        }
    }

    // Start und Ende sicherstellen
    lab[0][0] = 2
    lab[size - 1][size - 1] = 3

    // Start und Ende freiräumen (damit der Weg nicht blockiert ist)
    lab[0][1] = 0
    lab[1][0] = 0
    lab[size - 1][size - 2] = 0
    lab[size - 2][size - 1] = 0

    logProgress(true)

    return lab
}