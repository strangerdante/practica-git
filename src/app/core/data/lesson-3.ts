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
        },
        {
            id: 4,
            title: 'Unificar Commits (Squash)',
            description: 'Tienes 3 commits pequeños y quieres unirlos en uno solo antes de hacer push.',
            steps: [
                { id: 12, text: 'Observa tus últimos 3 cambios pequeños.', command: 'git log --oneline' },
                { id: 13, text: 'Mueve el puntero 2 pasos atrás (soft para no perder cambios).', command: 'git reset --soft HEAD~2' },
                { id: 14, text: 'Verifica que los cambios están listos para unirse.', command: 'git status' },
                { id: 15, text: 'Crea un solo commit que englobe todo.', command: 'git commit -m "Feature_completa_squashed"' },
                { id: 16, text: 'Confirma la historia simplificada.', command: 'git log --oneline' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js part1.txt part2.txt',
                'git add app.js', 'git commit -m "Base"',
                'git add part1.txt', 'git commit -m "WIP_1"',
                'git add part2.txt', 'git commit -m "WIP_2"'
            ],
            tips: [{ text: 'El `--soft` mantiene tus cambios en el área de staging, perfecto para re-commitear juntos.', type: 'info' }]
        },
        {
            id: 5,
            title: 'Etroceder y Dividir',
            description: 'Hiciste un commit gigante y quieres separarlo en dos más lógicos.',
            steps: [
                { id: 17, text: 'El último commit incluye front y back mezclado.', command: 'git log --oneline' },
                { id: 18, text: 'Deshaz el commit manteniendo cambios des-stageados.', command: 'git reset --mixed HEAD~1' },
                { id: 19, text: 'Añade solo el frontend.', command: 'git add index.html' },
                { id: 20, text: 'Guarda el primer commit.', command: 'git commit -m "Frontend_v1"' },
                { id: 21, text: 'Añade el resto (backend) y guárdalo.', command: 'git add server.js && git commit -m "Backend_v1"' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch index.html server.js',
                'git add .',
                'git commit -m "Todo_mezclado_error"'
            ],
            tips: [{ text: '`reset --mixed` es el defecto. Mueve HEAD y resetea el staging, pero deja tus archivos intactos.', type: 'info' }]
        },
        {
            id: 6,
            title: 'Referenciar Tags',
            description: 'Marca un punto específico en la historia como una "Versión".',
            steps: [
                { id: 27, text: 'Crea una etiqueta ligera para la versión 1.0.', command: 'git tag v1.0' },
                { id: 28, text: 'Lista las etiquetas existentes.', command: 'git tag' },
                { id: 29, text: 'Haz más cambios.', command: 'touch v2.txt && git add . && git commit -m "Work_v2"' },
                { id: 30, text: 'Vuelve al pasado usando el tag.', command: 'git checkout v1.0' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch release.txt',
                'git add .',
                'git commit -m "Release_Ready"'
            ],
            tips: [{ text: 'Los tags son punteros fijos, ideales para release versions (v1.0, v2.0).', type: 'info' }]
        }
    ]
};
