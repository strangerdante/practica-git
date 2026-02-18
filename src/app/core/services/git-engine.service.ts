import { Injectable, signal, computed } from '@angular/core';
import git from 'isomorphic-git';
import LightningFS from '@isomorphic-git/lightning-fs';
import { Buffer } from 'buffer';

(window as any).Buffer = Buffer;

export interface Commit {
    hash: string;
    message: string;
    author: string;
    date: Date;
    parent: string | null;
    mergeParent?: string | null;
    tree: Record<string, string>;
}

@Injectable({
    providedIn: 'root'
})
export class GitEngineService {
    commits = signal<Record<string, Commit>>({});
    branches = signal<Record<string, string | null>>({});
    head = signal<string>('');
    currentBranch = signal<string | null>(null);
    fileSystem = signal<Record<string, string>>({});
    remotes = signal<Record<string, string>>({});
    stashes = signal<{ id: number, message: string, files: Record<string, string> }[]>([]);
    networkOperation = signal<'download' | 'upload' | null>(null);

    // Virtual Filesystem State for Immersion
    cwd = signal<string>('~/project');
    repoPath = signal<string>('~/project'); // Where the "real" underlying repo is mounted virtually

    fs: any;
    readonly dir = '/repo';
    private currentDbName = 'fs';
    private readonly defaultAuthor = { name: 'User', email: 'user@example.com' };

    currentCommitHash = computed(() => {
        const head = this.head();
        if (head.startsWith('refs/heads/')) {
            const branchName = head.replace('refs/heads/', '');
            return this.branches()[branchName] || null;
        }
        return head || null;
    });

    constructor() {
        this.fs = new LightningFS('fs');
        this.init().catch(err => console.error('Error inicializando git:', err));
    }

    async init() {
        this.resetState();
        await this.cleanupOldDatabase();
        await this.initializeFreshDatabase();
        await this.setupGitRepo();
        await this.createExampleFiles();
        await this.refreshState();

        // Reset virtual environment defaults
        this.cwd.set('~/project');
        this.repoPath.set('~/project');

        console.log('Git Engine Ready (Clean Slate)');
    }

    private resetState() {
        this.commits.set({});
        this.branches.set({});
        this.head.set('');
        this.currentBranch.set(null);
        this.remotes.set({});
        this.stashes.set([]);
    }

    private async createExampleFiles() {
        try {
            await this.fs.promises.writeFile(`${this.dir}/README.md`, '# Bienvenido a Git Interactive\n\nEste es un entorno seguro para practicar comandos de Git.\nLos cambios aquí no afectan tu sistema real.');
            await this.fs.promises.writeFile(`${this.dir}/todo.txt`, '1. Aprender git init\n2. Aprender git add\n3. Aprender git commit\n4. Divertirse aprendiendo');
            await this.fs.promises.writeFile(`${this.dir}/guia-rapida.md`, '## Comandos Básicos\n\n- `git status`: Ver estado\n- `git add <archivo>`: Preparar archivo\n- `git commit -m "mensaje"`: Guardar cambios');
        } catch (error) {
            console.error('Error creando archivos de ejemplo:', error);
        }
    }

    private async cleanupOldDatabase() {
        if (this.currentDbName?.startsWith('fs_')) {
            try {
                window.indexedDB.deleteDatabase(this.currentDbName);
                console.log('Cleaned up old DB:', this.currentDbName);
            } catch (e) {
                console.warn('Could not delete old DB:', e);
            }
        }
    }

