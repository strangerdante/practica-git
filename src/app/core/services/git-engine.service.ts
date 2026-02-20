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
    repoPath = signal<string>('~/project');

    fs: any;
    readonly dir = '/repo';
    private readonly dbName = 'git-practice-fs';
    private readonly defaultAuthor = { name: 'User', email: 'user@example.com' };

    /** Optimization #9: getter compartido para evitar repetir { fs, dir } ~50 veces */
    private get gitOpts() {
        return { fs: this.fs, dir: this.dir };
    }

    currentCommitHash = computed(() => {
        const head = this.head();
        if (head.startsWith('refs/heads/')) {
            const branchName = head.replace('refs/heads/', '');
            return this.branches()[branchName] || null;
        }
        return head || null;
    });

    constructor() {
        this.fs = new LightningFS(this.dbName);
        this.init().catch(err => console.error('Error inicializando git:', err));
    }

    async init() {
        this.resetState();
        await this.initializeFreshDatabase();
        await this.setupGitRepo();
        await this.createExampleFiles();
        await this.refreshState();

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

    /**
     * Fix #3 (LightningFS): En lugar de crear DBs con timestamp (que acumulan
     * entradas huérfanas en IndexedDB), se usa siempre el mismo nombre con
     * `wipe: true` para garantizar un estado completamente limpio en cada init.
     */
    private async initializeFreshDatabase() {
        console.log('Initializing FRESH Git Environment on DB:', this.dbName);
        this.fs = new LightningFS(this.dbName, { wipe: true });

        try {
            await this.fs.promises.mkdir(this.dir);
        } catch (e) { /* ignore */ }
    }

    private async setupGitRepo() {
        await git.init({ ...this.gitOpts, defaultBranch: 'main' });
        await git.setConfig({ ...this.gitOpts, path: 'user.name', value: this.defaultAuthor.name });
        await git.setConfig({ ...this.gitOpts, path: 'user.email', value: this.defaultAuthor.email });
        await git.branch({ ...this.gitOpts, ref: 'main', checkout: true });
    }

    /**
     * Optimization #1: listBranches se llamaba dos veces seguidas (una en updateBranches
     * y otra en updateCommits). Ahora se llama una sola vez y se pasa como argumento.
     */
    async refreshState() {
        try {
            await this.updateHead();
            const branchesList = await git.listBranches(this.gitOpts);
            await this.updateBranches(branchesList);
            await this.updateCommits(branchesList);
        } catch (error) {
            console.error('Error refrescando estado:', error);
        }
    }

    private async updateHead() {
        let currentHead = '';
        try {
            currentHead = await git.resolveRef({ ...this.gitOpts, ref: 'HEAD', depth: 2 });
        } catch (e) { /* ignore */ }

        const branch = await git.currentBranch(this.gitOpts) || null;
        this.currentBranch.set(branch);
        this.head.set(branch ? `refs/heads/${branch}` : currentHead);
    }

    /**
     * Optimization #2: resolución de ramas en paralelo con Promise.all
     * en lugar de un bucle for-await secuencial.
     */
    private async updateBranches(branchesList: string[]) {
        const entries = await Promise.all(
            branchesList.map(async b => {
                const hash = await git.resolveRef({ ...this.gitOpts, ref: b });
                return [b, hash] as [string, string];
            })
        );
        this.branches.set(Object.fromEntries(entries));
    }

    /** Recibe la lista pre-obtenida en refreshState (Optimization #1) */
    private async updateCommits(branchesList: string[]) {
        const commitsMap: Record<string, Commit> = {};
        const currentHead = this.head();
        const refs = [...branchesList];

        if (!refs.includes('HEAD') && currentHead) refs.push('HEAD');

        for (const ref of refs) {
            try {
                const logs = await git.log({ ...this.gitOpts, ref });
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
                const commit = await git.readCommit({ ...this.gitOpts, oid });
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
            return await git.resolveRef({ ...this.gitOpts, ref });
        } catch {
            try {
                // Intenta buscar si es un tag
                return await git.resolveRef({ ...this.gitOpts, ref: `refs/tags/${ref}` });
            } catch {
                return await git.expandOid({ ...this.gitOpts, oid: ref });
            }
        }
    }

    async status() {
        const matrix = await git.statusMatrix(this.gitOpts);
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

        if (paths.includes('.')) {
            const status = await this.status();
            filesToAdd.push(...status.untracked, ...status.modified);
        } else {
            filesToAdd.push(...paths);
        }

        const uniqueFiles = [...new Set(filesToAdd)];

        for (const path of uniqueFiles) {
            if (path === '.') continue;
            try {
                await git.add({ ...this.gitOpts, filepath: path });
            } catch (e) {
                return `fatal: pathspec '${path}' did not match any files`;
            }
        }
        await this.refreshState();
        return `Se añadieron: ${uniqueFiles.join(', ')}`;
    }

    async commit(message: string) {
        const sha = await git.commit({
            ...this.gitOpts,
            message,
            author: this.defaultAuthor
        });
        await this.refreshState();
        return `[${this.currentBranch() || 'detached'} ${sha.substring(0, 7)}] ${message}`;
    }

    async checkout(ref: string) {
        const branches = await git.listBranches(this.gitOpts);
        if (branches.includes(ref)) {
            await git.checkout({ ...this.gitOpts, ref });
            await this.refreshState();
            return `Cambiado a rama '${ref}'`;
        }

        try {
            const oid = await this.resolveCommit(ref);
            await git.checkout({ ...this.gitOpts, ref: oid });
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
        await git.deleteBranch({ ...this.gitOpts, ref: name });
        await this.refreshState();
        return `Rama eliminada ${name}`;
    }

    /**
     * Fix #2 (merge): La API lanza `MergeConflictError` en caso de conflicto —
     * NO devuelve un resultado sin `oid`. Se añade `abortOnConflict: false` para
     * que los conflict markers se escriban en el working tree (comportamiento real
     * de git), y se distinguen los 3 casos del MergeResult: fast-forward,
     * alreadyMerged y merge-commit.
     */
    async merge(branchName: string) {
        try {
            const result = await git.merge({
                ...this.gitOpts,
                ours: this.currentBranch() || undefined,
                theirs: branchName,
                author: this.defaultAuthor,
                abortOnConflict: false
            });
            await this.refreshState();
            if (result.alreadyMerged) return `Ya está actualizado.`;
            if (result.fastForward) return `Fast-forward: puntero movido a ${result.oid?.substring(0, 7)}.`;
            return `Merge commit: ${result.oid?.substring(0, 7)}`;
        } catch (e: any) {
            if (e.code === 'MergeConflictError') {
                await this.refreshState();
                const files = Array.isArray(e.data) ? e.data.join(', ') : 'uno o más archivos';
                return `CONFLICTO (contenido): Conflicto de fusión en ${files}.\nResuelve los conflictos y ejecuta:\n  git add <archivo>\n  git commit`;
            }
            return `Merge fallido: ${e.message}`;
        }
    }

    async rebase(targetBranch: string) {
        const currentBranch = this.currentBranch();
        if (!currentBranch) throw new Error('Debes estar en una rama para hacer rebase');

        const targetOid = await this.resolveRef(targetBranch);

        const currentLog = await git.log({ ...this.gitOpts, ref: currentBranch });
        const targetLog = await git.log({ ...this.gitOpts, ref: targetBranch });

        const targetHashes = new Set(targetLog.map(c => c.oid));

        const commitsToReplay = currentLog
            .filter(c => !targetHashes.has(c.oid))
            .reverse();

        if (commitsToReplay.length === 0) {
            return `Ya está actualizado con ${targetBranch}`;
        }

        await git.checkout({ ...this.gitOpts, ref: targetBranch });
        await git.branch({ ...this.gitOpts, ref: currentBranch, force: true, object: targetOid });
        await git.checkout({ ...this.gitOpts, ref: currentBranch });

        let appliedCount = 0;
        for (const commit of commitsToReplay) {
            try {
                await git.commit({
                    ...this.gitOpts,
                    message: commit.commit.message,
                    author: commit.commit.author,
                    tree: commit.commit.tree,
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
                if (refStr === 'HEAD' && !arg.includes('.')) {
                    refStr = arg;
                } else {
                    filepaths.push(arg);
                }
            }
        }

        return { mode, refStr, filepaths };
    }

    private async resetFiles(filepaths: string[], oid: string) {
        for (const filepath of filepaths) {
            await git.resetIndex({ ...this.gitOpts, filepath, ref: oid });
        }
        await this.refreshState();
        return `Reset realizado en ${filepaths.join(', ')}`;
    }

    private async resetBranch(oid: string, mode: 'soft' | 'mixed' | 'hard') {
        const currentBranch = this.currentBranch();
        if (currentBranch) {
            await git.branch({ ...this.gitOpts, ref: currentBranch, object: oid, force: true });
        }

        if (mode === 'mixed' || mode === 'hard') {
            if (mode === 'hard') {
                await git.checkout({ ...this.gitOpts, ref: oid, force: true });
            } else {
                try {
                    const matrix = await git.statusMatrix(this.gitOpts);
                    for (const [filepath] of matrix) {
                        try {
                            await git.resetIndex({ ...this.gitOpts, filepath });
                        } catch (e) { /* Ignorar errores individuales */ }
                    }
                } catch (e) {
                    console.error('Error during mixed reset index update:', e);
                }
            }
        }

        await this.refreshState();
        // Optimization #7: updateHead() redundante eliminado — refreshState() ya lo llama internamente
        return `Reset --${mode} a ${oid.substring(0, 7)}`;
    }

    async revert(ref: string) {
        if (!ref) return 'git revert: falta el commit (ej: HEAD)';

        try {
            const oid = await this.resolveCommit(ref);
            const commit = await git.readCommit({ ...this.gitOpts, oid });

            if (!commit.commit.parent?.length) {
                return 'No se puede revertir commit inicial';
            }

            const parent = commit.commit.parent[0];
            const filesInParent = await git.listFiles({ ...this.gitOpts, ref: parent });

            await git.checkout({ ...this.gitOpts, ref: parent, filepaths: filesInParent, force: true });

            const filesInOid = await git.listFiles({ ...this.gitOpts, ref: oid });
            const parentSet = new Set(filesInParent);

            for (const f of filesInOid) {
                if (!parentSet.has(f)) {
                    try {
                        await this.fs.promises.unlink(`${this.dir}/${f}`);
                        await git.remove({ ...this.gitOpts, filepath: f });
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
            let hasHead = true;
            try {
                await git.resolveRef({ ...this.gitOpts, ref: 'HEAD' });
            } catch {
                hasHead = false;
            }

            for (const filepath of filepaths) {
                if (staged) {
                    const filesToProcess = filepath === '.' ? (await this.status()).staged : [filepath];

                    for (const f of filesToProcess) {
                        if (hasHead) {
                            await git.resetIndex({ ...this.gitOpts, filepath: f, ref: 'HEAD' });
                        } else {
                            await git.remove({ ...this.gitOpts, filepath: f });
                        }
                    }
                } else {
                    /**
                     * Fix #1 (restore): Se añade `noUpdateHead: true` para que al
                     * restaurar archivos del working tree no se mueva HEAD accidentalmente.
                     * Documentado en la API de git.checkout como el patrón correcto
                     * cuando se hace checkout de archivos sin cambiar de rama.
                     */
                    // Redundancia eliminada: el if/else producía el mismo resultado;
                    // filepath se envuelve siempre en array, sea '.' o un nombre de archivo.
                    await git.checkout({ ...this.gitOpts, filepaths: [filepath], force: true, noUpdateHead: true });
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
            const commit = await git.readCommit({ ...this.gitOpts, oid });

            const sha = await git.commit({
                ...this.gitOpts,
                message: commit.commit.message,
                author: {
                    name: commit.commit.author.name,
                    email: commit.commit.author.email,
                    timestamp: Math.floor(Date.now() / 1000),
                    timezoneOffset: new Date().getTimezoneOffset()
                },
                parent: [await git.resolveRef({ ...this.gitOpts, ref: 'HEAD' })],
                tree: commit.commit.tree
            });

            await git.checkout({ ...this.gitOpts, ref: sha, force: true });
            await this.refreshState();
            return `Cherry-pick ${oid.substring(0, 7)} aplicado como ${sha.substring(0, 7)}.`;
        } catch (e: any) {
            return `fatal: ${e.message}`;
        }
    }

    async runCommand(commandStr: string): Promise<string> {
        if (commandStr.includes('&&')) {
            const commands = commandStr.split('&&');
            let output = '';
            for (const cmd of commands) {
                const result = await this.runCommand(cmd.trim());
                if (result) output += (output ? '\n' : '') + result;
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
            newPath = segments.join('/') || '~';
        } else {
            const target = current === '~' ? `~/${path}` : `${current}/${path}`;
            newPath = target;
        }

        this.cwd.set(newPath);
        return '';
    }

    private handleConfigureEnv(args: string[]): string {
        for (const arg of args) {
            const [key, val] = arg.split('=');
            if (key === 'cwd') this.cwd.set(val);
            if (key === 'repo') this.repoPath.set(val);
        }
        return '';
    }

    private async handleOpen(filename: string) {
        if (!filename) return 'open: falta archivo';
        return await this.handleCat(filename);
    }

    // Redundancia eliminada: `async` innecesario — la función es puramente síncrona.
    private handleEditor(editor: string, filename: string) {
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
        if (arrowIndex === -1) return parts.slice(1).join(' ');

        const content = parts.slice(1, arrowIndex).join(' ').replace(/^"(.*)"$/, '$1');
        const filename = parts[arrowIndex + 1];
        if (!filename) return 'error sintaxis';

        try {
            if (append) {
                let currentContent = '';
                try {
                    currentContent = await this.fs.promises.readFile(`${this.dir}/${filename}`, 'utf8');
                    if (currentContent && !currentContent.endsWith('\n')) currentContent += '\n';
                } catch (e) { /* File doesn't exist, create it */ }
                await this.fs.promises.writeFile(`${this.dir}/${filename}`, currentContent + content + '\n');
            } else {
                await this.fs.promises.writeFile(`${this.dir}/${filename}`, content + '\n');
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
            const current = this.cwd();
            const repo = this.repoPath();

            if (current === repo) {
                const files = await this.fs.promises.readdir(this.dir);
                return files.filter((f: string) => f !== '.git').join('  ');
            } else {
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

        const current = this.cwd();
        const repo = this.repoPath();

        const allowedOutside = ['clone', 'init', 'help', '--help', 'version'];

        if (!allowedOutside.includes(subCmd)) {
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
            const tags = await git.listTags(this.gitOpts);
            return tags.join('\n') || 'No tags found.';
        }

        const tagName = args[0];
        try {
            await git.tag({ ...this.gitOpts, ref: tagName });
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

    /**
     * Optimization #9: lógica de detección del flag -m unificada.
     * Antes se hacía dos veces (líneas ~841 y ~852), ahora se calcula una sola vez
     * y se reutiliza tanto para el commit normal como para --amend.
     */
    private async handleCommit(args: string[]) {
        const mIdx = args.findIndex(a => a.startsWith('-') && a.includes('m') && a !== '--amend');
        const messageProvided = mIdx !== -1 && args.length > mIdx + 1;
        const message = messageProvided
            ? args.slice(mIdx + 1).join(' ').replace(/^"(.*)"$/, '$1')
            : 'Commit sin mensaje';

        const autoAdd = args.some(a => a.startsWith('-') && a.includes('a'));

        if (args.includes('--amend')) {
            try {
                const headOid = await this.resolveRef('HEAD');
                const headCommit = await git.readCommit({ ...this.gitOpts, oid: headOid });

                const sha = await git.commit({
                    ...this.gitOpts,
                    message: messageProvided ? message : headCommit.commit.message,
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
            const s = await this.status();
            for (const file of s.modified) {
                await git.add({ ...this.gitOpts, filepath: file });
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
                const branches = await git.listBranches(this.gitOpts);
                const commitMap = new Map<string, any>();

                /**
                 * Optimization #3: todos los branch logs + HEAD se obtienen en paralelo
                 * con Promise.all en lugar de un for-await secuencial.
                 */
                const results = await Promise.all([
                    ...branches.map(b => git.log({ ...this.gitOpts, ref: b }).catch(() => [] as any[])),
                    git.log({ ...this.gitOpts, ref: 'HEAD' }).catch(() => [] as any[])
                ]);

                for (const branchCommits of results) {
                    for (const c of branchCommits) {
                        commitMap.set(c.oid, c);
                    }
                }

                commits = Array.from(commitMap.values());
            } else {
                const nonFlags = args.filter(a => !a.startsWith('-'));
                const ref = nonFlags.length > 0 ? nonFlags[0] : undefined;
                commits = await git.log({ ...this.gitOpts, ref });
            }

            commits.sort((a, b) => b.commit.author.timestamp - a.commit.author.timestamp);

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
                const msg = l.commit.message.split('\n')[0];

                if (oneline) {
                    const prefix = graph ? '* ' : '';
                    const hashColor = '\x1b[33m';
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
            ...this.gitOpts,
            ref: name,
            force,
            object: oid
        });
        await this.refreshState();
        return '';
    }

    private async handleBranch(args: string[]) {
        if (args.length === 0) {
            const branches = await git.listBranches(this.gitOpts);
            // Redundancia eliminada: se usa el signal currentBranch() en lugar de
            // una segunda llamada a git.currentBranch() — ya actualizado por refreshState().
            const current = this.currentBranch();
            return branches.map(b => (b === current ? '* ' : '  ') + b).join('\n');
        }

        if (args[0] === '-d' || args[0] === '-D') return await this.deleteBranch(args[1]);

        const moveFlagIndex = args.findIndex(a => a === '-m' || a === '--move');
        if (moveFlagIndex !== -1) {
            const renameArgs = args.filter((_, i) => i !== moveFlagIndex);

            let oldName = await git.currentBranch(this.gitOpts);
            let newName = '';

            if (renameArgs.length === 1) {
                newName = renameArgs[0];
            } else if (renameArgs.length === 2) {
                oldName = renameArgs[0];
                newName = renameArgs[1];
            } else {
                return 'fatal: invalid usage of git branch -m';
            }

            if (!oldName) return 'fatal: no branch to rename';

            try {
                await git.renameBranch({ ...this.gitOpts, oldref: oldName, ref: newName });
                await this.refreshState();
                return '';
            } catch (e: any) {
                return `fatal: ${e.message}`;
            }
        }

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
        let result: string;
        if (dashIdx === 0) {
            const files = args.slice(1);
            await git.checkout({ ...this.gitOpts, filepaths: files });
            result = `Checkout de archivos: ${files.join(', ')}`;
        } else {
            const ref = args[0];
            const files = args.slice(dashIdx + 1);
            await git.checkout({ ...this.gitOpts, ref, filepaths: files });
            result = `Checkout de archivos desde ${ref}`;
        }
        // Redundancia eliminada: refreshState() se llama una sola vez fuera del if/else.
        await this.refreshState();
        return result;
    }

    private async handleCheckout(args: string[]) {
        if (args.includes('--')) return await this.handleCheckoutFiles(args);
        if (args.length > 1 && !args[0].startsWith('-')) {
            try {
                await this.resolveCommit(args[0]);
                const files = args.slice(1);
                await git.checkout({ ...this.gitOpts, ref: args[0], filepaths: files });
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

    /**
     * Optimization #4: HEAD se resolvía dentro del bucle en cada iteración.
     * Ahora se resuelve una sola vez antes de entrar al bucle.
     */
    private async handleDiff() {
        const matrix = await git.statusMatrix(this.gitOpts);
        let diffOutput = '';

        // Resolver HEAD una sola vez fuera del bucle
        let headRef: string | null = null;
        try {
            headRef = await git.resolveRef({ ...this.gitOpts, ref: 'HEAD' });
        } catch { /* No HEAD aún */ }

        for (const [filepath, head, workdir] of matrix) {
            if (head === 1 && workdir === 2 && headRef) {
                try {
                    const headObj = await git.readBlob({ ...this.gitOpts, oid: headRef, filepath });
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

    /** Redundancia eliminada: patrón setTimeout repetido en handlePull y handlePush extraído aquí. */
    private async simulateNetwork(direction: 'download' | 'upload', ms = 1500) {
        this.networkOperation.set(direction);
        await new Promise(resolve => setTimeout(resolve, ms));
        this.networkOperation.set(null);
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
        await this.simulateNetwork('download');
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
        await this.simulateNetwork('upload');
        let head = '';
        try {
            head = await git.resolveRef({ ...this.gitOpts, ref: 'HEAD' });
        } catch { return 'error: cannot push (no HEAD)'; }
        let remoteOid = undefined;
        const remoteRef = `${remote}/${branch}`;
        try {
            remoteOid = await git.resolveRef({ ...this.gitOpts, ref: remoteRef });
        } catch { }
        if (remoteOid) {
            if (remoteOid === head) return 'Everything up-to-date';
            const isAncestor = await this.isAncestor(remoteOid, head);
            if (!isAncestor) return `! [rejected] (non-fast-forward)`;
            await git.branch({ ...this.gitOpts, ref: remoteRef, object: head, force: true });
            return `To ${this.remotes()[remote]}\n   ${remoteOid.substring(0, 7)}..${head.substring(0, 7)}  ${branch} -> ${branch}`;
        } else {
            await git.branch({ ...this.gitOpts, ref: remoteRef, object: head });
            return `To ${this.remotes()[remote]}\n * [new branch]      ${branch} -> ${branch}`;
        }
    }

    private async isAncestor(ancestor: string, descendant: string): Promise<boolean> {
        if (ancestor === descendant) return true;
        const queue = [descendant];
        const visited = new Set<string>();
        while (queue.length > 0) {
            const currentOid = queue.shift();
            if (!currentOid || visited.has(currentOid)) continue;
            visited.add(currentOid);
            if (currentOid === ancestor) return true;
            try {
                const commit = await git.readCommit({ ...this.gitOpts, oid: currentOid });
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
            const matrix = await git.statusMatrix(this.gitOpts);
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
                await git.checkout({ ...this.gitOpts, ref: 'HEAD', force: true });

                // Remove untracked files so the stash actually cleans the working directory
                const { untracked } = await this.status();
                for (const f of untracked) {
                    try {
                        await this.fs.promises.unlink(`${this.dir}/${f}`);
                    } catch (e) { }
                }

                await this.refreshState();
                return `Saved working directory and index state On ${this.currentBranch()}: ${msg}`;
            }
            return 'No local changes to save';
        }
        if (args[0] === 'pop') {
            /**
             * Optimization #8: el .pop() original NO mutaba el signal — solo leía el valor.
             * Ahora se lee explícitamente el último elemento y luego se actualiza el signal.
             */
            const stashes = this.stashes();
            const stash = stashes[stashes.length - 1];
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
        if (args.includes('-n')) {
            const { untracked } = await this.status();
            return untracked.map(f => `Would remove ${f}`).join('\n');
        }
        if (args.includes('-f')) {
            // Redundancia eliminada: una sola llamada a status() cubre ambas ramas.
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
        const file = args[0];
        try {
            await git.remove({ ...this.gitOpts, filepath: file });
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
            await git.remove({ ...this.gitOpts, filepath: src });
            await git.add({ ...this.gitOpts, filepath: dest });
            await this.refreshState();
            return `Renaming ${src} to ${dest}`;
        } catch (e) {
            return `mv failed: ${e}`;
        }
    }
}