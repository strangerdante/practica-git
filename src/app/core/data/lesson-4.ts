import { Lesson } from '../models/lesson.interface';

export const lesson4: Lesson = {
    id: 4,
    title: 'Deshacer Errores',
    description: 'Aprende a recuperarte de errores en Git. Desde deshacer cambios locales hasta eliminar commits, domina reset, restore y revert.',
    steps: [],
    tips: [],
    practices: [
        {
            id: 1,
            title: 'Descartar Cambios (Restore)',
            description: 'Has modificado un archivo por error y quieres volver a la versión del último commit.',
            steps: [
                { id: 1, text: 'Verifica que tienes cambios no deseados.', command: 'git status' },
                { id: 2, text: 'Observa las diferencias exactas.', command: 'git diff' },
                { id: 3, text: 'Descarta los cambios en el archivo.', command: 'git restore config.json' },
                { id: 4, text: 'Verifica que el archivo está limpio de nuevo.', command: 'git status' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch config.json',
                'git add .',
                'git commit -m "Config_estable"',
                'echo "ERROR_CONFIG" > config.json'
            ],
            tips: [{ text: '`git restore` es la forma moderna. Antes se usaba `git checkout -- archivo`.', type: 'info' }]
        },
        {
            id: 2,
            title: 'Resetear Rama (Reset)',
            description: 'Mueve la rama hacia atrás para deshacer commits enteros.',
            steps: [
                { id: 5, text: 'Revisa el historial para decidir hasta dónde volver.', command: 'git log --oneline' },
                { id: 6, text: 'Deshaz el último commit pero mantén los cambios (Soft).', command: 'git reset --soft HEAD~1' },
                { id: 7, text: 'Verifica que el commit desapareció pero los archivos siguen ahí.', command: 'git status' },
                { id: 8, text: 'Ahora elimina todo permanentemente (Hard).', command: 'git reset --hard HEAD' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "V1"',
                'touch bug.js',
                'git add .',
                'git commit -m "Commit_con_bug"'
            ],
            tips: [{ text: '`--soft` es genial para "deshacer" un commit y volver a intentarlo. `--hard` destruye trabajo.', type: 'warning' }]
        },
        {
            id: 3,
            title: 'Revertir Seguro (Revert)',
            description: 'Deshaz el efecto de un commit creando uno nuevo inverso. Seguro para equipos.',
            steps: [
                { id: 9, text: 'Identifica el commit problemático en el historial.', command: 'git log --oneline' },
                { id: 10, text: 'Crea un contra-commit que anule los cambios.', command: 'git revert HEAD' },
                { id: 11, text: 'Verifica que ahora tienes un nuevo commit "Revert..."', command: 'git log --oneline' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "Inicio"',
                'echo "Bug" >> app.js',
                'git add .',
                'git commit -m "Feature_bugueada"'
            ],
            tips: [{ text: '`git revert` no borra historia, solo añade. Es la forma correcta de deshacer cambios en ramas públicas.', type: 'pro' }]
        }
    ]
};
