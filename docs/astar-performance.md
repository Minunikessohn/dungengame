# A*-Algorithmus: Warum ist er langsam?

Der Algorithmus in [a star.js](../astar/a%20star.js) funktioniert, aber er ist viel zu langsam. Das liegt nicht an einem einzelnen Fehler, sondern daran, dass fast jeder Schritt durch die ganze Liste läuft, obwohl er das gar nicht müsste. Bei einem 600×600 Labyrinth macht das einen riesigen Unterschied.

Hier sind die Probleme, sortiert nach Wichtigkeit.

## 1. `findbestpoint()` sucht jedes Mal die ganze Liste durch

Datei: [a star.js:26-40](../astar/a%20star.js#L26-L40)

Jedes Mal, wenn der Algorithmus den nächsten Punkt holen will, geht er **alle** offenen Punkte durch und sucht den mit dem kleinsten `f`-Wert. Das ist der klassische A*-Anfängerfehler.

**Lösung:** Eine Prioritätswarteschlange (Priority Queue, am besten ein Binär-Heap). Dann dauert das Holen nur noch `O(log n)` statt `O(n)`.

## 2. `pointgeneratet()` durchsucht zwei Listen pro Nachbar

Datei: [a star.js:42-56](../astar/a%20star.js#L42-L56)

Für **jeden** der 4 Nachbarn von **jedem** Punkt werden beide Listen (`unusedpoints` und `usedpoints`) komplett durchsucht. Je größer `usedpoints` wird, desto langsamer wird alles. Das ist der größte Bremser.

**Lösung:** Ein `Set` mit einem Schlüssel wie `` `${x},${y}` `` benutzen, oder ein 2D-Array (so groß wie das Labyrinth) mit `true`/`false`. Dann ist das Nachschauen `O(1)` statt `O(n)`.

## 3. `unusedpoints.splice(index, 1)` ist langsam

Datei: [a star.js:119](../astar/a%20star.js#L119)

`splice` muss alle Elemente nach dem entfernten Punkt nach links verschieben. Das ist `O(n)` und passiert bei jedem Schritt.

**Lösung:** Mit einem Heap fällt das Problem automatisch weg (man tauscht mit dem letzten Element und lässt es nach unten sinken).

## 4. `console.log(point)` mitten in der heißen Schleife

Datei: [a star.js:43](../astar/a%20star.js#L43)

Jeder besuchte Punkt wird in die Konsole geschrieben. Bei einem großen Labyrinth sind das schnell hunderttausende Ausgaben. Das alleine bremst den Code stark.

**Lösung:** Den `console.log` einfach löschen.

## 5. `reconstructPath()` sucht für jeden Schritt die ganze Liste

Datei: [a star.js:140-146](../astar/a%20star.js#L140-L146)

Beim Zurückverfolgen des Weges wird für jeden Schritt wieder die komplette `usedpoints`-Liste durchsucht.

**Lösung:** Wenn die besuchten Punkte in einer `Map` (Schlüssel = Koordinaten, Wert = Punkt-Objekt mit `pointer`) gespeichert werden, geht das Zurückverfolgen direkt in `O(Pfadlänge)`.

## 6. `find("start")` und `find("end")` laufen zweimal durch das ganze Labyrinth

Datei: [a star.js:3-20](../astar/a%20star.js#L3-L20)

Kleinigkeit, aber `forEach` hört auch dann nicht auf, wenn der Punkt schon gefunden wurde.

**Lösung:** Eine normale `for`-Schleife mit `break` benutzen, oder `generateLab` gibt Start und Ziel direkt mit zurück.

## Zusammenfassung

Der jetzige Code arbeitet ungefähr mit `O(n²)` Aufwand, ein richtiger A* arbeitet mit `O(n log n)`.

**Reihenfolge zum Beheben:**

1. Punkt 2 fixen (Set für besuchte Punkte) — größter Effekt.
2. Punkt 1 fixen (Binär-Heap als offene Liste).
3. Punkt 4 (`console.log` raus) — kostet nichts und bringt sofort etwas.
4. Den Rest danach.

Schon nach den ersten beiden Punkten sollte der Algorithmus sich fast augenblicklich anfühlen.
