import { Injectable, signal, computed } from '@angular/core';
import { GitEngineService } from './git-engine.service';
import { Lesson } from '../models/lesson.interface';
import { lesson1 } from '../data/lesson-1';
import { lesson2 } from '../data/lesson-2';
import { lesson3 } from '../data/lesson-3';
import { lesson4 } from '../data/lesson-4';
import { lesson5 } from '../data/lesson-5';
import { lesson6 } from '../data/lesson-6';
import { lesson7 } from '../data/lesson-7';
import { lesson8 } from '../data/lesson-8';

const STORAGE_KEY = 'git-practice-progress';

@Injectable({
    providedIn: 'root'
})
export class LessonService {
    private lessons = signal<Lesson[]>([lesson1, lesson2, lesson3, lesson4, lesson5, lesson6, lesson7, lesson8]);

    // Current active lesson
    currentLessonId = signal<number>(1);
    currentPracticeId = signal<number | null>(null);

    currentLesson = computed(() => {
        return this.lessons().find(l => l.id === this.currentLessonId());
    });

    currentPractice = computed(() => {
        const lesson = this.currentLesson();
        if (!lesson?.practices?.length) return null;
        return lesson.practices.find(p => p.id === this.currentPracticeId()) || null;
    });

    constructor(private gitService: GitEngineService) {
        this.loadProgress();
    }

    async setLesson(id: number) {
        this.currentLessonId.set(id);
        const lesson = this.lessons().find(l => l.id === id);

        if (lesson?.practices && lesson.practices.length > 0) {
            // Default to first practice
            await this.setPractice(lesson.practices[0].id);
        } else {
            this.currentPracticeId.set(null);
            await this.initializeEnvironment(lesson?.setupCommands);
        }
        this.saveProgress();
    }

    async setPractice(practiceId: number) {
        this.currentPracticeId.set(practiceId);
        const lesson = this.currentLesson();
        const practice = lesson?.practices?.find(p => p.id === practiceId);

        if (practice) {
            await this.initializeEnvironment(practice.setupCommands);
        }
        this.saveProgress();
    }

    private async initializeEnvironment(commands?: string[]) {
        // Reset state first (GitEngineService init now clears everything)
        await this.gitService.init();

        if (commands) {
            for (const cmd of commands) {
                try {
                    const result = await this.gitService.runCommand(cmd);
                    if (result && result.startsWith('Error')) {
                        console.error(`Setup command '${cmd}' failed:`, result);
                    }
                } catch (e) {
                    console.error(`Setup command '${cmd}' threw exception:`, e);
                }
            }
        }
    }

    getLessons() {
        return this.lessons; // Return the signal itself for reactivity in template iteration
    }

    // Track completed steps per lesson: { lessonId: [stepId, stepId, ...] }
    completedSteps = signal<Record<number, number[]>>({});

    toggleStepCompletion(lessonId: number, stepId: number) {
        this.completedSteps.update(current => {
            const lessonSteps = current[lessonId] || [];
            let newSteps;
            if (lessonSteps.includes(stepId)) {
                newSteps = lessonSteps.filter(id => id !== stepId);
            } else {
                newSteps = [...lessonSteps, stepId];
            }
            const updated = {
                ...current,
                [lessonId]: newSteps
            };
            this.saveProgress(updated);
            return updated;
        });
    }

    async resetLesson(lessonId: number) {
        // Clear progress for this lesson
        this.completedSteps.update(current => {
            const updated = { ...current };
            delete updated[lessonId];
            return updated;
        });
        this.saveProgress();

        // If it's the current lesson, re-initialize
        if (this.currentLessonId() === lessonId) {
            const lesson = this.lessons().find(l => l.id === lessonId);
            if (lesson) {
                if (lesson.practices && lesson.practices.length > 0) {
                    // Check if there is a current practice
                    const currentPracticeId = this.currentPracticeId();
                    if (currentPracticeId) {
                        await this.setPractice(currentPracticeId);
                    } else {
                        await this.setPractice(lesson.practices[0].id);
                    }
                } else {
                    await this.initializeEnvironment(lesson.setupCommands);
                }
            }
        }
    }

