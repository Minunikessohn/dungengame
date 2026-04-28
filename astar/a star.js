let labyrinth = generateLab(100)

function find(obj){
    if(obj == "start"){
        obj = 2
    } else if (obj == "end"){
        obj = 3
    }
    let out;
    labyrinth.forEach((element, index) =>{
        element.forEach((element2, index2) =>{
            if(element2 == obj) {
                out = [index, index2]
            }
        })
    })
    return out
}
let end = find("end")
let start = find("start")

function geth(point){
    return Math.abs(end[0] - point[0]) + Math.abs(end[1] - point[1])
}

function findbestpoint(){
    if (unusedpoints.length === 0) {
        return -1; // Signalisiert: Nichts mehr zu tun!
    }
    let lowestf = unusedpoints[0].f
    let bestpoint = 0
    unusedpoints.forEach((element, index) => {
        if (element.f < lowestf){
            lowestf = element.f
            bestpoint = index
        }
        
    });
    return bestpoint
}

function pointgeneratet(point){
    console.log(point)
    let out = false
    unusedpoints.forEach((element, index) => {
        if(unusedpoints[index].coords[0] == point[0] && unusedpoints[index].coords[1] == point[1]){
            out = true
        }
    });
    usedpoints.forEach((element, index) => {
        if(usedpoints[index].coords[0] == point[0] && usedpoints[index].coords[1] == point[1]){
            out = true
        }
    });
    return out
}

function generatenewpoints(index){
    let xx = unusedpoints[index].coords[0]
    let yy = unusedpoints[index].coords[1]
    if (xx - 1 >= 0 && !pointgeneratet([xx -1, yy])){
        if (labyrinth[xx -1][yy] != 1){
            unusedpoints.push({
                coords: [xx -1, yy],
                g: unusedpoints[index].g + 1,
                f: unusedpoints[index].g + 1 + geth([xx -1, yy]),
                pointer: [xx, yy]
        })
        }
        if (labyrinth[xx -1][yy] == 3){
            foundziel = true
        }

    }
    if (xx + 1 < labyrinth.length && !pointgeneratet([xx +1, yy])){
        if (labyrinth[xx +1][yy] != 1){
            unusedpoints.push({
                coords: [xx +1, yy],
                g: unusedpoints[index].g + 1,
                f: unusedpoints[index].g + 1 + geth([xx +1, yy]),
                pointer: [xx, yy]
        })
        }
        if (labyrinth[xx +1][yy] == 3){
            foundziel = true
        }
    }
    if (yy - 1 >= 0 && !pointgeneratet([xx, yy -1])){
        if (labyrinth[xx][yy -1] != 1){
            unusedpoints.push({
                coords: [xx, yy -1],
                g: unusedpoints[index].g + 1,
                f: unusedpoints[index].g + 1 + geth([xx, yy -1]),
                pointer: [xx, yy]
        })
        }
        if (labyrinth[xx][yy -1] == 3){
            foundziel = true
        }

    }
    if (yy + 1 < labyrinth[xx].length && !pointgeneratet([xx, yy +1])){
        if (labyrinth[xx][yy +1] != 1){
            unusedpoints.push({
                coords: [xx, yy +1],
                g: unusedpoints[index].g + 1,
                f: unusedpoints[index].g + 1 + geth([xx, yy +1]),
                pointer: [xx, yy]
        })
        }
        if (labyrinth[xx][yy +1] == 3){
            foundziel = true
        }

    }


    usedpoints.push(unusedpoints[index])
    unusedpoints.splice(index,1)
}

let foundziel = false

function reconstructPath(){
        console.log("generatet end")
        let lastpointer = []
        unusedpoints.forEach((element, index) => {
            if (unusedpoints[index].coords[0] == end[0] && unusedpoints[index].coords[1] == end[1]){
                console.log("found end")
                console.log(index)
                lastpointer = unusedpoints[index].pointer
                output1[unusedpoints[index].coords[0]][unusedpoints[index].coords[1]] = 3
                output2.unshift(unusedpoints[index].coords)
                console.log(lastpointer)
            }
        });
        console.log(lastpointer)
        let i = 0
        while (lastpointer.length > 0){
            usedpoints.forEach((element, index) => {
                if (usedpoints[index].coords[0] == lastpointer[0] && usedpoints[index].coords[1] == lastpointer[1]){
                    lastpointer = usedpoints[index].pointer
                    output1[usedpoints[index].coords[0]][usedpoints[index].coords[1]] = 8
                    output2.unshift(usedpoints[index].coords)
                }
            });
        }
        console.log("generation complete")
        return end
}

function startPathfinding() {
    let found = false;

    while (unusedpoints.length > 0) {
        let bestIdx = findbestpoint();
        
        // 1. Punkt verarbeiten
        generatenewpoints(bestIdx);

        // 2. Prüfen, ob das Ende erreicht wurde
        if (foundziel) {
            console.log("Ziel gefunden!");
            found = true;
            break; // Schleife sofort beenden
        }
    }

    if (found) {
        reconstructPath(); // Hier lagerst du deinen Code zum Pfad-Zeichnen aus
    } else {
        console.log("Kein Weg möglich.");
    }
}

let output1 = JSON.parse(JSON.stringify(labyrinth));
let output2 = []

let unusedpoints = [{
    coords: start,
    g: 0,
    f: geth(start),
    pointer: []
}
]

let usedpoints = []