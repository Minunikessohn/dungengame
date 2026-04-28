var Loottable = [
    {
        name: "Sword",
        chance: 5
    },
    {
        name: "steak",
        chance: 10,
        fillshunger: 30
    },
    {
        name: "healing potion",
        chance: 5,
        heals: 50
    }
]
     maxvergebenezahl = 0
Loottable.forEach(item => {
    item.start = maxvergebenezahl + 1//um neue zahlenbreiche von 0 - 1000 zu vergeben
    maxvergebenezahl = maxvergebenezahl + 1000 * (item.chance / 100)
    item.end = maxvergebenezahl
});