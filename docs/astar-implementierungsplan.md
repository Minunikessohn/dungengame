# A*-Implementierungsplan: So beheben wir die Performance-Probleme

Dieser Plan zeigt Schritt für Schritt, wie der A*-Algorithmus in [a star.js](../astar/a%20star.js) schneller gemacht wird. Die Reihenfolge ist wichtig: jeder Schritt bringt schon einen messbaren Vorteil, auch wenn man danach aufhört.

Ein Überblick über die Probleme steht in [astar-performance.md](astar-performance.md).

---

## Schritt 1: `console.log` aus der heißen Schleife entfernen

**Aufwand:** 10 Sekunden. **Wirkung:** sofort spürbar.

In [a star.js:43](../astar/a%20star.js#L43) die Zeile löschen:

```js
function pointgeneratet(point){
    // console.log(point)   <-- LÖSCHEN
    let out = false
    // ...
}
```

Auch die `console.log`-Aufrufe in `reconstructPath` können raus, sie bremsen aber weniger.

---

## Schritt 2: Besuchte Punkte in einem `Set` speichern (größter Effekt)

Das Problem: `pointgeneratet()` durchsucht zwei Listen für jeden Nachbarn. Stattdessen benutzen wir ein `Set`, in dem wir Koordinaten als String speichern (`"x,y"`).

### 2a) Hilfsfunktion und neue Datenstrukturen

Ganz oben (bei den anderen `let`-Deklarationen) hinzufügen:

```js
function key(x, y) {
    return x + "," + y;
}

let openSet = new Set();   // Koordinaten der Punkte in unusedpoints
let closedSet = new Set(); // Koordinaten der Punkte in usedpoints
```

Beim Anlegen des Startpunkts auch in das Set eintragen:

```js
let unusedpoints = [{
    coords: start,
    g: 0,
    f: geth(start),
    pointer: []
}];
openSet.add(key(start[0], start[1]));
```

### 2b) `pointgeneratet()` ersetzen

Alte Funktion komplett ersetzen durch:

```js
function pointgeneratet(point){
    const k = key(point[0], point[1]);
    return openSet.has(k) || closedSet.has(k);
}
```

Aus `O(n)` wird `O(1)`. Das ist der wichtigste Schritt.

### 2c) Sets bei Push/Splice mitpflegen

In `generatenewpoints()` muss bei jedem `unusedpoints.push(...)` auch ein `openSet.add(...)` stehen. Beispiel für den ersten Block:

```js
if (xx - 1 >= 0 && !pointgeneratet([xx - 1, yy])){
    if (labyrinth[xx - 1][yy] != 1){
        unusedpoints.push({
            coords: [xx - 1, yy],
            g: unusedpoints[index].g + 1,
            f: unusedpoints[index].g + 1 + geth([xx - 1, yy]),
            pointer: [xx, yy]
        });
        openSet.add(key(xx - 1, yy));   // NEU
    }
    if (labyrinth[xx - 1][yy] == 3){
        foundziel = true;
    }
}
```

Das gleiche für die anderen drei Richtungen.

Am Ende von `generatenewpoints()` (wo der Punkt von `unusedpoints` nach `usedpoints` wandert):

```js
const movedPoint = unusedpoints[index];
usedpoints.push(movedPoint);
unusedpoints.splice(index, 1);

const mk = key(movedPoint.coords[0], movedPoint.coords[1]);
openSet.delete(mk);   // NEU
closedSet.add(mk);    // NEU
```

---

## Schritt 3: Offene Liste durch einen Binär-Heap ersetzen

Das Problem: `findbestpoint()` ist `O(n)`, `splice` auch. Mit einem Min-Heap wird beides `O(log n)`.

### 3a) Heap-Klasse hinzufügen

Diese kleine Klasse ganz oben in die Datei (vor den restlichen Funktionen) einfügen:

```js
class MinHeap {
    constructor() {
        this.data = [];
    }

    push(node) {
        this.data.push(node);
        this._siftUp(this.data.length - 1);
    }

    pop() {
        if (this.data.length === 0) return undefined;
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this._siftDown(0);
        }
        return top;
    }

    get size() {
        return this.data.length;
    }

    _siftUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.data[i].f < this.data[parent].f) {
                [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
                i = parent;
            } else break;
        }
    }

    _siftDown(i) {
        const n = this.data.length;
        while (true) {
            const l = 2 * i + 1;
            const r = 2 * i + 2;
            let smallest = i;
            if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
            if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
            if (smallest === i) break;
            [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
            i = smallest;
        }
    }
}
```

### 3b) `unusedpoints` durch den Heap ersetzen

```js
let openHeap = new MinHeap();
openHeap.push({
    coords: start,
    g: 0,
    f: geth(start),
    pointer: []
});
openSet.add(key(start[0], start[1]));
```

Die alte Variable `unusedpoints` wird nicht mehr gebraucht.

### 3c) `findbestpoint()` löschen

Die Funktion ist überflüssig. Stattdessen direkt:

```js
const current = openHeap.pop();
```

### 3d) `generatenewpoints()` umbauen

Die Funktion bekommt jetzt den Punkt direkt übergeben (kein Index mehr):

```js
function generatenewpoints(current){
    const xx = current.coords[0];
    const yy = current.coords[1];

    const tryNeighbor = (nx, ny) => {
        if (nx < 0 || nx >= labyrinth.length) return;
        if (ny < 0 || ny >= labyrinth[nx].length) return;
        if (labyrinth[nx][ny] == 1) return;
        if (pointgeneratet([nx, ny])) return;

        const node = {
            coords: [nx, ny],
            g: current.g + 1,
            f: current.g + 1 + geth([nx, ny]),
            pointer: [xx, yy]
        };
        openHeap.push(node);
        openSet.add(key(nx, ny));

        if (labyrinth[nx][ny] == 3) {
            foundziel = true;
        }
    };

    tryNeighbor(xx - 1, yy);
    tryNeighbor(xx + 1, yy);
    tryNeighbor(xx, yy - 1);
    tryNeighbor(xx, yy + 1);

    usedpoints.push(current);
    const k = key(xx, yy);
    openSet.delete(k);
    closedSet.add(k);
}
```

Schöner Nebeneffekt: viel weniger Code-Duplikation.

### 3e) `startPathfinding()` anpassen

```js
function startPathfinding() {
    let found = false;

    while (openHeap.size > 0) {
        const current = openHeap.pop();

        // Falls schon abgehakt (kann bei Duplikaten im Heap passieren) → überspringen
        const k = key(current.coords[0], current.coords[1]);
        if (closedSet.has(k)) continue;

        generatenewpoints(current);

        if (foundziel) {
            console.log("Ziel gefunden!");
            found = true;
            break;
        }
    }

    if (found) {
        reconstructPath();
    } else {
        console.log("Kein Weg möglich.");
    }
}
```

---

## Schritt 4: `reconstructPath()` mit einer `Map` beschleunigen

Statt `usedpoints` linear zu durchsuchen, legen wir die Punkte zusätzlich in einer `Map` ab.

### 4a) Map einführen

Oben:

```js
let nodeByKey = new Map();
```

In `generatenewpoints()`, direkt nach `openHeap.push(node);`:

```js
nodeByKey.set(key(nx, ny), node);
```

Und für den Startpunkt beim Anlegen ebenfalls:

```js
const startNode = { coords: start, g: 0, f: geth(start), pointer: [] };
openHeap.push(startNode);
openSet.add(key(start[0], start[1]));
nodeByKey.set(key(start[0], start[1]), startNode);
```

### 4b) `reconstructPath()` ersetzen

```js
function reconstructPath(){
    let node = nodeByKey.get(key(end[0], end[1]));
    if (!node) {
        console.log("Endpunkt nicht in Map gefunden");
        return end;
    }

    output1[node.coords[0]][node.coords[1]] = 3;
    output2.unshift(node.coords);

    while (node.pointer.length > 0) {
        node = nodeByKey.get(key(node.pointer[0], node.pointer[1]));
        if (!node) break;
        output1[node.coords[0]][node.coords[1]] = 8;
        output2.unshift(node.coords);
    }

    console.log("generation complete");
    return end;
}
```

---

## Schritt 5: `find("start")` und `find("end")` in einem Durchlauf

Kleinigkeit, aber sauberer:

```js
function findStartAndEnd(){
    let startCoord, endCoord;
    for (let i = 0; i < labyrinth.length; i++) {
        for (let j = 0; j < labyrinth[i].length; j++) {
            if (labyrinth[i][j] === 2) startCoord = [i, j];
            else if (labyrinth[i][j] === 3) endCoord = [i, j];
            if (startCoord && endCoord) return { startCoord, endCoord };
        }
    }
    return { startCoord, endCoord };
}

const { startCoord, endCoord } = findStartAndEnd();
const start = startCoord;
const end = endCoord;
```

Die alte `find()`-Funktion und die zwei Aufrufe können dann weg.

---

## Test-Checkliste

Nach jedem Schritt sollte das Programm immer noch:

- den richtigen Pfad finden,
- bei einem unlösbaren Labyrinth „Kein Weg möglich" ausgeben,
- bei einer 600×600-Karte spürbar schneller sein als vorher.

Zum Vergleichen am Anfang von `startPathfinding()`:

```js
console.time("astar");
```

Und am Ende (vor `reconstructPath`):

```js
console.timeEnd("astar");
```

So sieht man nach jedem Schritt, wie viel Millisekunden gespart wurden.

---

## Erwartetes Ergebnis

| Schritt | Hauptkosten vorher | Hauptkosten nachher |
|---------|--------------------|----------------------|
| 1 (`console.log` raus) | ~hunderttausende Log-Aufrufe | 0 |
| 2 (Set für besucht) | `O(n)` pro Nachbar-Check | `O(1)` |
| 3 (Min-Heap) | `O(n)` pro `findbestpoint` + `splice` | `O(log n)` |
| 4 (Map für Pfad) | `O(n × Pfadlänge)` | `O(Pfadlänge)` |
| 5 (Start/Ende-Suche) | zwei volle Durchläufe | ein Durchlauf mit `break` |

Insgesamt: aus `O(n²)` wird `O(n log n)`. Auf einem 600×600-Labyrinth sollte das den Unterschied zwischen mehreren Sekunden und einem Bruchteil davon ausmachen.
