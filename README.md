# Simulador Git 🛠️

**Simulador Git** es una plataforma educativa interactiva diseñada para dominar Git mediante la práctica directa. A diferencia de un tutorial estático, esta aplicación proporciona un entorno simulado completo donde puedes ejecutar comandos reales y ver cómo afectan al historial de tu proyecto de forma visual y dinámica.
- **Demon online**: [Simulador Git](https://gitlet.netlify.app/)


## ✨ Características Principales

- **💻 Terminal Integrada**: Un emulador de terminal real (`ng-terminal`) que procesa comandos de Git directamente en el navegador.
- **📊 Visualización en Tiempo Real**: Cada commit, rama o merge se refleja instantáneamente en un gráfico interactivo impulsado por `@gitgraph/js`.
- **⚙️ Motor de Git en el Navegador**: Utiliza `isomorphic-git` para gestionar un sistema de archivos virtual (`lightning-fs`), permitiendo una experiencia 100% local y segura.
- **📚 Lecciones Estructuradas**: 8 niveles que cubren desde los fundamentos hasta flujos de trabajo profesionales.
- **🔄 Aislamiento de Prácticas**: Cada ejercicio genera un entorno limpio y específico para asegurar el aprendizaje enfocado.
- **💾 Persistencia de Progreso**: Tu avance se guarda automáticamente en el navegador usando LocalStorage.

## 🛠️ Tecnologías Utilizadas

- **Core**: [Angular 21](https://angular.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Git Engine**: [isomorphic-git](https://isomorphic-git.org/)
- **FileSystem**: [lightning-fs](https://github.com/isomorphic-git/lightning-fs)
- **Visualización**: [@gitgraph/js](https://github.com/gitgraphjs/gitgraph.js/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ng-terminal](https://github.com/p-foucht/ng-terminal)

## 🚀 Instalación y Desarrollo

Si deseas ejecutar este proyecto localmente:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/strangerdante/practica-git
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm start
   ```
4. Abre `http://localhost:4200` en tu navegador.

## 📖 Temario de Lecciones

1.  **Fundamentos**: Aprenderás `init`, `add`, `commit`, `status` y `log`.
2.  **Ramas y Fusiones**: Creación y navegación de ramas, y unión de cambios con `merge`.
3.  **Reescritura de Historial**: Uso de `amend`, `rebase` y `cherry-pick` para mantener un historial limpio.
4.  **Deshacer Errores**: Recuperación mediante `restore`, `reset` y `revert`.
5.  **Trabajo en Equipo**: Configuración de remotos, sincronización con `pull` y resolución de conflictos.
6.  **Trabajo Temporal y Limpieza**: Gestión de cambios pendientes con `stash` y limpieza con `clean`.
7.  **Simulación Real (Feature Branch)**: Ciclo completo desde el clonado hasta el push.
8.  **Flujo de Pull Request**: Proceso profesional de revisión de código y fusiones tras aprobación.

---
Desarrollado con ❤️ para la comunidad de aprendizaje de Git.
