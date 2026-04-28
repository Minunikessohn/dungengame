seed = 1234
combined = 0
x = 1
y = 1
health = 100
hunger = 100
doorchance = 150
class Room {
    constructor() {
        this.doorRight = undefined
        this.doorLeft = undefined
        this.doorDown = undefined
        this.doorUp = undefined
        this.chest = undefined
        this.loot = undefined
        this.room = undefined
    }
}

function randomint(seed, x, y, a) {
  let h = x * 374761393 + y * 668265263*a + seed * 1442695041;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) % 10; // Ergebnis 0–9
}

function generaterandomlist(max, a){
    let output = []
    for (let i=1; i<=max; i++){
        output.push(randomint(seed, x, y, 100+2*(i+a)+1))
    }
    return output
}

function generatebignumber(x,y,z){
        return x + y*10 +z*100
}

function generateloot(){

    const loot = []
    for (let i=1; i<=27; i++){ //für jeden item slot
        const number = generatebignumber(randomint(seed, x, y, i*6+1), randomint(seed, x, y, i*6+3), randomint(seed, x, y, i*6+5)) //3-stellige zahl
        
            if (number > maxvergebenezahl){
                loot.push("air")
            } else {
                for (let j = 0; j<Loottable.length; j++){ //für jedes item
                    if (number > Loottable[j].start & number <= Loottable[j].end) {//falls chance erfüllt
                        loot.push(Loottable[j].name)
                    }
                }
            }
    }
    return loot

}


function generateRoom(seed, x, y){
    if ((map[`${x},${y}`] == undefined)){
        if ((x == 0 && (y < 31 && y > -31))||(y == 0 && (x < 31 && x > -31))){
            out.doorRight = true
            out.doorLeft = true
            out.doorUp = true
            out.doorDown = true
            out.chest = false
            out.loot = []
            out.room = 15
            map[`${x},${y}`] = out;
            console.log("Room generated")
            return out
        } else {
            console.log("Room generated")
            indint = randomint(seed, x, y, 1) + randomint(seed, x, y, 1);
            indint2 = randomint(seed, x, y, 5);
            //indint1 = BigInt(randomint(seed, x, y, 1), randomint(seed, x, y, 3), randomint(seed, x, y, 5));
            //indint2 = BigInt(randomint(seed, x, y, 7), randomint(seed, x, y, 9), randomint(seed, x, y, 11));
            //indint3 = BigInt(randomint(seed, x, y, 13), randomint(seed, x, y, 15), randomint(seed, x, y, 17));
            //indint4 = BigInt(randomint(seed, x, y, 19), randomint(seed, x, y, 21), randomint(seed, x, y, 23));
            //indint5 = BigInt(randomint(seed, x, y, 25), randomint(seed, x, y, 27), randomint(seed, x, y, 29));
            out = new Room();
            //if (doorchance <= indint1){out.doorRight = true} else {out.doorRight = false}
            //if (doorchance <= indint2){out.doorLeft = true} else {out.doorLeft = false}
            //if (doorchance <= indint3){out.doorDown = true} else {out.doorDown = false}
            //if (doorchance <= indint4){out.doorUp = true} else {out.doorUp = false}
            out.doorRight = [2,3,5,7,9,11,13,15,17,19].includes(indint);
            out.doorLeft  = [1,2,5,6,9,10,13,14,15,17,18].includes(indint);
            out.doorUp    = [3,4,5,6,11,12,13,14,15,17,18].includes(indint);
            out.doorDown  = [7,8,9,10,11,12,13,14,15,16,18].includes(indint);
            out.chest = [1,2].includes(indint2)
            room = 0
            if (out.doorRight){room +1}
            if (out.doorLeft){room +2}
            if (out.doorUp){room +4}
            if (out.doorDown){room +8}
            out.room = room

            if (out.chest == true){ //loot generierung
                out.loot = [generateloot()]
            } else {
                out.loot = []
            }
            map[`${x},${y}`] = out;
            return out

        }

    }

}

function goroom(Direction){
    if (Direction == "up"){
        y = y + 1
        generateRoom(seed, x ,y)
    }
    if (Direction == "down"){
        y = y - 1
        generateRoom(seed, x ,y)
    }
    if (Direction == "left"){
        x = x - 1
        generateRoom(seed, x ,y)
    }
    if (Direction == "right"){
        x = x + 1
        generateRoom(seed, x ,y)
    }
}

generateRoom(seed, x, y)//generates startingroom

function generatesquare(size, startingpointx, startingpointy){ //for testing generating a big map
    for (let j = 0; j<size; j++){
        for (let o = 0; o<size; o++){
            generateRoom(seed, startingpointx + o, j+startingpointy)
        }
    }
}

function Exportmap(obj) {
  const content = "const data = " + JSON.stringify(obj, null, 2) + ";";

  const blob = new Blob([content], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'map.js';
  a.click();

  URL.revokeObjectURL(url);
}

function eat(food){
    for (let i=1; i<=Loottable.length; i++){
        if (Loottable[i].name = food){
            hunger = hunger + Loottable[i].fillshunger
            return "true"
        }
    }
    
}