    async resetPractice(lessonId: number, practiceId: number) {
        const lesson = this.lessons().find(l => l.id === lessonId);
        const practice = lesson?.practices?.find(p => p.id === practiceId);

        if (!lesson || !practice || !practice.steps) return;

        const practiceStepIds = practice.steps.map(s => s.id);

        this.completedSteps.update(current => {
            const updated = { ...current };
            const lessonSteps = updated[lessonId] || [];
            updated[lessonId] = lessonSteps.filter(id => !practiceStepIds.includes(id));
            if (updated[lessonId].length === 0) {
                delete updated[lessonId];
            }
            return updated;
        });
        this.saveProgress();

        if (this.currentLessonId() === lessonId && this.currentPracticeId() === practiceId) {
            await this.initializeEnvironment(practice.setupCommands);
        }
    }

    private saveProgress(steps?: Record<number, number[]>) {
        const state = {
            currentLessonId: this.currentLessonId(),
            currentPracticeId: this.currentPracticeId(),
            completedSteps: steps || this.completedSteps()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    private loadProgress() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const state = JSON.parse(stored);
                // Restore state without triggering side effects
                if (state.currentLessonId) this.currentLessonId.set(state.currentLessonId);
                if (state.currentPracticeId) this.currentPracticeId.set(state.currentPracticeId);
                if (state.completedSteps) this.completedSteps.set(state.completedSteps);
            } catch (e) {
                console.error('Failed to load progress', e);
            }
        }
    }

    resetProgress() {
        this.completedSteps.set({});
        localStorage.removeItem(STORAGE_KEY);
        this.setLesson(1);
    }

    checkCommandMatch(input: string, expected: string): boolean {
        if (!input || !expected) return false;
        const normalizedInput = input.trim().replace(/\s+/g, ' ');
        const normalizedExpected = expected.trim().replace(/\s+/g, ' ');

        // Support for dynamic placeholders like <COMMIT_ID>
        if (normalizedExpected.includes('<')) {
            const escaped = normalizedExpected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = escaped.replace(/<[^>]+>/g, '\\S+');
            return new RegExp(`^${pattern}$`, 'i').test(normalizedInput);
        }

        // Exact match (case-insensitive)
        if (normalizedInput.toLowerCase() === normalizedExpected.toLowerCase()) return true;

        // Flexible structural match: same command skeleton ignoring name-like arguments
        return this.matchesCommandStructure(normalizedInput, normalizedExpected);
    }

    /**
     * Compares two commands by their structural shape:
     * - Same base command (e.g. "git", "touch", "echo")
     * - Same git subcommand if present (e.g. "commit", "branch", "add")
     * - Same flags/options (tokens starting with "-")
     * - Ignores free-form name arguments (filenames, branch names, commit messages)
     *
     * This allows the user to write `git commit -m "mi mensaje"` and match
     * a step that says `git commit -m "Commit_inicial"`, because the structure is the same.
     */
    private matchesCommandStructure(input: string, expected: string): boolean {
        // Handle chained commands (&&) - split and match each pair
        const inputChunks = input.split('&&').map(s => s.trim());
        const expectedChunks = expected.split('&&').map(s => s.trim());

        if (inputChunks.length !== expectedChunks.length) return false;

        return inputChunks.every((inputChunk, i) =>
            this.matchesSingleCommandStructure(inputChunk, expectedChunks[i])
        );
    }

    private matchesSingleCommandStructure(input: string, expected: string): boolean {
        const inputTokens = this.tokenizeCommand(input);
        const expectedTokens = this.tokenizeCommand(expected);

        if (inputTokens.length === 0 || expectedTokens.length === 0) return false;

        // Base command must match exactly (e.g. "git", "touch", "echo", "mkdir")
        if (inputTokens[0].toLowerCase() !== expectedTokens[0].toLowerCase()) return false;

        const baseCmd = inputTokens[0].toLowerCase();

        if (baseCmd === 'git') {
            if (inputTokens.length < 2 || expectedTokens.length < 2) return false;

            const inputSubCmd = inputTokens[1].toLowerCase();
            const expectedSubCmd = expectedTokens[1].toLowerCase();

            // Git subcommand must match (add, commit, branch, remote, stash, etc.)
            if (inputSubCmd !== expectedSubCmd) return false;

            // For git commands that have a required sub-subcommand as their first
            // positional argument (e.g. "git remote add|rm|rename", "git stash save|pop|drop"),
            // also validate that sub-subcommand.
            const GIT_SUB_SUBCOMMANDS: Record<string, boolean> = {
                'remote': true,
                'stash': true,
                'submodule': true,
            };

            if (GIT_SUB_SUBCOMMANDS[inputSubCmd]) {
                // Find the first non-flag token after the subcommand (the sub-subcommand)
                const inputSubSub = this.firstPositionalArg(inputTokens, 2);
                const expectedSubSub = this.firstPositionalArg(expectedTokens, 2);

                // If expected has a sub-subcommand, input must match it
                if (expectedSubSub !== null) {
                    if (inputSubSub === null) return false;
                    if (inputSubSub.toLowerCase() !== expectedSubSub.toLowerCase()) return false;
                }
            }
        }

        // Extract flags from both, treating standalone "--" as a separator (not a flag)
        const inputFlags = inputTokens
            .filter(t => t.startsWith('-') && t !== '--')
            .map(t => t.toLowerCase())
            .sort();
        const expectedFlags = expectedTokens
            .filter(t => t.startsWith('-') && t !== '--')
            .map(t => t.toLowerCase())
            .sort();

        // Flags must match exactly
        if (inputFlags.length !== expectedFlags.length) return false;
        return inputFlags.every((flag, i) => flag === expectedFlags[i]);
    }

    /**
     * Returns the first token at or after `startIndex` that does NOT start with "-".
     * Used to detect sub-subcommands like the "add" in "git remote add".
     */
    private firstPositionalArg(tokens: string[], startIndex: number): string | null {
        for (let i = startIndex; i < tokens.length; i++) {
            if (!tokens[i].startsWith('-')) return tokens[i];
        }
        return null;
    }

    /**
     * Tokenizes a command string, respecting quoted strings as single tokens
     * and stripping surrounding quotes.
     */
    private tokenizeCommand(cmd: string): string[] {
        const tokens: string[] = [];
        const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
        let match;
        while ((match = regex.exec(cmd)) !== null) {
            tokens.push(match[1] ?? match[2] ?? match[3]);
        }
        return tokens;
    }

    /**
     * Called after every terminal command execution.
     * Checks all pending steps in the current practice/lesson and auto-completes
     * any whose command matches the executed input (using flexible matching).
     *
     * Strategy (two passes):
     *   1. Full-chain match: if the executed input contains &&, try it against
     *      steps that also have && (they must match the whole chain).
     *   2. Per-sub-command match: for each individual part of the input (split
     *      by &&), scan the steps in order and mark only the FIRST pending
     *      single-command step that matches → then stop (break).
     *
     * The break in pass 2 is the key: it ensures that when the same command
     * appears in multiple steps (e.g. "git remote -v" in step 1 AND step 3),
     * the first execution marks step 1 only, and the second execution marks
     * step 3 only — never both at once.
     */
    autoCheckCommandMatch(input: string): void {
        const lessonId = this.currentLessonId();
        const lesson = this.currentLesson();
        if (!lesson) return;

        const practice = this.currentPractice();
        const steps = practice?.steps ?? lesson.steps ?? [];
        if (steps.length === 0) return;

        const completed = this.completedSteps()[lessonId] || [];
        const newlyCompleted: number[] = [];

        // Helper: is this step already done or being marked this round?
        const isDone = (id: number) => completed.includes(id) || newlyCompleted.includes(id);

        // Split input by && to get individual sub-commands
        const inputParts = input.split('&&').map(s => s.trim());

        // ── Pass 1: Chained steps ──────────────────────────────────────────────
        // Match the full input against steps that themselves contain &&.
        for (const step of steps) {
            if (!step.command || isDone(step.id)) continue;
            if (step.command.includes('&&') && this.checkCommandMatch(input, step.command)) {
                newlyCompleted.push(step.id);
            }
        }

        // ── Pass 2: Single-command steps ──────────────────────────────────────
        // For each individual sub-command in the input, find the FIRST pending
        // single-command step that matches and mark only that one (break).
        for (const inputPart of inputParts) {
            for (const step of steps) {
                if (!step.command || isDone(step.id)) continue;
                if (step.command.includes('&&')) continue; // handled in pass 1

                if (this.checkCommandMatch(inputPart, step.command)) {
                    newlyCompleted.push(step.id);
                    break; // only the first matching pending step wins
                }
            }
        }

        if (newlyCompleted.length > 0) {
            this.completedSteps.update(current => {
                const existing = current[lessonId] || [];
                const merged = [...new Set([...existing, ...newlyCompleted])];
                const updated = { ...current, [lessonId]: merged };
                this.saveProgress(updated);
                return updated;
            });
        }
    }
}
