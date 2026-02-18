import { Lesson } from '../models/lesson.interface';

export const lesson3: Lesson = {
    id: 3,
    title: 'Reescritura de Historial',
    description: 'Domina el arte de mantener un historial limpio. Aprende la diferencia entre merge y rebase, y cómo modificar commits anteriores.',
    steps: [],
    tips: [],
    practices: [
        {
            id: 1,
            title: 'Corregir Commit (Amend)',
            description: 'Te equivocaste en el mensaje del último commit. Corrígelo sin crear uno nuevo.',
            steps: [
                { id: 1, text: 'Verifica el último commit con mensaje erróneo.', command: 'git log -1' },
                { id: 2, text: 'Modifica el archivo olvidado (opcional).', command: 'echo "Corrección" >> error.txt' },
                { id: 3, text: 'Añade los cambios al stage.', command: 'git add .' },
                { id: 4, text: 'Reescribe el último commit con el nuevo mensaje.', command: 'git commit --amend -m "Mensaje_corregido"' },
                { id: 5, text: 'Verifica que el hash cambió pero es un solo commit.', command: 'git log -1' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch error.txt',
                'git add .',
                'git commit -m "Error_en_mensaje"'
            ],
            tips: [{ text: '`--amend` solo sirve para el último commit. ¡No lo uses si ya hiciste push!', type: 'warning' }]
        },
        {
            id: 2,
            title: 'Rebase Lineal',
            description: 'Mueve tus cambios sobre la punta de main para tener una historia limpia.',
            steps: [
                { id: 6, text: 'Estás en "feature". Verifica que main avanzó.', command: 'git log --all --graph --oneline' },
                { id: 7, text: 'Aplica tus cambios sobre main usando rebase.', command: 'git rebase main' },
                { id: 8, text: 'Observa cómo tu historial ahora es lineal.', command: 'git log --graph --oneline' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch base.txt',
                'git add .',
                'git commit -m "Base"',
                'git switch -c feature',
                'echo "feat" > feat.txt',
                'git add .',
                'git commit -m "Feature_WIP"',
                'git switch main',
                'echo "update" > update.txt',
                'git add .',
                'git commit -m "Update_Main"',
                'git switch feature'
            ],
            tips: [{ text: 'Si hay conflictos en el rebase, Git se detendrá para que los resuelvas paso a paso.', type: 'info' }]
        },
        {
            id: 3,
            title: 'Cherry Pick',
            description: 'Trae un commit específico de otra rama a tu rama actual.',
            steps: [
                { id: 9, text: 'Estás en main. Quieres solo la corrección de "experiment".', command: 'git log experiment --oneline' },
                { id: 10, text: 'Trae el commit específico usando su ID (simulado).', command: 'git cherry-pick experiment' },
                { id: 11, text: 'Verifica que el commit se copió a main.', command: 'git log --oneline' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "Inicio"',
                'git switch -c experiment',
                'touch hotfix.js',
                'git add .',
                'git commit -m "Fix_importante"',
                'touch basura.js',
                'git add .',
                'git commit -m "Basura_experimental"',
                'git switch main'
            ],
            tips: [{ text: 'Cherry-pick es útil cuando no quieres fusionar toda una rama, solo un cambio puntual.', type: 'pro' }]
        }
    ]
};