    private async initializeFreshDatabase() {
        this.currentDbName = `fs_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        console.log('Initializing FRESH Git Environment on DB:', this.currentDbName);
        this.fs = new LightningFS(this.currentDbName);

        try {
            await this.fs.promises.mkdir(this.dir);
        } catch (e) { /* ignore */ }
    }

    private async setupGitRepo() {
        await git.init({ fs: this.fs, dir: this.dir, defaultBranch: 'main' });
        await git.setConfig({ fs: this.fs, dir: this.dir, path: 'user.name', value: this.defaultAuthor.name });
        await git.setConfig({ fs: this.fs, dir: this.dir, path: 'user.email', value: this.defaultAuthor.email });
        // Ensure main branch is created initially
        await git.branch({ fs: this.fs, dir: this.dir, ref: 'main', checkout: true });
    }

    async refreshState() {
        try {
            await this.updateHead();
            await this.updateBranches();
            await this.updateCommits();
        } catch (error) {
            console.error('Error refrescando estado:', error);
        }
    }

    private async updateHead() {
        let currentHead = '';
        try {
            currentHead = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD', depth: 2 });
        } catch (e) { /* ignore */ }

        const branch = await git.currentBranch({ fs: this.fs, dir: this.dir }) || null;
        this.currentBranch.set(branch);
        this.head.set(branch ? `refs/heads/${branch}` : currentHead);
    }

    private async updateBranches() {
        const branchesList = await git.listBranches({ fs: this.fs, dir: this.dir });
        const branchesMap: Record<string, string | null> = {};

        for (const b of branchesList) {
            const hash = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: b });
            branchesMap[b] = hash;
        }
        this.branches.set(branchesMap);
    }

    private async updateCommits() {
        const commitsMap: Record<string, Commit> = {};
        const branchesList = await git.listBranches({ fs: this.fs, dir: this.dir });
        const currentHead = this.head();
        const refs = [...branchesList];

        if (!refs.includes('HEAD') && currentHead) refs.push('HEAD');

        for (const ref of refs) {
            try {
                const logs = await git.log({ fs: this.fs, dir: this.dir, ref });
                for (const commitObj of logs) {
                    if (!commitsMap[commitObj.oid]) {
                        commitsMap[commitObj.oid] = {
                            hash: commitObj.oid,
                            message: commitObj.commit.message,
                            author: `${commitObj.commit.author.name} <${commitObj.commit.author.email}>`,
                            date: new Date(commitObj.commit.author.timestamp * 1000),
                            parent: commitObj.commit.parent[0] || null,
                            mergeParent: commitObj.commit.parent[1] || null,
                            tree: {}
                        };
                    }
                }
            } catch (e) { /* ignore */ }
        }
        this.commits.set(commitsMap);
    }

    async resolveCommit(ref: string): Promise<string> {
        const [base, countStr] = ref.split('~');
        let oid = await this.resolveRef(base);

        if (countStr !== undefined) {
            const count = parseInt(countStr, 10) || 1;
            for (let i = 0; i < count; i++) {
                const commit = await git.readCommit({ fs: this.fs, dir: this.dir, oid });
                if (commit.commit.parent?.length > 0) {
                    oid = commit.commit.parent[0];
                } else {
                    throw new Error(`Commit ${oid} no tiene padre`);
                }
            }
        }
        return oid;
    }

    private async resolveRef(ref: string): Promise<string> {
        try {
            return await git.resolveRef({ fs: this.fs, dir: this.dir, ref });
        } catch {
            return await git.expandOid({ fs: this.fs, dir: this.dir, oid: ref });
        }
    }

    async status() {
        const matrix = await git.statusMatrix({ fs: this.fs, dir: this.dir });
        const staged: string[] = [];
        const modified: string[] = [];
        const untracked: string[] = [];

        matrix.forEach(([filepath, head, workdir, stage]) => {
            if (stage !== head) {
                staged.push(filepath);
            }

            if (workdir !== stage) {
                if (workdir === 0 && stage !== 0) modified.push(filepath);
                else if (workdir === 2 && stage === 0) untracked.push(filepath);
                else if (workdir === 2) modified.push(filepath);
            }
        });

        return { staged, modified, untracked };
    }

    async add(paths: string[]) {
        if (!paths || paths.length === 0) return 'add: falta archivo';
        const filesToAdd: string[] = [];

        // Handle 'git add .' special case
        if (paths.includes('.')) {
            const status = await this.status();
            // Add untracked and modified files
            filesToAdd.push(...status.untracked, ...status.modified);
            // Deduplicate just in case
        } else {
            filesToAdd.push(...paths);
        }

        // Use a set to remove duplicates if mixed arguments provided
        const uniqueFiles = [...new Set(filesToAdd)];

        for (const path of uniqueFiles) {
            if (path === '.') continue; // Handled above, but just in case
            try {
                await git.add({ fs: this.fs, dir: this.dir, filepath: path });
            } catch (e) {
                return `fatal: pathspec '${path}' did not match any files`;
            }
        }
        await this.refreshState();
        return `Se añadieron: ${uniqueFiles.join(', ')}`;
    }

    async commit(message: string) {
        const sha = await git.commit({
            fs: this.fs,
            dir: this.dir,
            message,
            author: this.defaultAuthor
        });
        await this.refreshState();
        return `[${this.currentBranch() || 'detached'} ${sha.substring(0, 7)}] ${message}`;
    }

    async checkout(ref: string) {
        // 1. Si es una rama existente, checkout normal
        const branches = await git.listBranches({ fs: this.fs, dir: this.dir });
        if (branches.includes(ref)) {
            await git.checkout({ fs: this.fs, dir: this.dir, ref });
            await this.refreshState();
            return `Cambiado a rama '${ref}'`;
        }

        // 2. Si no es rama, intentar resolver como commit (Detached HEAD)
        // Esto maneja HEAD~1, short hashes, etc.
        try {
            const oid = await this.resolveCommit(ref);
            await git.checkout({ fs: this.fs, dir: this.dir, ref: oid });
            await this.refreshState();
            return `Nota: cambiando a '${ref}'.\nEstás en estado 'detached HEAD'.\nHEAD está ahora en ${oid.substring(0, 7)}`;
        } catch (e) {
            throw new Error(`referencia '${ref}' no encontrada.`);
        }
    }



    async deleteBranch(name: string) {
        if (name === this.currentBranch()) {
            throw new Error(`no se puede borrar la rama '${name}' checked out`);
        }
        await git.deleteBranch({ fs: this.fs, dir: this.dir, ref: name });
        await this.refreshState();
        return `Rama eliminada ${name}`;
    }

    async merge(branchName: string) {
        try {
            const result = await git.merge({
                fs: this.fs,
                dir: this.dir,
                ours: this.currentBranch() || undefined,
                theirs: branchName,
                author: this.defaultAuthor
            });
            await this.refreshState();
            if (result.oid) return `Merge realizado: ${result.oid.substring(0, 7)}`;
            return `CONFLICTO (contenido): Conflicto de fusión en archivo(s). Revise con git status.`;
        } catch (e: any) {
            return `Merge fallido: ${e.message}`;
        }
    }

    async rebase(targetBranch: string) {
        const currentBranch = this.currentBranch();
        if (!currentBranch) throw new Error('Debes estar en una rama para hacer rebase');

        // 1. Resolver OIDs
        const currentOid = await this.resolveRef(currentBranch);
        const targetOid = await this.resolveRef(targetBranch);

        // 2. Encontrar base común (simulada simple: buscar en historial)
        // O más simple: Obtener commits de current que no están en target
        const currentLog = await git.log({ fs: this.fs, dir: this.dir, ref: currentBranch });
        const targetLog = await git.log({ fs: this.fs, dir: this.dir, ref: targetBranch });

        const targetHashes = new Set(targetLog.map(c => c.oid));

        // Commits únicos de mi rama (desde el más antiguo al más nuevo)
        const commitsToReplay = currentLog
            .filter(c => !targetHashes.has(c.oid))
            .reverse(); // Importante: aplicar en orden

        if (commitsToReplay.length === 0) {
            return `Ya está actualizado con ${targetBranch}`;
        }

        // 3. Mover mi rama al target (Hard reset)
        await git.checkout({ fs: this.fs, dir: this.dir, ref: targetBranch });
        // Simular que moví mi rama aquí
        await git.branch({ fs: this.fs, dir: this.dir, ref: currentBranch, force: true, object: targetOid });
        await git.checkout({ fs: this.fs, dir: this.dir, ref: currentBranch });

        // 4. Reaplicar commits (Cherry-pick de cada uno)
        let appliedCount = 0;
        for (const commit of commitsToReplay) {
            try {
                // Crear nuevo commit con el mismo contenido y mensaje, pero nuevo padre
                await git.commit({
                    fs: this.fs,
                    dir: this.dir,
                    message: commit.commit.message,
                    author: commit.commit.author,
                    tree: commit.commit.tree, // Usamos el tree original (snapshot), simple pero efectivo para linear rebase
                    parent: [await this.resolveRef('HEAD')]
                });
                appliedCount++;
            } catch (e) {
                console.error('Error re-applying commit during rebase:', e);
            }
        }

        await this.refreshState();
        return `Rebase completado. Se movieron ${appliedCount} commits sobre ${targetBranch}.`;
    }

    async reset(args: string[]) {
        if (args.length === 0) return 'Reset necesita argumentos (ej: --hard HEAD~1)';
        const { mode, refStr, filepaths } = this.parseResetArgs(args);

        try {
            const oid = await this.resolveCommit(refStr);

            if (filepaths.length > 0) {
                return await this.resetFiles(filepaths, oid);
            }

            return await this.resetBranch(oid, mode);
        } catch (e: any) {
            return `fatal: ${e.message}`;
        }
    }

    private parseResetArgs(args: string[]) {
        let mode: 'soft' | 'mixed' | 'hard' = 'mixed';
        let refStr = 'HEAD';
        const filepaths: string[] = [];

        for (const arg of args) {
            if (arg === '--soft') mode = 'soft';
            else if (arg === '--hard') mode = 'hard';
            else if (arg === '--mixed') mode = 'mixed';
            else {
                // Heurística simple: si parece un ref, es ref. Si file existe, es file.
                // Asumimos archivo por defecto si no es flag
                if (refStr === 'HEAD' && !arg.includes('.')) {
                    refStr = arg; // Asumimos que es un commit/branch si no tiene extension (simple)
                } else {
                    filepaths.push(arg);
                }
            }
        }

        return { mode, refStr, filepaths };
    }

    private async resetFiles(filepaths: string[], oid: string) {
        for (const filepath of filepaths) {
            await git.resetIndex({ fs: this.fs, dir: this.dir, filepath, ref: oid });
        }
        await this.refreshState();
        return `Reset realizado en ${filepaths.join(', ')}`;
    }

    private async resetBranch(oid: string, mode: 'soft' | 'mixed' | 'hard') {
        const currentBranch = this.currentBranch();
        if (currentBranch) {
            await git.branch({ fs: this.fs, dir: this.dir, ref: currentBranch, object: oid, force: true });
        }

        if (mode === 'mixed' || mode === 'hard') {
            if (mode === 'hard') {
                // Hard: Reset Index AND Working Directory to match Target
                await git.checkout({ fs: this.fs, dir: this.dir, ref: oid, force: true });
            } else {
                // Mixed (Default): Reset Index to match Target, keep Working Directory
                // The HEAD ref was already moved above. Now we must sync Index -> HEAD
                // We iterate all files potentially involved (in Index or HEAD)
                try {
                    const matrix = await git.statusMatrix({ fs: this.fs, dir: this.dir });
                    for (const [filepath] of matrix) {
                        try {
                            await git.resetIndex({ fs: this.fs, dir: this.dir, filepath });
                        } catch (e) {
                            // Ignore errors for individual files (e.g. if deleted/renamed in weird ways)
                        }
                    }
                } catch (e) {
                    console.error('Error during mixed reset index update:', e);
                }
            }
        }

        await this.refreshState();
        // Recargar para asegurar
        await this.updateHead();

        return `Reset --${mode} a ${oid.substring(0, 7)}`;
    }

    async revert(ref: string) {
        if (!ref) return 'git revert: falta el commit (ej: HEAD)';

        try {
            const oid = await this.resolveCommit(ref);
            const commit = await git.readCommit({ fs: this.fs, dir: this.dir, oid });

            if (!commit.commit.parent?.length) {
                return 'No se puede revertir commit inicial';
            }

            const parent = commit.commit.parent[0];
            const filesInParent = await git.listFiles({ fs: this.fs, dir: this.dir, ref: parent });

            // Estrategia: "Hard" checkout de los archivos del padre
            // Esto sobrescribe cambios locales. Git revert real falla si hay dirty state.
            // Asumimos clean state para lecciones.
            await git.checkout({ fs: this.fs, dir: this.dir, ref: parent, filepaths: filesInParent, force: true });

            const filesInOid = await git.listFiles({ fs: this.fs, dir: this.dir, ref: oid });
            const parentSet = new Set(filesInParent);

            for (const f of filesInOid) {
                if (!parentSet.has(f)) {
                    try {
                        await this.fs.promises.unlink(`${this.dir}/${f}`);
                        await git.remove({ fs: this.fs, dir: this.dir, filepath: f });
                    } catch { }
                }
            }

            await this.add(['.']);
            await this.commit(`Revert "${commit.commit.message}"`);
            return 'Revert completado.';
        } catch (e: any) {
            return `fatal: ${e.message}`;
        }
    }

    async restore(args: string[]) {
        const { staged, filepaths } = this.parseRestoreArgs(args);

        if (filepaths.length === 0) return 'git restore: falta archivo(s) para restaurar';

        try {
            // Check if HEAD exists to decide how to unstage
            let hasHead = true;
            try {
                await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' });
            } catch {
                hasHead = false;
            }

            for (const filepath of filepaths) {
                if (staged) {
                    const filesToProcess = filepath === '.' ? (await this.status()).staged : [filepath];

                    for (const f of filesToProcess) {
                        if (hasHead) {
                            // Normal unstage: HEAD -> Index
                            await git.resetIndex({ fs: this.fs, dir: this.dir, filepath: f, ref: 'HEAD' });
                        } else {
                            // Initial commit unstage: Remove from Index -> Untracked
                            await git.remove({ fs: this.fs, dir: this.dir, filepath: f });
                        }
                    }
                } else {
                    // Restore Working Dir from Index
                    if (filepath === '.') {
                        await git.checkout({ fs: this.fs, dir: this.dir, filepaths: ['.'], force: true });
                    } else {
                        await git.checkout({ fs: this.fs, dir: this.dir, filepaths: [filepath], force: true });
                    }
                }
            }
            await this.refreshState();
            return staged ? 'Archivos sacados del área de staging.' : 'Cambios en el directorio de trabajo descartados.';
        } catch (e: any) {
            return `fatal: ${e.message}`;
        }
    }

    private parseRestoreArgs(args: string[]) {
        let staged = false;
        const filepaths: string[] = [];

        for (const arg of args) {
            if (arg === '--staged' || arg === '--stage') staged = true;
            else if (!arg.startsWith('-')) filepaths.push(arg);
        }

        return { staged, filepaths };
    }

    async cherryPick(ref: string) {
        if (!ref) return 'cherry-pick: falta el commit/rama';

        try {
            const oid = await this.resolveCommit(ref);
            const commit = await git.readCommit({ fs: this.fs, dir: this.dir, oid });

            // Simulación simplificada: "Aplicar" el estado del commit.
            // En un cherry-pick real, se aplicaría solo el diff.
            // Para fines educativos en esta app, usamos el tree del commit target
            // pero mantenemos el padre actual como padre principal.
            const sha = await git.commit({
                fs: this.fs,
                dir: this.dir,
                message: commit.commit.message,
                author: {
                    name: commit.commit.author.name,
                    email: commit.commit.author.email,
                    timestamp: Math.floor(Date.now() / 1000),
                    timezoneOffset: new Date().getTimezoneOffset()
                },
                parent: [await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' })],
                tree: commit.commit.tree
            });

            // Actualizar directorio de trabajo e índice al nuevo commit
            await git.checkout({ fs: this.fs, dir: this.dir, ref: sha, force: true });

            await this.refreshState();
            return `Cherry-pick ${oid.substring(0, 7)} aplicado como ${sha.substring(0, 7)}.`;
        } catch (e: any) {
            return `fatal: ${e.message}`;
        }
    }

    async runCommand(commandStr: string): Promise<string> {
        // Support && chaining
        if (commandStr.includes('&&')) {
            const commands = commandStr.split('&&');
            let output = '';
            for (const cmd of commands) {
                const result = await this.runCommand(cmd.trim());
                if (result) output += (output ? '\n' : '') + result;
                // Stop on error (simple heuristic)
                if (result.toLowerCase().startsWith('fatal:') || result.toLowerCase().startsWith('error:')) {
                    return output;
                }
            }
            return output;
        }

        const parts = commandStr.trim().split(/\s+/);
        const cmd = parts[0];

        try {
            if (cmd === 'cd') return this.handleCd(parts[1]);
            if (cmd === 'configure-env') return this.handleConfigureEnv(parts.slice(1));

            if (cmd === 'touch') return await this.handleTouch(parts.slice(1));
            if (cmd === 'mkdir') return await this.handleMkdir(parts[1]);
            if (cmd === 'echo') return await this.handleEcho(parts);
            if (cmd === 'cat') return await this.handleCat(parts[1]);
            if (cmd === 'ls') return await this.handleLs();
            if (cmd === 'git') return await this.handleGitCommand(parts.slice(1));

            if (cmd === 'open') return await this.handleOpen(parts[1]);
            if (['nano', 'vi', 'vim', 'notepad', 'code', 'pico', 'emacs'].includes(cmd)) {
                return await this.handleEditor(cmd, parts[1]);
            }

            return `${cmd}: comando no encontrado`;
        } catch (e: any) {
            return `Error: ${e.message}`;
        }
    }

    private handleCd(path: string): string {
        if (!path || path === '~') {
            this.cwd.set('~');
            return '';
        }

        const current = this.cwd();
        let newPath = current;

        if (path === '..') {
            if (current === '~') return '';
            const segments = current.split('/');
            segments.pop();
            newPath = segments.join('/') || '~'; // Fallback shouldn't happen if rooted at ~
        } else {
            // Simple subdirectory simulation
            // If we are at '~' and cd 'sales-app', we go to '~/sales-app'
            // We don't strictly validate directory existence for ALL paths, but we could.
            // For immersion, assuming success unless it's obviously wrong.
            const target = current === '~' ? `~/${path}` : `${current}/${path}`;
            newPath = target;
        }

        this.cwd.set(newPath);
        return '';
    }

    private handleConfigureEnv(args: string[]): string {
        // syntax: configure-env cwd=~ repo=~/sales-app
        for (const arg of args) {
            const [key, val] = arg.split('=');
            if (key === 'cwd') this.cwd.set(val);
            if (key === 'repo') this.repoPath.set(val);
        }
        return '';
    }

    private async handleOpen(filename: string) {
        if (!filename) return 'open: falta archivo';
        // En esta terminal simulada, "abrir" un archivo de texto es equivalente a verlo con cat
        return await this.handleCat(filename);
    }

    private async handleEditor(editor: string, filename: string) {
        const target = filename ? filename : 'archivo';
        return `Editor '${editor}' simulado.\nPara editar archivos usa:\n  echo "contenido" > ${target} (sobrescribir)\n  echo "más contenido" >> ${target} (agregar al final)\n  cat ${target} (ver contenido)`;
    }

    private async handleTouch(filenames: string[]) {
        if (!filenames || filenames.length === 0) return 'touch: falta archivo';
        for (const filename of filenames) {
            await this.fs.promises.writeFile(`${this.dir}/${filename}`, '');
        }
        await this.refreshState();
        return '';
    }

    private async handleMkdir(dirname: string) {
        if (!dirname) return 'mkdir: falta directorio';
        await this.fs.promises.mkdir(`${this.dir}/${dirname}`);
        return '';
    }

    private async handleEcho(parts: string[]) {
        let append = false;
        let arrowIndex = parts.indexOf('>>');
        if (arrowIndex !== -1) {
            append = true;
        } else {
            arrowIndex = parts.indexOf('>');
        }
        if (arrowIndex === -1) return parts.slice(1).join(' '); // Echo to stdout

        const content = parts.slice(1, arrowIndex).join(' ').replace(/^"(.*)"$/, '$1');
        const filename = parts[arrowIndex + 1];
        if (!filename) return 'error sintaxis';

        try {
            if (append) {
                let currentContent = '';
                try {
                    currentContent = await this.fs.promises.readFile(`${this.dir}/${filename}`, 'utf8');
                    // Add newline if file not empty and doesn't end with one? Simpler to just append with newline prefix usually
                    if (currentContent && !currentContent.endsWith('\n')) currentContent += '\n';
                } catch (e) {
                    // File doesn't exist, create it
                }
                await this.fs.promises.writeFile(`${this.dir}/${filename}`, currentContent + content + '\n');
            } else {
                await this.fs.promises.writeFile(`${this.dir}/${filename}`, content + '\n'); // Add newline for typical editor behavior
            }
            await this.refreshState();
            return '';
        } catch (e) {
            return `echo: error escribiendo archivo: ${e}`;
        }
    }

    private async handleCat(filename: string) {
        if (!filename) return 'cat: falta archivo';
        try {
            const content = await this.fs.promises.readFile(`${this.dir}/${filename}`, 'utf8');
            return content as string;
        } catch (e) {
            return `cat: ${filename}: No existe el archivo o directorio`;
        }
    }

    private async handleLs() {
        try {
            // Since we are simulating different directories but backing them with ONE repo at /repo
            // We need to decide what to show.
            // If cwd == repoPath, show repo contents.
            const current = this.cwd();
            const repo = this.repoPath();

            if (current === repo) {
                const files = await this.fs.promises.readdir(this.dir);
                return files.filter((f: string) => f !== '.git').join('  ');
            } else {
                // If we are at ~ (parent), show the repo directory name if it exists?
                // This implies we need a registry of "other" folders.
                // For simplicity, if at ~, and repoPath is ~/sales-app, show 'sales-app'.
                if (current === '~') {
                    if (repo.startsWith('~/')) {
                        return repo.replace('~/', '');
                    }
                }
                return '';
            }
        } catch (e) {
            return `ls: error al listar directorio`;
        }
    }

    private async handleGitCommand(parts: string[]): Promise<string> {
        const subCmd = parts[0];
        const args = parts.slice(1);

        // Check if we are inside a git repo (virtual check)
        const current = this.cwd();
        const repo = this.repoPath();

        // Allowed commands outside a repo
        const allowedOutside = ['clone', 'init', 'help', '--help', 'version'];

        if (!allowedOutside.includes(subCmd)) {
            // Very simple check: cwd must START WITH repoPath (so subdirs work too)
            // But for simplicity, let's say cwd must BE repoPath or inside it.
            if (!current.startsWith(repo)) {
                return `fatal: not a git repository (or any of the parent directories): .git`;
            }
        }

        const commands: Record<string, () => Promise<string>> = {
            'init': async () => { await this.init(); return 'Repositorio reinicializado.'; },
            'status': () => this.handleStatus(),
            'add': () => this.add(args),
            'commit': () => this.handleCommit(args),
            'log': () => this.handleLog(args),
            'branch': () => this.handleBranch(args),
            'reset': () => this.reset(args),
            'revert': () => this.revert(args[0]),
            'restore': () => this.restore(args),
            'checkout': () => this.handleCheckout(args),
            'switch': () => this.handleSwitch(args),
            'merge': () => this.merge(args[0]),
            'rebase': () => this.rebase(args[0]),
            'cherry-pick': () => this.cherryPick(args[0]),
            'diff': () => this.handleDiff(),
            'remote': () => this.handleRemote(args),
            'fetch': () => this.handleFetch(args),
            'pull': () => this.handlePull(args),
            'push': () => this.handlePush(args),
            'clone': () => this.handleClone(args),
            'stash': () => this.handleStash(args),
            'clean': () => this.handleClean(args),
            'rm': () => this.handleRm(args),
            'mv': () => this.handleMv(args),
            'tag': () => this.handleTag(args)
        };

        return commands[subCmd] ? await commands[subCmd]() : `git ${subCmd}: comando no encontrado`;
    }

    private async handleTag(args: string[]) {
        if (args.length === 0) {
            const tags = await git.listTags({ fs: this.fs, dir: this.dir });
            return tags.join('\n') || 'No tags found.';
        }

        const tagName = args[0];
        try {
            await git.tag({ fs: this.fs, dir: this.dir, ref: tagName });
            await this.refreshState();
            return `Tag ${tagName} creado.`;
        } catch (e: any) {
            return `Error creando tag: ${e.message}`;
        }
    }

    private async handleStatus() {
        const s = await this.status();
        if (!s.staged.length && !s.modified.length && !s.untracked.length) return 'Árbol de trabajo limpio';
        return `Staged: ${s.staged.join(', ')}\nModified: ${s.modified.join(', ')}\nUntracked: ${s.untracked.join(', ')}`;
    }

    private async handleCommit(args: string[]) {
        let message = 'Commit sin mensaje';
        let autoAdd = false;

        // Detect -a, -am, -ma or just combined flags
        // Simplification: check if any arg starting with - contains 'a'
        for (const arg of args) {
            if (arg.startsWith('-') && arg.includes('a')) {
                autoAdd = true;
            }
        }

        // Logic to extract message from -m flag
        const mIdx = args.findIndex(a => a.startsWith('-') && a.includes('m') && a !== '--amend');
        if (mIdx !== -1 && args.length > mIdx + 1) {
            message = args.slice(mIdx + 1).join(' ').replace(/^"(.*)"$/, '$1');
        }

        if (args.includes('--amend')) {
            try {
                const headOid = await this.resolveRef('HEAD');
                const headCommit = await git.readCommit({ fs: this.fs, dir: this.dir, oid: headOid });

                // Si no se pasó -m, reusar el mensaje anterior
                const messageProvided = args.some(a => a.startsWith('-') && a.includes('m') && a !== '--amend');
                if (!messageProvided) {
                    message = headCommit.commit.message;
                }

                // Hacer commit usando los padres del commit original (reemplazo)
                const sha = await git.commit({
                    fs: this.fs,
                    dir: this.dir,
                    message: message,
                    author: this.defaultAuthor,
                    parent: headCommit.commit.parent
                });

                await this.refreshState();
                return `[${this.currentBranch() || 'detached'} ${sha.substring(0, 7)}] ${message} (amend)`;
            } catch (e: any) {
                return `fatal: no se pudo hacer amend: ${e.message}`;
            }
        }

        if (autoAdd) {
            // Stage modified files (mimicking git commit -a)
            const s = await this.status();
            for (const file of s.modified) {
                await git.add({ fs: this.fs, dir: this.dir, filepath: file });
            }
        }

        return await this.commit(message);
    }

    private async handleLog(args: string[]) {
        try {
            const oneline = args.includes('--oneline');
            const all = args.includes('--all');
            const graph = args.includes('--graph');

            let commits: any[] = [];

            if (all) {
                const branches = await git.listBranches({ fs: this.fs, dir: this.dir });
                const commitMap = new Map<string, any>();

                // Fetch log for every branch
                for (const branch of branches) {
                    try {
                        const branchCommits = await git.log({ fs: this.fs, dir: this.dir, ref: branch });
                        for (const c of branchCommits) {
                            commitMap.set(c.oid, c);
                        }
                    } catch (e) { /* ignore ref errors */ }
                }

                // Also try HEAD explicitly if detached
                try {
                    const headCommits = await git.log({ fs: this.fs, dir: this.dir, ref: 'HEAD' });
                    for (const c of headCommits) {
                        commitMap.set(c.oid, c);
                    }
                } catch (e) { /* ignore */ }

                commits = Array.from(commitMap.values());
            } else {
                // Detect specific ref (e.g. 'git log experiment')
                const nonFlags = args.filter(a => !a.startsWith('-'));
                const ref = nonFlags.length > 0 ? nonFlags[0] : undefined; // git.log defaults to HEAD if undefined

                commits = await git.log({ fs: this.fs, dir: this.dir, ref });
            }

            // Sort by timestamp descending
            commits.sort((a, b) => b.commit.author.timestamp - a.commit.author.timestamp);

            // Parse -N or -n N limit
            let limit = 0;
            const limitArgIndex = args.findIndex(a => /^-(\d+)$/.test(a));
            if (limitArgIndex !== -1) {
                limit = parseInt(args[limitArgIndex].substring(1), 10);
            } else {
                const nArgIndex = args.indexOf('-n');
                if (nArgIndex !== -1 && args[nArgIndex + 1]) {
                    limit = parseInt(args[nArgIndex + 1], 10);
                }
            }

            if (limit > 0) {
                commits = commits.slice(0, limit);
            }

            return commits.map(l => {
                const shortHash = l.oid.substring(0, 7);
                const msg = l.commit.message.split('\n')[0]; // First line only for oneline

                if (oneline) {
                    // Start with simple * for graph, effectively a flat list but acknowledges the flag
                    const prefix = graph ? '* ' : '';

                    // Simple colorization for terminal
                    const hashColor = '\x1b[33m'; // Yellow
                    const reset = '\x1b[0m';

                    return `${prefix}${hashColor}${shortHash}${reset} ${msg}`;
                } else {
                    return `commit ${l.oid}\nAuthor: ${l.commit.author.name} <${l.commit.author.email}>\nDate:   ${new Date(l.commit.author.timestamp * 1000).toDateString()}\n\n    ${l.commit.message}`;
                }
            }).join(oneline ? '\n' : '\n\n');

        } catch (e: any) {
            return `fatal: ${e.message}`;
        }
    }

    async branch(name: string, force: boolean = false, oid?: string) {
        await git.branch({
            fs: this.fs,
            dir: this.dir,
            ref: name,
            force,
            object: oid
        });
        await this.refreshState();
        return '';
    }

    private async handleBranch(args: string[]) {
        if (args.length === 0) {
            const branches = await git.listBranches({ fs: this.fs, dir: this.dir });
            const current = await git.currentBranch({ fs: this.fs, dir: this.dir });
            return branches.map(b => (b === current ? '* ' : '  ') + b).join('\n');
        }

        if (args[0] === '-d' || args[0] === '-D') return await this.deleteBranch(args[1]);

        // Handle rename (-m / --move)
        const moveFlagIndex = args.findIndex(a => a === '-m' || a === '--move');
        if (moveFlagIndex !== -1) {
            // Remove flag
            const renameArgs = args.filter((_, i) => i !== moveFlagIndex);

            let oldName = await git.currentBranch({ fs: this.fs, dir: this.dir });
            let newName = '';

            if (renameArgs.length === 1) {
                // git branch -m newName (rename current)
                newName = renameArgs[0];
            } else if (renameArgs.length === 2) {
                // git branch -m oldName newName
                oldName = renameArgs[0];
                newName = renameArgs[1];
            } else {
                return 'fatal: invalid usage of git branch -m';
            }

            if (!oldName) return 'fatal: no branch to rename';

            try {
                await git.renameBranch({ fs: this.fs, dir: this.dir, oldref: oldName, ref: newName });
                await this.refreshState();
                return ''; // Git is silent on success usually
            } catch (e: any) {
                return `fatal: ${e.message}`;
            }
        }

        // Parse -f and startPoint
        let force = false;
        let name = '';
        let startPoint = '';

        const cleanArgs = args.filter(a => {
            if (a === '-f' || a === '--force') {
                force = true;
                return false;
            }
            return true;
        });

        if (cleanArgs.length > 0) name = cleanArgs[0];
        if (cleanArgs.length > 1) startPoint = cleanArgs[1];

        if (!name) return 'fatal: branch name required';

        let oid: string | undefined = undefined;
        if (startPoint) {
            try {
                oid = await this.resolveCommit(startPoint);
            } catch {
                return `fatal: not a valid object name: '${startPoint}'`;
            }
        }

        return await this.branch(name, force, oid);
    }

    private async handleCheckoutFiles(args: string[]) {
        const dashIdx = args.indexOf('--');
        if (dashIdx === 0) {
            const files = args.slice(1);
            await git.checkout({ fs: this.fs, dir: this.dir, filepaths: files });
            await this.refreshState();
            return `Checkout de archivos: ${files.join(', ')}`;
        }
        const ref = args[0];
        const files = args.slice(dashIdx + 1);
        await git.checkout({ fs: this.fs, dir: this.dir, ref, filepaths: files });
        await this.refreshState();
        return `Checkout de archivos desde ${ref}`;
    }

    private async handleCheckout(args: string[]) {
        if (args.includes('--')) return await this.handleCheckoutFiles(args);
        if (args.length > 1 && !args[0].startsWith('-')) {
            try {
                await this.resolveCommit(args[0]);
                const files = args.slice(1);
                await git.checkout({ fs: this.fs, dir: this.dir, ref: args[0], filepaths: files });
                await this.refreshState();
                return `Restaurado ${files.join(', ')} desde ${args[0]}`;
            } catch { }
        }
        if (args[0] === '-b') {
            await this.branch(args[1]);
            return await this.checkout(args[1]);
        }
        return await this.checkout(args[0]);
    }

    private async handleSwitch(args: string[]) {
        if (args[0] === '-c') {
            await this.branch(args[1]);
            return await this.checkout(args[1]);
        }
        return await this.checkout(args[0]);
    }

    private async handleDiff() {
        const matrix = await git.statusMatrix({ fs: this.fs, dir: this.dir });
        let diffOutput = '';
        for (const [filepath, head, workdir] of matrix) {
            if (head === 1 && workdir === 2) {
                try {
                    const headRef = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' });
                    const headObj = await git.readBlob({ fs: this.fs, dir: this.dir, oid: headRef, filepath });
                    const headContent = new TextDecoder().decode(headObj.blob);
                    const workContent = await this.fs.promises.readFile(`${this.dir}/${filepath}`, 'utf8');
                    diffOutput += `diff --git a/${filepath} b/${filepath}\n--- a/${filepath}\n+++ b/${filepath}\n`;
                    if (headContent !== workContent) {
                        diffOutput += `@@ -1 +1 @@\n-${headContent}\n+${workContent}\n`;
                    }
                } catch { }
            }
        }
        return diffOutput;
    }

    private async handleRemote(args: string[]) {
        if (args.length === 0) return Array.from(Object.keys(this.remotes())).join('\n');
        if (args[0] === '-v') {
            return Object.entries(this.remotes())
                .map(([name, url]) => `${name}\t${url} (fetch)\n${name}\t${url} (push)`)
                .join('\n');
        }
        if (args[0] === 'add') {
            const name = args[1];
            const url = args[2];
            this.remotes.update(r => ({ ...r, [name]: url }));
            return '';
        }
        return 'remote: comando no soportado';
    }

    private async handleFetch(args: string[]) {
        const remote = args[0] || 'origin';
        if (!this.remotes()[remote]) return `fatal: '${remote}' does not appear to be a git repository`;
        return `From ${this.remotes()[remote]}\n * [new branch]      main       -> ${remote}/main`;
    }

    private async handlePull(args: string[]) {
        const remote = args[0] || 'origin';
        const branch = args[1] || 'main';
        const remoteBranch = `${remote}/${branch}`;
        this.networkOperation.set('download');
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.networkOperation.set(null);
        let mergeMsg = '';
        try {
            mergeMsg = await this.merge(remoteBranch);
        } catch (e: any) {
            return `fatal: couldn't find remote ref ${remoteBranch}`;
        }
        if (mergeMsg.includes('CONFLICTO')) return mergeMsg;
        return mergeMsg.replace('Merge realizado', 'Fast-forward');
    }

    private async handlePush(args: string[]) {
        const remote = args[0] || 'origin';
        const branch = args[1] || 'main';
        this.networkOperation.set('upload');
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.networkOperation.set(null);
        let head = '';
        try {
            head = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' });
        } catch { return 'error: cannot push (no HEAD)'; }
        let remoteOid = undefined;
        const remoteRef = `${remote}/${branch}`;
        try {
            remoteOid = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: remoteRef });
        } catch { }
        if (remoteOid) {
            if (remoteOid === head) return 'Everything up-to-date';
            const isAncestor = await this.isAncestor(remoteOid, head);
            if (!isAncestor) return `! [rejected] (non-fast-forward)`;
            await git.branch({ fs: this.fs, dir: this.dir, ref: remoteRef, object: head, force: true });
            return `To ${this.remotes()[remote]}\n   ${remoteOid.substring(0, 7)}..${head.substring(0, 7)}  ${branch} -> ${branch}`;
        } else {
            await git.branch({ fs: this.fs, dir: this.dir, ref: remoteRef, object: head });
            return `To ${this.remotes()[remote]}\n * [new branch]      ${branch} -> ${branch}`;
        }
    }

    private async isAncestor(ancestor: string, descendant: string): Promise<boolean> {
        if (ancestor === descendant) return true;
        let current = descendant;
        const queue = [descendant];
        const visited = new Set<string>();
        while (queue.length > 0) {
            const currentOid = queue.shift();
            if (!currentOid || visited.has(currentOid)) continue;
            visited.add(currentOid);
            if (currentOid === ancestor) return true;
            try {
                const commit = await git.readCommit({ fs: this.fs, dir: this.dir, oid: currentOid });
                if (commit.commit.parent) queue.push(...commit.commit.parent);
            } catch { }
        }
        return false;
    }

    private async handleClone(args: string[]) {
        const url = args[0];
        let dirName = args[1];
        if (!dirName && url) {
            const segments = url.split('/');
            dirName = segments[segments.length - 1].replace('.git', '');
        }
        if (!dirName) dirName = 'repo';

        this.networkOperation.set('download');
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.networkOperation.set(null);

        const current = this.cwd();
        const newRepoPath = current === '~' ? `~/${dirName}` : `${current}/${dirName}`;
        this.repoPath.set(newRepoPath);

        return `Cloning into '${dirName}'...\nremote: Enumerating objects: 10, done.\nremote: Total 10 (delta 0), reused 0 (delta 0)\nReceiving objects: 100% (10/10), done.`;
    }

    private async handleStash(args: string[]) {
        if (args.length === 0 || args[0] === 'save' || (args[0] === 'push' && args.length > 1)) {
            const matrix = await git.statusMatrix({ fs: this.fs, dir: this.dir });
            const changes: Record<string, string> = {};
            let hasChanges = false;
            for (const [filepath, head, workdir, stage] of matrix) {
                if (head !== workdir || head !== stage) {
                    try {
                        const content = await this.fs.promises.readFile(`${this.dir}/${filepath}`, 'utf8');
                        changes[filepath] = content;
                        hasChanges = true;
                    } catch { }
                }
            }
            if (hasChanges) {
                const msg = args.includes('save') ? args[args.indexOf('save') + 1] : 'WIP on ' + (this.currentBranch() || 'detached');
                this.stashes.update(s => [...s, { id: s.length, message: msg || 'WIP', files: changes }]);
                await git.checkout({ fs: this.fs, dir: this.dir, ref: 'HEAD', force: true });
                await this.refreshState();
                return `Saved working directory and index state On ${this.currentBranch()}: ${msg}`;
            }
            return 'No local changes to save';
        }
        if (args[0] === 'pop') {
            const stash = this.stashes().pop();
            this.stashes.update(s => s.slice(0, -1));
            if (stash) {
                for (const [file, content] of Object.entries(stash.files)) {
                    await this.fs.promises.writeFile(`${this.dir}/${file}`, content);
                }
                await this.refreshState();
                return `Dropped refs/stash@{0} (${stash.message})`;
            }
            return 'No stash entries found.';
        }
        if (args[0] === 'list') {
            return this.stashes().map((s, i) => `stash@{${i}}: ${s.message}`).join('\n');
        }
        return 'stash: comando desconocido';
    }

    private async handleClean(args: string[]) {
        // Simple implementation: remove untracked files
        if (args.includes('-n')) {
            const { untracked } = await this.status();
            return untracked.map(f => `Would remove ${f}`).join('\n');
        }
        if (args.includes('-f')) {
            const { untracked } = await this.status();
            for (const f of untracked) {
                await this.fs.promises.unlink(`${this.dir}/${f}`);
            }
            await this.refreshState();
            return `Removing ${untracked.join('\nRemoving ')}`;
        }
        return 'fatal: clean requiring -f to run';
    }

    private async handleRm(args: string[]) {
        // Simple implementation
        const file = args[0];
        try {
            await git.remove({ fs: this.fs, dir: this.dir, filepath: file });
            await this.fs.promises.unlink(`${this.dir}/${file}`);
            await this.refreshState();
            return `rm '${file}'`;
        } catch (e: any) {
            return `fatal: pathspec '${file}' did not match any files`;
        }
    }

    private async handleMv(args: string[]) {
        const src = args[0];
        const dest = args[1];
        try {
            const content = await this.fs.promises.readFile(`${this.dir}/${src}`, 'utf8');
            await this.fs.promises.writeFile(`${this.dir}/${dest}`, content);
            await this.fs.promises.unlink(`${this.dir}/${src}`);
            await git.remove({ fs: this.fs, dir: this.dir, filepath: src });
            await git.add({ fs: this.fs, dir: this.dir, filepath: dest });
            await this.refreshState();
            return `Renaming ${src} to ${dest}`;
        } catch (e) {
            return `mv failed: ${e}`;
        }
    }
}