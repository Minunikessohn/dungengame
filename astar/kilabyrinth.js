function generateLab(size) {
    let lab = Array.from({ length: size }, () => Array(size).fill(0));
    
    // Zufällige Wände (30% Dichte)
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (Math.random() < 0.3) lab[i][j] = 1;
        }
    }
    
    // Start und Ende sicherstellen
    lab[0][0] = 2;
    lab[size - 1][size - 1] = 3;
    
    // Start und Ende freiräumen (damit der Weg nicht blockiert ist)
    lab[0][1] = 0; lab[1][0] = 0;
    lab[size-1][size-2] = 0; lab[size-2][size-1] = 0;
    
    return lab;
}