import { Lesson } from '../models/lesson.interface';

export const lesson7: Lesson = {
    id: 7,
    title: 'Simulación Real: Feature Branch',
    description: 'Experimenta el ciclo de vida completo de una funcionalidad: clonar, crear rama, desarrollar (commit) y subir cambios (push).',
    steps: [],
    tips: [],
    practices: [
        {
            id: 1,
            title: 'Inicio de Funcionalidad',
            description: 'Prepárate para desarrollar una nueva característica.',
            steps: [
                { id: 1, text: 'Clona el repositorio del proyecto.', command: 'git clone https://github.com/app/ventas.git' },
                { id: 2, text: 'Entra al directorio.', command: 'cd sales-app' }, // Not strictly needed in this sim but good practice
                { id: 3, text: 'Crea una rama específica para la feature.', command: 'git switch -c feature/login' },
                { id: 4, text: 'Verifica que estás en la rama correcta.', command: 'git branch' }
            ],
            setupCommands: [
                'git init',
                'git branch -M main',
                'touch README.md',
                'git add .',
                'git commit -m "Init"',
                'cd ~'
            ],
            tips: [{ text: 'Nombrar ramas con prefijos como `feature/` o `fix/` es una gran práctica.', type: 'info' }]
        },
        {
            id: 2,
            title: 'Desarrollo Aislado',
            description: 'Trabaja en tu funcionalidad sin miedo a romper nada importante.',
            steps: [
                { id: 5, text: 'Crea el archivo de la funcionalidad.', command: 'touch login.ts' },
                { id: 6, text: 'Añade el archivo al stage.', command: 'git add login.ts' },
                { id: 7, text: 'Haz commit de tu progreso.', command: 'git commit -m "Implementar_login_básico"' },
                { id: 8, text: 'Simula más cambios.', command: 'echo "validar()" >> login.ts && git commit -am "Añadir_validaciones"' }
            ],
            setupCommands: [
                'configure-env cwd=~/sales-app repo=~/sales-app',
                'git init',
                'git branch -M main',
                'touch README.md',
                'git add .',
                'git commit -m "Init"',
                'git switch -c feature/login'
            ],
            tips: [{ text: 'Haz commits pequeños y frecuentes mientras desarrollas.', type: 'pro' }]
        },
        {
            id: 3,
            title: 'Compartir Cambios (Push)',
            description: 'Sube tu rama al servidor para revisión (Pull Request).',
            steps: [
                { id: 9, text: 'Verifica que tienes commits para subir.', command: 'git status' },
                { id: 10, text: 'Sube tu rama feature al remoto.', command: 'git push origin feature/login' },
                { id: 11, text: 'Simula volver a main para esperar el review.', command: 'git switch main' }
            ],
            setupCommands: [
                'configure-env cwd=~/sales-app repo=~/sales-app',
                'git init',
                'git branch -M main',
                'git remote add origin https://github.com/app/ventas.git',
                'touch README.md',
                'git add .',
                'git commit -m "Init"',
                'git switch -c feature/login',
                'touch login.ts',
                'git add .',
                'git commit -m "Login_complete"'
            ],
            tips: [{ text: 'Al hacer push, tu código está seguro en la nube y listo para ser revisado por tus compañeros.', type: 'info' }]
        },
        {
            id: 4,
            title: 'Sincronizar Main',
            description: 'Mientras esperabas, el equipo actualizó `main`. Actualiza tu rama para evitar conflictos.',
            steps: [
                { id: 12, text: 'Vuelve a la rama principal.', command: 'git switch main' },
                { id: 13, text: 'Trae los últimos cambios del equipo.', command: 'git pull origin main' },
                { id: 14, text: 'Regresa a tu rama de trabajo.', command: 'git switch feature/login' },
                { id: 15, text: 'Fusiona los cambios de main en tu rama.', command: 'git merge main' }
            ],
            setupCommands: [
                'configure-env cwd=~/sales-app repo=~/sales-app',
                'git init',
                'git branch -M main',
                'git remote add origin https://github.com/app/ventas.git',
                'touch README.md',
                'git add .',
                'git commit -m "Init"',
                // Crear historial remoto en main
                'git switch -c temp_remote',
                'echo "Update_team" >> README.md',
                'git commit -am "Team_update"',
                'git branch -f origin/main temp_remote',
                'git switch main',
                'git branch -D temp_remote',
                // Rama feature local
                'git switch -c feature/login',
                'touch login.ts',
                'git add .',
                'git commit -m "WIP"',
                'git branch --set-upstream-to=origin/main main'
            ],
            tips: [{ text: 'Mantener tu rama actualizada con `main` reduce drásticamente los conflictos al final.', type: 'pro' }]
        },
        {
            id: 5,
            title: 'Correcciones (Feedback)',
            description: 'Te pidieron cambios en el Code Review. ¡A trabajar!',
            steps: [
                { id: 16, text: 'Edita el archivo según el feedback.', command: 'echo "check_perms()" >> login.ts' },
                { id: 17, text: 'Guarda los cambios rápidamente.', command: 'git commit -am "Fix: permisos requeridos"' },
                { id: 18, text: 'Actualiza tu Pull Request subiendo los cambios.', command: 'git push origin feature/login' }
            ],
            setupCommands: [
                'configure-env cwd=~/sales-app repo=~/sales-app',
                'git init',
                'git branch -M main',
                'git remote add origin https://github.com/app/ventas.git',
                'touch README.md', 'git add .', 'git commit -m "Init"',
                'git switch -c feature/login',
                'touch login.ts', 'echo "code" > login.ts', 'git add .', 'git commit -m "Feature_v1"',
                'git push origin feature/login'
            ],
            tips: [{ text: 'En un PR, cada nuevo push actualiza automáticamente la solicitud de revisión.', type: 'info' }]
        },
        {
            id: 6,
            title: 'Cierre y Limpieza',
            description: 'Tu código ya está en producción. Hora de limpiar.',
            steps: [
                { id: 19, text: 'Ve a la rama main.', command: 'git switch main' },
                { id: 20, text: 'Trae la versión final fusionada.', command: 'git pull origin main' },
                { id: 21, text: 'Borra tu rama local, ya no la necesitas.', command: 'git branch -d feature/login' },
                { id: 22, text: 'Verifica que todo esté limpio.', command: 'git branch' }
            ],
            setupCommands: [
                'configure-env cwd=~/sales-app repo=~/sales-app',
                'git init',
                'git branch -M main',
                'git remote add origin https://github.com/app/ventas.git',
                'touch README.md',
                'git add .',
                'git commit -m "Init"',
                // Simular que feature/login ya se fusionó en remoto
                'git switch -c feature/login',
                'touch login.ts', 'git add .', 'git commit -m "Feature_complete"',
                'git push origin feature/login',
                'git switch main',
                // Simular merge en remoto
                'git merge feature/login',
                'git push origin main', // Update remote main
                'git reset --hard HEAD~1', // Rollback local main to simulate being behind
                'git branch --set-upstream-to=origin/main main'
            ],
            tips: [{ text: 'Borrar ramas fusionadas mantiene tu entorno local ordenado y fácil de entender.', type: 'pro' }]
        }
    ]
};
