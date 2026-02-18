import { Lesson } from '../models/lesson.interface';

export const lesson8: Lesson = {
    id: 8,
    title: 'Flujo de Pull Request',
    description: 'Simula el proceso profesional de solicitar cambios: subir rama, recibir feedback y fusionar (merge) tras aprobación.',
    steps: [],
    tips: [],
    practices: [
        {
            id: 1,
            title: 'Abrir Pull Request',
            description: 'Tienes una nueva funcionalidad lista. Sube tu rama para abrir un PR.',
            steps: [
                { id: 1, text: 'Clona el repositorio.', command: 'git clone https://github.com/app/fintech.git' },
                { id: 2, text: 'Entra al directorio.', command: 'cd fintech' },
                { id: 3, text: 'Crea una rama para la funcionalidad.', command: 'git switch -c feature/pagos' },
                { id: 4, text: 'Crea el módulo de pagos.', command: 'touch pagos.ts' },
                { id: 5, text: 'Guarda los cambios.', command: 'git add . && git commit -m "Feat: estructura de pagos"' },
                { id: 6, text: 'Sube la rama para crear el PR.', command: 'git push -u origin feature/pagos' }
            ],
            setupCommands: [
                'configure-env cwd=~/fintech repo=~/fintech',
                'git init',
                'git branch -M main',
                'touch README.md',
                'git add .',
                'git commit -m "Init_project"',
                'cd ~'
            ],
            tips: [{ text: 'El flag `-u` conecta tu rama local con la remota, facilitando futuros push/pull.', type: 'info' }]
        },
        {
            id: 2,
            title: 'Feedback (Code Review)',
            description: 'Tu líder técnico comentó en el PR: "Falta validar la tarjeta de crédito".',
            steps: [
                { id: 7, text: 'Implementa la corrección solicitada.', command: 'echo "validarTarjeta()" >> pagos.ts' },
                { id: 8, text: 'Añade y confirma el cambio.', command: 'git commit -am "Fix: validación requerida"' },
                { id: 9, text: 'Actualiza el PR subiendo los cambios.', command: 'git push' }
            ],
            setupCommands: [
                'configure-env cwd=~/fintech repo=~/fintech',
                'git init',
                'git branch -M main',
                'git remote add origin https://github.com/app/fintech.git',
                'touch README.md', 'git add .', 'git commit -m "Init"',
                'git switch -c feature/pagos',
                'touch pagos.ts', 'git add .', 'git commit -m "Feat: estructura de pagos"',
                'git push -u origin feature/pagos'
            ],
            tips: [{ text: 'No necesitas abrir otro PR. Al hacer push en la misma rama, el PR se actualiza automáticamente.', type: 'pro' }]
        },
        {
            id: 3,
            title: 'Aprobación y Merge',
            description: '¡PR Aprobado y Fusionado! El código ya está en `main` del servidor. Sincronízate.',
            steps: [
                { id: 10, text: 'Vuelve a la rama principal.', command: 'git switch main' },
                { id: 11, text: 'Descarga los cambios fusionados.', command: 'git pull origin main' },
                { id: 12, text: 'Verifica que la funcionalidad esté ahí.', command: 'ls' },
                { id: 13, text: 'Elimina tu rama local (ya no sirve).', command: 'git branch -d feature/pagos' }
            ],
            setupCommands: [
                'configure-env cwd=~/fintech repo=~/fintech',
                'git init',
                'git branch -M main',
                'git remote add origin https://github.com/app/fintech.git',
                'touch README.md', 'git add .', 'git commit -m "Init"',
                // Crear feature/pagos local 
                'git switch -c feature/pagos',
                'touch pagos.ts',
                'echo "export class Pagos { validarTarjeta() {} }" > pagos.ts',
                'git add .',
                'git commit -m "Feat_complete"',
                'git push -u origin feature/pagos',
                // Simular MERGE en remoto (origin/main)
                'git switch main',
                'git merge feature/pagos',
                'git branch -f origin/main main', // "Subir" el merge al remoto simulado
                // Resetear local main para que esté atrás
                'git reset --hard HEAD~1',
                // Volver al usuario a su rama feature para empezar
                'git switch feature/pagos'
            ],
            tips: [{ text: 'Es vital hacer `git pull` después de que tu PR se fusione para tener la última versión del proyecto.', type: 'warning' }]
        }
    ]
};
