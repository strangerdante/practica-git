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
                'git switch -c feature',
                'touch feature.txt',
                'git add .',
                'git commit -m "Feature_WIP"',
                'git switch main',
                'git merge feature'
            ],
            tips: [{ text: 'Si la rama no se ha fusionado, Git te impedirá borrarla con `-d`. Para forzarlo usa `-D`.', type: 'warning' }]
        },
        {
            id: 4,
            title: 'Fusión sin FF (No Fast-Forward)',
            description: 'Fuerza la creación de un commit de merge para mantener la historia de la rama.',
            steps: [
                { id: 12, text: 'Tienes una rama "dev" lista para fusionar.', command: 'git checkout dev' },
                { id: 13, text: 'Observa que dev está un commit por delante.', command: 'git log --oneline' },
                { id: 14, text: 'Vuelve a main.', command: 'git checkout main' },
                { id: 15, text: 'Fusiona creando explícitamente un commit.', command: 'git merge --no-ff dev' },
                { id: 16, text: 'Verifica el commit de Merge en el historial.', command: 'git log --graph --oneline' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "V1"',
                'git switch -c dev',
                'echo "Dev" > dev.txt',
                'git add .',
                'git commit -m "Feature_dev"',
                'git switch main'
            ],
            tips: [{ text: 'Útil en equipos para ver claramente cuándo se integró una feature completa.', type: 'info' }]
        },
        {
            id: 5,
            title: 'Renombrar Rama (Move)',
            description: 'Te equivocaste al escribir el nombre de la rama. Corrígelo.',
            steps: [
                { id: 17, text: 'Estás en una rama con nombre incorrecto "featre-login".', command: 'git branch' },
                { id: 18, text: 'Renómbrala a "feature-login".', command: 'git branch -m feature-login' },
                { id: 19, text: 'Verifica el cambio de nombre.', command: 'git branch' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "Init"',
                'git switch -c featre-login'
            ],
            tips: [{ text: 'El flag `-m` viene de "move" (mover/renombrar).', type: 'info' }]
        },
        {
            id: 6,
            title: 'Cabeza Separada (Detached HEAD)',
            description: 'Viaja al pasado para inspeccionar un commit antiguo sin crear una rama.',
            steps: [
                { id: 20, text: 'Consulta el historial para ver IDs antiguos.', command: 'git log --oneline' },
                { id: 21, text: 'Salta al pasado (3 commits atrás).', command: 'git checkout HEAD~3' },
                { id: 22, text: 'Observa que ya no estás en una rama (detached).', command: 'git status' },
                { id: 23, text: 'Vuelve al presente (a la rama main).', command: 'git switch main' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch versiones.txt',
                'echo "Archivo de Versiones\n------------------\nVersión 1: Funcionalidad base del sistema." > versiones.txt',
                'git add .',
                'git commit -m "V1_Incial"',
                'echo "Archivo de Versiones\n------------------\nVersión 2: Agregados estilos CSS y layout." > versiones.txt',
                'git add .',
                'git commit -m "V2_Estilos"',
                'echo "Archivo de Versiones\n------------------\nVersión 3: Implementada lógica de autenticación." > versiones.txt',
                'git add .',
                'git commit -m "V3_Auth"',
                'echo "Archivo de Versiones\n------------------\nVersión 4: Corrección de bugs críticos en login." > versiones.txt',
                'git add .',
                'git commit -m "V4_Fixes"',
                'echo "Archivo de Versiones\n------------------\nVersión 5: Optimización de rendimiento y cache." > versiones.txt',
                'git add .',
                'git commit -m "V5_Optimizacion"'
            ],
            tips: [{ text: 'Cuidado: los commits que hagas en modo "detached" se perderán si cambias de rama sin crear una nueva.', type: 'warning' }]
        }
    ]
};
