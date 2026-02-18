import { Lesson } from '../models/lesson.interface';

export const lesson2: Lesson = {
    id: 2,
    title: 'Ramas y Fusiones',
    description: 'Aprende a trabajar en paralelo creando ramas. Una rama es como una línea de tiempo alternativa donde puedes experimentar sin romper el código principal.',
    steps: [],
    tips: [],
    practices: [
        {
            id: 1,
            title: 'Crear Ramas (Branch & Switch)',
            description: 'Crea un universo paralelo para trabajar sin afectar el código principal.',
            steps: [
                { id: 1, text: 'Crea una nueva rama llamada "feature".', command: 'git branch feature' },
                { id: 2, text: 'Verifica que la rama se creó.', command: 'git branch' },
                { id: 3, text: 'Cámbiate a e esa rama para trabajar.', command: 'git switch feature' },
                { id: 4, text: 'Crea un archivo en esta nueva rama.', command: 'touch feature.txt' },
                { id: 5, text: 'Guarda el archivo en esta rama.', command: 'git add . && git commit -m "Feature_inicio"' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "Base"'
            ],
            tips: [{ text: '`git switch -c nombre` crea y cambia de rama en un solo paso.', type: 'pro' }]
        },
        {
            id: 2,
            title: 'Fusión Simple (Merge)',
            description: 'Une los cambios de tu rama "feature" de vuelta a la rama principal.',
            steps: [
                { id: 6, text: 'Vuelve a la rama principal donde quieres traer los cambios.', command: 'git switch main' },
                { id: 7, text: 'Fusiona la rama "feature" en "main".', command: 'git merge feature' },
                { id: 8, text: 'Verifica en el historial que los cambios están unidos.', command: 'git log --oneline' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "Base"',
                'git switch -c feature',
                'touch feature.txt',
                'git add .',
                'git commit -m "Feature_completada"',
                // Volvemos a feature para que el usuario tenga que cambiar manualmente
            ],
            tips: [{ text: 'Este tipo de fusión se llama "Fast-forward" porque Git solo mueve el puntero hacia adelante.', type: 'info' }]
        },
        {
            id: 3,
            title: 'Limpieza (Delete Branch)',
            description: 'Una vez fusionada, la rama "feature" ya no es necesaria. Elimínala.',
            steps: [
                { id: 9, text: 'Verifica las ramas existentes.', command: 'git branch' },
                { id: 10, text: 'Elimina la rama "feature" de forma segura.', command: 'git branch -d feature' },
                { id: 11, text: 'Confirma que solo queda la rama main.', command: 'git branch' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "Base"',
                'git branch feature' // Rama ya fusionada o existente que queremos borrar
            ],
            tips: [{ text: 'Si la rama no se ha fusionado, Git te impedirá borrarla con `-d`. Para forzarlo usa `-D`.', type: 'warning' }]
        }
    ]
};
