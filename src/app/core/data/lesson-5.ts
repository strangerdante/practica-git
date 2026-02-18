import { Lesson } from '../models/lesson.interface';

export const lesson5: Lesson = {
    id: 5,
    title: 'Trabajo en equipo (Simulación)',
    description: 'Aprende a colaborar usando repositorios remotos. Simula merge, pull requests y resolución de conflictos.',
    steps: [],
    tips: [],
    practices: [
        {
            id: 1,
            title: 'Configuración Remota',
            description: 'Conecta tu repositorio local con uno remoto (simulado).',
            steps: [
                { id: 1, text: 'Verifica los remotos actuales (vacío).', command: 'git remote -v' },
                { id: 2, text: 'Añade un origen remoto.', command: 'git remote add origin https://github.com/demo/app.git' },
                { id: 3, text: 'Verifica que se añadió correctamente.', command: 'git remote -v' },
                { id: 4, text: 'Simula traer la historia del remoto.', command: 'git fetch origin' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "Inicio"'
            ],
            tips: [{ text: '`origin` es solo el nombre estándar, podrías llamarlo como quisieras.', type: 'info' }]
        },
        {
            id: 2,
            title: 'Sincronización (Pull)',
            description: 'Tu equipo ha hecho cambios. Tráelos a tu computadora.',
            steps: [
                { id: 5, text: 'Verifica el estado de tu rama vs el remoto.', command: 'git status' },
                { id: 6, text: 'Trae y fusiona los cambios del remoto.', command: 'git pull origin main' },
                { id: 7, text: 'Revisa el historial para ver lo nuevo.', command: 'git log --oneline' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch app.js',
                'git add .',
                'git commit -m "V1"',
                'git remote add origin https://fake.url',
                // Simular commit en origin/main
                'git switch -c temp',
                'echo "Cambio_remoto" >> app.js',
                'git add .',
                'git commit -m "Update_remoto"',
                'git branch -f origin/main temp',
                'git switch main',
                'git branch -D temp',
                // Configurar tracking para que git status sepa
                'git branch --set-upstream-to=origin/main main'
            ],
            tips: [{ text: '`git pull` es en realidad un `git fetch` seguido de un `git merge`.', type: 'info' }]
        },
        {
            id: 3,
            title: 'Conflicto de Fusión',
            description: 'Tú y un compañero editaron el mismo archivo. Git necesita tu ayuda.',
            steps: [
                { id: 8, text: 'Intenta traer los cambios del compañero.', command: 'git pull origin main' },
                { id: 9, text: '¡Fallo automático! Git avisa del conflicto.', command: 'git status' },
                { id: 10, text: 'Resuelve el conflicto manualmente.', command: 'echo "Código Fusionado" > equipo.txt' },
                { id: 11, text: 'Marca el conflicto como resuelto.', command: 'git add equipo.txt' },
                { id: 12, text: 'Termina la fusión con un commit.', command: 'git commit -m "Merge_fix"' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'git remote add origin https://fake.url',
                'echo "Base" > equipo.txt',
                'git add .',
                'git commit -m "Base"',
                // Remoto
                'git switch -c temp',
                'echo "Cambio Remoto" > equipo.txt',
                'git add .',
                'git commit -m "Remote_change"',
                'git branch -f origin/main temp',
                'git switch main',
                'git branch -D temp',
                // Local conflict
                'echo "Cambio Local" > equipo.txt',
                'git add .',
                'git commit -m "Local_change"',
                'git branch --set-upstream-to=origin/main main'
            ],
            tips: [{ text: 'No temas a los conflictos, son normales en equipos activos.', type: 'pro' }]
        }
    ]
};
