import { Lesson } from '../models/lesson.interface';

export const lesson1: Lesson = {
    id: 1,
    title: 'Fundamentos',
    description: 'Aprende los conceptos básicos de Git creando tu primer repositorio, añadiendo archivos y guardando cambios en el historial.',
    steps: [],
    tips: [],
    practices: [
        {
            id: 1,
            title: 'Inicio (Init & Status)',
            description: 'Todo comienza aquí. Inicializa tu repositorio y verifica su estado.',
            steps: [
                { id: 1, text: 'Inicializa el repositorio Git en esta carpeta.', command: 'git init' },
                { id: 2, text: 'Verifica el estado del repositorio vacío.', command: 'git status' },
                { id: 3, text: 'Crea un archivo de lectura.', command: 'touch README.md' },
                { id: 4, text: 'Vuelve a verificar el estado para ver el archivo "untracked".', command: 'git status' }
            ],
            setupCommands: [], // Start clean
            tips: [{ text: '`git init` crea una carpeta oculta `.git` donde vive toda la magia.', type: 'info' }]
        },
        {
            id: 2,
            title: 'Primer Commit (Add & Commit)',
            description: 'Aprende a guardar tus cambios permanentemente en el historial.',
            steps: [
                { id: 5, text: 'Agrega el archivo al área de preparación (staging).', command: 'git add README.md' },
                { id: 6, text: 'Verifica que el archivo está listo para ser confirmado.', command: 'git status' },
                { id: 7, text: 'Guarda tu primera versión con un mensaje descriptivo.', command: 'git commit -m "Commit_inicial"' },
                { id: 8, text: 'Comprueba que el árbol de trabajo está limpio.', command: 'git status' }
            ],
            setupCommands: [
                'git init',
                'touch README.md'
            ],
            tips: [{ text: 'El mensaje del commit es vital para entender la historia del proyecto después.', type: 'pro' }]
        },
        {
            id: 3,
            title: 'Historial y Cambios (Diff & Log)',
            description: 'Modifica archivos, revisa las diferencias y consulta la historia.',
            steps: [
                { id: 9, text: 'Modifica el archivo existente.', command: 'echo "# Proyecto Increíble" > README.md' },
                { id: 10, text: 'Revisa qué cambios has hecho exactamente.', command: 'git diff' },
                { id: 11, text: 'Guarda los cambios nuevos.', command: 'git add . && git commit -m "Añadir_título"' },
                { id: 12, text: 'Consulta el historial de commits realizados.', command: 'git log' }
            ],
            setupCommands: [
                'git init',
                'touch README.md',
                'git add .',
                'git commit -m "Commit_inicial"'
            ],
            tips: [{ text: '`git diff` te muestra las líneas exactas que cambiaron.', type: 'info' }]
        }
    ]
};
