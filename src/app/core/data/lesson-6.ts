import { Lesson } from '../models/lesson.interface';

export const lesson6: Lesson = {
    id: 6,
    title: 'Trabajo temporal y limpieza',
    description: 'Aprende a guardar tu trabajo incompleto temporalmente y a mantener limpio tu repositorio. Domina git stash, clean, rm y mv.',
    steps: [],
    tips: [],
    practices: [
        {
            id: 1,
            title: 'Multitasking (Stash)',
            description: 'Simula una interrupción urgente mientras trabajas en una feature.',
            steps: [
                { id: 1, text: 'Estás desarrollando una nueva feature compleja.', command: 'echo "Lógica compleja..." > feature.ts' },
                { id: 2, text: '¡Emergencia! Guarda tu trabajo temporalmente.', command: 'git stash save "WIP: Feature"' },
                { id: 3, text: 'Cambia a la rama del hotfix.', command: 'git switch hotfix-urgente' },
                { id: 4, text: 'Arregla el bug (simulado) y guarda.', command: 'echo "Fixed" >> app.js && git commit -am "Fix_bug"' },
                { id: 5, text: 'Vuelve a tu rama principal.', command: 'git switch main' },
                { id: 6, text: 'Recupera tu trabajo donde lo dejaste.', command: 'git stash pop' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "Inicio"',
                'git switch -c hotfix-urgente',
                'echo "Bug report" > bug.txt',
                'git add .',
                'git commit -m "Reporte_bug"',
                'git switch main'
            ],
            tips: [
                { text: '`git stash save` permite añadir un mensaje para recordar qué guardaste.', type: 'info' }
            ]
        },
        {
            id: 2,
            title: 'Limpieza (Clean)',
            description: 'Tu entorno de trabajo está sucio con archivos temporales.',
            steps: [
                { id: 7, text: 'Verifica los archivos basura generados.', command: 'git status' },
                { id: 8, text: 'Haz un simulacro de borrado (dry-run).', command: 'git clean -n' },
                { id: 9, text: 'Limpia el entorno borrando los archivos.', command: 'git clean -f' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "Start"',
                'touch debug.log temp.cache build.tmp' // Archivos "basura"
            ],
            tips: [
                { text: '`git clean -f` es irreversible. ¡Cuidado!', type: 'warning' }
            ]
        },
        {
            id: 3,
            title: 'Refactor (Mv & Rm)',
            description: 'Reorganiza la estructura del proyecto y elimina archivos obsoletos.',
            steps: [
                { id: 10, text: 'Crea una carpeta para documentación.', command: 'mkdir docs' },
                { id: 11, text: 'Mueve las notas a la nueva carpeta.', command: 'git mv notas.txt docs/notas.txt' },
                { id: 12, text: 'Confirma la reestructuración.', command: 'git commit -m "Refactor_docs"' },
                { id: 13, text: 'Elimina el archivo deprecado.', command: 'git rm legacy.txt' },
                { id: 14, text: 'Confirma la eliminación.', command: 'git commit -m "Delete_legacy"' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js notas.txt legacy.txt',
                'git add .',
                'git commit -m "Estructura_inicial"'
            ],
            tips: [
                { text: '`git mv` conserva el historial del archivo movido.', type: 'pro' }
            ]
        }
    ]
};
